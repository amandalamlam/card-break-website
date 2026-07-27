# Phase 0 Setup Guide (Beginner Friendly)

Follow these steps in order. Each step explains **what** you are doing and **why**.

---

## Step 1 — Install Node.js (required first)

Node.js runs the tools that power your website on your computer.

1. Open [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (recommended for most users)
3. Run the installer and accept the defaults
4. **Restart Cursor** after installation (important so the terminal sees Node)

Verify it worked — open **Terminal** in Cursor (`Terminal → New Terminal`) and run:

```bash
node -v
npm -v
```

You should see version numbers (e.g. `v22.x.x` and `10.x.x`). If you see `command not found`, restart Cursor and try again.

---

## Step 2 — Install project dependencies

Dependencies are pre-written code libraries (Next.js, Tailwind, etc.) your project needs.

In the terminal, run:

```bash
cd /Users/amanda/Desktop/card-break-website
npm install
```

This creates a `node_modules` folder. That is normal — do not edit it by hand.

**Expected time:** 1–3 minutes depending on your internet speed.

---

## Step 3 — Create your local environment file

Environment files store secret keys (Supabase, Stripe) later. For now we use placeholders.

```bash
cp .env.example .env.local
```

You do **not** need to fill in Supabase or Stripe keys yet. Phase 0 works without them.

---

## Step 4 — Start the development server

```bash
npm run dev
```

When you see `Ready`, open your browser:

| URL | Language |
|-----|----------|
| [http://localhost:3000/zh-Hant](http://localhost:3000/zh-Hant) | 繁體中文 (default) |
| [http://localhost:3000/en](http://localhost:3000/en) | English |
| [http://localhost:3000/zh-Hans](http://localhost:3000/zh-Hans) | 简体中文 |

Use the **language switcher** in the top-right to test all three.

To stop the server: press `Ctrl + C` in the terminal.

---

## Step 5 — Create free accounts (no coding yet)

Create these accounts now so they are ready for later phases. You can skip connecting them until Phase 1.

### GitHub (code backup + deploy)

1. Go to [https://github.com/signup](https://github.com/signup)
2. Create an account
3. Later we will push this project to a repository

### Supabase (database + login) — Phase 1

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up → **New project**
3. Choose region: **Singapore** (closest to Hong Kong)
4. Save your database password somewhere safe

### Stripe (payments) — Phase 5

Your Stripe HK account is not ready yet — that is fine.

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. You can register with a personal email for now
3. Stay in **Test mode** (toggle in the dashboard) while building
4. HK-specific methods (FPS, PayMe) will be configured when your HK account is approved

### Vercel (hosting) — end of Phase 0

1. Go to [https://vercel.com/signup](https://vercel.com/signup)
2. Sign up with the **same GitHub account**
3. We will deploy after Step 6

---

## Step 6 — Initialize Git and push to GitHub (optional but recommended)

Git tracks changes to your code. GitHub stores a backup online and connects to Vercel.

```bash
cd /Users/amanda/Desktop/card-break-website
git init
git add .
git commit -m "Phase 0: Next.js scaffold with i18n and placeholder homepage"
```

On GitHub, create a new **empty** repository named `card-break-website` (no README).

Then run (replace `YOUR_GITHUB_USERNAME`):

```bash
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/card-break-website.git
git push -u origin main
```

---

## Step 7 — Deploy to Vercel (get a live URL)

1. Log in to [https://vercel.com](https://vercel.com)
2. Click **Add New → Project**
3. Import your `card-break-website` GitHub repo
4. Leave default settings → **Deploy**
5. After ~2 minutes you get a live URL like `https://card-break-website.vercel.app`

Your Phase 0 deliverable is complete when that URL shows the homepage in Traditional Chinese.

---

## What was set up for you

| File / folder | Purpose |
|---------------|---------|
| `src/app/[locale]/` | Pages for each language |
| `messages/zh-Hant.json` | 繁體中文 text |
| `messages/en.json` | English text |
| `messages/zh-Hans.json` | 简体中文 text |
| `src/i18n/` | Language routing logic |
| `src/components/` | Header, footer, language switcher |
| `.env.example` | Template for future API keys |

---

## Troubleshooting

### `command not found: node`
Node.js is not installed or Cursor was not restarted after install. Redo Step 1.

### `Port 3000 is already in use`
Another app is using that port. Run instead:

```bash
npm run dev -- -p 3001
```

Then open `http://localhost:3001/zh-Hant`.

### Page shows an error after `npm install`
Run:

```bash
rm -rf node_modules .next
npm install
npm run dev
```

---

## When Phase 0 is done, tell me:

> "Phase 0 is working — I can see the homepage locally" (or share your Vercel URL)

We will then start **Phase 1: Supabase database setup**.
