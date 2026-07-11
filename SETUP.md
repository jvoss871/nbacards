# CardPicks — Setup

## 1. Create a Supabase project

Go to supabase.com → New project. Free tier is fine.

## 2. Run the schema + seed

In the Supabase SQL Editor, run these files **in order**:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

## 3. Add env vars

Edit `.env.local` with your project values (found in Supabase → Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

## 4. Start the dev server

```bash
cd sports-card-game
npm run dev
```

Open http://localhost:3000

## Economy summary

| Action | Credits |
|--------|---------|
| Correct pick (no card) | 10 |
| Correct pick (Bronze card) | 11 |
| Correct pick (Silver card) | 13 |
| Correct pick (Gold card) | 15 |
| Correct pick (Platinum card) | 20 |

| Pack | Cost | Cards |
|------|------|-------|
| Starter Pack | 40 | 3 |
| Silver Boost | 120 | 5 |
| Gold Rush | 300 | 7 |
| Platinum Elite | 1000 | 7 |

You start with **150 credits** — enough for a Starter Pack immediately, or save for Silver Boost.
