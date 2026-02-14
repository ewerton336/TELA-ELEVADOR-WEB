# Stage 1: Build frontend + install server deps
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:20-alpine
RUN apk add --no-cache nginx

# Copy built frontend
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy server files + node_modules (for better-sqlite3)
COPY --from=build /app/node_modules /app/node_modules
COPY rss-proxy.cjs /app/rss-proxy.cjs
COPY start.sh /app/start.sh

# Create data directory for SQLite database
RUN mkdir -p /app/data && chmod +x /app/start.sh

VOLUME /app/data
EXPOSE 80
CMD ["/app/start.sh"]
