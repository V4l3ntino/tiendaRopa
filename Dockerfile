FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/data/hf \
    TRANSFORMERS_CACHE=/app/data/hf

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY frontend ./frontend

RUN mkdir -p /app/data

EXPOSE 8011
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8011"]
