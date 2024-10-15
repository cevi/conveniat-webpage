# Conveniat 2027 - Official Website

See `conveniat.ch` for the live version of the website.

## Getting Started

### Prerequisites

Make sure to have the following installed on your machine:

- [Node.js](https://nodejs.org/en/)
- [pnpm](https://pnpm.io/)
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/)

### Installation

1) Clone the repository
2) Copy the `.env.example` file to `.env` and fill empty values.
3) Start Developing using the following commands:
    ```bash
    docker compose up --build --watch
    ```
   The above command launches a local development server with hot-reloading enabled.
   You can open the website on `http://localhost:3000`.
4) For Code Completion and Linting on you Host Machine, run the following command:
    ```bash
pnpm install

    ```

## Tech Stack and Decisions

The application is based on [Next.js](https://nextjs.org/docs/canary/app/api-reference/functions/generate-metadata), a
[React Framework](https://19.react.dev/). As the main building block we are using
the [Payload CMS](https://payloadcms.com/docs/beta/getting-started/what-is-payload) which is a headless CMS.
