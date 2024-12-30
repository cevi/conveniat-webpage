# Conveniat 2027 - Official Website

See `conveniat27.ch` for the live version of the website.

## Getting Started

### Prerequisites

Make sure to have the following installed on your machine:

- [Node.js](https://nodejs.org/en/)
- [pnpm](https://pnpm.io/)
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/)

### Installation

1. Clone the repository
2. Copy the `.env.example` file to `.env` and fill empty values.
3. Start Developing using the following commands:
   ```bash
   docker compose up --build --watch
   ```
   The above command launches a local development server with hot-reloading enabled.
   You can open the website on `http://localhost:3000`.
4. For Code Completion and Linting on you Host Machine, run the following command:
   ```bash
   pnpm install
   ```

### Clear Database and Seed Data

You can clear and reseed the local database by running the following command, followed by a restart of the dev server
with `docker compose up --build --watch`.

```bash
docker compose down --volumes
```

### MinIO Setup

Start the MinIO Container (`docker compose up -d minio`) and log in (admin:password).
Then, create a new Bucket (note the name) and a new user. For the user, create an Access Key.
Write these values into the `.env` file:

```
MINIO_ACCESS_KEY_ID=
MINIO_SECRET_ACCESS_KEY=
MINIO_BUCKET_NAME=
```

Then, start the rest of the stack (`docker compose up -d`) and upload images into your bucket.

## Tech Stack and Decisions

The application is based on [Next.js](https://nextjs.org/docs/canary/app/api-reference/functions/generate-metadata), a
[React Framework](https://19.react.dev/). As the main building block we are using
the [Payload CMS](https://payloadcms.com/docs/beta/getting-started/what-is-payload) which is a headless CMS.

## Project Structuring - How do we Render Pages?

Due to the flexible nature of a CMS system, this project is structured such that most pages are dynamically generated
based on the settings in the CMS. Therefore, there is no single file containing the content of any given page, but
rather a collaboration of files that work together to generate the page.

1. We have the Payload CMS config file `src/payload.config.ts` which defines the structure of the CMS. Collections and
   Globals may also be defined inside the `src/payload-cms` directory.

2. The entrypoint for any frontend page is the `src/app/(frontend)` directory. Especially, the file
   `src/app/(frontend)/[locale]/[...slugs]/page.tsx` is the main entrypoint for all dynamic pages.

3. We then resolve the content of the page based on the URL and pattern matching on all Globals and Collections defined
   within the `payload.config.ts` file. This is done by the `routeLookupTable` and by searching throw the collections.

4. Once found, the corresponding page layout is rendered. The layout is defined in the `src/page-layouts` directory.
   For complex, potentially nested content types we use the converters defined in the `src/converters` directory to
   map the content to react components defined inside `src/components` directory.

## UI Component Library

We are using [shadcn/ui](https://ui.shadcn.com/) as the main component library for the project. Some functional
component are implemented with the help of [HeadlessUI](https://headlessui.com/). Additionally, we use
the [lucide icon](https://lucide.dev/icons/) library for SVG icons.