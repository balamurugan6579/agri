
import os
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    print("Available models:")
    count = 0
    for m in client.models.list():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
            count += 1
            if count >= 10: break # Only show first 10 to avoid truncation
except Exception as e:
    print(e)
