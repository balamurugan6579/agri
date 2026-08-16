
import requests
import json

try:
    print("Testing /chat endpoint...")
    resp = requests.post("http://localhost:5000/chat", json={
        "query": "hello", 
        "recommendation": "Mock recommendation regarding banana crop.", 
        "language": "en"
    })
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
