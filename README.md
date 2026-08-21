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

The first person to open the app creates the admin account (name + 4-digit
PIN). From there, an admin adds companies, contacts, activities, and the
rest of the team from inside the app.

## How data is stored right now

`server/index.js` keeps everything — employees, companies, contacts, the
activity pool, time entries, timesheets — in one `server/data.json` file on
disk, read and overwritten as a whole on every save. That's intentionally
simple to get you running today. It's also the main thing to change before
this handles a growing team long-term:

- **Multiple people saving near-simultaneously** can clobber each other's
  changes, since each save overwrites the whole file.
- **No real database** means no easy querying, indexing, or backups beyond
  copying the JSON file.

The straightforward next step is swapping `server/index.js`'s file
read/write for a real datastore — SQLite (via `better-sqlite3`) is a solid
first upgrade with almost no infra to manage, or Postgres (e.g. via
[Supabase](https://supabase.com) or [Neon](https://neon.tech)) if you want
it hosted. The `GET /api/data` / `PUT /api/data` shape can stay the same
for a while; only `server/index.js` needs to change, not the frontend.

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

If you'd rather host the frontend separately (e.g. Netlify, same as the
[[williams-executive-support-site]] setup), build the frontend as a static
site there and run `server/index.js` somewhere reachable, then update
`vite.config.js`'s proxy (dev only) and point the frontend's fetch calls in
`src/lib/data.js` at the API's real URL in production.

## Known limitations to revisit

- PIN-only auth (see above).
- Single JSON file as the datastore — fine for a handful of people, worth
  swapping for a real DB as data and concurrent use grows.
- No automated tests yet.
