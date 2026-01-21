FROM node:18-alpine AS ronyx-builder

ENV TENANT_ID=ronyx
ENV TENANT_NAME="Ronyx Transportation"
ENV DOMAIN=ronyx.movearoundtms.com

WORKDIR /app

COPY package.ronyx.json ./package.json
COPY package-lock.ronyx.json ./package-lock.json

RUN npm ci --only=production

COPY . .

RUN npm run build:ronyx

FROM node:18-alpine AS ronyx-runtime
WORKDIR /app
COPY --from=ronyx-builder /app ./

CMD ["npm", "start:ronyx"]
