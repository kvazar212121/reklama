# AdForge AI — jcode ishonchsiz (untrusted) ijro sandboxi
#
# Bu image ichida jcode (foydalanuvchi "IDEA" matni asosida) to'liq erkin
# ishlaydi: bash, fayl yozish, Puppeteer/Chrome orqali render, ffmpeg orqali
# video/musiqa montaji — hammasi shu konteyner ichida, production serverning
# haqiqiy fayl tizimidan (.env, manba kod, boshqa foydalanuvchilar fayllari)
# butunlay ajratilgan holda.

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Node.js 22 (host bilan mos) + ffmpeg + headless Chrome uchun kerakli
# umumiy kutubxonalar + shriftlar + Python3/NumPy (hubmusic — sof sintez
# musiqa generatori — uchun)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg ffmpeg fontconfig fonts-liberation \
    libasound2t64 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-6 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 \
    libxrandr2 libxshmfence1 python3 python3-numpy \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g puppeteer-core@23 hyperframes \
    && apt-get purge -y curl gnupg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV NODE_PATH=/usr/lib/node_modules

# Loyihada ishlatilayotgan shriftlar (Poppins, Bebas Neue) + DejaVu (Ubuntu bilan keladi)
COPY fonts/*.ttf /usr/share/fonts/truetype/adforge/
RUN fc-cache -f

# Ishlaydigan (root bo'lmagan) foydalanuvchi — konteyner ichida ham imtiyoz yo'q
RUN useradd -m -u 10001 sandboxuser
USER sandboxuser
ENV HOME=/home/sandboxuser
WORKDIR /work

ENTRYPOINT ["/usr/local/bin/jcode"]
