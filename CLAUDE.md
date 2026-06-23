# Project: conveniat27

Official website of conveniat27.

## Key Commands

- **Environment Pathing**: You must prepend the Node/pnpm binary path to the `PATH` before running package manager or git commands:
  ```bash
  export PATH="$HOME/.nvm/versions/node/v24.11.1/bin:$PATH"
  ```
- **Run dev server**: `pnpm run dev`
- **Format code**: `pnpm prettier` (always use this script; do not use `npx prettier` or other global formatters)
- **Lint code**: `pnpm lint`
- **Type check**: `pnpm lint:check`
- **Run tests**: `pnpm test`
- **Build project**: `pnpm run build`

## Core Rules & Conventions

- Coding standards, modular feature-based architecture, styling guidelines, and framework conventions are located in [.github/copilot-instructions.md](file:///.github/copilot-instructions.md). Refer to it for all coding conventions.
