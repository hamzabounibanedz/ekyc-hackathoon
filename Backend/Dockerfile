FROM python:3.9-slim

WORKDIR /app

Install system dependencies

RUN apt-get update && apt-get install -y 
tesseract-ocr 
libtesseract-dev 
libopencv-dev 
&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt . RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001 5002

CMD ["python", "ocr_service.py"]
