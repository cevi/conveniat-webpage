# Agent Instructions

- Always use `pnpm prettier` instead of `npx` (or `npx prettier`) to run Prettier formatting in this repository.
- **Environment Pathing**: Because the terminal runs commands using a non-login bash shell, it does not load the user's interactive `zsh` settings (like NVM/pnpm initializations in `.zshrc`). You must prepend the correct Node version binary directory to the `PATH` when executing package manager and git commands (e.g., `export PATH="/home/pucyril/.nvm/versions/node/v24.11.1/bin:$PATH"`). This ensures `pnpm`, `node`, `eslint`, and pre-commit hooks execute correctly.
