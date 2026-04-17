FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --include=dev && npm cache clean --force

COPY . .

RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD ["npm", "run", "docker-start"]
