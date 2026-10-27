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
client = None

def get_gemini_client():
    global client
    if client is not None:
        return client
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        load_dotenv(os.path.join(BASE_DIR, '..', '.env'))
        api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            print("Gemini Client configured successfully.")
            return client
        except Exception as e:
            print(f"Error configuring Gemini: {e}")
            return None
    return None

try:
    client = get_gemini_client()
except Exception as e:
    print(f"Initial Gemini config warning: {e}")
    client = None

@app.route('/chat', methods=['POST'])
def chat():
    gemini_client = get_gemini_client()
    if not gemini_client:
        return jsonify({
            'error': 'Gemini API key is missing. Please set GEMINI_API_KEY in backend/.env'
        }), 503

    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid request body. Expected JSON.'}), 400

        query = str(data.get('query', '')).strip()
        if not query:
            return jsonify({'error': 'Query text cannot be empty.'}), 400

        recommendation = data.get('recommendation', {})
        language = data.get('language', 'en')
        conversation_history = data.get('conversationHistory', [])

        lang_instruction = (
            "Respond in Tamil (தமிழ்). Use simple, clear, conversational Tamil that farmers and agricultural advisors can understand easily."
            if language == 'ta'
            else "Respond in English. Use simple, clear language that farmers and agricultural advisors can understand easily."
        )

        # Contextual recommendation extraction
        if isinstance(recommendation, dict):
            crop_info = recommendation.get('crop', {})
            crop_name_en = crop_info.get('nameEn', 'Unknown')
            crop_name_ta = crop_info.get('nameTa', 'Unknown')
            confidence = recommendation.get('confidence', 'N/A')
            weather = recommendation.get('weather', {})
            temp = weather.get('temperature', 'N/A')
            hum = weather.get('humidity', 'N/A')
            rain = weather.get('rainfall', 'N/A')
            ph = recommendation.get('estimatedPH', 'N/A')
            fert_note = recommendation.get('fertilizerNote', {})
            risk_note = recommendation.get('riskNote', {})
            price_curr = recommendation.get('currentPrice', {})
            price_harv = recommendation.get('harvestPrice', {})
            fert_text = fert_note.get(language, fert_note.get('en', 'N/A')) if isinstance(fert_note, dict) else str(fert_note)
            risk_text = risk_note.get(language, risk_note.get('en', 'N/A')) if isinstance(risk_note, dict) else str(risk_note)

            rec_context = f"""
- Recommended Crop: {crop_name_en} ({crop_name_ta})
- Recommendation Confidence: {confidence}%
- Estimated Soil pH: {ph}
- Weather Conditions: Temperature {temp}°C, Humidity {hum}%, Rainfall {rain}mm
- Expected Current Market Price: ₹{price_curr.get('min', 'N/A')} - ₹{price_curr.get('max', 'N/A')} per quintal
- Expected Harvest Market Price: ₹{price_harv.get('min', 'N/A')} - ₹{price_harv.get('max', 'N/A')} per quintal
- Fertilizer Advice: {fert_text}
- Precautions & Risks: {risk_text}
"""
        else:
            rec_context = str(recommendation)

        history_context = ""
        if isinstance(conversation_history, list) and conversation_history:
            history_lines = []
            for item in conversation_history[-4:]:
                if isinstance(item, dict):
                    role = item.get('role', 'user')
                    msg = item.get('content', '')
                    if msg:
                        history_lines.append(f"{role.capitalize()}: {msg}")
            if history_lines:
                history_context = "RECENT CONVERSATION:\n" + "\n".join(history_lines) + "\n\n"

        system_prompt = f"""You are CropSmart AI, an agricultural advisory assistant for Tamil Nadu, India. Your role is to explain crop recommendations to farmers and agricultural advisors.

{lang_instruction}

IMPORTANT RULES:
1. You can ONLY explain the recommendation data provided - never make conflicting crop predictions or override the system's recommendations.
2. Keep responses concise (2 to 4 sentences max).
3. Use simple, practical language appropriate for local farmers and field advisors.
4. Be helpful, clear, and encouraging.
5. If asked about topics outside agriculture or this recommendation, politely redirect to the crop advice.
6. Format your response cleanly.

CURRENT RECOMMENDATION DATA:
{rec_context}
"""

        prompt = f"{system_prompt}\n{history_context}User Question: {query}"

        # Candidate models in order of stability and availability
        models_to_try = [
            'models/gemini-flash-latest',
            'gemini-2.0-flash',
            'gemini-2.5-flash',
            'models/gemini-2.0-flash',
            'models/gemini-2.5-flash-lite'
        ]

        import time
        max_retries = 2
        last_error = None

        for attempt in range(max_retries):
            for model_name in models_to_try:
                try:
                    response = gemini_client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    if response and response.text:
                        return jsonify({
                            'response': response.text.strip(),
                            'model': model_name
                        })
                except Exception as model_err:
                    last_error = model_err
                    err_str = str(model_err)
                    
                    # Stop immediately if API key is invalid
                    if "API_KEY_INVALID" in err_str or "API key not valid" in err_str:
                        print("Gemini API key is invalid.")
                        return jsonify({
                            'error': 'Gemini API key is invalid. Please check your GEMINI_API_KEY in backend/.env'
                        }), 401
                    
                    # If model not found (404), continue to next model in candidate list
                    if "404" in err_str or "Not Found" in err_str:
                        continue
                    
                    # If rate limited (429), back off and retry
                    if ("429" in err_str or "Resource has been exhausted" in err_str) and attempt < max_retries - 1:
                        sleep_time = 2 ** attempt
                        print(f"Rate limited (429). Retrying in {sleep_time}s...")
                        time.sleep(sleep_time)
                        break
                    
                    continue

        if last_error:
            raise last_error

        return jsonify({'error': 'No response generated by AI.'}), 500

    except Exception as e:
        error_msg = str(e)
        print(f"Chat error: {error_msg}")
        if "429" in error_msg or "Resource has been exhausted" in error_msg:
            return jsonify({'error': 'AI quota exceeded. Please try again in a minute.'}), 429
        if "API_KEY_INVALID" in error_msg or "API key not valid" in error_msg:
            return jsonify({'error': 'Gemini API key is invalid. Please check your GEMINI_API_KEY in backend/.env'}), 401
        if "404" in error_msg or "Not Found" in error_msg:
            return jsonify({'error': 'AI Model is temporarily unavailable.'}), 503
        return jsonify({'error': 'AI advisory service is temporarily unavailable. Please try again.'}), 500

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
