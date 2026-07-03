import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

FRONTEND = ROOT / "frontend"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "180"))


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[dict[str, str]] = Field(default_factory=list)
    context: str = Field(default="", max_length=12000)


app = FastAPI(title="MODE — Tienda de moda")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/assets", StaticFiles(directory=FRONTEND), name="assets")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND / "index.html")


@app.get("/sitemap.xml")
def sitemap() -> FileResponse:
    return FileResponse(FRONTEND / "sitemap.xml")


@app.get("/robots.txt")
def robots() -> FileResponse:
    return FileResponse(FRONTEND / "robots.txt")


@app.post("/api/ai/chat")
def ai_chat(payload: ChatIn, token: str = Query("")) -> dict:
    history_lines = []
    for item in (payload.history or [])[-12:]:
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if not content:
            continue
        if role not in ("user", "assistant"):
            role = "user"
        history_lines.append(f"{role}: {content}")

    prompt = "Eres asesor de moda de una tienda online. Responde en español, breve y útil. Recomienda solo productos del catálogo si encajan."
    if history_lines:
        prompt += "\n\nHistorial reciente de conversación:\n" + "\n".join(history_lines)
    if payload.context.strip():
        prompt += f"\n\nContexto interno para analizar la tienda:\n{payload.context.strip()}"
    prompt += f"\n\nContexto del catálogo:\n{payload.context.strip() or 'Sin contexto adicional'}\n\nPregunta del usuario: {payload.message}"
    fallback = "Ahora mismo puedo ayudarte con chaquetas, camisetas, zapatos, pantalones y accesorios. Dime talla, color, presupuesto y ocasión para recomendarte una opción."

    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/generate",
            data=json.dumps({"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"num_predict": 500}}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as res:
            data = json.loads(res.read().decode())
        return {"response": data.get("response", fallback), "model": OLLAMA_MODEL}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return {"response": fallback, "model": "fallback"}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "shop": "MODE Clothing Store"}


@app.get("/{path:path}", response_model=None)
def spa(path: str):
    if path.startswith("api/") or path.startswith("assets/") or path in ("sitemap.xml", "robots.txt"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    return FileResponse(FRONTEND / "index.html")
