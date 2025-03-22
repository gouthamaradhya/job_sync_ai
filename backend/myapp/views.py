from django.shortcuts import render
import os
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from PyPDF2 import PdfReader
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import FileSystemStorage
from .models import Resume
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from myapp.models import Resume  # Replace `myapp` with your actual app name
from groq import Groq  # Ensure `groq` is installed and imported
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from huggingface_hub import InferenceClient
from .models import Resume  # Assuming you have a Resume model
from django.http import HttpResponse
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from django.http import JsonResponse
import numpy as np
import requests

load_dotenv() 
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")



supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

        # Initialize the Hugging Face Inference Client
        try:
            # Store API keys in environment variables or settings, not in code
            hf_api_key = os.getenv("HUGGING_FACE_API_KEY")
            client = InferenceClient(api_key=hf_api_key)
            print("✅ Hugging Face Inference Client initialized.")
        except Exception as e:
            print(f"❌ Error initializing Hugging Face client: {e}")
            return JsonResponse({"error": f"Failed to initialize Hugging Face Client: {str(e)}"}, status=500)

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

        # Perform embedding using the HF Inference API
        try:
            print("🔄 Sending resume for embedding...")
            vector = client.feature_extraction(
                user_resume,
                model="sentence-transformers/all-MiniLM-L6-v2"
            )

            if vector is not None and len(vector) > 0:
                vector_list = vector.tolist() if isinstance(vector, np.ndarray) else vector

                print(f"✅ Vector generated successfully: Length - {len(vector)}")

                # Match filtered jobs using the generated vector
                print("🔄 Matching filtered jobs...")
                result = match_filtered_jobs(vector_list)
                print(result)
                
                # Process result
                if hasattr(result, 'data'):
                    matched_jobs = result.data
                else:
                    matched_jobs = result
                
                # New functionality: Analyze resume and matched jobs with Groq
                try:
                    print("🔄 Analyzing resume fit with Groq Gemma2...")
                    # Get Groq API key from environment variables
                    groq_api_key = os.getenv("GROQ_API_KEY")
                    
                    # Prepare job descriptions for the prompt
                    jobs_text = ""
                    for i, job in enumerate(matched_jobs, 1):
                        jobs_text += f"Job {i}: {job.get('title', 'No title')}\n"
                        jobs_text += f"Description: {job.get('description', 'No description')}\n\n"
                    
                    # Create prompt for Groq
                    prompt = f"""
                    Given the following resume and matched job opportunities, please:
                    1. Explain why each job might be suitable for the candidate
                    2. Identify skills the candidate is lacking for each role
                    3. Suggest resources for upskilling in those areas
                    
                    RESUME:
                    {user_resume}
                    
                    MATCHED JOBS:
                    {jobs_text}
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
                    print("✅ Received analysis from Groq")
                    
                    # Return both matched jobs and the analysis
                    return JsonResponse({
                        "matched_jobs": matched_jobs,
                        "job_analysis": analysis
                    }, status=200)
                    
                except Exception as e:
                    print(f"❌ Error in Groq analysis: {e}")
                    # Continue even if Groq analysis fails, just return matched jobs
                    return JsonResponse({
                        "matched_jobs": matched_jobs,
                        "job_analysis_error": str(e)
                    }, status=200)
            else:
                print("❌ Empty or invalid vector response from Hugging Face API.")
                return JsonResponse({"error": "Invalid response format from Hugging Face API"}, status=500)

        except Exception as e:
            print(f"❌ Error in processing: {e}")
            return JsonResponse({"error": f"Processing error: {str(e)}"}, status=500)

    # Return error for invalid request methods
    print("❌ Invalid request method. Only GET is allowed.")
    return JsonResponse({"error": "Invalid request method. Only GET is allowed."}, status=405)