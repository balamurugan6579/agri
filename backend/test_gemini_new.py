
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
        
        print("\nAttempting generation with 'gemini-1.5-flash'...")
        try:
            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents="Hello"
            )
            print("Response:", response.text)
        except Exception as e:
            print(f"Error generating content: {e}")
            import traceback
            traceback.print_exc()

        print("\nListing available models...")
        models = client.models.list()
        for m in models:
            print(m.name)
        
    except Exception as e:
        print(f"Fatal Error: {e}")
        import traceback
        traceback.print_exc()
else:
    print("Cannot test without API key.")
