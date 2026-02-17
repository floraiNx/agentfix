FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile || bun install

COPY . .

EXPOSE 8787

CMD ["bun", "src/cli.ts", "serve", "--port", "8787"]
