// Cloudflare Pages Function for /sitemap.xml — dynamic sitemap of the whole directory.
//
// Routing: the filename `sitemap.xml.ts` maps to the exact path /sitemap.xml (Pages strips the .ts,
// keeps .xml). No static /sitemap.xml exists in this project, so nothing shadows it.
//
// Lists: /directory, every /directory/<niche>, every /directory/<niche>/<area>, and every
// /directory/<niche>/<slug>. All URLs use the REQUEST origin (correct on .pages.dev now and
// findabledirectory.com later) so the directory advertises ONLY its own /directory/ pages — the
// external yoursites.uk /r/ business-report URLs are no longer listed. Reads with the anon key +
// Supabase REST — SAME env access (context.env) and fetch pattern as functions/directory/index.ts,
// and selects ONLY anon-granted columns (niche/area/name) — no lastmod, so no ungranted-column 403.

import { anonHeaders, slugify, escHtml, type Env } from "./directory/_shared";

// PostgREST page cap. Fine for the current dataset; past this you'd paginate or emit a sitemap index.
const ROW_LIMIT = 10000;

interface BizRow { niche?: string; area?: string; name?: string }

/** Fetch a JSON array via anon REST. On a non-ok response (e.g. a 403 permission-denied for a column)
 *  or a thrown error, LOG it and return [] — so a failure surfaces in logs instead of silently
 *  producing a near-empty sitemap, while the sitemap is still built from whatever else succeeded. */
async function fetchRows<T>(url: string, env: Env, label: string): Promise<T[]> {
  try {
    const r = await fetch(url, { headers: anonHeaders(env) });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.error(`sitemap: ${label} query failed (HTTP ${r.status}): ${body.slice(0, 300)}`);
      return [];
    }
    const data = await r.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch (e) {
    console.error(`sitemap: ${label} query threw:`, e instanceof Error ? e.message : String(e));
    return [];
  }
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { env } = context;
  const origin = new URL(context.request.url).origin;

  // Only anon-granted columns (matches the homepage/category selects) — no scraped_at / updated_at.
  const businesses = await fetchRows<BizRow>(
    `${env.SUPABASE_URL}/rest/v1/directory_businesses?select=niche,area,name&limit=${ROW_LIMIT}`,
    env, "directory_businesses",
  );

  // Build a de-duplicated, ordered set of loc URLs: root → categories → areas → businesses.
  const locs = new Set<string>();
  locs.add(`${origin}/directory`);

  const niches = new Set<string>();
  const areas = new Set<string>();            // key: `${niche}\t${area}` (TAB — areas may contain spaces)
  const bizLocs: string[] = [];
  for (const b of businesses) {
    const niche = (b.niche || "").trim().toLowerCase();
    const name = (b.name || "").trim();
    if (!niche || !name) continue;
    niches.add(niche);
    const area = (b.area || "").trim().toLowerCase();
    if (area) areas.add(`${niche}\t${area}`);
    bizLocs.push(`${origin}/directory/${encodeURIComponent(niche)}/${slugify(name)}`);
  }

  for (const niche of niches) locs.add(`${origin}/directory/${encodeURIComponent(niche)}`);
  for (const key of areas) {
    const [niche, area] = key.split("\t");
    locs.add(`${origin}/directory/${encodeURIComponent(niche)}/${encodeURIComponent(area)}`);
  }
  for (const loc of bizLocs) locs.add(loc);

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [...locs].map((loc) => `  <url><loc>${escHtml(loc)}</loc></url>`).join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
