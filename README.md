# Callbox Idea Lab

AI-powered blog content suite for Callbox Inc. Built with Next.js (App Router) and Google Gemini.

## Features

- **Let's Generate!** with three modes: Event-Based (US / SG / AU holidays), Custom Topic, and Abrakada Blog (trend-inspired topics)
- **4 blog types**, each with its own structure and voice: Listicle, How-To, Strategy, Article
- **Blog Packed**: saved articles, rewrite by tone and character range, DOC export
- **Char Counter**
- SEO optimize, graphics prompt ideas, copy-all, DOC download named after the article title

## Run locally

```powershell
npm install
copy .env.example .env.local
# open .env.local and set GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | Get one at https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |

The key is only read inside `app/api/ai/route.js` (server-side). It is never sent to the browser, so do **not** prefix it with `NEXT_PUBLIC_`.

## Deploy: GitHub then Vercel

```powershell
git init
git add .
git commit -m "Initial commit: Callbox Idea Lab"
git branch -M main
git remote add origin https://github.com/<your-org>/callbox-idea-lab.git
git push -u origin main
```

1. Vercel dashboard, **Add New, Project**, import the repo. Framework is auto-detected as Next.js.
2. Before the first deploy, open **Environment Variables** and add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) for Production, Preview and Development.
3. Deploy.

If you added the key after deploying, redeploy once. Env vars only apply to new builds.

## Things to know

- **Protect the deployment.** `/api/ai` is a public endpoint that spends your Gemini quota. Turn on Vercel Deployment Protection (Settings, Deployment Protection) so only your team can reach it.
- **Holiday dates are for 2026.** Update `STATIC_HOLIDAYS` in `components/IdeaLab.jsx` each year. SG dates follow the official MOM list.
- **The Bucket and Blog Packed live in memory.** Refreshing the page clears them. Download DOCs you want to keep.
- Errors from Gemini (bad key, quota, blocked content) show in a red banner at the top of the app.

## Project layout

```
app/
  api/ai/route.js     Gemini proxy (server-side, holds the key)
  layout.jsx
  page.jsx
components/
  IdeaLab.jsx         The whole UI
lib/
  ai.js               Client helper that calls /api/ai
```
