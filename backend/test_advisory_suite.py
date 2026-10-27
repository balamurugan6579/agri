import unittest
import json
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app, generate_rule_based_fallback

class TestChatAndAdvisory(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.sample_rec = {
            "crop": {
                "id": "banana",
                "nameEn": "Banana",
                "nameTa": "வாழை",
                "icon": "🍌"
            },
            "confidence": 95,
            "confidenceLevel": "high",
            "weatherSuitability": "suitable",
            "soilSuitability": "suitable",
            "currentPrice": {"min": 2500, "max": 3100},
            "harvestPrice": {"min": 2900, "max": 3500},
            "fertilizerNote": {
                "en": "Apply 110g Nitrogen, 35g Phosphorus, 330g Potassium per plant in split applications.",
                "ta": "ஒரு செடிக்கு 110 கிராம் தழைச்சத்து, 35 கிராம் மணிச்சத்து, 330 கிராம் சாம்பல் சத்து இடவும்."
            },
            "riskNote": {
                "en": "Susceptible to Panama wilt and sigatoka leaf spot during high moisture.",
                "ta": "அதிக ஈரப்பதம் இருக்கும்போது பனாமா வாடல் மற்றும் இலைப்புள்ளி நோய் தாக்க வாய்ப்புள்ளது."
            },
            "waterRequirement": "irrigationRequired",
            "weather": {
                "temperature": 26,
                "humidity": 65,
                "rainfall": 5
            },
            "estimatedPH": 5.0
        }

    def test_01_empty_query_rejected(self):
        """Empty query must return HTTP 400"""
        res = self.client.post('/chat', json={"query": ""})
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.get_json())

    def test_02_get_probe_returns_200(self):
        """GET /chat probe returns 200 without 405"""
        res = self.client.get('/chat')
        self.assertEqual(res.status_code, 200)

    def test_03_options_preflight_returns_204(self):
        """OPTIONS /chat preflight returns 204"""
        res = self.client.options('/chat')
        self.assertEqual(res.status_code, 204)

    def test_04_rule_based_fallback_english(self):
        """Rule-based fallback answers 'Why this crop?' in English"""
        text = generate_rule_based_fallback(
            "Why is Banana recommended for this soil (pH 5.0) and weather conditions (26°C, 5mm rainfall)?",
            self.sample_rec,
            language='en'
        )
        self.assertIn("Banana", text)
        self.assertIn("Rule-Based Advisory", text)
        self.assertIn("5.0", text)
        self.assertIn("26°C", text)

    def test_05_rule_based_fallback_tamil(self):
        """Rule-based fallback answers in Tamil"""
        text = generate_rule_based_fallback(
            "இந்த மண் (pH 5.0) மற்றும் வானிலைக்கு வாழை பயிர் ஏன் பரிந்துரைக்கப்படுகிறது?",
            self.sample_rec,
            language='ta'
        )
        self.assertIn("வாழை", text)
        self.assertIn("விதிமுறை அடிப்படையிலான", text)
        self.assertIn("5.0", text)

    def test_06_fertilizer_query(self):
        """Fertilizer queries return specific fertilizer notes"""
        text = generate_rule_based_fallback(
            "What fertilizer should I use for Banana?",
            self.sample_rec,
            language='en'
        )
        self.assertIn("Fertilizer Guidance", text)
        self.assertIn("Nitrogen", text)

    def test_07_price_query(self):
        """Price queries return verified price ranges"""
        text = generate_rule_based_fallback(
            "What is the expected market price for Banana?",
            self.sample_rec,
            language='en'
        )
        self.assertIn("2500", text)
        self.assertIn("3500", text)

    def test_08_chat_endpoint_fallback_execution(self):
        """When Gemini key is invalid/unconfigured, /chat returns transparent fallback with HTTP 200"""
        res = self.client.post('/chat', json={
            "query": "Why is Banana recommended for this soil (pH 5.0)?",
            "recommendation": self.sample_rec,
            "language": "en"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("is_fallback"))
        self.assertIn("Banana", data.get("response"))
        self.assertIn("Rule-Based", data.get("response"))

if __name__ == '__main__':
    unittest.main()
