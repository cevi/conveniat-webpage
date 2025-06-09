# To use this Dockerfile, you have to set output: 'standalone' in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
FROM node:22.14-alpine AS base

# Install build dependencies for sharp, rebuild sharp, and then uninstall build dependencies
RUN apk add --no-cache vips vips-dev fftw-dev gcc g++ make python3 && \
    npm rebuild sharp --platform=linuxmusl --arch=x64 && \
    apk del vips-dev fftw-dev gcc g++ make python3

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

ENV BUILD_TARGET=production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

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
RUN npx prisma generate

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Remove this line if you do not have this folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/prisma/ /app/src/lib/prisma/

USER nextjs

EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
