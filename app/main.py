import json
import os
import re
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


def sanitize_ai_response(text: str) -> str:
    lines = []
    for raw_line in str(text or "").splitlines():
        line = raw_line.strip()
        if not line:
            lines.append("")
            continue
        line = re.sub(r"\s*\(?\s*(remember|recuerda|note|nota|rule|regla)[^\)]*\)?\s*", " ", line, flags=re.I)
        if not line.strip():
            continue
        if "respuesta final sin explicaciones" in line.lower() or "reglas del modelo" in line.lower():
            continue
        lines.append(line.rstrip())
    cleaned = "\n".join(lines).strip()
    return re.sub(r"\n{3,}", "\n\n", cleaned)


@app.post("/api/ai/chat")
def ai_chat(payload: ChatIn, token: str = Query("")) -> dict:
    normalized_message = payload.message.lower()
    table_task = any(word in normalized_message for word in ("tabla", "lista", "muestra", "muéstrame", "muestreme", "catálogo", "catalogo"))
    prompt = (
        "MODE_AI_V1\n"
        "ROLE=asistente_catalogo\n"
        "STYLE=directo|breve|sin_saludo|sin_intro\n"
        "RULES=usa_solo_contexto;si_piden_tabla_devuelve_markdown;si_el_contexto_incluye_BUSINESS_responde_como_analista;si_no_hay_datos_dilo_breve;no_asumas_cliente;no_inventes_precios;no_inventes_moneda;responde_en_espanol\n"
        "FORMAT=respuesta_final\n"
    )
    if table_task:
        prompt += "TASK=si_hay_datos_devuelve_solo_tabla_markdown_sin_texto_extra\n"
    if payload.context.strip():
        prompt += f"\nCONTEXT=\n{payload.context.strip()}\n"
    prompt += f"QUESTION= {payload.message}"
    fallback = "Ahora mismo puedo ayudarte con chaquetas, camisetas, zapatos, pantalones y accesorios. Dime talla, color, presupuesto y ocasión para recomendarte una opción."

    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/generate",
            data=json.dumps({"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"num_predict": 500}}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as res:
            data = json.loads(res.read().decode())
        return {"response": sanitize_ai_response(data.get("response", fallback)), "model": OLLAMA_MODEL}
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
