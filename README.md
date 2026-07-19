# Findable Directory

An AI-optimised UK business directory, server-rendered as **Cloudflare Pages Functions**. It reads
the **same Supabase** project as LeadFinderOS (tables `directory_businesses` + `business_reports`) — one
data source, no duplicate DB. Served on its own domain (`findabledirectory.com`; test on `*.pages.dev`).

## Routes (all SSR, no client JS)
| URL | File | What |
|-----|------|------|
| `/` | `public/_redirects` | 302 → `/directory` |
| `/directory` | `functions/directory/index.ts` | homepage — categories + counts |
| `/directory/:niche` | `functions/directory/[niche].ts` | category — ranked businesses + "browse by area" |
| `/directory/:niche/:seg` | `functions/directory/[niche]/[slug].ts` | smart handler — **area listing** if `:seg` is a known area, else **business profile** |
| `/sitemap.xml` | `functions/sitemap.xml.ts` | dynamic sitemap of every page + published `/r/` reports |
| `/robots.txt` | `functions/robots.txt.ts` | allow-all + explicit AI crawlers + sitemap pointer |

`functions/directory/_shared.ts` is the shared Findable-brand template (header/nav/footer + CSS + card
helpers). It's `_`-prefixed so Pages never routes it.

## Environment variables (Pages → Settings → Environment variables)
| Var | Value | Notes |
|-----|-------|-------|
| `SUPABASE_URL` | `https://ruusxpkkmwtljxxulhbq.supabase.co` | same Supabase as LeadFinderOS |
| `SUPABASE_ANON_KEY` | the public anon key | read-only via RLS |
| `REPORTS_ORIGIN` | `https://yoursites.uk` | where `/r/` audit reports live (a different domain) |

Local dev: copy `.dev.vars.example` → `.dev.vars`, then `npx wrangler pages dev public`.

## Deploy
1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → **Create → Pages → Connect to Git** → select the repo.
3. Build settings: **build command = (none)**, **build output directory = `public`**. (Functions in
   `functions/` are picked up automatically; `wrangler.toml` already sets `pages_build_output_dir`.)
4. Add the three environment variables above (Production + Preview).
5. Deploy → live on `<project>.pages.dev`. Add `findabledirectory.com` as a custom domain when ready.

## Prerequisites in Supabase (shared with LeadFinderOS)
The pages read `directory_businesses` with the **anon** key, so that table needs an anon SELECT grant +
public-read RLS policy (including the `description` column), and the `description` /
`description_generated_at` columns must exist. Until then, pages render the graceful "coming soon" /
"no listings" states. Data is populated by LeadFinderOS's `scrape-directory` + `enrich-directory-business`
edge functions (which stay in LeadFinderOS — not duplicated here).
