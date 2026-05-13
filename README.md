# Astra Monorepo

Welcome to the Astra Monorepo. This repository contains the code for our polyglot suite of applications and services.

## Tech Stack

- **Package Manager**: Bun
- **Monorepo Tools**: Turborepo & Moonrepo
- **Formatting & Linting**: Biome
- **Languages**: TypeScript, Python, Go, Java, Rust
- **Frameworks**: TanStack Start, React (via shadcn/ui)
- **Databases**: PostgreSQL (Supabase), MongoDB
- **CI/CD**: GitHub Actions & ArgoCD

## Structure

- `apps/` - Deployable applications (Web, CLI)
- `packages/` - Shared internal libraries
- `services/` - Backend services
- `tools/` - Development tools
- `config/` - Shared configurations
- `docs/` - Documentation
- `scripts/` - Scripts
- `data/` - Data files


## Getting Started

1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Install dependencies: `bun install`
3. Run dev environment: `bun run dev`
