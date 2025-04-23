# conveniat27 - Official Website

[![Visit Live Site](https://img.shields.io/badge/Live%20Site-conveniat27.ch-blue)](https://conveniat27.ch)

This repository contains the source code for the official website of conveniat27, built with Next.js and Payload CMS.

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
  - [Dynamic Page Rendering](#dynamic-page-rendering)
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
- **CMS:** [Payload CMS](https://payloadcms.com/) (Headless, Self-hosted)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (with strict type checking)
- **UI:** [React](https://react.dev/), [shadcn/ui](https://ui.shadcn.com/),
  [Tailwind CSS](https://tailwindcss.com/), [Headless UI](https://headlessui.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Database:** [MongoDB](https://www.mongodb.com/) (self-hosted),
  [MinIO](https://min.io/) (S3-compatible object storage, self-hosted)
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
   docker compose up --build --watch
   ```
   The above command launches a local development server with hot-reloading enabled.
   You can open the website on `http://localhost:3000`.

### Local Development Commands

- **Install Dependencies:** `pnpm install`
- **Start Development Server:** `docker compose up --build --watch`
- **Stop Development Server:** `docker compose down`
- **Clear Database & Volumes:** To completely reset the database and remove Docker volumes (useful for reseeding):
  ```bash
  docker compose down --volumes
  ```
  After running this, you'll need to restart the server with `docker compose up --build --watch` to re-initialize and
  potentially re-seed the database based on Payload's configuration.

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

### Dynamic Page Rendering

A core aspect of this project is that most frontend pages are dynamically generated based on data managed within Payload
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

## License

This project is licensed under the ??? License - see the `LICENSE` file for details.
