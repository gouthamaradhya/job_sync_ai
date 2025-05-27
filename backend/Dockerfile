# Use an official Python runtime as the base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1  
ENV PYTHONUNBUFFERED=1         
ENV DJANGO_SETTINGS_MODULE=jobsyncai.settings 

# Set the working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    tesseract-ocr \
    poppler-utils \
    netcat-traditional \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker caching
COPY requirements.txt /app/

# Install Python dependencies with better error handling
# Split installation into smaller groups to identify problematic packages
RUN pip install --upgrade pip && \
    # Install basic dependencies first
    pip install --no-cache-dir \
    asgiref==3.8.1 \
    Django==5.1.4 \
    django-cors-headers==4.6.0 \
    djangorestframework==3.16.0 \
    sqlparse==0.5.3 \
    python-dotenv==1.0.1 \
    uvicorn==0.34.2 && \
    # Install packages with system dependencies
    pip install --no-cache-dir \
    pdf2image==1.17.0 \
    pytesseract==0.3.13 \
    PyPDF2==3.0.1 && \
    # Install ml/ai dependencies
    pip install --no-cache-dir \
    numpy==2.2.4 \
    scikit-learn==1.6.1 \
    scipy==1.15.2 \
    transformers==4.51.3 \
    tokenizers==0.21.1 \
    sentence-transformers==4.1.0 && \
    # Install remaining dependencies
    pip install --no-cache-dir -r requirements.txt

# Create a non-root user to run the application
RUN useradd -m django-user

# Copy the project code
COPY . /app/

# Create directories for static and media files if they don't exist
RUN mkdir -p /app/staticfiles /app/mediafiles

# Set proper permissions
RUN chown -R django-user:django-user /app

# Switch to non-root user
USER django-user

# Create a startup script - adjusted to be more flexible with project names
RUN echo '#!/bin/bash\n\
    # Get the Django project name from the DJANGO_SETTINGS_MODULE environment variable\n\
    PROJECT_NAME=$(echo $DJANGO_SETTINGS_MODULE | cut -d. -f1)\n\
    # Check if the project directory exists, if not, list what\'s available\n\
    if [ ! -d "$PROJECT_NAME" ]; then\n\
    echo "ERROR: Project directory $PROJECT_NAME not found!"\n\
    echo "Available directories:"\n\
    ls -la\n\
    exit 1\n\
    fi\n\
    # Try to run Django commands with error handling\n\
    if python manage.py collectstatic --noinput; then\n\
    echo "Static files collected successfully"\n\
    else\n\
    echo "Warning: collectstatic failed, but continuing..."\n\
    fi\n\
    if python manage.py migrate; then\n\
    echo "Database migrations applied successfully"\n\
    else\n\
    echo "Warning: migrations failed, but continuing..."\n\
    fi\n\
    # Start the server with the correct project name\n\
    echo "Starting server for $PROJECT_NAME"\n\
    uvicorn $PROJECT_NAME.asgi:application --host 0.0.0.0 --port 8000\n\
    ' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["/app/entrypoint.sh"]