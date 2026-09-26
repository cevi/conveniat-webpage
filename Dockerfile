# To use this Dockerfile, you have to set output: 'standalone' in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
FROM node:24.15-alpine AS base

# libc6-compat for native libs. sharp needs no system libvips: it ships its own in the
# prebuilt @img/sharp-libvips-linuxmusl-x64 package.
RUN apk add --no-cache libc6-compat

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

ENV BUILD_TARGET=production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches

RUN corepack enable pnpm && pnpm install --frozen-lockfile


# Rebuild the source code only when needed. Building on top of deps rather than copying its
# node_modules over saves a copy of the whole tree, which is several hundred thousand files.
FROM deps AS builder

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

COPY . .

# Copy the dev icons for the dev build
# if NEXT_PUBLIC_APP_HOST_URL is not set to conveniat27.ch
RUN \
  if [ "${NEXT_PUBLIC_APP_HOST_URL}" != "https://conveniat27.ch" ]; then \
  cp /app/public/dev-icons/* /app/public/; \
  fi

# Build identity for src/build.ts. The workflows pass these; a local build falls back to .git.
ARG BUILD_GIT_HASH
ARG BUILD_GIT_REF
RUN sh create_build_info.sh

# generate prisma client
ENV PRISMA_OUTPUT='src/lib/prisma/client/'
RUN pnpm exec prisma generate --no-hints

RUN pnpm run build

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

# curl for the healthcheck, poppler-utils for pdftocairo in the PDF thumbnail task
RUN apk add --no-cache curl poppler-utils

# The .next directory must be writable for the prerender cache
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs && \
  mkdir .next && \
  chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# copy the fallback cache containing pre-build / static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/cache/fs-fallback ./.next/cache/fs-fallback

# copy prisma client
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/prisma/ /app/src/lib/prisma/

COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh

USER nextjs

EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
# The entrypoint copies this build's static assets into the mounted cumulative directory first.
CMD ["./entrypoint.sh"]
