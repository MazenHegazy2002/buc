This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Server Recovery & Troubleshooting

If the server or background worker stalls, crashes, or database operations fail, anyone can run the automated recovery script:

```bash
./scripts/fix-server.sh
```

This script performs:
1. Database connectivity check via Prisma.
2. Automatic reset of stuck (`PROCESSING`) and `FAILED` tasks back to `PENDING`.
3. Clearing corrupted Next.js build caches (`.next`).
4. Verifying and installing missing dependencies.

---

*Powered by Brandyy*
