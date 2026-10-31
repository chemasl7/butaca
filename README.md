# Butaca

**What should we watch tonight?** Butaca learns what you like, checks which streaming services you pay for in Mexico, and picks something for tonight. It also has a six-question "Recommend me a movie" quiz.

This is the first version: no accounts yet. Ratings are saved in each visitor's own browser.

---

## Put it online (about 15 minutes, no coding)

You need three free accounts: **GitHub** (where the code lives), **TMDB** (movie data) and **Vercel** (hosting).

### 1. Get your TMDB token

1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup) and confirm your email.
2. Go to **Settings → API** ([direct link](https://www.themoviedb.org/settings/api)) and request an API key. Choose **Developer**, and describe the project as a personal movie-recommendation website.
3. On the same page, copy the long **API Read Access Token** (it starts with `eyJ`).
4. Keep it private. Don't paste it into chats, emails or the code. It only goes into Vercel, in step 2.

### 2. Deploy on Vercel

1. Go to [vercel.com/signup](https://vercel.com/signup) and choose **Continue with GitHub**.
2. Click **Add New… → Project**, find your `butaca` repository and click **Import**.
3. Open **Environment Variables** and add one:
   - **Key:** `TMDB_READ_TOKEN`
   - **Value:** the token from step 1
4. Click **Deploy**. After a minute or two you'll get a link like `butaca-yourname.vercel.app`. That's your website.

The first visit after each daily refresh can take several seconds while Butaca downloads the catalog from TMDB. After that it's fast.

### No token yet?

The site still works. Without the token it shows a small built-in sample catalog, with a notice at the top. Add the token in Vercel at any time (**Project → Settings → Environment Variables**), then redeploy (**Deployments → ⋯ → Redeploy**).

### Changing the site

Every time new code is pushed to the GitHub repository, Vercel updates the website automatically.

---

## How it works

- **Catalog**: once a day, the site asks TMDB for about 250 popular and highly rated movies, series and documentaries available on streaming in Mexico, including posters, keywords, and which services carry them (TMDB gets that availability from JustWatch).
- **Mood tags**: genres and keywords become tags like *mind-bending*, *cozy* or *dark crime* (see `lib/tags.ts`).
- **Recommendations**: your ratings build a taste profile. Each title is scored by how closely it matches that profile (50%), its TMDB score (25%), popularity (15%) and a hidden-gem bonus (10%). See `lib/recommend.ts`.
- **Quiz**: answers about who's watching, time, mood and services filter and score the catalog (see `components/Quiz.tsx`).

### Where things live

| File | What it does |
|---|---|
| `app/page.tsx` | Home page |
| `app/quiz/page.tsx` | Quiz page |
| `components/Home.tsx` | Spotlight, poster rows and the rating stack |
| `components/Quiz.tsx` | The six questions and the result |
| `lib/tmdb.ts` | Downloads the catalog from TMDB (region, language, size) |
| `lib/services.ts` | Which streaming services are supported |
| `lib/tags.ts` | How genres and keywords become mood tags |
| `lib/recommend.ts` | The recommendation scoring |
| `lib/sample.ts` | The fallback sample catalog |
| `app/globals.css` | All the styling |

To show titles and synopses in Spanish, change `LANGUAGE` in `lib/tmdb.ts` to `"es-MX"`.

### Running it on your own computer (optional)

Requires [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env.local   # then paste your token after TMDB_READ_TOKEN=
npm run dev                  # open http://localhost:3000
```

---

## Credits and terms

Title data and images come from [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability is provided by [JustWatch](https://www.justwatch.com). Both credits appear in the site footer and must stay there.

TMDB's API is free for non-commercial use. If Butaca starts earning money (ads, subscriptions), you'll need a commercial agreement with TMDB first.

## Next steps

- Accounts and friends (Supabase), so ratings follow you across devices and friends can see each other's picks
- Spanish interface
- A page for each title
