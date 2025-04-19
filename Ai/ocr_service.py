#!/usr/bin/env python
# coding: utf-8

# In[ ]:


import pytesseract
from PIL import Image
import cv2
import numpy as np
from flask import Flask, request, jsonify
import time
import os

app = Flask(__name__)

# Simulated database for registered users (to be replaced with MongoDB)
registered_users = set()

def assess_image_quality(image):
    """Assess if the ID image is readable for OCR."""
    # Convert to grayscale and calculate Laplacian variance for sharpness
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Basic quality thresholds
    if laplacian_var < 100:  # Low sharpness
        return False, "Low quality image: blurry"
    return True, None

def perform_ocr(image_path):
    """Perform OCR and return extracted data with confidence."""
    try:
        # Load and preprocess image
        image = cv2.imread(image_path)
        if image is None:
            return None, "Failed to load image"
        
        # Quality check
        is_readable, error = assess_image_quality(image)
        if not is_readable:
            return None, error
        
        # Perform OCR
        result = pytesseract.image_to_data(Image.fromarray(image), output_type=pytesseract.Output.DICT)
        
        # Calculate average confidence for detected text
        confidences = [float(conf) for conf in result['conf'] if conf != '-1']
        if not confidences:
            return None, "No text detected"
        
        avg_confidence = sum(confidences) / len(confidences) / 100  # Normalize to 0-1
        fields = {
            "name": "",  # Simplified: actual field extraction depends on ID format
            "idNumber": ""
        }
        
        return {"fields": fields, "confidence": avg_confidence}, None
    except Exception as e:
        return None, f"OCR processing error: {str(e)}"

@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    start_time = time.time()
    
    # Check for two ID images
    if 'id_front' not in request.files or 'id_back' not in request.files:
        return jsonify({"error": "Missing ID images"}), 400
    
    id_front = request.files['id_front']
    id_back = request.files['id_back']
    
    # Save images temporarily
    front_path = f"/tmp/id_front_{id_front.filename}"
    back_path = f"/tmp/id_back_{id_back.filename}"
    id_front.save(front_path)
    id_back.save(back_path)
    
    # Process front image (main ID data)
    result, error = perform_ocr(front_path)
    
    # Clean up
    os.remove(front_path)
    os.remove(back_path)
    
    if error:
        return jsonify({"error": error}), 400
    
    response_time = time.time() - start_time
    print(f"OCR response time: {response_time:.2f}s")
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)

