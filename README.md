# Classy & Beautiful - Beauty Salon Website

Елегантен уебсайт за козметичен салон "Classy & Beautiful" с онлайн резервации.

## Tech stack

- **Frontend**: Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS
- **UI**: shadcn/ui-style components, Radix UI, Lucide icons
- **Backend**: Supabase (PostgreSQL + Storage), Next.js server actions
- **Validation**: Zod (client and server)
- **Tests**: Vitest (unit), Playwright (end-to-end)

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Database and environment setup: [docs/SETUP.md](docs/SETUP.md).
How the code is organised: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run hash-password -- "<password>"` | Generates `ADMIN_PASSWORD_HASH` |

## License

Private - Classy & Beautiful © 2026
