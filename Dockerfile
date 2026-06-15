FROM nginx:alpine

# Copy all static files to Nginx
COPY . /usr/share/nginx/html/

# Cloud Run injects a PORT environment variable.
# We update the Nginx config to listen on this port dynamically before starting the server.
CMD sed -i -e 's/listen.*/listen '"${PORT:-8080}"';/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
