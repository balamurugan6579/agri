
import os
from dotenv import load_dotenv
from google import genai
import sys

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)
    
    print("Testing 'gemini-2.0-flash'...")
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents="Hello"
        )
        print("Success without prefix!")
        print(response.text)
    except Exception as e:
        print(f"Failed without prefix: {e}")

    print("\nTesting 'models/gemini-2.0-flash'...")
    try:
        response = client.models.generate_content(
            model='models/gemini-2.0-flash',
            contents="Hello"
        )
        print("Success with prefix!")
        print(response.text)
    except Exception as e:
        print(f"Failed with prefix: {e}")

else:
    print("No API Key")
