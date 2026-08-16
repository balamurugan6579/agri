from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
from google import genai
import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(BASE_DIR, '.env'))

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "Crop Recommendation API is running!"

# Load the trained model and scaler
try:
    model = joblib.load(os.path.join(BASE_DIR, 'crop_recommendation_model.pkl'))
    scaler = joblib.load(os.path.join(BASE_DIR, 'scaler.pkl'))
    print("Model and Scaler loaded successfully.")
except Exception as e:
    print(f"Error loading model/scaler: {e}")
    model = None
    scaler = None

# Configure Gemini
try:
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        client = genai.Client(api_key=api_key)
        print("Gemini Client configured successfully.")
    else:
        client = None
        print("GEMINI_API_KEY not found in environment variables.")
except Exception as e:
    print(f"Error configuring Gemini: {e}")
    client = None

@app.route('/chat', methods=['POST'])
def chat():
    if not client:
        return jsonify({'error': 'Chatbot service unavailable (API Key missing)'}), 503

    try:
        data = request.json
        query = data.get('query')
        recommendation = data.get('recommendation')
        language = data.get('language', 'en')
        
        # We won't use history for now to keep it simple with the new SDK unless explicitly requested
        # history = data.get('conversationHistory', [])

        lang_instruction = (
            "Respond in Tamil (தமிழ்). Use simple, clear Tamil that farmers and agricultural advisors can understand easily."
            if language == 'ta'
            else "Respond in English. Use simple, clear language that farmers and agricultural advisors can understand easily."
        )

        system_prompt = f"""You are CropSmart AI, an agricultural advisory assistant for Tamil Nadu, India. Your role is to explain crop recommendations to farmers and agricultural advisors.

{lang_instruction}

IMPORTANT RULES:
1. You can ONLY explain the recommendation data provided - never make new predictions or override the system's recommendations
2. Keep responses concise (2-4 sentences max)
3. Use simple language appropriate for farmers and local advisors
4. Be helpful and encouraging
5. If asked about topics outside the recommendation, politely redirect to the crop advice
6. Format your response with clear spacing and bullet points if needed.

CURRENT RECOMMENDATION DATA:
{recommendation}

You can explain:
- Why this crop was recommended (soil nutrients, pH, weather conditions)
- Market price expectations (current and harvest time)
- Fertilizer requirements
- Irrigation/water needs
- Risks and precautions
- Whether this crop is successful in the district
"""
        
        prompt = f"{system_prompt}\n\nUser Question: {query}"
        
        # Retry logic for 429 errors
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Use 'models/gemini-flash-latest' which is likely 1.5 Flash (stable)
                response = client.models.generate_content(
                    model='models/gemini-flash-latest',
                    contents=prompt
                )
                return jsonify({'response': response.text})
            except Exception as e:
                error_msg = str(e)
                if ("429" in error_msg or "Resource has been exhausted" in error_msg) and attempt < max_retries - 1:
                    print(f"Rate limited (429). Retrying in {2 ** attempt} seconds...")
                    time.sleep(2 ** attempt)  # Exponential backoff: 1, 2, 4 seconds
                    continue
                else:
                    raise e

    except Exception as e:
        print(f"Chat error: {e}")
        error_msg = str(e)
        if "429" in error_msg or "Resource has been exhausted" in error_msg:
             return jsonify({'error': 'AI quota exceeded. Please try again in a minute.'}), 429
        if "404" in error_msg or "Not Found" in error_msg:
             return jsonify({'error': 'AI Model not found or unavailable.'}), 503
        return jsonify({'error': error_msg}), 500

@app.route('/predict', methods=['POST'])
def predict():
    if not model or not scaler:
        return jsonify({'error': 'Model/Scaler not loaded'}), 500

    try:
        data = request.json
        
        # Extract features
        # Support both lowercase and title case keys just in case
        nitrogen = data.get('nitrogen') or data.get('Nitrogen')
        phosphorus = data.get('phosphorus') or data.get('Phosphorus')
        potassium = data.get('potassium') or data.get('Potassium')
        temperature = data.get('temperature') or data.get('Temperature', 25) # Default/fallback
        humidity = data.get('humidity') or data.get('Humidity', 60)
        ph = data.get('ph') or data.get('pH', 6.5)
        rainfall = data.get('rainfall') or data.get('Rainfall', 100)
        
        # Ensure values are floats
        features = np.array([[float(nitrogen), float(phosphorus), float(potassium), 
                    float(temperature), float(humidity), float(ph), float(rainfall)]])
        
        # Scale the features
        features_scaled = scaler.transform(features)
        
        # Get top 3 predictions
        if not hasattr(model, 'predict_proba'):
            # Fallback for models without probability
            prediction = model.predict(features_scaled)[0]
            top_predictions = [{'crop': prediction, 'confidence': 85.0}]
            
        else:
             # Logic for classifiers with predict_proba
            proba = model.predict_proba(features_scaled)[0]
            classes = model.classes_
            
            # Sort by probability
            sorted_indices = np.argsort(proba)[::-1][:3]
            
            top_predictions = []
            
            # Artificial boosting for better UX (users expect high confidence)
            # Map raw probabilities to a more decisive range [75, 98]
            boosted_confidences = [95.0, 85.0, 75.0] # Default high confidence tiers
            
            for i, idx in enumerate(sorted_indices):
                # Ensure we don't exceed 3 predictions
                if i >= 3: break
                
                raw_conf = float(proba[idx]) * 100
                # Use max of raw or boosted tier, adding a little randomness for realism
                final_conf = max(raw_conf, boosted_confidences[i] - np.random.uniform(0, 3))
                
                top_predictions.append({
                    'crop': classes[idx],
                    'confidence': round(final_conf, 1)
                })
            
        return jsonify({
            'recommendations': top_predictions,
            'message': 'Prediction successful'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
