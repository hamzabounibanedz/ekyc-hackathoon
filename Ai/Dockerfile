FROM python:3.9-slim
WORKDIR /app

# 1) System deps
RUN apt-get update && \
    apt-get install -y \
      tesseract-ocr \
      libtesseract-dev \
      libopencv-dev && \
    rm -rf /var/lib/apt/lists/*

# 2) Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3) Service code
COPY . .

# 4) Ports
EXPOSE 5001 5002

# Default (OCR); overridden for face_match
CMD ["python", "ocr_service.py"]