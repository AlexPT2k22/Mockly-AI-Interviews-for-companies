Mockly

## Analytics

This project includes a lightweight analytics abstraction in `src/lib/analytics.ts`.

### Tracking

Use `track('event_name', { optional: 'props' })` to emit events. By default events log to the console.

### Adding a Provider (Example: PostHog)

Install dependency:

```bash
npm install posthog-js
```

Initialize (e.g. in `main.tsx`):

```ts
import posthog from "posthog-js";
import { setAnalyticsProvider } from "./lib/analytics";

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: "https://app.posthog.com",
});

setAnalyticsProvider({
  track: (event, props) => posthog.capture(event, props),
  identify: (id, traits) => {
    posthog.identify(id, traits);
  },
  page: (name, props) => posthog.capture("$pageview", { name, ...props }),
});
```

Environment variable `VITE_POSTHOG_KEY` should be defined in a `.env` file.

### Event Reference (current)

| Area     | Events                                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CTAs     | `cta_click` (location: header, header_mobile, hero; action: open_demo, open_waitlist)                                                                       |
| Demo     | `demo_play_toggle`, `demo_restart`, `demo_completed`, `demo_close`, `demo_close_footer`, `demo_join_waitlist_click`, `demo_volume_change`                   |
| Waitlist | `waitlist_interest_toggle`, `waitlist_submit_attempt`, `waitlist_submit_success`, `waitlist_submit_error`, `waitlist_success_close`, `waitlist_modal_close` |
| Features | `feature_card_click`, `feature_card_key_activate`                                                                                                           |

Add new events consistently with snake_case names.

## Waitlist Storage (Supabase)

Create the `waitlist` table in Supabase (SQL editor):

```sql
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  role text,
  company text,
  experience_level text,
  interests text[] default '{}',
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Allow inserts from anon (optional; refine for production)
create policy "Allow insert waitlist" on public.waitlist for insert
  with check (true);

-- (Optional) allow read aggregate counts later
create policy "Allow select count" on public.waitlist for select
  using (true);
```

Environment variables required (in `.env.local`):

```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

The form in `WaitlistModal` writes directly to this table and gracefully handles duplicate emails (unique constraint 23505).

### Realtime Count

O contador em tempo real no Hero usa Realtime Postgres Changes. Certifique-se de que o projeto Supabase tem Realtime ativado e que a tabela `waitlist` está marcada para "Broadcast".

Passos:

1. Dashboard Supabase > Realtime > Configurar para schema `public`.
2. Em Table Editor, abra `waitlist` e habilite Realtime se ainda não estiver.
3. Policies já permitem `select` head para contar; opcionalmente restringir depois.

O hook `useWaitlistCount` faz:

- Select head para count inicial (`select('*', { head: true, count: 'exact' })`).
- Assina canal `postgres_changes` em `waitlist` (qualquer evento) e reconsulta o count.

Evento analytics: `waitlist_count_update` dispara a cada atualização.
