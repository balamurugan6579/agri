
import os
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    print("Testing 'gemini-2.0-flash-lite'...")
    response = client.models.generate_content(
        model='gemini-2.0-flash-lite-001', # Using specific version from list
        contents="Hello"
    )
    print("Success!")
    print(response.text)
except Exception as e:
    print(f"Failed: {e}")
