from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import google.generativeai as genai
import requests
import os

# 🔑 Configure Gemini API Key
GEMINI_API_KEY = os.getenv("AIzaSyDMNSRYMh4RJbn-iOo0r_eAq40j43u8B6s", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="."), name="static")

# Serve index.html at root
@app.get("/")
async def serve_home():
    return FileResponse("index.html")

# 📩 Models
class ChatIn(BaseModel):
    message: str
    language: str = "en"

class ChatOut(BaseModel):
    answer: str

# 💬 Chat
@app.post("/chat", response_model=ChatOut)
async def chat(payload: ChatIn):
    prompt = f"""
    You are 🌱 Kalpataru, an AI Farming Assistant.
    The farmer is asking in {payload.language}:
    "{payload.message}"

    Please answer with:
    - ✅ Crop/Tree requirements
    - 🌱 Growth timeline
    - 🍂 If disease-related → suggest natural remedies
    - 🌦 If weather-related → include 10-day advice
    - 🗣 Answer in the same language as the farmer
    - Keep response simple and farmer-friendly
    """

    # Weather API
    weather_data = ""
    if any(word in payload.message.lower() for word in ["weather", "rain", "temperature", "climate", "forecast"]):
        weather_url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": 52.52,
            "longitude": 13.41,
            "hourly": "temperature_2m,precipitation,precipitation_probability",
            "forecast_days": 10
        }
        try:
            res = requests.get(weather_url, params=params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                temp = data["hourly"]["temperature_2m"][:24]
                avg_temp = sum(temp) / len(temp)
                weather_data = f"\n🌦 Weather update: Avg next 24h temp {avg_temp:.1f}°C."
        except:
            weather_data = "\n⚠️ Weather API unavailable."

    # Gemini
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt + weather_data)
    return {"answer": response.text}

# 🌿 Disease Diagnosis
@app.post("/diagnose")
async def diagnose(file: UploadFile = File(...)):
    model = genai.GenerativeModel("gemini-1.5-pro-vision")
    img = file.file.read()
    response = model.generate_content(
        [
            "You are a plant disease expert. Diagnose the crop/tree and suggest natural remedies (use bullet points).",
            {"mime_type": file.content_type, "data": img}
        ]
    )
    return {"disease_report": response.text}
