FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/fonts \
    && python3 -c "import urllib.request; urllib.request.urlretrieve('https://github.com/dejavu-fonts/dejavu-fonts/raw/refs/heads/master/fonts/DejaVuSans.ttf', '/app/fonts/DejaVuSans.ttf')"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

ENV PORT=8080
EXPOSE 8080

CMD ["python", "main.py"]
