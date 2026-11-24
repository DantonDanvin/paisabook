# PaisaBook

A fast, simple expense and money manager for Android and the web (Add to Home Screen on iPhone).
Built with Expo (React Native) and Supabase. Both versions use the same database, so data is the same everywhere.

## Run it

```bash
npx expo start
```

- **Android phone:** install Expo Go, connect to the same Wi-Fi, scan the QR code.
- **Browser:** press `w`.

## First-time database setup

Open the Supabase dashboard → **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**.
The project URL and publishable key go in `.env.local` (not committed to git).

## How it is organised

- `src/app/(tabs)/` — the four tabs: Accounts, Chart, Calendar, Settings
- `src/app/txn.tsx` — add/edit an income or expense
- `src/app/account/[id].tsx` — transactions of one account
- `src/lib/store.ts` — all data: kept on the phone, changes queued and synced to Supabase
- `supabase/schema.sql` — database tables and security rules

## Upcoming transactions

A transaction dated in the future is "upcoming": it is listed but not counted in the balance.
It starts counting automatically when its time arrives, or immediately when you tap **Done** on it.
