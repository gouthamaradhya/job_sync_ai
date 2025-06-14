from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view

from django.shortcuts import render
import os
import pytesseract
import time
from pdf2image import convert_from_path
from PIL import Image
from PyPDF2 import PdfReader
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import FileSystemStorage
from .models import Resume
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from groq import Groq  # Ensure `groq` is installed and imported
import json
from supabase import create_client, Client
import numpy as np
import requests
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from .models import JobDescription, JobRecruiter
from .serializers import JobDescriptionSerializer, DomainSerializer
import uuid


# Initialize the model once at module level
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

load_dotenv() 
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_supabase_client():
    """Helper function to get Supabase client"""
    return supabase

@csrf_exempt
def upload_resume(request):
    if request.method == "POST":
        if 'file' not in request.FILES:
            return JsonResponse({"error": "No file provided"}, status=400)
        
        uploaded_file = request.FILES['file']
        
        # Specify the directory where files should be stored
        uploads_directory = os.path.join('uploads')
        
        # Ensure the uploads directory exists
        if not os.path.exists(uploads_directory):
            os.makedirs(uploads_directory)

        # Save the uploaded file to the uploads folder
        fs = FileSystemStorage(location=uploads_directory)
        file_name = fs.save(uploaded_file.name, uploaded_file)
        file_path = os.path.join(uploads_directory, file_name)
        
        try:
            text = ""
            if uploaded_file.name.endswith('.pdf'):
                # Check if PDF has embedded text
                try:
                    reader = PdfReader(file_path)
                    for page in reader.pages:
                        if page.extract_text():
                            text += page.extract_text()
                except Exception:
                    # Fallback to OCR if PDF is an image-based document
                    images = convert_from_path(file_path)
                    for image in images:
                        gray_image = image.convert('L')  # Convert to grayscale
                        text += pytesseract.image_to_string(gray_image, lang='eng')
            else:
                # Process image files
                image = Image.open(file_path)
                gray_image = image.convert('L')  # Convert to grayscale
                text = pytesseract.image_to_string(gray_image, lang='eng')
            
            if not text.strip():
                return JsonResponse({"error": "Failed to extract text from the document."}, status=500)
            
            # Save the extracted text in the database
            resume = Resume.objects.create(name=uploaded_file.name, text=text)
            
            # Generate and store resume embedding in Supabase
            try:
                # Generate embedding using the local model
                vector = model.encode(text).tolist()
                
                # Store in Supabase resume_vectors table
                supabase_client = get_supabase_client()
                supabase_client.table("resume_vectors").insert({
                    "id": resume.id,
                    "name": uploaded_file.name,
                    "text": text,
                    "embedding": vector
                }).execute()
            except Exception as e:
                print(f"Warning: Failed to store resume vector in Supabase: {e}")
            
            resume.save()
            
            return JsonResponse({"message": "Resume uploaded successfully", "resume_id": resume.id}, status=201)
        
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
        
        finally:
            # Clean up: delete the uploaded file from storage
            if os.path.exists(file_path):
                os.remove(file_path)
    
    return JsonResponse({"error": "Invalid request method"}, status=405)

def match_filtered_jobs(query_embedding):
    match_threshold = 0.2
    match_count = 10

    # Call Supabase function with correct parameters
    response = supabase.rpc(
        "match_filtered_job_descriptions", 
        {
            "query_embedding": query_embedding,
            "match_threshold": match_threshold,
            "match_count": match_count
        }
    ).execute()

    # Check if response is valid
    if not response or not hasattr(response, 'data'):
        return {"error": "Invalid response from Supabase"}

    # Return the matched jobs
    return response.data


@csrf_exempt
def analyze_resume(request):
    if request.method == "GET":
        print("✅ Received GET request for analyzing resume.")

        # Retrieve the most recent resume data from SQLite
        try:
            resume_instance = Resume.objects.last()
            if not resume_instance:
                print("❌ No resume data found in the database.")
                return JsonResponse({"error": "No resume data found"}, status=404)

            user_resume = resume_instance.text
            print(f"✅ Fetched resume: {user_resume[:100]}...")

        except Exception as e:
            print(f"❌ Error fetching resume from the database: {e}")
            return JsonResponse({"error": str(e)}, status=500)

        # Perform embedding using the local model
        try:
            print("🔄 Generating resume embedding locally...")
            # Use the model imported at the top of the file
            vector = model.encode(user_resume).tolist()

            if vector is not None and len(vector) > 0:
                print(f"✅ Vector generated successfully: Length - {len(vector)}")

                # Match filtered jobs using the generated vector
                print("🔄 Matching filtered jobs...")
                result = match_filtered_jobs(vector)
                
                # Process result
                if isinstance(result, dict) and "error" in result:
                    return JsonResponse(result, status=500)
                
                matched_jobs = result
                
                # New functionality: Analyze resume and matched jobs with Groq
                try:
                    print("🔄 Analyzing resume fit with Groq LLM...")
                    # Get Groq API key from environment variables
                    groq_api_key = os.getenv("GROQ_API_KEY")
                    
                    if not groq_api_key:
                        print("❌ GROQ_API_KEY environment variable not set")
                        return JsonResponse({
                            "matched_jobs": matched_jobs,
                            "job_analysis_error": "Groq API key not configured"
                        }, status=200)
                    
                    # Prepare job descriptions for the prompt - limit to top 3 to avoid token issues
                    jobs_text = ""
                    for i, job in enumerate(matched_jobs, 1):
                        jobs_text += f"Job {i}: {job.get('domain', 'No title')}\n"
                        # Truncate job descriptions to manage token count
                        description = job.get('description', 'No description')
                        if len(description) > 1000:
                            description = description[:1000] + "... (truncated)"
                        jobs_text += f"Description: {description}\n\n"
                    
                    # Create a more structured prompt for Groq that's likely to generate better responses
                    prompt = f"""
                    Please analyze the following resume against these job opportunities. 
                    
                    For each job, provide the following sections in a clear, structured format:

                    1. Match Assessment: How well does the candidate's resume match the job requirements?
                    2. Key Matching Skills: List the top skills from the resume that match this job.
                    3. Missing Skills: Identify important skills mentioned in the job description that are not evident in the resume.
                    4. Recommended Learning: Suggest specific resources (courses, certifications, projects) to develop the missing skills.
                    
                    Format your response as markdown with clear headings and bullet points.
                    
                    RESUME:
                    {user_resume}  # Truncate if needed
                    
                    MATCHED JOBS:
                    {jobs_text}
                    """
                    
                    # Try Mixtral first (more stable), fallback to Gemma if needed
                    models_to_try = ["llama-3.3-70b-versatile", "gemma2-9b-it"]
                    
                    analysis = None
                    for model_name in models_to_try:
                        try:
                            print(f"🔄 Attempting analysis with model: {model_name}")
                            # Make request to Groq with retry logic
                            for attempt in range(3):  # Try up to 3 times
                                try:
                                    response = requests.post(
                                        "https://api.groq.com/openai/v1/chat/completions",
                                        headers={
                                            "Content-Type": "application/json",
                                            "Authorization": f"Bearer {groq_api_key}"
                                        },
                                        json={
                                            "model": model_name,
                                            "messages": [{"role": "user", "content": prompt}],
                                            "temperature": 0.3,  # Lower temperature for more consistent output
                                            "max_tokens": 2048
                                        },
                                        timeout=30
                                    )
                                    
                                    # Check if response is valid JSON
                                    try:
                                        groq_data = response.json()

                                    except json.JSONDecodeError:
                                        print(f"❌ Invalid JSON response from Groq: {response.text[:100]}...")
                                        if attempt < 2:  # If not the last attempt
                                            time.sleep(2)  # Wait before retrying
                                            continue
                                        raise Exception("Failed to parse Groq API response")
                                    
                                    # Validate response format
                                    if not isinstance(groq_data, dict) or "choices" not in groq_data:
                                        print(f"❌ Unexpected response structure: {groq_data}")
                                        if attempt < 2:
                                            time.sleep(2)
                                            continue
                                        raise Exception("Invalid response structure from Groq API")
                                    
                                    # Extract and validate content
                                    content = groq_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                                    
                                    # Check if content is malformed (like in the example with lots of ** symbols)
                                    if content.count("**") > 20 or len(content.strip()) < 100:
                                        print("❌ Received malformed or truncated content from Groq")
                                        if attempt < 2:
                                            time.sleep(2)
                                            continue
                                    else:
                                        # Valid response
                                        analysis = content
                                        print(analysis,matched_jobs)
                                        break
                                        
                                except requests.exceptions.RequestException as e:
                                    print(f"❌ Network error in Groq request (attempt {attempt+1}): {e}")
                                    if attempt < 2:
                                        time.sleep(2)
                                        continue
                                    raise
                            
                            # If we got a valid analysis, break out of the model loop
                            if analysis:
                                print(f"✅ Successfully obtained analysis from {model_name}")
                                break
                                
                        except Exception as model_e:
                            print(f"❌ Error using model {model_name}: {model_e}")
                            # Continue to the next model if this one failed
                    
                    # If no models succeeded, generate a fallback analysis
                    if not analysis:
                        print("❌ All LLM models failed, generating fallback analysis")
                        analysis = generate_fallback_analysis(user_resume, matched_jobs)
                    
                    # Return both matched jobs and the analysis
                    return JsonResponse({
                        "matched_jobs": matched_jobs,
                        "job_analysis": analysis
                    }, status=200)
                
                    
                except Exception as e:
                    print(f"❌ Error in LLM analysis: {e}")
                    # Generate a fallback analysis without the LLM
                    fallback_analysis = generate_fallback_analysis(user_resume, matched_jobs)
                    return JsonResponse({
                        "matched_jobs": matched_jobs,
                        "job_analysis": fallback_analysis,
                        "job_analysis_error": str(e)
                    }, status=200)
            else:
                print("❌ Empty or invalid vector response.")
                return JsonResponse({"error": "Failed to generate embedding vector"}, status=500)

        except Exception as e:
            print(f"❌ Error in processing: {e}")
            return JsonResponse({"error": f"Processing error: {str(e)}"}, status=500)

    # Return error for invalid request methods
    print("❌ Invalid request method. Only GET is allowed.")
    return JsonResponse({"error": "Invalid request method. Only GET is allowed."}, status=405)


def generate_fallback_analysis(resume, jobs):
    """Generate a basic analysis without using an LLM when the API call fails"""
    
    # Create a simple analysis based on keyword matching
    analysis = "# Resume Analysis (System Generated)\n\n"
    analysis += "> Note: This is an automated analysis generated without AI assistance due to service limitations.\n\n"
    
    # Extract keywords from resume (simple approach)
    resume_lower = resume.lower()
    
    # Common skills to check for
    common_skills = [
        "python", "javascript", "java", "c++", "sql", "aws", "azure", "gcp", 
        "react", "angular", "vue", "node.js", "django", "flask", "express",
        "docker", "kubernetes", "cicd", "devops", "machine learning", "ai",
        "data science", "analytics", "agile", "scrum", "product management",
        "html", "css", "ui", "ux", "design", "testing", "qa", "security"
    ]
    
    # Find skills in resume
    resume_skills = []
    for skill in common_skills:
        if skill in resume_lower:
            resume_skills.append(skill)
    
    for i, job in enumerate(jobs[:3], 1):
        job_title = job.get("title", "Unnamed Position")
        company = job.get("company_name", "Unknown Company")
        
        analysis += f"## Job {i}: {job_title} at {company}\n\n"
        
        # Basic matching section
        analysis += "### Match Assessment\n"
        analysis += "A basic keyword analysis has been performed on your resume and this job listing.\n\n"
        
        # Check for skill matches in job description
        job_desc_lower = job.get("description", "").lower()
        matching_skills = []
        missing_skills = []
        
        for skill in common_skills:
            if skill in job_desc_lower:
                if skill in resume_lower:
                    matching_skills.append(skill)
                else:
                    missing_skills.append(skill)
        
        # Add matching skills
        analysis += "### Key Matching Skills\n"
        if matching_skills:
            for skill in matching_skills:
                analysis += f"- {skill.title()}\n"
        else:
            analysis += "- No specific skill matches detected\n"
        
        analysis += "\n### Missing Skills\n"
        if missing_skills:
            for skill in missing_skills[:5]:  # Limit to top 5
                analysis += f"- {skill.title()}\n"
        else:
            analysis += "- No obvious skill gaps detected\n"
        
        analysis += "\n### Recommended Learning\n"
        if missing_skills:
            for skill in missing_skills[:3]:  # Recommend for top 3
                analysis += f"- For {skill.title()}: Online courses on platforms like Coursera, Udemy, or LinkedIn Learning\n"
        else:
            analysis += "- Continue developing your current skillset\n"
        
        analysis += "\n\n"
    
    return analysis

@api_view(['GET'])
def get_jobs_by_domain(request):
    """
    API endpoint to fetch jobs by domain from Supabase
    
    Query parameters:
    - domain: The domain category to filter jobs by
    """
    domain = request.GET.get('domain', None)
    
    if not domain:
        return Response({"error": "Domain parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Use the helper function
        supabase = get_supabase_client()
        
        # Fetch jobs from Supabase that match the specified domain
        response = supabase.table("job_description").select("*").eq("domain", domain).execute()
        
        # Check if we got data back
        if hasattr(response, 'data') and response.data:
            return Response(response.data)
        else:
            return Response([], status=status.HTTP_200_OK)  # Return empty list if no jobs found
            
    except Exception as e:
        print(f"Error fetching jobs from Supabase: {str(e)}")
        return Response(
            {"error": "Failed to fetch jobs. Please try again later."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_all_domains(request):
    """
    API endpoint to fetch all available job domains
    """
    try:
        # Use the helper function
        supabase = get_supabase_client()
        
        # Query to get unique domains
        response = supabase.table("job_description").select("domain").execute()
        
        if hasattr(response, 'data') and response.data:
            # Extract unique domains
            domains = list(set([item['domain'] for item in response.data if item.get('domain')]))
            return Response(domains)
        else:
            return Response([], status=status.HTTP_200_OK)
            
    except Exception as e:
        print(f"Error fetching domains from Supabase: {str(e)}")
        return Response(
            {"error": "Failed to fetch domains. Please try again later."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def match_candidates_for_job(request):
    """
    API endpoint to find the best candidates for a job description
    """
    if request.method != "POST":
        return Response({"error": "Invalid request method"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    try:
        data = request.data
        job_description = data.get('job_description')
        
        if not job_description:
            return Response({"error": "Job description is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate embedding locally
        vector = model.encode(job_description).tolist()
        
        # Match candidates using a Supabase function
        match_threshold = 0.2
        match_count = 10
        
        # Call Supabase function to match candidates
        supabase = get_supabase_client()
        response = supabase.rpc(
            "match_candidates", 
            {
                "query_embedding": vector,
                "match_threshold": match_threshold,
                "match_count": match_count
            }
        ).execute()
        
        if not response or not hasattr(response, 'data'):
            return Response({"error": "Invalid response from Supabase"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        matched_candidates = response.data
        
        # Use Groq to analyze the matches
        try:
            groq_api_key = os.getenv("GROQ_API_KEY")
            
            # Prepare candidate data for the prompt
            candidates_text = ""
            for i, candidate in enumerate(matched_candidates, 1):
                candidates_text += f"Candidate {i}: {candidate.get('name', 'Unknown')}\n"
                candidates_text += f"Resume: {candidate.get('text', 'No resume available')[:500]}...\n\n"
            
            # Create prompt for Groq
            prompt = f"""
            Given the following job description and matched candidate resumes, please:
            1. Rank the candidates from best to worst match for the position
            2. Explain why each candidate is suited for the role
            3. Identify any missing skills or experience for each candidate
            
            JOB DESCRIPTION:
            {job_description}
            
            MATCHED CANDIDATES:
            {candidates_text}
            """
            
            # Make request to Groq
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {groq_api_key}"
                },
                json={
                    "model": "gemma2-9b-it",
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            
            groq_data = response.json()
            analysis = groq_data.get("choices", [{}])[0].get("message", {}).get("content", "Analysis unavailable")
            
            # Return both matched candidates and the analysis
            return Response({
                "matched_candidates": matched_candidates,
                "candidate_analysis": analysis
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error in Groq analysis: {e}")
            # Continue even if Groq analysis fails, just return matched candidates
            return Response({
                "matched_candidates": matched_candidates,
                "candidate_analysis_error": str(e)
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        print(f"Error matching candidates: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def insert_job_to_supabase(job_data):
    """
    Insert job data into Supabase job_description table
    """
    client = get_supabase_client()
    
    # Insert into job_description table
    result = client.table('job_description').insert({
        'id': str(job_data['id']),
        'uuid': str(job_data['uuid']),
        'domain': job_data['domain'],
        'description': job_data['description'],
        'salary': float(job_data['salary']),
        'contact_info': job_data['contact_info'],
        'application_link': job_data['application_link']
    }).execute()
    
    return result

def insert_vector_to_supabase(vector_data):
    """
    Insert vector data into Supabase vector_table
    """
    client = get_supabase_client()
    
    # Insert into vector_table
    result = client.table('vector_table').insert({
        'id': str(vector_data['id']),
        'job_id': str(vector_data['job_id']),
        'embedding': vector_data['embedding']
    }).execute()
    
    return result

@api_view(['GET'])
def get_domains(request):
    """API endpoint to get available job domains"""
    # For demonstration, hard-coded domains
    # In a real app, you might fetch these from a database
    domains = [
        "Software Development",
        "Data Science",
        "DevOps",
        "Product Management",
        "UX/UI Design",
        "Marketing",
        "Sales",
        "Customer Support",
        "Human Resources",
        "Finance"
    ]
    return Response(domains)

@api_view(['POST'])
def upload_job_posting(request):
    """
    API endpoint to receive job postings from the NextJS frontend and store them in Supabase
    """
    try:
        data = request.data
        
        # Extract job posting data
        title = data.get('title')
        company = data.get('company')
        description = data.get('description')
        requirements = data.get('requirements', '')
        location = data.get('location', '')
        domain = data.get('domain')
        
        # Debug information
        print(f"Received data: title={title}, company={company}, domain={domain}")
        
        # Validate required fields
        if not all([title, company, description, domain]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            job_id = uuid.uuid4()
            # Create and save the job description in the local database
            job_description = JobDescription.objects.create(
                id = job_id,
                title=title,
                description=description,
                company=company,
                location=location,
                domain=domain,
            )
            
            # For debugging - to ensure we're correctly creating the Django model
            print(f"Created JobDescription with ID: {job_description.id}")
            
            try:
                # Generate vector embedding using sentence-transformers
                # Import model inside try/except to handle potential import errors gracefully
                from sentence_transformers import SentenceTransformer
                model = SentenceTransformer('all-MiniLM-L6-v2')
                
                combined_text = f"{title} {company} {description} {requirements}"
                vector = model.encode(combined_text).tolist()
                
                try:
                    # Import supabase client inside try/except to handle potential import errors
                    supabase_client = get_supabase_client()
                    
                    # Insert into Supabase job_description table
                    job_response = supabase_client.table("job_description").insert({
                        "id": str(job_description.id),  # Use Django model ID as Supabase ID, not job_description.id,  # Use Django model ID as Supabase ID
                        "uuid": str(job_description.id),  # Using the same ID for uuid field, not job_description.id,  # Using the same ID for uuid field
                        "domain": domain,
                        "description": description,
                        "salary": 0,  # Default value as per schema
                        "contact_info": company,  # Using company as contact info
                        "recruiter_id": "00000000-0000-0000-0000-000000000000",  # Default UUID
                        "application_link": ""  # Empty application link
                    }).execute()

                    if not job_response.data or len(job_response.data) == 0:
                        print("Failed to insert job into Supabase:", job_response.error)
                        return Response({
                            "status": "partial_success", 
                             "message": "Job posting created in local database but Supabase job insert failed",
                             "job_id": str(job_description.id),
                             "error": str(job_response.error)
                     }, status=status.HTTP_201_CREATED)
                    
                    # Insert vector embedding into vector_table
                    vector_response = supabase_client.table("vector_table").insert({
                        "id": str(uuid.uuid4()),   # Generate new UUID for vector table
                        "job_id": str(job_description.id),  # Reference to job description ID in job_description table, not job_description.id,  # Reference to job description
                        "embedding": vector  # The embedding vector
                    }).execute()

                    
                    print("Successfully inserted data into Supabase")
                    
                except Exception as supabase_error:
                    # Handle Supabase integration errors
                    print(f"Supabase error: {str(supabase_error)}")
                    # If Supabase fails but Django DB succeeded, we still return success
                    # but include a warning
                    return Response({
                        "status": "partial_success", 
                        "message": "Job posting created in local database but Supabase integration failed",
                        "job_id": job_description.id,
                        "warning": str(supabase_error)
                    }, status=status.HTTP_201_CREATED)
                
            except ImportError as import_error:
                # Handle missing sentence-transformers package
                print(f"Import error: {str(import_error)}")
                return Response({
                    "status": "partial_success", 
                    "message": "Job posting created but vector embedding failed",
                    "job_id": job_description.id,
                    "error_detail": str(import_error)
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                "status": "success", 
                "message": "Job posting created successfully",
                "job_id": job_description.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as db_error:
            # Database-specific errors
            print(f"Database error: {str(db_error)}")
            return Response({
                "status": "error", 
                "message": "Database error",
                "error_detail": str(db_error)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        # Catch-all for any other errors
        print(f"General error: {str(e)}")
        return Response({
            "status": "error", 
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

