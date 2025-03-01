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



@csrf_exempt
def analyze_resume_view(request):
    if request.method == "GET":
        # Initialize the Groq client
        client = Groq(
            api_key="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"
        )

        # Define the system prompt
        system_prompt = '''Analyze the resume to predict the most suitable job title, identify current skills, suggest additional skills required to excel in the role, and recommend relevant courses for upskilling. Return the output in the following JSON format:
{
"predicted_job": "string",
"skills": "comma-separated string of current skills",
"skills_required": ["array of additional skills needed"],
"courses_required": ["array of recommended courses"]
}
'''

        # Retrieve the most recent resume data from SQLite
        try:
            resume_instance = Resume.objects.last()  # Get the most recent resume
            if not resume_instance:
                return JsonResponse({"error": "No resume data found"}, status=404)

            user_resume = resume_instance.text  # Assuming a field `text`
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        # Call the Groq API
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_resume
                    }
                ],
                model="gemma2-9b-it",
                response_format={"type": "json_object"}
            )

            # Extract the content and return as JSON
            result = chat_completion.choices[0].message.content
            return JsonResponse(result, safe=False)

        except Exception as e:
            return JsonResponse({"error": f"Groq API error: {str(e)}"}, status=500)
    
    return JsonResponse({"error": "Invalid request method. Only GET is allowed."}, status=405)
