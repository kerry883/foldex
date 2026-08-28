# Use the official Manim community image as the base
# It includes Python, FFmpeg, and LaTeX pre-installed
FROM manimcommunity/manim:v0.19.0

# Switch to root user to allow installing packages and file permissions
USER root

RUN apt-get update && apt-get install -y ffmpeg sox libsox-fmt-mp3

# Set the working directory inside the container
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY flask_api.py .
COPY manim_generator.py .
COPY r2_uploader.py .
COPY custom_google_tts.py .

# Create the output directory and ensure the app can write to it
RUN mkdir -p output && chmod 777 output


# Expose the port defined in flask_api.py
EXPOSE 5001

# --timeout 0 tells Gunicorn "Let Cloud Run handle the timeout"
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 flask_api:app