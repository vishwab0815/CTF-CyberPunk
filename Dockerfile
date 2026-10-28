# Optional container image. State lives in MongoDB (set MONGODB_URI at runtime); no local volume.
FROM node:24-slim
ENV NODE_ENV=production CHALLENGES_DIR=/app/challenges NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
# devDependencies are needed at build time (Tailwind, TypeScript for next.config.ts).
RUN pnpm install --frozen-lockfile --prod=false
COPY . .
RUN pnpm build && chown -R node:node /app/.next
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
