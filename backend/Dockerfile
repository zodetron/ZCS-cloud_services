FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Install deps (including devDeps for prisma CLI)
COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

RUN chmod +x entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["sh", "entrypoint.sh"]
