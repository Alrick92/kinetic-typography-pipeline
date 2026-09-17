FROM node:20-bookworm-slim

# System deps required by Remotion's headless-Chrome renderer + ffmpeg for audio muxing.
# See https://www.remotion.dev/docs/miscellaneous/linux-dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libgbm1 \
    libasound2 \
    libxrandr2 \
    libxkbcommon0 \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libatk-bridge2.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Pre-download Remotion's headless browser at build time so the first render
# doesn't pay that cost (and so a broken/offline runtime env fails at build, not mid-job).
RUN npx remotion browser ensure

ENV NODE_ENV=production

EXPOSE 4000

CMD ["npx", "tsx", "src/webhook.ts"]
