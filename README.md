# Ledger — time tracking for Williams Executive Support

A small internal time-tracking app: companies → contacts (the C-suite people
your team supports) → activities pulled from a shared, admin-managed pool.
Built with React + Vite on the frontend and a tiny Express API on the backend.

## Project shape

```
wes-timetrack/
  server/
    index.js       Express API — GET/PUT /api/data, serves the built app in production
    data.json       created automatically on first save (gitignored)
  src/
    lib/
      utils.js       date/format helpers, constants
      data.js        data schema, legacy-data migration, useAppData hook (calls the API)
    components/
      ui.jsx         shared primitives (Button, Card, Select, Pill, etc.)
      LoginScreen.jsx
      DashboardTab.jsx
      LogTimeTab.jsx        live timer + manual entry
      TimesheetTab.jsx      weekly grid, submit/reopen
      CompaniesTab.jsx      companies, contacts, and the shared activity pool (admin)
      TeamTab.jsx           team members, PINs, roles (admin)
      ReportsTab.jsx        filters, breakdowns, CSV export
    App.jsx          tab shell + auth gate
    main.jsx         React entry point
```

## Running it locally

```bash
npm install
npm run dev
```

This starts the Vite dev server on **http://localhost:5173** and the API on
**http://localhost:5175** together (Vite proxies `/api/*` to the API — see
`vite.config.js`). Open `localhost:5173` and you're in.

To test "Forgot your PIN?" locally, copy `.env.example` to `.env` and set
`RESEND_API_KEY` (see [Deploying to Netlify](#deploying-to-netlify) below
for how to get one). Without it, `server/index.js` still generates and
stores the reset link — it just logs it to the terminal instead of emailing
it, which is enough to test the flow without a real Resend account.

The first person to open the app creates the admin account (name + 4-digit
PIN). From there, an admin adds companies, contacts, activities, and the
rest of the team from inside the app.

## Deploying to Netlify

The project is set up to run entirely on Netlify — `netlify.toml` at the repo
root tells Netlify to build the frontend with `npm run build` (output in
`dist/`) and to run `netlify/functions/data.mjs` as the API, backed by
**Netlify Blobs** for storage instead of a JSON file on disk (a file
wouldn't survive between serverless invocations the way it does on a
long-running server).

To deploy:

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Netlify, "Add new site" → "Import an existing project" → pick the repo.
   Netlify reads `netlify.toml` automatically, so the build command,
   publish directory, and functions directory are already set — no manual
   dashboard configuration needed.
3. Deploy. Netlify Blobs is available on every site automatically; there's
   no separate service to sign up for or API key to configure.
4. To enable "Forgot your PIN?" emails, sign up at
   [resend.com](https://resend.com) (free tier is enough), grab an API key,
   and set it in Netlify → Site configuration → Environment variables as
   `RESEND_API_KEY`. Without it, reset requests still work end-to-end but
   the email is skipped — the link is only logged to the function's logs,
   so it's really only usable that way for testing. Optionally also set
   `RESEND_FROM` once you've verified your own sending domain in Resend
   (until then, Resend's shared sandbox sender can only deliver to the
   email address on your own Resend account, not your whole team).
5. Open the deployed site and create the first (admin) account, same as
   local dev.

If you see errors creating the first account, it almost always means the
frontend is trying to reach an API that isn't there — double check the
site actually deployed the function (Netlify's dashboard → Functions tab
should list `data`) and that `netlify.toml` made it into the repo.

`server/index.js` (Express + JSON file) is still there and still what
`npm run dev` uses for **local development** — it's simpler to run locally
than spinning up Netlify's dev environment for every change. The two
backends are separate implementations of the same tiny `GET`/`PUT
/api/data` contract, so the frontend code doesn't need to know or care
which one it's talking to.

## How data is stored right now

Locally (`npm run dev`), `server/index.js` keeps everything — employees,
companies, contacts, the activity pool, time entries, timesheets — in one
`server/data.json` file on disk, read and overwritten as a whole on every
save. On Netlify, the same shape is stored as one blob via Netlify Blobs
instead. Both are intentionally simple to get you running today. The main
thing to revisit as the team and data grow:

- **Multiple people saving near-simultaneously** can clobber each other's
  changes, since each save overwrites the whole record.
- **No real database** means no easy querying, indexing, or backups beyond
  copying the file (locally) or exporting the blob (on Netlify).

The straightforward next step for either environment is swapping the
whole-blob read/write for a real datastore — SQLite (via
`better-sqlite3`) locally, or Postgres (e.g. via [Supabase](https://supabase.com)
or [Neon](https://neon.tech)) if you want it hosted and shared between
environments. The `GET /api/data` / `PUT /api/data` shape can stay the same
for a while; only `server/index.js` and `netlify/functions/data.mjs` need
to change, not the frontend.

## Auth

Login is name + 4-digit PIN, stored in plain text in the data file. That's
fine for a small trusted team using this on a private link, but it is
**not real authentication** — no hashing, no sessions, no protection
against someone guessing a PIN. If this ever needs to be reachable outside
your team, put real auth in front of it (e.g. a hosted auth provider, or at
minimum hash the PINs and add rate limiting) before that happens.

## Building for production

```bash
npm run build      # outputs static frontend to dist/
NODE_ENV=production npm start   # serves dist/ + the API from one process
```

That gives you a single Node process serving both the app and the API,
which is enough to deploy to something like Render, Railway, or Fly.io, or
a small VPS behind a reverse proxy. Point `PORT` at whatever the platform
expects (`PORT=... npm start`).

If you'd rather not deploy the whole thing to Netlify, `dist/` is a plain
static build that can be hosted anywhere (e.g. the same setup as the
[[williams-executive-support-site]]), as long as `server/index.js` (or an
equivalent API) is reachable somewhere and `src/lib/data.js`'s fetch calls
point at it — see `vite.config.js`'s dev proxy for how that wiring works
locally.

## Known limitations to revisit

- PIN-only auth (see above).
- Single JSON file as the datastore — fine for a handful of people, worth
  swapping for a real DB as data and concurrent use grows.
- No automated tests yet.
