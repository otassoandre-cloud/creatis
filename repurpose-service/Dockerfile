FROM python:3.11-slim

# Deps système : ffmpeg + dépendances Chromium pour Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libatspi2.0-0 libwayland-client0 libx11-6 libx11-xcb1 libxcb1 \
    libxext6 libxshmfence1 ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Installer Chromium pour Playwright (après pip install playwright)
RUN playwright install chromium

COPY main.py .
COPY watermark_base.png .

ENV PORT=8080
EXPOSE 8080

CMD ["python", "main.py"]
