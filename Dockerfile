FROM node:25-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:25-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY scripts ./scripts
COPY src ./src
COPY apps/mobile/App.tsx ./apps/mobile/App.tsx
COPY apps/mobile/src ./apps/mobile/src
COPY infra ./infra
USER node
EXPOSE 4173
CMD ["node", "scripts/api-server.mjs"]
