FROM node:20-slim AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build


FROM python:3.12-slim

# Системні залежності для asyncpg, Pillow, qrcode
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libffi-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Спочатку копіюємо requirements для кешування шару
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо код у /app/backend/ щоб `backend.main` був імпортованим
COPY . ./backend/

# Підкладаємо зібраний фронтенд у шлях, який очікує backend/main.py (/app/backend/frontend/dist)
COPY --from=frontend-builder /build/frontend/dist ./backend/frontend/dist

# Відкриваємо порт для FastAPI
EXPOSE 8000

CMD ["sh", "-c", "cd /app/backend && alembic upgrade head && cd /app && uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
