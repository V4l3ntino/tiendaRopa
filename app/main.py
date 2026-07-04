import json
import os
import re
import threading
import time
import math
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from transformers import AutoTokenizer

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

FRONTEND = ROOT / "frontend"
AI_MODEL = os.getenv("DEEPINFRA_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo")
AI_ENDPOINT = os.getenv("DEEPINFRA_URL", "https://api.deepinfra.com/v1/openai/chat/completions").rstrip("/")
AI_TIMEOUT = int(os.getenv("DEEPINFRA_TIMEOUT", "180"))
AI_SPEND_LIMIT_EUR = float(os.getenv("AI_SPEND_LIMIT_EUR", "2"))
AI_INPUT_COST_PER_1M = float(os.getenv("AI_INPUT_COST_PER_1M_TOKENS_EUR", "0.02"))
AI_OUTPUT_COST_PER_1M = float(os.getenv("AI_OUTPUT_COST_PER_1M_TOKENS_EUR", "0.03"))
AI_MAX_COMPLETION_TOKENS = int(os.getenv("AI_MAX_COMPLETION_TOKENS", "500"))
DEEPINFRA_API_KEY = os.getenv("DEEPINFRA_API_KEY", "").strip()
HF_TOKEN = os.getenv("HUGGINGFACE_HUB_TOKEN", "").strip() or None
AI_USAGE_FILE = ROOT / "data" / "ai_usage.json"
AI_USAGE_FILE.parent.mkdir(exist_ok=True)
AI_USAGE_LOCK = threading.Lock()
TOKENIZER_LOCK = threading.Lock()
TOKENIZER_INSTANCE = None
TOKENIZER_LOADING = False

PUBLIC_SYSTEM_PROMPT = (
    "Eres el asistente de MODE. Responde en espanol, breve y directo. "
    "Usa solo el contexto proporcionado. Si piden una tabla, responde solo con markdown. "
    "No inventes precios, stock ni productos."
)

ADMIN_SYSTEM_PROMPT = (
    "Eres el analista interno de MODE. Responde en espanol, breve y directo. "
    "Usa solo el contexto proporcionado. Si piden una tabla, responde solo con markdown. "
    "Prioriza clientes, ingresos, productos, carritos y stock. No inventes datos."
)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[dict[str, str]] = Field(default_factory=list)
    context: str = Field(default="", max_length=12000)
    mode: str = Field(default="public", max_length=32)


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


def build_system_prompt(mode: str) -> str:
    return ADMIN_SYSTEM_PROMPT if mode == "admin" else PUBLIC_SYSTEM_PROMPT


def build_user_prompt(message: str, context: str) -> str:
    clean_context = context.strip() or "[sin contexto]"
    return f"QUESTION:\n{message.strip()}\n\nCONTEXT:\n{clean_context}"


def get_tokenizer():
    global TOKENIZER_LOADING, TOKENIZER_INSTANCE
    with TOKENIZER_LOCK:
        if TOKENIZER_INSTANCE is not None:
            return TOKENIZER_INSTANCE
        if not TOKENIZER_LOADING:
            TOKENIZER_LOADING = True

            def _load() -> None:
                global TOKENIZER_INSTANCE, TOKENIZER_LOADING
                model_id = "meta-llama/Meta-Llama-3.1-8B-Instruct"
                tokenizer = None
                try:
                    tokenizer = AutoTokenizer.from_pretrained(model_id, token=HF_TOKEN, use_fast=True)
                except Exception:
                    try:
                        tokenizer = AutoTokenizer.from_pretrained(model_id, token=HF_TOKEN, use_fast=False)
                    except Exception:
                        tokenizer = None
                with TOKENIZER_LOCK:
                    TOKENIZER_INSTANCE = tokenizer
                    TOKENIZER_LOADING = False

            threading.Thread(target=_load, daemon=True).start()
    return None


def estimate_text_tokens(text: str) -> int:
    tokenizer = get_tokenizer()
    if tokenizer is not None:
        try:
            return len(tokenizer.encode(str(text or ""), add_special_tokens=False))
        except Exception:
            pass
    return max(1, math.ceil(len(str(text or "")) / 3))


def estimate_prompt_tokens(messages: list[dict[str, str]]) -> int:
    tokenizer = get_tokenizer()
    if tokenizer is not None:
        try:
            if hasattr(tokenizer, "apply_chat_template"):
                ids = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True)
                return len(ids) if hasattr(ids, "__len__") else estimate_text_tokens(str(ids))
        except Exception:
            pass
    rendered = "\n".join(f"{m.get('role', 'user').upper()}: {m.get('content', '')}" for m in messages) + "\nASSISTANT:"
    return estimate_text_tokens(rendered)


def load_ai_usage() -> dict:
    if not AI_USAGE_FILE.exists():
        return {"spent_eur": 0.0, "reserved_eur": 0.0, "prompt_tokens": 0, "completion_tokens": 0, "requests": 0}
    try:
        data = json.loads(AI_USAGE_FILE.read_text())
    except Exception:
        data = {}
    return {
        "spent_eur": float(data.get("spent_eur", 0.0) or 0.0),
        "reserved_eur": float(data.get("reserved_eur", 0.0) or 0.0),
        "prompt_tokens": int(data.get("prompt_tokens", 0) or 0),
        "completion_tokens": int(data.get("completion_tokens", 0) or 0),
        "requests": int(data.get("requests", 0) or 0),
    }


def save_ai_usage(data: dict) -> None:
    tmp = AI_USAGE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    tmp.replace(AI_USAGE_FILE)


def cost_eur(prompt_tokens: int, completion_tokens: int) -> float:
    return (prompt_tokens / 1_000_000) * AI_INPUT_COST_PER_1M + (completion_tokens / 1_000_000) * AI_OUTPUT_COST_PER_1M


def claim_ai_budget(prompt_tokens: int) -> float:
    estimated_cost = cost_eur(prompt_tokens, AI_MAX_COMPLETION_TOKENS)
    with AI_USAGE_LOCK:
        usage = load_ai_usage()
        available = AI_SPEND_LIMIT_EUR - usage["spent_eur"] - usage["reserved_eur"]
        if estimated_cost > available + 1e-12:
            raise HTTPException(status_code=429, detail="Límite de gasto de IA alcanzado. Inténtalo más tarde.")
        usage["reserved_eur"] += estimated_cost
        save_ai_usage(usage)
    return estimated_cost


def settle_ai_usage(reservation: float, prompt_tokens: int, completion_tokens: int) -> None:
    actual_cost = cost_eur(prompt_tokens, completion_tokens)
    with AI_USAGE_LOCK:
        usage = load_ai_usage()
        usage["reserved_eur"] = max(0.0, usage["reserved_eur"] - reservation)
        usage["spent_eur"] = usage["spent_eur"] + actual_cost
        usage["prompt_tokens"] += int(prompt_tokens)
        usage["completion_tokens"] += int(completion_tokens)
        usage["requests"] += 1
        usage["updated_at"] = time.time()
        save_ai_usage(usage)


def release_ai_reservation(reservation: float) -> None:
    with AI_USAGE_LOCK:
        usage = load_ai_usage()
        usage["reserved_eur"] = max(0.0, usage["reserved_eur"] - reservation)
        save_ai_usage(usage)


@app.post("/api/ai/chat")
async def ai_chat(payload: ChatIn, token: str = Query("")) -> StreamingResponse:
    if not DEEPINFRA_API_KEY:
        raise HTTPException(status_code=503, detail="La IA en la nube no está configurada en el servidor.")

    mode = (payload.mode or "public").strip().lower()
    system_prompt = build_system_prompt(mode)
    user_prompt = build_user_prompt(payload.message, payload.context)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    prompt_tokens = estimate_prompt_tokens(messages)
    reservation = claim_ai_budget(prompt_tokens)

    headers = {
        "Authorization": f"Bearer {DEEPINFRA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    payload_json = {
        "model": AI_MODEL,
        "stream": True,
        "max_tokens": AI_MAX_COMPLETION_TOKENS,
        "messages": messages,
    }

    async def event_stream():
        assistant_text = ""
        sent_any_chunk = False
        try:
            timeout = httpx.Timeout(AI_TIMEOUT)
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream("POST", AI_ENDPOINT, headers=headers, json=payload_json) as res:
                    if res.status_code >= 400:
                        body = await res.aread()
                        detail = body.decode(errors="ignore")[:500] or f"DeepInfra respondió {res.status_code}"
                        raise HTTPException(status_code=502, detail="La IA en la nube no respondió correctamente.")

                    async for line in res.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if not data:
                            continue
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        choice = (chunk.get("choices") or [{}])[0]
                        delta = choice.get("delta") or {}
                        content = str(delta.get("content") or "").replace("</s>", "")
                        if content:
                            assistant_text += content
                        cleaned = {
                            "id": chunk.get("id"),
                            "object": "chat.completion.chunk",
                            "created": chunk.get("created", int(time.time())),
                            "model": chunk.get("model", AI_MODEL),
                            "choices": [{"index": 0, "delta": {}, "finish_reason": choice.get("finish_reason")}],
                        }
                        if delta.get("role"):
                            cleaned["choices"][0]["delta"]["role"] = delta.get("role")
                        if content:
                            cleaned["choices"][0]["delta"]["content"] = content
                            sent_any_chunk = True
                            yield f"data: {json.dumps(cleaned, ensure_ascii=False)}\n\n"
                        elif delta.get("role"):
                            yield f"data: {json.dumps(cleaned, ensure_ascii=False)}\n\n"
                    completion_tokens = estimate_text_tokens(assistant_text)
                    settle_ai_usage(reservation, prompt_tokens, completion_tokens)
                    yield "data: [DONE]\n\n"
        except HTTPException as exc:
            release_ai_reservation(reservation)
            yield f"data: {json.dumps({'error': exc.detail}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception:
            release_ai_reservation(reservation)
            yield f"data: {json.dumps({'error': 'No se pudo completar la respuesta de IA. Inténtalo de nuevo.'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "shop": "MODE Clothing Store"}


@app.get("/{path:path}", response_model=None)
def spa(path: str):
    if path.startswith("api/") or path.startswith("assets/") or path in ("sitemap.xml", "robots.txt"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    return FileResponse(FRONTEND / "index.html")
