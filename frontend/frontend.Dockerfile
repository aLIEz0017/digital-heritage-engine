FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN corepack enable \
	&& corepack prepare pnpm@latest --activate \
	&& pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]