# Nginx image to serve static files - using latest stable version
FROM nginx:1.27-alpine

# Update Alpine packages to patch known vulnerabilities
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
        libxml2 \
        libxslt \
        libexpat \
        openssl \
        curl && \
    rm -rf /var/cache/apk/*

# Copy all static files from player-update to nginx html directory
COPY . /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
