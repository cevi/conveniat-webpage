FROM node:24.4-alpine

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Install Dependencies for Sharp
RUN apk add --no-cache vips vips-dev fftw-dev gcc g++ make python3

# Rebuild sharp again in builder stage to ensure it's built in the build environment
RUN npm rebuild sharp --platform=linuxmusl --arch=x64

ENV TZ="Europe/Zurich"

WORKDIR /home/node/app
COPY . .
