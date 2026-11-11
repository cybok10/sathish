# Deploying to Vercel (free tier)

The stack is **Vercel** for the site and the API, and **Supabase** for Postgres and
file storage. Nothing needs a server of its own.

```
GitHub ──▶ Vercel ──▶ static site (CDN)  +  /api/* serverless function
                     │
                     └──▶ Supabase Postgres (articles, sessions, subscribers)
                          Supabase Storage (uploaded images)
```

---

## 1. Supabase — the database and the file store

1. **Create a project** at <https://supabase.com/dashboard> (GitHub sign-in works).
   Pick the region closest to your visitors — Mumbai or Singapore for India.

2. **Create the tables.** Open the **SQL Editor** and paste the contents of
   [`server/schema.sql`](server/schema.sql), then run it.
   The app also applies this schema itself on first boot, so this step is
   belt-and-braces — but running it first means you can see the tables.

3. **Get the connection string.** *Project Settings → Database → Connection
   string*. Copy the **Session pooler** one, not the direct connection:

   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   > The session pooler (port `6543`) is required. The direct connection
   > (`5432`) exhausts the connection limit as soon as a few serverless
   > functions run at once.

4. **Get the API keys.** *Project Settings → API*. Supabase now issues two
   kinds of key, and the names matter:

   | Environment variable | Key | Notes |
   |---|---|---|
   | `SUPABASE_ANON_KEY` | `sb_publishable_…` | The public key. Safe in the browser. |
   | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` | Server only — full access, never exposed to the browser. |

   > These replace the old `anon` / `service_role` pair. The `sb_secret_…`
   > key is the one that belongs in `SUPABASE_SERVICE_ROLE_KEY`; putting the
   > publishable key there silently breaks every upload.

5. **Create the upload bucket.** *Storage → New bucket*:
   - name it exactly `blog-uploads` (or set `BLOG_UPLOAD_BUCKET` to match)
   - **keep it private** — the API serves the files after checking the
     `uploads` table, so the bucket should not be public

---

## 2. Vercel — the site and the API

1. **Import the repository.** <https://vercel.com/new> → pick `cybok10/sathish`.

2. **Set the project settings:**

   | Setting | Value |
   |---|---|
   | Root Directory | `portofolio-main` |
   | Framework Preset | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm ci` |

   > The Root Directory matters. The repository root still holds the older
   > static site; without this, Vercel builds the wrong thing.

3. **Add the environment variables.** Add each of these for **Production**,
   **Preview** *and* **Build**:

   ```
   DATABASE_URL                = the session pooler connection string
   SUPABASE_URL                = https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY           = the anon key
   SUPABASE_SERVICE_ROLE_KEY   = the service_role key
   BLOG_UPLOAD_BUCKET          = blog-uploads
   ADMIN_EMAIL                 = admin@sathish.blog
   ADMIN_PASSWORD              = a long unique password
   ADMIN_NAME                  = Sathish M
   SITE_URL                    = https://your-domain.com
   BASE_PATH                   = /
   DB_POOL_MAX                 = 5
   ```

   > `DATABASE_URL` must be present at **build time** as well: the build runs
   > `scripts/export-static.mjs`, which writes `public/feed.xml` and
   > `public/sitemap.xml` from the live database.

4. **Deploy.** Every later `git push` to the default branch redeploys.

5. **Add your domain** in *Project Settings → Domains*.

---

## 3. Keep the database awake

Supabase pauses a free project after a week with no activity. `vercel.json`
already contains a daily cron that hits `/api/health`, which queries the
database and resets the timer. You can confirm it is running under
*Project Settings → Cron Jobs*.

---

## What changed, and why

### The base path is now `/`

The site used to live at `/portofolio/`, which only works when it is served
from a folder of that name. Vercel serves from the root of a domain, so
`base` is now `/` in `vite.config.js`.

That also fixed thirteen hardcoded paths that ignored the base entirely —
`src/App.jsx`, `src/components/{Navbar,Footer,Lanyard}.jsx` and `src/data.js`.
They now read `import.meta.env.BASE_URL`, so they follow the deployment.

### The API is a serverless function

`api/[...path].js` catches every `/api/...` request and hands it to the same
handler the standalone server uses, so behaviour is identical in both places.
`vercel.json` rewrites everything that is not `/api/*` to `index.html`, which
is what makes a deep link like `/blog/tactics/pentesting/services/redis`
survive a hard refresh.

### SQLite became PostgreSQL

A serverless function has no persistent disk, so the database cannot be a
file. `server/db.js` now talks to Postgres through `pg`, and `server/pgdb.js`
keeps the shape of the old synchronous `node:sqlite` API so the rest of the
server barely changed.

The port also fixed three SQLite-isms that PostgreSQL does not accept:

| SQLite | PostgreSQL |
|---|---|
| `?` placeholders | `$1`, `$2` |
| `IS NOT ?` | `IS DISTINCT FROM ?` |
| `HAVING post_count > 0` | `HAVING COUNT(bt.blog_id) > 0` |

Uploads moved from `server/uploads/` to Supabase Storage. The local
filesystem is still used when Supabase is not configured, so local
development keeps working.

### The admin password hashing is asynchronous

`scryptSync` blocks the event loop, which on a serverless runtime means one
slow login can stall every other request sharing the instance. It is now the
promise-based `crypto.scrypt`. The parameters are unchanged, so existing
hashes stay valid.

---

## Local development

```bash
cp server/.env.example server/.env     # then fill it in
npm run dev                             # site on :5173, API on the same origin
npm run api                             # standalone API on :8787
npm run tactics:validate                # checks the tactics content files
```

Point `DATABASE_URL` at a local PostgreSQL for development. Any Postgres will
do — the schema is applied automatically on first start.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `DATABASE_URL is not set` | The environment variable is missing in Vercel |
| `too many connections` | The direct connection string is in use — switch to the session pooler |
| Articles 404 but the site loads | The SPA rewrite is missing from `vercel.json` |
| Images upload then 404 | The bucket name does not match `BLOG_UPLOAD_BUCKET`, or the bucket is not private |
| `column "id" does not exist` | The schema was applied by an older version — re-run `server/schema.sql` |
| The feed is missing your newest articles | `DATABASE_URL` is not available at build time |
