#!/usr/bin/env python
# coding: utf-8

# In[ ]:


from deepface import DeepFace
from flask import Flask, request, jsonify
import time
import os
import cv2

app = Flask(__name__)

# Simulated blacklist and registered users (to be replaced with MongoDB)
blacklist = set(["blacklist_face1.jpg", "blacklist_face2.jpg"])  # Placeholder file names
registered_users = set()  # Tracks registered user IDs

def is_blacklisted(image_path):
    """Check if the face is in the blacklist."""
    for blacklisted_face in blacklist:
        try:
            result = DeepFace.verify(img1_path=image_path, img2_path=f"/blacklist/{blacklisted_face}", enforce_detection=True)
            if result["verified"]:
                return True
        except:
            continue
    return False

def verify_user_not_registered(selfie_path, user_id):
    """Check if the user is already registered (simplified)."""
    # In a real system, compare against stored face embeddings
    return user_id not in registered_users

@app.route('/match', methods=['POST'])
def face_match_endpoint():
    start_time = time.time()
    
    # Check for selfie and ID image
    if 'selfie' not in request.files or 'id_image' not in request.files or 'user_id' not in request.form:
        return jsonify({"error": "Missing selfie, ID image, or user_id"}), 400
    
    selfie = request.files['selfie']
    id_image = request.files['id_image']
    user_id = request.form['user_id']
    
    # Save images temporarily
    selfie_path = f"/tmp/selfie_{selfie.filename}"
    id_path = f"/tmp/id_{id_image.filename}"
    selfie.save(selfie_path)
    id_image.save(id_path)
    
    try:
        # Check if user is already registered
        if not verify_user_not_registered(selfie_path, user_id):
            os.remove(selfie_path)
            os.remove(id_path)
            return jsonify({"error": "User already registered"}), 400
        
        # Check blacklist
        if is_blacklisted(selfie_path):
            os.remove(selfie_path)
            os.remove(id_path)
            return jsonify({"error": "User is blacklisted"}), 400
        
        # Perform face matching
        result = DeepFace.verify(img1_path=selfie_path, img2_path=id_path, enforce_detection=True)
        match_score = result["distance"]  # Lower distance means better match
        normalized_score = max(0, 1 - match_score / 0.6)  # Normalize to 0-1 (tuned threshold)
        
        # Approve selfie if match is good
        if normalized_score >= 0.8:
            registered_users.add(user_id)  # Mark as registered
        
        response_time = time.time() - start_time
        print(f"Face match response time: {response_time:.2f}s")
        
        # Clean up
        os.remove(selfie_path)
        os.remove(id_path)
        
        return jsonify({"matchScore": normalized_score})
    except Exception as e:
        os.remove(selfie_path)
        os.remove(id_path)
        return jsonify({"error": f"Face match error: {str(e)}"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)

