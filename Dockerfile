FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js styles.css panorama.css panorama.js favicon.svg /usr/share/nginx/html/
COPY vendor /usr/share/nginx/html/vendor
COPY assets/audio /usr/share/nginx/html/assets/audio
COPY assets/hero /usr/share/nginx/html/assets/hero
COPY assets/interview /usr/share/nginx/html/assets/interview
COPY assets/memories /usr/share/nginx/html/assets/memories
COPY assets/panoramas /usr/share/nginx/html/assets/panoramas
COPY assets/people /usr/share/nginx/html/assets/people
COPY assets/photo-wall /usr/share/nginx/html/assets/photo-wall
COPY assets/story /usr/share/nginx/html/assets/story
COPY assets/wall /usr/share/nginx/html/assets/wall

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3   CMD wget -q -O - http://127.0.0.1/healthz >/dev/null || exit 1
