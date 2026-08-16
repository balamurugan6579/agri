
import os
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    print("Available models (names only):")
    count = 0
    for m in client.models.list():
        print(m.name)
        count += 1
        if count >= 10: break
except Exception as e:
    print(e)
