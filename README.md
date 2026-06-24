# Anukool Yadav — Portfolio

Personal portfolio website with a dynamic blog backend, built with vanilla HTML/CSS/JS and a Node.js + Express + MongoDB stack.

**Live →** [anukoolyadav.onrender.com](https://anukoolyadav.onrender.com)

---

## Features

- Night sky parallax hero with animated stars, nebula orbs, and mountain layers
- Deep space recession effect as you scroll
- Vertical animated left-side navigation bar
- Dark / Light mode toggle (persisted to localStorage)
- Horizontal skill progress bars with shimmer animation
- 3D diamond hover effect on contact links
- Dynamic blog — write and publish posts from an admin panel
- Resume PDF download via server route
- MongoDB Atlas for blog post storage
- Fully responsive — mobile fallback bottom nav

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas + Mongoose |
| Fonts | Inter, Fira Code (Google Fonts) |
| Icons | Font Awesome 6 |
| Markdown | marked.js |
| Hosting | Render |

---

## Project Structure

```
portfolio/
├── index.html          # Main portfolio (all sections + CSS + JS)
├── admin.html          # Blog admin panel
├── server.js           # Express API server
├── package.json
├── render.yaml         # Render deployment config
├── .env                # Local environment variables (not committed)
├── .gitignore
└── Anukool_CV2026.pdf  # Resume file served via /download/resume
```

---

## Local Setup

**1. Clone the repo**
```bash
git clone https://github.com/Anukoolyadav/portfolio.git
cd portfolio
```

**2. Install dependencies**
```bash
npm install
```

**3. Create `.env` file**
```env
MONGODB_URI=your_mongodb_atlas_uri
ADMIN_PASS=your_admin_password
PORT=3000
```

> **Note:** In the MongoDB URI, URL-encode any special characters in your password.  
> Example: `@` → `%40`, so `Pass@123` becomes `Pass%40123`

**4. Start the server**
```bash
npm start
```

Open `http://localhost:3000`

---

## Blog Admin

Visit `http://localhost:3000/admin.html`

- Enter your `ADMIN_PASS` to log in
- Create, edit, publish, or delete blog posts
- Markdown supported with live preview

---

## Deployment (Render)

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Render auto-detects `render.yaml`
4. Add environment variables in Render dashboard:
   - `MONGODB_URI` — your Atlas connection string
   - `ADMIN_PASS` — your admin password
5. MongoDB Atlas → Network Access → allow `0.0.0.0/0`

To prevent cold-start delays on the free tier, add a free monitor at [uptimerobot.com](https://uptimerobot.com) pinging your Render URL every 5 minutes.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/posts` | — | All published posts |
| GET | `/api/posts/:id` | — | Single post |
| POST | `/api/posts` | ✓ | Create post |
| PUT | `/api/posts/:id` | ✓ | Update post |
| DELETE | `/api/posts/:id` | ✓ | Delete post |
| GET | `/api/admin/posts` | ✓ | All posts including drafts |
| GET | `/download/resume` | — | Download resume PDF |
| GET | `/health` | — | Health check |

Auth: pass `x-admin-pass: <password>` header.

---

## Sections

| Section | Description |
|---------|-------------|
| Hero | Name, bio, social links, CTA buttons |
| About | Summary + animated stat cards |
| Skills | Horizontal progress bars (4 categories) |
| Projects | Row-based project list with tech tags |
| Blog | Dynamic posts from MongoDB |
| Experience | Timeline of work history |
| Certifications | Row list with issuer |
| Achievements | LeetCode, HackerRank, Research |
| Education | Academic background |
| Contact | 3D diamond social buttons |

---

## License

MIT — free to use as a template. Attribution appreciated but not required.
