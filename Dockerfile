# To use this Dockerfile, you have to set output: 'standalone' in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
FROM node:24.15-alpine AS base

# Install curl for healthcheck, libc6-compat for native libs, poppler-utils and vips for sharp
RUN apk add --no-cache curl libc6-compat poppler-utils vips vips-dev

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

ENV BUILD_TARGET=production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./
COPY patches ./patches

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
ARG POSTHOG_API_KEY
ARG POSTHOG_PROJECT_ID

# Locales this deployment serves, as a comma separated list (e.g. `de,fr`). Empty means all
# locales, which is what conveniat27 ships; konekta builds pass `de,fr` to drop English.
# This must be available at build time: it is inlined into the client bundle.
ARG NEXT_PUBLIC_ENABLED_LOCALES
ENV NEXT_PUBLIC_ENABLED_LOCALES=${NEXT_PUBLIC_ENABLED_LOCALES}

# Base URL of the Cevi.DB web UI, used to link a bill-participant row back to its
# participation. Like every NEXT_PUBLIC_ value it is inlined into the client bundle at
# build time, so setting it only in the deployment environment has no effect: the admin
# reads it from the bundle, where it would be `undefined`.
ARG NEXT_PUBLIC_HITOBITO_API_URL=https://db.cevi.ch
ENV NEXT_PUBLIC_HITOBITO_API_URL=${NEXT_PUBLIC_HITOBITO_API_URL}

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
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm; fi && \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Copy full node_modules native bindings into standalone node_modules so Next.js standalone output includes sharp native binaries
RUN mkdir -p /app/.next/standalone/node_modules/@img && \
    cp -r /app/node_modules/@img/* /app/.next/standalone/node_modules/@img/ 2>/dev/null || true
RUN mkdir -p /app/.next/standalone/node_modules/.pnpm && \
    cp -r /app/node_modules/.pnpm/* /app/.next/standalone/node_modules/.pnpm/ 2>/dev/null || true

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
ENV NEXT_TELEMETRY_DISABLED=1

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
