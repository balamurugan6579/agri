
import os
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    print("Checking for gemini-1.5-flash models...")
    all_models = [m.name for m in client.models.list()]
    flash_models = [m for m in all_models if '1.5-flash' in m] 
    print(flash_models)
except Exception as e:
    print(e)
