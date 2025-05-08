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

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json
import requests
import os
import base64
import tempfile
from django.core.files.base import ContentFile
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Import your existing analysis functions
# from your_analysis_app.services import analyze_resume

# WhatsApp API settings
WHATSAPP_API_URL = "https://graph.facebook.com/v18.0"
VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "your_custom_verify_token")
ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "your_whatsapp_access_token")
PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "your_whatsapp_phone_number_id")

# User session tracking - simple in-memory store
# In production, use a database or Redis
user_sessions = {}

@csrf_exempt
def whatsapp_webhook(request):
    """Main webhook endpoint that handles both verification and incoming messages"""
    logger.info(f"Received {request.method} request to webhook")
    
    if request.method == "GET":
        # Handle verification request from Meta (via Next.js proxy)
        return verify_webhook(request)
    elif request.method == "POST":
        # Handle incoming messages (via Next.js proxy)
        return process_incoming_message(request)
    else:
        return HttpResponse(status=405)  # Method not allowed

def verify_webhook(request):
    """Verifies the webhook with Meta Developer platform"""
    logger.info("Processing webhook verification request")
    
    mode = request.GET.get("hub.mode")
    token = request.GET.get("hub.verify_token")
    challenge = request.GET.get("hub.challenge")
    
    logger.info(f"Verification params - Mode: {mode}, Token: {'*' * len(token) if token else None}, Challenge: {challenge}")
    
    if mode and token:
        if mode == "subscribe" and token == VERIFY_TOKEN:
            logger.info("Webhook verified successfully!")
            return HttpResponse(challenge, status=200)
        else:
            logger.warning("Failed webhook verification - invalid token or mode")
            return HttpResponse(status=403)  # Forbidden
    
    logger.warning("Bad verification request - missing parameters")
    return HttpResponse(status=400)  # Bad request

def process_incoming_message(request):
    """Processes incoming WhatsApp messages"""
    try:
        # Log request headers for debugging
        logger.info(f"Headers: {request.headers}")
        
        # Parse the request body
        data = json.loads(request.body.decode("utf-8"))
        logger.info(f"Received webhook data: {json.dumps(data)[:500]}...")  # Log first 500 chars
        
        # Check if this is a WhatsApp Business API message
        if data.get("object") == "whatsapp_business_account":
            for entry in data.get("entry", []):
                for change in entry.get("changes", []):
                    if change.get("field") == "messages":
                        if "messages" in change.get("value", {}):
                            process_message(change["value"])
        
        return HttpResponse(status=200)
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)
        return HttpResponse(status=500)

def process_message(value):
    """Processes a specific message and determines the response"""
    try:
        # Extract message information
        message = value["messages"][0]
        message_id = message["id"]
        phone_number = value["contacts"][0]["wa_id"]
        
        logger.info(f"Processing message from {phone_number}, message_id: {message_id}")
        
        # Track user session
        if phone_number not in user_sessions:
            user_sessions[phone_number] = {"state": "new"}
            logger.info(f"New user session created for {phone_number}")
        
        # Handle message based on type
        if "text" in message:
            text_content = message["text"]["body"]
            logger.info(f"Received text message: {text_content}")
            handle_text_message(phone_number, text_content)
        elif "image" in message:
            logger.info(f"Received image message from {phone_number}")
            handle_file_message(phone_number, message)
        elif "document" in message:
            logger.info(f"Received document message from {phone_number}")
            handle_file_message(phone_number, message)
        else:
            # Handle other message types
            logger.info(f"Received unsupported message type from {phone_number}")
            send_message(phone_number, "I can only process text messages and files. Please send a message or your resume.")
    except Exception as e:
        logger.error(f"Error in process_message: {e}", exc_info=True)

def handle_text_message(phone_number, message_text):
    """Handles text messages from users"""
    message_text = message_text.lower().strip()
    user_state = user_sessions[phone_number]["state"]
    
    logger.info(f"Handling text message '{message_text}' from {phone_number} (state: {user_state})")
    
    if message_text == "hi" or message_text == "hello":
        # Welcome message
        send_message(
            phone_number,
            "👋 Welcome to Job Sync AI!\n\n"
            "I can help analyze your resume and provide personalized feedback. "
            "Would you like to upload your resume now? (Reply with 'yes' to proceed)"
        )
        user_sessions[phone_number]["state"] = "awaiting_confirmation"
    
    elif user_state == "awaiting_confirmation" and (message_text == "yes" or message_text == "y"):
        # Prompt for resume upload
        send_message(
            phone_number,
            "Great! Please upload your resume as a PDF or image file."
        )
        user_sessions[phone_number]["state"] = "awaiting_resume"
    
    elif user_state == "analysis_complete":
        # After analysis is complete, reset state if user sends another message
        send_message(
            phone_number,
            "Do you want to analyze another resume? Reply with 'yes' to proceed."
        )
        user_sessions[phone_number]["state"] = "awaiting_confirmation"
    
    else:
        # Default response
        send_message(
            phone_number,
            "I'm here to help analyze your resume. Say 'hi' to start over, or upload your resume if you're ready."
        )

def handle_file_message(phone_number, message):
    """Handles file messages (resumes) from users"""
    user_state = user_sessions[phone_number]["state"]
    logger.info(f"Handling file message from {phone_number} (state: {user_state})")
    
    # Check if we're expecting a resume
    if user_state != "awaiting_resume" and user_state != "analysis_complete":
        send_message(
            phone_number,
            "I wasn't expecting a file yet. Please say 'hi' to start the resume analysis process."
        )
        return
    
    # Determine file type
    file_type = None
    media_id = None
    if "image" in message:
        file_type = "image"
        media_id = message["image"]["id"]
        logger.info(f"Received image with media ID: {media_id}")
    elif "document" in message:
        file_type = "document"
        media_id = message["document"]["id"]
        mime_type = message["document"].get("mime_type", "unknown")
        logger.info(f"Received document with media ID: {media_id}, mime_type: {mime_type}")
        
    if media_id:
        # Download the file
        send_message(phone_number, "Downloading your resume... Please wait.")
        file_path = download_media(media_id)
        
        if file_path:
            logger.info(f"Successfully downloaded file to {file_path}")
            # Process the resume
            send_message(phone_number, "Analyzing your resume... This may take a moment.")
            
            try:
                # Call your existing resume analysis function
                # analysis_result = analyze_resume(file_path)
                
                # For now, we'll return a placeholder result
                # In production, integrate with your existing analysis code
                analysis_result = {
                    "skills": ["Python", "JavaScript", "React", "Django"],
                    "experience_years": 3,
                    "education": "Bachelor's Degree",
                    "missing_keywords": ["Docker", "AWS"],
                    "improvement_suggestions": [
                        "Add more quantifiable achievements",
                        "Include certifications",
                        "Highlight leadership experiences"
                    ]
                }
                
                logger.info(f"Analysis complete for {phone_number}")
                
                # Format and send the analysis
                send_analysis_result(phone_number, analysis_result)
                user_sessions[phone_number]["state"] = "analysis_complete"
                
                # Clean up file
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Cleaned up temporary file {file_path}")
                    
            except Exception as e:
                logger.error(f"Error analyzing resume: {e}", exc_info=True)
                send_message(
                    phone_number,
                    "I encountered an error while analyzing your resume. Please try uploading it again."
                )
        else:
            logger.error(f"Failed to download media with ID {media_id}")
            send_message(
                phone_number,
                "I couldn't download your file. Please try uploading it again."
            )
    else:
        logger.warning(f"Could not determine media ID from message")
        send_message(
            phone_number,
            "I couldn't process your file. Please upload a PDF or image file of your resume."
        )

def send_analysis_result(phone_number, analysis_result):
    """Formats and sends the resume analysis results"""
    logger.info(f"Sending analysis results to {phone_number}")
    
    # Create a formatted message with the analysis results
    message = "📋 *Your Resume Analysis Results* 📋\n\n"
    
    # Skills section
    message += "*Skills Identified:*\n"
    skills = ", ".join(analysis_result["skills"])
    message += f"• {skills}\n\n"
    
    # Experience and education
    message += f"*Experience:* {analysis_result['experience_years']} years\n"
    message += f"*Education:* {analysis_result['education']}\n\n"
    
    # Missing keywords
    message += "*Missing Keywords:*\n"
    missing = ", ".join(analysis_result["missing_keywords"])
    message += f"• {missing}\n\n"
    
    # Improvement suggestions
    message += "*Suggestions for Improvement:*\n"
    for idx, suggestion in enumerate(analysis_result["improvement_suggestions"], 1):
        message += f"{idx}. {suggestion}\n"
    
    # Conclusion
    message += "\nWould you like to upload another resume? Reply with 'yes' to analyze a different resume."
    
    send_message(phone_number, message)

def download_media(media_id):
    """Downloads media (resume) from WhatsApp servers"""
    try:
        logger.info(f"Attempting to download media with ID: {media_id}")
        
        # Get media URL
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}"
        }
        url = f"{WHATSAPP_API_URL}/{media_id}"
        
        logger.info(f"Requesting media URL from: {url}")
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            media_data = response.json()
            media_url = media_data.get("url")
            
            logger.info(f"Got media URL: {media_url[:50]}...")  # Log part of URL for debugging
            
            # Download the file
            media_response = requests.get(media_url, headers=headers)
            if media_response.status_code == 200:
                logger.info(f"Downloaded media content, size: {len(media_response.content)} bytes")
                
                # Create a temporary file
                fd, temp_path = tempfile.mkstemp()
                with os.fdopen(fd, 'wb') as file:
                    file.write(media_response.content)
                    
                logger.info(f"Saved media to temporary file: {temp_path}")
                return temp_path
            else:
                logger.error(f"Failed to download media content: {media_response.status_code}, {media_response.text[:100]}")
        else:
            logger.error(f"Failed to get media URL: {response.status_code}, {response.text[:100]}")
    
    except Exception as e:
        logger.error(f"Error downloading media: {e}", exc_info=True)
    
    return None

def send_message(phone_number, message_text):
    """Sends a WhatsApp message to the user"""
    logger.info(f"Sending message to {phone_number}: {message_text[:50]}...")  # Log part of message
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "text",
        "text": {
            "body": message_text
        }
    }
    
    try:
        url = f"{WHATSAPP_API_URL}/{PHONE_NUMBER_ID}/messages"
        logger.info(f"Sending message to WhatsApp API: {url}")
        
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            logger.info(f"Message sent successfully to {phone_number}")
        else:
            logger.error(f"Error sending message: {response.status_code}, {response.text[:100]}")
    
    except Exception as e:
        logger.error(f"Error sending message: {e}", exc_info=True)