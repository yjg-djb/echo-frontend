FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html panorama.css panorama.js sw.js favicon.svg /usr/share/nginx/html/
COPY vendor /usr/share/nginx/html/vendor
COPY assets/hero /usr/share/nginx/html/assets/hero
COPY assets/panoramas /usr/share/nginx/html/assets/panoramas

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/healthz >/dev/null || exit 1
