# Production setup

The website works immediately in local preview mode, storing edits in the browser. That mode is useful for design and content rehearsal only; it is not shared across devices and does not provide secure admin access.

To use the production CMS:

1. Create a Supabase project.
2. In the Supabase SQL editor, run [supabase/schema.sql](supabase/schema.sql).
3. Create the tournament administrator in **Authentication > Users**.
4. Run the final commented `insert` statement in the schema with that user's Auth UUID. This permits only that account to publish content.
5. Copy `.env.example` to `.env.local` for local testing and add the real Supabase URL and anon key.
6. In Netlify, add the same values as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables, then deploy.

The public site is readable without login. Open `/#admin` and sign in with the authorised Supabase user to manage tournament settings, teams, fixtures, standings, history and contacts. Every save publishes immediately to the public site.
