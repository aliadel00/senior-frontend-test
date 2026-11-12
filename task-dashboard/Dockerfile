FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Prefer committed mock data; regenerate when the script tree is available.
RUN if [ -f ../data-fetching/generate-data.js ]; then npm run data:generate; \
    elif [ ! -f public/mock-db.json ] && [ -f mock-api/db.json ]; then \
      node -e "require('fs').copyFileSync('mock-api/db.json','public/mock-db.json')"; \
    fi
ARG BUILD_CONFIGURATION=docker
RUN npx ng build --configuration=${BUILD_CONFIGURATION}

FROM nginx:1.27-alpine
COPY --from=build /app/dist/task-dashboard/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
