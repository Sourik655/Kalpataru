from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

# 🔑 Configure Gemini API Key
GEMINI_API_KEY = "AIzaSyDMNSRYMh4RJbn-iOo0r_eAq40j43u8B6s"
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

    Please answer clearly in short farmer-friendly sentences.
    - Use bullets only when absolutely needed (like remedies or step lists).
    - Do not use unnecessary *, - or symbols.
    - Keep response easy to understand.
    - Reply in the same language as the farmer.
    """
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return {"answer": response.text}

# 🌿 Disease Diagnosis
@app.post("/diagnose")
async def diagnose(file: UploadFile = File(...)):
    model = genai.GenerativeModel("gemini-1.5-pro-vision")
    img = file.file.read()
    response = model.generate_content(
        [
            "You are a plant disease expert. Diagnose the crop/tree and suggest natural remedies in short sentences. Use simple bullets only if necessary. Avoid *, - or decorative symbols.",
            {"mime_type": file.content_type, "data": img}
        ]
    )
    return {"disease_report": response.text}
