
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    models = genai.list_models()
    found = False
    for m in models:
        if '1.5-flash' in m.name:
            print(m.name)
            found = True
    if not found:
        print("No 1.5-flash found")
except Exception as e:
    print(e)
