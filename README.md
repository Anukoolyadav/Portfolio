# Anukool Yadav — Portfolio

Personal portfolio website built with vanilla HTML/CSS/JS on a Node.js + Express backend, with MongoDB for admin-managed content.

**Live →** [anukoolyadav.onrender.com](https://anukoolyadav.onrender.com)

---

## Features

- Night sky parallax hero with animated stars, nebula orbs, and mountain layers
- Deep space recession effect as you scroll
- Vertical animated left-side navigation bar (bottom bar on mobile)
- Dark / Light mode toggle (persisted to localStorage)
- Horizontal skill progress bars with shimmer animation
- 3D diamond hover effect on contact links
- Contact form that emails me via [Resend](https://resend.com)
- Resume PDF download via server route
- Password-protected admin panel (bcrypt + signed session cookie) to add, edit, reorder (drag and drop), publish and delete Projects and Experience
- Hardened: CSP via helmet, login rate limiting, same-origin checks on admin writes

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JS |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Email | Resend |
| Fonts | Inter, Fira Code (Google Fonts) |
| Icons | Font Awesome 6 |
| Hosting | Render (today) — AWS EC2 planned |

---

## Project Structure

```
portfolio/
├── server.js               # Entry: env checks, DB connect, listen
├── app.js                  # Express app (routes, SSR home page) — imported by tests
├── data/*.seed.json        # Seed + fallback data (projects, experience)
├── scripts/seed.js         # Idempotent local seeding
├── tests/                  # Jest + Supertest
├── src/
│   ├── admin/              # Shared admin CRUD router + input whitelist
│   ├── auth/session.js     # Signed session cookie (HMAC)
│   ├── config/             # DB, env validation, security headers, trust proxy
│   ├── config/db.js        # MongoDB connection (retries on failure)
│   ├── middleware/
│   │   ├── auth.js         # Admin password check (constant-time)
│   │   └── requireDB.js    # 503 until the DB is connected
│   ├── models/             # Project, Experience + shared validators
│   ├── services/           # Public queries + page rendering/cache (pageView)
│   ├── views/              # Section markup (projects, experience)
│   ├── controllers/        # Route handlers
│   ├── routes/             # /api/projects, /api/experience, /api/admin, /api/contact
│   └── utils/              # escapeHtml, slugify, URL checks
├── public/                 # Served as static files
│   ├── index.html          # Portfolio page
│   ├── admin.html          # Admin panel (Projects | Experience)
│   ├── css/style.css
│   └── js/                 # main.js (site), admin.js (admin panel)
├── docs/project-doc.html   # Learning notes on how the project was built
├── Anukool_CV2026.pdf      # Resume served via /download/resume
├── render.yaml             # Render deployment config
└── .env.example            # Environment variable template
```

---

## Local Setup

**1. Clone the repo**
```bash
git clone https://github.com/Anukoolyadav/Portfolio.git
cd Portfolio
```

**2. Install dependencies**
```bash
npm install
```

**3. Create `.env`** from the template and fill in values
```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `ADMIN_PASS_HASH` | **Yes** — server refuses to start without it | bcrypt hash of the admin password: `npm run hash-password` |
| `SESSION_SECRET` | **Yes** — min 32 chars | Signs the admin session cookie: `openssl rand -hex 32` |
| `MONGODB_URI` | No — DB features disabled if unset | e.g. `mongodb://127.0.0.1:27017/portfolio` for local MongoDB |
| `RESEND_API_KEY` | No — contact form returns 503 if unset | Resend API key |
| `PORT` | No (default `3000`) | HTTP port |
| `NODE_ENV` | No | `development` / `production` (production ⇒ Secure cookie, HSTS) |
| `TRUST_PROXY` | No (default off) | `1` behind a single reverse proxy, so rate limiting sees real client IPs |
| `LOGIN_RATE_LIMIT_MAX` | No (default `5`) | Failed sign-ins allowed per window |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | No (default `900000`) | Rate-limit window |

> `ADMIN_PASS_HASH` contains `$` characters. In `.env` it works quoted or unquoted
> (dotenv 16 does not expand variables); single quotes are the safest habit. In a
> hosting dashboard (Render) paste the raw hash **without** quotes.

> Never commit `.env`. It is git-ignored.

**4. Start the server**
```bash
npm start        # or: npm run dev (auto-restart with nodemon)
```

Open `http://localhost:3000`.

**5. (Optional) Seed projects and experience into your local DB**
```bash
npm run seed                      # inserts missing entries from data/*.seed.json
npm run seed -- --update          # also overwrite existing ones with seed values
npm run seed -- --only=experience # one resource only (projects | experience)
```
The seed script refuses to run unless `MONGODB_URI` points to localhost (override with `--allow-remote`). Seed entries are matched by a stable `seedKey`, so renaming a seeded project or editing a seeded experience entry in the admin never creates a duplicate on re-seed. Documents created in the admin have no `seedKey`.

**6. Run tests** (needs a local MongoDB on `127.0.0.1:27017`; uses a separate `portfolio_test` DB)
```bash
npm test
```

---

## Admin

Visit `/admin.html` and sign in with your admin password. Two tabs — **Projects** and **Experience** — each with:

- a list you can reorder by dragging ⠿ (saved immediately),
- an editor for every field, with per-field validation messages,
- publish / unpublish (drafts are never shown on the site), plus a featured toggle for projects,
- delete with confirmation.

Changes appear on the public page immediately (the server-side render cache is invalidated on every write).

### How login works

1. `POST /api/admin/login` compares the password against `ADMIN_PASS_HASH` with bcrypt.
2. On success the server sets `admin_session`: an HMAC-signed token in a cookie that is
   `HttpOnly`, `SameSite=Strict`, `Path=/api/admin`, 8 hours, and `Secure` when `NODE_ENV=production`.
   The password is never stored in JavaScript or in browser storage, and the cookie cannot be read by scripts.
3. Every admin request is authenticated by that cookie. A reload keeps you signed in until it expires.
4. `POST /api/admin/logout` clears it.

Extra protections: **5 failed sign-ins per IP per 15 minutes** (a lockout returns `429`), and
state-changing admin requests must be **same-origin** (`Origin`/`Referer` host must match `Host`, else `403`).

> **Behind a reverse proxy**, pass the Host header through unchanged or every admin write will be
> rejected: `proxy_set_header Host $host;` in Nginx. Set `TRUST_PROXY=1` there too.

> Sessions are stateless: logging out clears your cookie, but an already-issued token stays valid
> until it expires. To invalidate every session at once, change `SESSION_SECRET` and restart.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/projects` | — | Published projects, sorted by `order` |
| GET | `/api/projects/:slug` | — | One published project (404 for drafts) |
| GET | `/api/experience` | — | Published experience/internship entries, sorted by `order` |
| POST | `/api/admin/login` | — | `{ "password": "…" }` → sets the session cookie (rate limited) |
| POST | `/api/admin/logout` | — | Clears the session cookie |
| GET | `/api/admin/session` | ✓ | `200 { ok: true }` while signed in |
| GET | `/api/admin/{projects,experience}` | ✓ | All entries incl. drafts, by order |
| POST | `/api/admin/{projects,experience}` | ✓ | Create (draft by default) |
| PUT | `/api/admin/{projects,experience}/:id` | ✓ | Update (whitelisted fields only) |
| DELETE | `/api/admin/{projects,experience}/:id` | ✓ | Delete |
| PATCH | `/api/admin/{projects,experience}/:id/publish` | ✓ | `{ "published": true \| false }` |
| PATCH | `/api/admin/{projects,experience}/reorder` | ✓ | `{ "ids": [...] }` — every id exactly once |
| POST | `/api/contact` | — | Send a contact-form message |
| GET | `/download/resume` | — | Download resume PDF |
| GET | `/health` | — | Health check |

Auth (✓): the `admin_session` cookie from `POST /api/admin/login`. State-changing admin requests also need a same-origin `Origin`/`Referer`.

---

## Deployment

**Today — Render.** The repo includes a `render.yaml` blueprint (`npm install` → `npm start`, health check on `/health`). Set `ADMIN_PASS_HASH`, `SESSION_SECRET`, `MONGODB_URI`, `RESEND_API_KEY` and `TRUST_PROXY=1` in the Render dashboard's Environment tab.

**Planned — AWS EC2** behind Nginx with Let's Encrypt HTTPS, a process manager, a custom domain, and GitHub Actions CI/CD.

---

## Sections

Projects and Experience are server-rendered from MongoDB. If the DB is unreachable or a collection is empty, the published entries in `data/*.seed.json` are shown instead; if entries exist but none are published, the section shows an empty state.


| Section | Description |
|---------|-------------|
| Hero | Name, bio, social links, CTA buttons |
| About | Summary + animated stat cards |
| Skills | Horizontal progress bars (4 categories) |
| Projects | Server-rendered from MongoDB |
| Experience | Internship/job timeline, server-rendered from MongoDB |
| Certifications | Row list with issuer |
| Achievements | LeetCode, HackerRank, Research |
| Education | Academic background |
| Contact | 3D diamond social buttons + contact form |

---

## License

MIT — free to use as a template. Attribution appreciated but not required.
