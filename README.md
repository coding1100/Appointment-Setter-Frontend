# SamAI Rep Frontend Monorepo

This repository now uses a frontend-only monorepo layout with pnpm workspaces and Turborepo.

## Layout

- `apps/platform-shell`: current platform shell app
- `apps/appointment-setter`: appointment-setter microfrontend scaffold
- `apps/chatbot-agents`: chatbot-agents microfrontend scaffold
- `packages/*`: shared internal frontend packages

## Scripts

- `pnpm install`
- `pnpm build`
- `pnpm dev:platform-shell`
- `pnpm dev:appointment-setter`
- `pnpm dev:chatbot-agents`

## Notes

- Backend remains in its own repository.
- Path-based microfrontend deployment is scaffolded here, while production route cutover should happen only after app-specific surfaces are fully migrated.
