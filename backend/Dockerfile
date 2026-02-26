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

# Копіюємо код
COPY . .

# Відкриваємо порт для FastAPI
EXPOSE 8000
