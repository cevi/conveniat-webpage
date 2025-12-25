# conveniat27 - Official Website

[![Visit Live Site](https://img.shields.io/badge/Live%20Site-conveniat27.ch-blue)](https://conveniat27.ch)

This repository contains the source code for the official website as well as the official app of conveniat27, built with
Next.js and Payload CMS.

## Table of Contents

- [Core Technologies](#core-technologies)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Launch Project Locally (Devcontainer Recommended)](#launch-project-locally-devcontainer-recommended)
  - [Local Development Commands](#local-development-commands)
  - [Accessing the Payload Admin Panel](#accessing-the-payload-admin-panel)
- [Project Structure](#project-structure)
  - [Folder Overview](#folder-overview)
  - [Feature-Based Modularity](#feature-based-modularity)
- [Key Concepts](#key-concepts)
  - [Page Rendering](#page-rendering)
  - [Progressive Web App (PWA)](#progressive-web-app-pwa)
- [Code Quality & Conventions](#code-quality--conventions)
  - [TypeScript Strictness](#typescript-strictness)
  - [Linting and Formatting](#linting-and-formatting)
  - [Import Restrictions](#import-restrictions)
- [UI Component Library](#ui-component-library)
- [Environment Variables](#environment-variables)
- [License](#license)

## Core Technologies

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **TRPC:** [tRPC](https://trpc.io/) (for type-safe API routes)
- **CMS:** [Payload CMS](https://payloadcms.com/) (Headless, Self-hosted)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (with strict type checking)
- **UI:** [React](https://react.dev/), [shadcn/ui](https://ui.shadcn.com/),
  [Tailwind CSS](https://tailwindcss.com/), [Headless UI](https://headlessui.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Database:** [MongoDB](https://www.mongodb.com/) (self-hosted),
  [MinIO](https://min.io/) (S3-compatible object storage, self-hosted),
  [PostgreSQL](https://www.postgresql.org/) (self-hosted)
- **PWA:** [Serwist](https://serwist.pages.dev/) (for Service Worker management)
- **Code Quality:** [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)
- **Development Environment:** [Docker](https://www.docker.com/) (Devcontainer)

## Prerequisites

Ensure you have the following installed on your system:

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) & Docker Compose
- An IDE that supports Devcontainers (e.g., [VS Code](https://code.visualstudio.com/) with the Dev Containers
  extension, [WebStorm](https://www.jetbrains.com/webstorm/)).

## Getting Started

### Launch Project Locally (Devcontainer Recommended)

1. Clone the repository
2. Copy the `.env.example` file to `.env` and fill empty values.
3. Open the project using the provided devconatiner inside your IDE (VSCode or Webstorm are tested).
4. Start Developing using the following commands:
   ```bash
   docker compose up --build
   ```
   The above command launches a local development server with hot-reloading enabled.
   You can open the website on `http://localhost:3000`.

### Local Development Commands

- **Install Dependencies:** `pnpm install`
- **Start Development Server:** `docker compose up --build`
- **Stop Development Server:** `docker compose down`
- **Clear Database & Volumes:** To completely reset the database and remove Docker volumes (useful for reseeding):
  ```bash
  docker compose down --volumes
  ```
  After running this, you'll need to restart the server with `docker compose up --build` to re-initialize and
  potentially re-seed the database based on Payload's configuration.

### Observability Stack

The project includes an optional observability stack (Prometheus, Grafana, Loki, Tempo).
To start the project with these tools enabled locally:

```bash
docker compose --profile observability up --build
```

### Accessing the Payload Admin Panel

Once the development server is running, you can typically access the Payload CMS admin interface at:
`http://localhost:3000/admin` (or your configured admin route)

## Project Structure

The project structure is influenced by Next.js App Router conventions and principles from Bulletproof React, emphasizing
modularity and maintainability.

### Folder Overview

```plaintext
public/         # Static assets (images, fonts, sw.js, etc.)
src/
|
+-- app/              # Next.js App Router: Layouts, Pages, Route Handlers
|   |-- (entrypoint)/ # Entrypoint for the APP (manually localized)
|   |-- (payload)/    # Routes related to Payload Admin UI
|   |-- (frontend)/   # Routes for the main website frontend / app
|
+-- components/       # Globally shared React components
|
+-- config/           # Global application configurations (e.g., exported env vars)
|
+-- features/         # Feature-based modules (self-contained units of functionality)
|   |-- service-worker/ # Serwist service worker logic
|   |-- payload-cms/    # Payload CMS specific configurations, collections, globals, hooks
|   +-- ...             # Other features
|
+-- hooks/            # Globally shared React hooks
|
+-- lib/              # Globally shared utility functions, libraries, clients
|
+-- types/            # Globally shared TypeScript types and interfaces
|
+-- utils/            # Globally shared low-level utility functions
```

### Feature-Based Modularity

- Most application logic resides within the `src/features` directory.
- Each sub-directory in `src/features` represents a distinct feature (e.g., `chat`, `map`, `payload-cms`).
- **Encapsulation:** Code within a feature folder should primarily relate to that specific feature.
- **Structure within Features:** A feature can internally have its own `components`, `hooks`, `api`, `types`, `utils`
  subdirectories, scoped to that feature.
- **Import Restrictions:** ESLint rules (`import/no-restricted-paths` in `eslint.config.mjs`) enforce unidirectional
  dependencies:
  - `app` can import from `features` and shared directories (`components`, `hooks`, etc.).
  - `features` _cannot_ import from `app` or shared directories.
  - Features generally should _not_ import directly from other features, promoting loose coupling. Exceptions are
    explicitly defined (e.g., `payload-cms` and `next-auth` can be imported more broadly).
  - Shared directories (`components`, `hooks`, `lib`, `types`, `utils`) should not import from `app` or `features`.
- **Payload CMS Exception:** The `payload-cms` feature is central and can be imported by other parts of the application
  as it defines the core data structures / content types used throughout the app.

This structure aids scalability, maintainability, and team collaboration by keeping concerns separated.

## Key Concepts

### Page Rendering

A core aspect of this project is that most frontend pages are generated based on data managed within Payload
CMS.

1. **CMS Configuration (`src/features/payload-cms/payload.config.ts`, `src/features/payload-cms/settings`):** Defines
   data structures (Collections, Globals) and their fields. Collections might represent page types, blog posts, etc.
2. **Routing (`src/app/(frontend)/[locale]/(payload-pages)/[...slugs]/page.tsx`):** This dynamic route catches most
   frontend URL paths.
3. **Route Resolution:** The application resolves the incoming URL (`slugs`) against Collections and Globals defined in
   Payload CMS (via the `src/features/payload-cms/routeResolutionTable.ts`).
4. **Layout & Component Mapping:** Once the corresponding CMS data is found for a URL, a specific page layout (
   `src/features/payload-cms/page-layouts`) is rendered. Complex CMS fields (like Blocks or Rich Text) are mapped
   to React components using converters (`src/features/payload-cms/converters`).

To improve performance, calls to Payload CMS are cached server-side using Next.js 'use cache' functionality.

### Progressive Web App (PWA)

This application utilizes [Serwist](https://serwist.pages.dev/) (`@serwist/next`) to implement Service Worker
functionality, enabling PWA features:

- **Offline Access:** Pre-cached pages (like the `/offline` page) and potentially other assets allow basic functionality
  when the user is offline.
- **Caching:** Improves performance by caching assets and network requests.
- **Reliability:** Provides a more resilient user experience on flaky networks.

The service worker logic is defined in `src/features/service-worker/index.ts` and configured in `next.config.mjs`. It's
generally disabled in development unless `ENABLE_SERVICE_WORKER_LOCALLY=true` is set.

## Code Quality & Conventions

Maintaining code quality and consistency is crucial.

### TypeScript Strictness

The project enforces strict TypeScript settings (`tsconfig.json`), including:
`strict`, `strictNullChecks`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc. This helps
catch errors at compile time and improves code reliability.

### Linting and Formatting

- **ESLint (`eslint.config.mjs`):** Used for identifying and reporting on patterns in JavaScript/TypeScript code.
  Includes rules from `eslint:recommended`, `typescript-eslint`, `unicorn`, `react-hooks`, `next/core-web-vitals`, and
  custom rules for conventions and import restrictions.
- **Prettier:** Used for automatic code formatting to ensure a consistent style. Integrated via
  `eslint-plugin-prettier`.
- **Run Checks:** (Ensure these scripts exist in your `package.json`)
  ```bash
  # Run ESLint checks and fix issues
  pnpm run lint
  ```

### Import Restrictions

As mentioned in the [Project Structure](#project-structure) section, ESLint rules strictly enforce module boundaries to
maintain a clean and understandable architecture. Path aliases (`@/*`, `@payload-config`) defined in `tsconfig.json` are
used for cleaner imports.

## UI Component Library

- **[shadcn/ui](https://ui.shadcn.com/):** Provides beautifully designed, accessible components built on Radix UI and
  Tailwind CSS. Components are typically copied into the project (`src/components/ui`) rather than installed as a
  dependency.
- **[Headless UI](https://headlessui.com/):** Used for unstyled, accessible UI components providing underlying logic for
  elements like modals, dropdowns, etc.
- **[Lucide React](https://lucide.dev/):** Provides a wide range of clean and consistent SVG icons.

## Environment Variables

- Configuration is managed via environment variables.
- `.env.example` serves as a template listing the required variables.
- Create a `.env` file (copied from `.env.example`) for local development. **Never commit `.env` files to Git.**
- Populate `.env` with necessary credentials (database URLs, API keys, secrets, etc.).

## Build Production Bundle

The easiest way to build the page into a production ready bundle is to use the provided Docker Compose file.
This will build the Next.js application and Payload CMS, and prepare it for deployment.

```bash
docker compose -f docker-compose.prod.yml up --build
```

However, you can also build the application manually using the following commands.
Please ensure that you have deleted `node_modules`, `src/lib/prisma/*`, and `.next`
before running the commands to ensure a clean build.

Also make sure that you DON'T have any `.env` file in the root of the project, as this will
cause issues with the build process.

```bash
# Export environment variables
export $(grep -v '^#' .env | grep '^NEXT_PUBLIC_' | xargs)
export BUILD_TARGET="production"
export NODE_ENV="production"
export DISABLE_SERVICE_WORKER="true" # speeds up build process (optional)
export PRISMA_OUTPUT="src/lib/prisma/client/"

# Install dependencies
pnpm install

# Create build info file
bash create_build_info.sh

# Generate Prisma client
npx prisma generate --no-hints

# Build the Next.js application
pnpm next build
```

### Analyse Bundle Size

To analyze the bundle size of the Next.js application, you can use the `next-bundle-analyzer` package.
Xou can run the following command to analyze the bundle size. This will generate a report and open it in
your default browser.

```bash
ANALYZE=true pnpm build
```

## Git Workflow

We follow a standard Git workflow for managing changes:

1. **Branching:** Create a new branch for each (bigger) feature or bug fix.
   - Use descriptive names (e.g., `feature/new-header`, `bugfix/fix-footer`).
   - For small changes, you can commit directly to the `dev` branch.
   - For larger features, create a feature branch from `dev` and merge it back when complete.
   - You are allowed to force push to your feature branches. However, if multiple developers are collaborating on the
     same feature branch, always coordinate and communicate with your teammates before force pushing, as it can
     overwrite others' work. Avoid force pushing to `dev`, and never force push to `main`.
2. **Pull Requests:** When ready, open a pull request (PR) against the `dev` branch.
   - Ensure the PR description is clear about the changes made.
   - Request reviews from team members.
   - Once approved, we merge the PR into `dev`.
3. **Releases:** When ready to deploy, merge `dev` into `main`.
   - We do not use squash merging for releases, instead, we use regular merging to preserve commit history.
   - After every release, we rebase the `dev` branch from `main` to keep it up to date without introducing merge
     commits.
   - We may squash merge features into `dev` to keep the history clean.
4. **Hotfixes:** For urgent fixes, create a hotfix branch from `main`, apply the fix, and merge it back into both `main`
   and `dev`. Hotfix branches should be named like `hotfix/fix-issue`.

## Migrate Production Database

The following commands are used to generate and apply migrations to the postgreSQL database.
Here you can find
an [in-depth guide](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/mental-model) on how to
use Prisma Migrate.

```bash
###############################################
# Generate and apply migrations to conveniat27.cevi.tools
###############################################
# 1. Establish SSH Tunnel for Dev (see 'Connect from Localhost' below)
export DB_PASSWORD= # dev deployment database password
# Connect via the tunnel on localhost:5433
export CHAT_DATABASE_URL="postgres://conveniat27:$DB_PASSWORD@localhost:5433/conveniat27"

# check status (this will show the current migration status)
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma

# create a new migration
npx prisma migrate dev --schema prisma/schema.prisma

#############################################
# Apply migrations to conveniat27.ch
#############################################
# 1. Establish SSH Tunnel for Prod (see 'Connect from Localhost' below)
export DB_PASSWORD= # prod deployment database password
# Connect via the tunnel on localhost:5433
export CHAT_DATABASE_URL="postgres://conveniat27:$DB_PASSWORD@localhost:5433/conveniat27"

npx prisma migrate deploy --schema prisma/schema.prisma
```

### Database Maintenance

If you see warnings about **collation version mismatch** (e.g., `The database was created using collation version 2.36, but the operating system provides version 2.41`), you need to update the collation version to match the current OS.

Run the following SQL command against the database:

```sql
ALTER DATABASE conveniat27 REFRESH COLLATION VERSION;
```

SSH into the server and run the following command to execute the SQL command:

### Production (conveniat.ch)

If asked for a password for the user conveniat27, use the production database password.

```bash
docker run --rm -it --network conveniat_backend-net postgres:17 \
  psql -h conveniat_postgres -U conveniat27 -d conveniat27 -c "ALTER DATABASE conveniat27 REFRESH COLLATION VERSION;"
```

### Development (conveniat27.cevi.tools)

If asked for a password for the user conveniat27, use the development database password.

```bash
docker run --rm -it --network conveniat-dev_backend-net postgres:17 \
  psql -h conveniat-dev_postgres -U conveniat27 -d conveniat27 -c "ALTER DATABASE conveniat27 REFRESH COLLATION VERSION;"
```

### Interactive SQL Console

To open an interactive `psql` shell (instead of running a single command), simply omit the `-c` argument:

**Production:**

```bash
docker run --rm -it --network conveniat_backend-net postgres:17 \
  psql -h conveniat_postgres -U conveniat27 -d conveniat27
```

**Development:**

```bash
docker run --rm -it --network conveniat-dev_backend-net postgres:17 \
  psql -h conveniat-dev_postgres -U conveniat27 -d conveniat27
```

### Connect from Localhost

To directly connect to the database from your local machine, use an **SSH Tunnel**:

#### Open Tunnel (Swarm-Aware):

Since the database runs on a private internal network (`conveniat_backend-net`) and may not be on the manager node, a simple SSH tunnel won't work.
Use this command to tunnel via a temporary forwarder container:

**For Production:**

```bash
ssh -i ~/.ssh/id_rsa_cevi_tools -L 5433:127.0.0.1:5433 root@10.0.0.13 \
  "docker run --rm -p 127.0.0.1:5433:5432 --network conveniat_backend-net alpine sh -c 'apk add --no-cache socat && socat TCP-LISTEN:5432,fork TCP:conveniat_postgres:5432'"
```

**For Development:**

```bash
ssh -i ~/.ssh/id_rsa_cevi_tools -L 5433:127.0.0.1:5433 root@10.0.0.13 \
    "docker run --rm -p 127.0.0.1:5433:5432 --network conveniat-dev_backend-net alpine sh -c 'apk add --no-cache socat && socat TCP-LISTEN:5432,fork TCP:conveniat-dev_postgres:5432'"
```

**How this works:**

- It SSHs to the manager.
- Starts a tiny `alpine` container attached to the private backend network.
- Maps the container's port to the manager's localhost (`-p 127.0.0.1:5433:5432`).
- Uses `socat` to forward traffic to the `conveniat_postgres` service VIP.
- Your local machine tunnels to the manager's `localhost:5433`.

## License

This project is licensed under the [MIT](LICENSE.md) License — see the `LICENSE` file for details.
