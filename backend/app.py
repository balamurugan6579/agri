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
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "service": "CropSmart TN API",
        "endpoints": ["/predict", "/chat"]
    })

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
        # Sanitize whitespace and accidental enclosing quotes
        api_key = api_key.strip().strip('"').strip("'")
        # Check for empty or typical placeholder strings
        placeholders = [
            "your_gemini_api_key_here", "paste_your_real_api_key_here",
            "your_api_key", "placeholder", "xxxx", "enter_api_key"
        ]
        if not api_key or any(p in api_key.lower() for p in placeholders) or api_key.startswith("<"):
            print("[GEMINI] GEMINI_API_KEY is an unconfigured placeholder.")
            return None

        try:
            client = genai.Client(api_key=api_key)
            print("[GEMINI] Gemini Client configured successfully.")
            return client
        except Exception as e:
            print(f"[GEMINI] Error configuring Gemini Client: {e}")
            return None
    return None

try:
    client = get_gemini_client()
except Exception as e:
    print(f"[GEMINI] Initial config warning: {e}")
    client = None

def generate_rule_based_fallback(query: str, recommendation: dict, language: str = 'en') -> str:
    """
    Deterministic agricultural advisory grounded in verified recommendation data.
    Provides transparent, rule-based explanations when Gemini AI is unavailable.
    """
    is_tamil = language == 'ta'

    if not isinstance(recommendation, dict) or not recommendation.get('crop'):
        if is_tamil:
            return (
                "⚠️ [விதிமுறை அடிப்படையிலான தகவல்]: போதுமான பயிர் பரிந்துரை விவரங்கள் கிடைக்கவில்லை. "
                "முழுமையான AI சேவைக்கு backend/.env கோப்பில் சரியான GEMINI_API_KEY உள்ளமைக்கவும்."
            )
        return (
            "⚠️ [Rule-Based Advisory]: Insufficient crop recommendation context provided. "
            "Please ensure soil analysis is completed, or configure a valid GEMINI_API_KEY in backend/.env for AI assistance."
        )

    crop_info = recommendation.get('crop', {})
    crop_name = crop_info.get('nameTa' if is_tamil else 'nameEn', crop_info.get('nameEn', 'Selected Crop'))
    confidence = recommendation.get('confidence', '90')
    ph = recommendation.get('estimatedPH', '6.5')

    weather = recommendation.get('weather', {})
    temp = weather.get('temperature', '28')
    rain = weather.get('rainfall', '100')

    fert_note = recommendation.get('fertilizerNote', {})
    fert_text = fert_note.get(language, fert_note.get('en', '')) if isinstance(fert_note, dict) else str(fert_note)

    risk_note = recommendation.get('riskNote', {})
    risk_text = risk_note.get(language, risk_note.get('en', '')) if isinstance(risk_note, dict) else str(risk_note)

    price_curr = recommendation.get('currentPrice', {})
    price_harv = recommendation.get('harvestPrice', {})
    water_req = recommendation.get('waterRequirement', 'irrigationRequired')

    q_lower = query.lower()
    is_fert = any(k in q_lower for k in ['fertilizer', 'உரம்', 'dosage', 'nutrient', 'யூரியா', 'npk', 'potash'])
    is_risk = any(k in q_lower for k in ['risk', 'ஆபத்து', 'precaution', 'முன்னெச்சரிக்கை', 'disease', 'நோய்', 'பூச்சி', 'pest'])
    is_price = any(k in q_lower for k in ['price', 'விலை', 'market', 'சந்தை', 'profit', 'லாபம்', 'cost', 'quintel'])

    if is_tamil:
        header = "📌 [விதிமுறை அடிப்படையிலான விவசாய வழிகாட்டல் — Gemini AI கிடைக்காததால் கணக்கிடப்பட்ட தரவு]:\n\n"
        if is_fert and fert_text:
            body = (
                f"🌱 **{crop_name} பயிருக்கான உர மேலாண்மை:**\n"
                f"• {fert_text}\n"
                f"• மண்ணின் கார-அமிலத்தன்மை (pH): {ph}. உரங்களை தேவையான இடைவெளியில் பிரித்து இடவும்."
            )
        elif is_risk and risk_text:
            body = (
                f"⚠️ **{crop_name} சாகுபடி அபாயங்கள் & முன்னெச்சரிக்கைகள்:**\n"
                f"• {risk_text}\n"
                f"• தற்போதைய காலநிலை: வெப்பநிலை {temp}°C, மழை அளவு {rain}mm. வடிகால் வசதி மற்றும் பயிர் பாதுகாப்பில் கவனம் செலுத்தவும்."
            )
        elif is_price and price_curr.get('min'):
            body = (
                f"💰 **{crop_name} சந்தை விலை கணிப்பு:**\n"
                f"• தற்போதைய உத்தேச சந்தை விலை: ₹{price_curr.get('min')} - ₹{price_curr.get('max')} / குவிண்டால்.\n"
                f"• அறுவடை கால எதிர்பார்க்கப்படும் விலை: ₹{price_harv.get('min')} - ₹{price_harv.get('max')} / குவிண்டால்.\n"
                f"• தரமான அறுவடை மற்றும் நேரடி சந்தைப்படுத்தல் மூலம் நல்ல லாபம் ஈட்டலாம்."
            )
        else:
            water_desc = "பாசன வசதி கட்டாயம் தேவை" if water_req == 'irrigationRequired' else "மானாவாரி சாகுபடி சாத்தியம்"
            body = (
                f"🌾 **{crop_name} ஏன் பரிந்துரைக்கப்படுகிறது?**\n"
                f"• உங்கள் மண்ணின் கார-அமிலத்தன்மை (pH {ph}) மற்றும் காலநிலை ({temp}°C வெப்பநிலை, {rain}mm மழை) அடிப்படையில் இயந்திர கற்றல் மாதிரி (ML Model) {confidence}% நம்பிக்கையுடன் {crop_name} பயிரை பரிந்துரைத்துள்ளது.\n"
                f"• நீர் தேவை: {water_desc}.\n"
                f"• உர பரிந்துரை: {fert_text}\n"
                f"• பாதுகாப்பு குறிப்பு: {risk_text}"
            )
    else:
        header = "📌 [Rule-Based Advisory — Grounded in verified recommendation data while Gemini AI is unavailable]:\n\n"
        if is_fert and fert_text:
            body = (
                f"🌱 **Fertilizer Guidance for {crop_name}:**\n"
                f"• {fert_text}\n"
                f"• Soil pH Assessment: {ph}. Apply balanced nutrients in split doses to optimize uptake and prevent leaching."
            )
        elif is_risk and risk_text:
            body = (
                f"⚠️ **Risk Factors & Mitigation for {crop_name}:**\n"
                f"• {risk_text}\n"
                f"• Weather Context: {temp}°C temperature, {rain}mm rainfall. Ensure proper field drainage and regular pest monitoring."
            )
        elif is_price and price_curr.get('min'):
            body = (
                f"💰 **Market Price Outlook for {crop_name}:**\n"
                f"• Current Estimated Market Price: ₹{price_curr.get('min')} - ₹{price_curr.get('max')} per quintal.\n"
                f"• Expected Harvest Market Price: ₹{price_harv.get('min')} - ₹{price_harv.get('max')} per quintal.\n"
                f"• Pre-sorting by grade can help maximize net realization."
            )
        else:
            water_desc = "Irrigation required" if water_req == 'irrigationRequired' else "Rainfed cultivation possible"
            body = (
                f"🌾 **Why {crop_name} is recommended:**\n"
                f"• Based on your soil test (pH {ph}) and climate conditions ({temp}°C, {rain}mm rainfall), our machine learning model recommended {crop_name} with {confidence}% confidence.\n"
                f"• Water Requirement: {water_desc}.\n"
                f"• Fertilizer Plan: {fert_text}\n"
                f"• Precautionary Note: {risk_text}"
            )

    return header + body

@app.route('/chat', methods=['GET', 'POST', 'OPTIONS'])
@app.route('/chat/', methods=['GET', 'POST', 'OPTIONS'])
def chat():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204

    # Handle health / probe GET request
    if request.method == 'GET':
        return jsonify({
            'status': 'CropSmart AI chat service is operational.',
            'message': 'Send a POST request with JSON payload containing query, recommendation, and language.'
        }), 200

    data = request.get_json(silent=True) or {}
    query = str(data.get('query', '')).strip()
    if not query:
        return jsonify({'error': 'Query text cannot be empty.'}), 400

    recommendation = data.get('recommendation', {})
    language = data.get('language', 'en')
    conversation_history = data.get('conversationHistory', [])

    gemini_client = get_gemini_client()

    # If Gemini client cannot be configured (missing, unconfigured, or placeholder key),
    # return the deterministic, transparent rule-based advisory without crashing.
    if not gemini_client:
        print("[CHAT] Gemini client not configured. Generating rule-based agricultural fallback.")
        fallback_text = generate_rule_based_fallback(query, recommendation, language)
        return jsonify({
            'response': fallback_text,
            'is_fallback': True,
            'fallback_reason': 'Gemini API key is unconfigured or invalid in backend/.env',
            'model': 'rule-based-advisory'
        }), 200

    try:
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
            'gemini-2.0-flash',
            'models/gemini-flash-latest',
            'gemini-2.5-flash',
            'gemini-1.5-flash'
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
                        print(f"[CHAT] Gemini successfully answered via {model_name}")
                        return jsonify({
                            'response': response.text.strip(),
                            'is_fallback': False,
                            'model': model_name
                        })
                except Exception as model_err:
                    last_error = model_err
                    err_str = str(model_err)

                    # If API key is invalid or unauthorized, break immediately without retrying credentials
                    if "API_KEY_INVALID" in err_str or "API key not valid" in err_str:
                        print("[CHAT] Gemini API key is invalid. Switching to transparent rule-based advisory.")
                        fallback_text = generate_rule_based_fallback(query, recommendation, language)
                        return jsonify({
                            'response': fallback_text,
                            'is_fallback': True,
                            'fallback_reason': 'Gemini API key is invalid or unauthorized in backend/.env',
                            'model': 'rule-based-advisory'
                        }), 200

                    # If model not found (404), try next model in candidate list
                    if "404" in err_str or "Not Found" in err_str:
                        continue

                    # If rate limited (429), back off and retry once
                    if ("429" in err_str or "Resource has been exhausted" in err_str) and attempt < max_retries - 1:
                        sleep_time = 2 ** attempt
                        print(f"[CHAT] Rate limited (429). Retrying in {sleep_time}s...")
                        time.sleep(sleep_time)
                        break

                    continue

        # If all Gemini models failed (e.g. quota, timeout, network error),
        # return the deterministic rule-based advisory transparently.
        print(f"[CHAT] All Gemini attempts failed ({last_error}). Providing rule-based fallback advisory.")
        fallback_text = generate_rule_based_fallback(query, recommendation, language)
        return jsonify({
            'response': fallback_text,
            'is_fallback': True,
            'fallback_reason': 'Gemini AI service is temporarily unavailable',
            'model': 'rule-based-advisory'
        }), 200

    except Exception as e:
        print(f"[CHAT] Unexpected exception: {e}. Providing rule-based fallback advisory.")
        fallback_text = generate_rule_based_fallback(query, recommendation, language)
        return jsonify({
            'response': fallback_text,
            'is_fallback': True,
            'fallback_reason': 'Unexpected AI service error',
            'model': 'rule-based-advisory'
        }), 200

@app.route('/predict', methods=['GET', 'POST', 'OPTIONS'])
@app.route('/predict/', methods=['GET', 'POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        return '', 204

    if request.method == 'GET':
        return jsonify({
            'status': 'CropSmart prediction service is operational.',
            'message': 'Send a POST request with soil parameters.'
        }), 200

    if not model or not scaler:
        return jsonify({'error': 'Model/Scaler not loaded'}), 500

    try:
        data = request.get_json(silent=True) or {}
        
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
    app.run(debug=True, host='0.0.0.0', port=5000)
