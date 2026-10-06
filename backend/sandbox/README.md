# airek.uz render sandbox (x86_64)

Video render dvigateli uchun Docker sandbox image.

## Qurish:
```
cd /home/devops/sandbox-build   # jcode + jcode-linux-x86_64.bin shu yerda
docker build -t adforge-jcode-sandbox:latest .
```

## STT (Talking-Head overlay uchun):
```
cd backend
python3 -m venv stt/venv
stt/venv/bin/pip install faster-whisper "av==12.3.0"
```

Chrome (puppeteer):
```
PUPPETEER_CACHE_DIR=/home/devops/.cache/puppeteer npx puppeteer browsers install chrome
```
