# Fehm-e-Quran — Vercel-ready quiz

A single-page, responsive HTML/CSS/JavaScript quiz based on the supplied bank of **562 MCQs**. No React, Node.js backend, database, environment variables, or build process is needed.

## What's improved

- 562 questions retained with shorter, clearer English wording; Arabic and Urdu displayed where relevant.
- One question at a time, with four options and a short explanation after answering in Practice Mode.
- Challenging 50-question timed mock exam (45 minutes) weighted toward advanced grammar, verb forms and particles.
- Practice progress and active mock session saved in browser localStorage.
- Topic filters, search, unanswered-only filter, bookmarks, random question, skip and back/next controls.
- Mobile, tablet and desktop layouts.

## Run locally

Open `index.html` in Chrome or Edge. Alternatively, serve the folder using `python -m http.server 8000` and visit `http://localhost:8000`.

## Deploy on Vercel — CLI

From this folder, run:

```bash
npx vercel login
npx vercel --prod
```

Follow the CLI prompts. Use the existing directory (`.`), framework preset **Other**, and no build command. Your public link is printed by the Vercel CLI.

## Deploy on Vercel — GitHub

1. Upload these five files (`index.html`, `styles.css`, `app.js`, `questions.js`, `vercel.json`) to the root of a GitHub repository.
2. In [vercel.com/new](https://vercel.com/new), import the repository.
3. Set **Framework Preset: Other**. Set **Root Directory: `.`**. No build command or environment variables are required.
4. Click **Deploy** and open the generated `*.vercel.app` URL.

> Browser localStorage only saves results on the same device/browser; there are no online user accounts or shared scores.
>
> This is an independent practice bank based on the uploaded content. Past-paper labels and syllabus claims from the source were not independently verified.
