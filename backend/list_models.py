
import os
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    print("Listing models containing 'flash':")
    for m in client.models.list():
        if 'flash' in m.name:
            print(m.name)
except Exception as e:
    print(e)
