# Use official Playwright image that has Node.js and Chromium pre-installed
FROM mcr.microsoft.com/playwright:v1.44.1-jammy

WORKDIR /app

# Copy package configurations
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code and session files
COPY index.ts ./
COPY login.ts ./
COPY facebook-session.json ./
COPY .env ./

# Define command to run the worker
CMD ["npx", "ts-node", "index.ts"]
