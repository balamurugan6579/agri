
import os
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
try:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    with open('backend/available_models.txt', 'w') as f:
        count = 0
        for m in client.models.list():
            f.write(m.name + '\n')
            count += 1
            if count >= 20: break
    print("Models written to file.")
except Exception as e:
    with open('backend/available_models.txt', 'w') as f:
        f.write(str(e))
    print(e)
