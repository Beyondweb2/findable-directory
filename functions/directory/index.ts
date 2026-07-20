// Cloudflare Pages Function for /directory — the directory homepage.
//
// Fully server-rendered (via the shared shell in ./_shared). Queries directory_businesses with the
// anon key + Supabase REST (config from context.env), derives the DISTINCT niches present + a count
// per niche, and renders a hero + a grid of category cards linking to /directory/<niche>. No data →
// a graceful "coming soon" instead of an empty page.

import { renderDirectoryPage, escHtml, nicheLabel, anonHeaders, IMG_OFFICE, HERO_WAVE, DIRECTORY_NAME, DIRECTORY_TAGLINE, type Env } from "./_shared";

interface NicheRow { niche?: string }

export const onRequestGet = async (context: { request: Request; params: Record<string, string>; env: Env }) => {
  const { env } = context;
  const origin = new URL(context.request.url).origin; // correct canonical/OG wherever this is served
  const canonical = `${origin}/directory`;

  // Pull the niches present. RLS/anon-read gates which rows are visible; a blocked/empty read just
  // yields the "coming soon" state below (never a broken page). Capped at PostgREST's default page.
  let rows: NicheRow[] = [];
  try {
    const apiUrl = `${env.SUPABASE_URL}/rest/v1/directory_businesses?select=niche`;
    const r = await fetch(apiUrl, { headers: anonHeaders(env) });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) rows = data as NicheRow[];
    }
  } catch {
    // network/parse failure → treat as no data (graceful coming-soon)
  }

  // Distinct niches + counts (aggregated here; directory_businesses has no server-side group view yet).
  const counts = new Map<string, number>();
  for (const row of rows) {
    const n = (row.niche || "").trim().toLowerCase();
    if (!n) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  const niches = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const title = `${DIRECTORY_NAME} — ${DIRECTORY_TAGLINE}`;
  const metaDescription =
    "A UK business directory helping people find trusted local firms — browse by category to compare businesses in your area.";

  // JSON-LD: the directory as a WebSite + a CollectionPage listing the category links.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: metaDescription,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: DIRECTORY_NAME, url: `${origin}/directory` },
    hasPart: niches.map(([niche]) => ({
      "@type": "CollectionPage",
      name: nicheLabel(niche),
      url: `${origin}/directory/${encodeURIComponent(niche)}`,
    })),
  });

  // Hero with the proven office image behind a dark overlay (see .hero--img in _shared).
  const hero =
`<section class="hero hero--img" style="background-image:url('${IMG_OFFICE}')">
<div class="container">
<h1>Find trusted UK businesses</h1>
<p>Browse local firms by category, compare them side by side, and find the right one for you — accountants, tradespeople and more, all in one place.</p>
</div>
${HERO_WAVE}
</section>`;

  let categoriesSection: string;
  if (niches.length === 0) {
    // Graceful empty state — no data yet (or anon read not yet enabled).
    categoriesSection =
`<section class="section">
<div class="container">
<div class="empty">
<h2>Coming soon</h2>
<p>We're building this directory now. Categories and listings will appear here shortly.</p>
</div>
</div>
</section>`;
  } else {
    const cards = niches.map(([niche, count]) => {
      const label = nicheLabel(niche);
      const href = `/directory/${encodeURIComponent(niche)}`;
      const noun = count === 1 ? "business" : "businesses";
      return (
`<a class="card" href="${escHtml(href)}">
<h3>${escHtml(label)}</h3>
<div class="count">${count} ${noun}</div>
<span class="arrow">Browse ${escHtml(label.toLowerCase())} &rarr;</span>
</a>`
      );
    }).join("\n");
    const catNoun = niches.length === 1 ? "category" : "categories";
    categoriesSection =
`<section class="section">
<div class="container">
<div class="section-head">
<h2>Browse by category</h2>
<p class="sub">${niches.length} ${catNoun} of trusted UK businesses.</p>
</div>
<div class="grid">
${cards}
</div>
</div>
</section>`;
  }

  const howSection =
`<section class="section"><div class="container">
<div class="section-head"><h2>How Findable works</h2><p class="sub">A directory built to be read - by people and by AI search.</p></div>
<div class="grid">
<div class="info"><h3>Ranked by real reviews</h3><p>Firms are ordered by genuine ratings and review counts, never by who paid. Featured clients are marked and listed honestly alongside everyone else.</p></div>
<div class="info"><h3>Checked and structured</h3><p>Every listing's name, location and services are marked up so search engines and AI assistants can read exactly who each firm is.</p></div>
<div class="info"><h3>Built to be found by AI</h3><p>When someone asks chatgpt or gemini for a trusted local firm, this is the kind of clear, structured source those tools read and cite.</p></div>
</div>
</div></section>`;

  const coverageSection =
`<section class="section"><div class="container" style="text-align:center">
<p class="sub" style="max-width:60ch;margin:0 auto">Findable is growing. Right now we cover accountants in Peterborough, ranked honestly, with more trades and areas being added.</p>
</div></section>`;

  const bodyHtml = `${hero}\n${categoriesSection}\n${howSection}\n${coverageSection}`;

  const html = renderDirectoryPage({ title, metaDescription, canonical, jsonLd, bodyHtml });

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=300" },
  });
};
