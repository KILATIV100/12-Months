FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Use nginx's built-in template processor: it expands ${PORT} on container start.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV PORT=80
