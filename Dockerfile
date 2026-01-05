# To use this Dockerfile, you have to set output: 'standalone' in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
FROM node:24.4-alpine AS base

# Install curl for healthcheck, libc6-compat for native libs, and build dependencies for sharp
RUN apk add --no-cache curl libc6-compat vips vips-dev fftw-dev gcc g++ make python3 && \
  npm rebuild sharp --platform=linuxmusl --arch=x64 && \
  apk del vips-dev fftw-dev gcc g++ make python3

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

ENV BUILD_TARGET=production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

ENV BUILD_TARGET=production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_HOST_URL=https://conveniat27.ch
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# set vapid public key, this must be available at build time
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
ENV NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST}
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy the dev icons for the dev build
# if NEXT_PUBLIC_APP_HOST_URL is not set to conveniat27.ch
RUN \
  if [ "${NEXT_PUBLIC_APP_HOST_URL}" != "https://conveniat27.ch" ]; then \
  cp /app/public/dev-icons/* /app/public/; \
  fi

RUN sh create_build_info.sh

# generate prisma client
ENV PRISMA_OUTPUT='src/lib/prisma/client/'
RUN npx prisma generate --no-hints

RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm; fi; \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi 2>&1 | tee build.log; \
  RET=$?; \
  if [ $RET -ne 0 ]; then \
  echo "Build failed with exit code $RET"; \
  cat build.log; \
  exit $RET; \
  fi



# Ensure fallback cache directory exists so copy commands don't fail if empty
RUN mkdir -p .next/cache/fs-fallback

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ="Europe/Zurich"

# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs


# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# copy the fallback cache containing pre-build / static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/cache/fs-fallback ./.next/cache/fs-fallback

# copy prisma client
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/prisma/ /app/src/lib/prisma/

USER nextjs

EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
