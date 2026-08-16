
import os
from dotenv import load_dotenv
from google import genai
import sys

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key found: {'Yes' if api_key else 'No'}")

if api_key:
    try:
        client = genai.Client(api_key=api_key)
        print("Gemini Client configured successfully.")
        
        print("\nAttempting generation with 'gemini-2.0-flash'...")
        try:
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents="Hello! Are you working?"
            )
            print("Response:", response.text)
        except Exception as e:
            if "429" in str(e) or "Resource has been exhausted" in str(e):
                print("Error: AI Quota Exceeded (429). Please wait a moment and try again.")
            else:
                print(f"Error generating content: {e}")
        
    except Exception as e:
        print("Error:", e)
else:
    print("Cannot test without API key. Check your .env file.")
