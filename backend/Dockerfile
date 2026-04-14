FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate self-signed certificate for HTTPS (with SAN for all access points)
RUN apk add --no-cache openssl && \
    mkdir -p certs && \
    openssl req -nodes -new -x509 -keyout certs/server.key -out certs/server.cert -days 365 \
    -subj "/C=KR/ST=Seoul/L=Seoul/O=ITMarket/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*,IP:127.0.0.1,IP:0.0.0.0"

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["npm", "start"]