// Shared SSR shell for every /directory/* page (homepage, category, business).
//
// Every directory route imports renderDirectoryPage() so they all share ONE header/nav/footer and
// ONE stylesheet — the Findable brand look (navy #1a3d7c + yellow #ffd23f wordmark, subtle #eef1f6
// page tint, navy footer). Palette + typography match src/lib/aiAuditReportHtml.ts (the audit report).
// Fully self-contained: inline CSS, system font stack (no web fonts), no client JS. SEO is ENFORCED
// in renderDirectoryPage — every page gets title, meta description, canonical, OG/twitter + JSON-LD.
//
// Underscore-prefixed (`_shared.ts`) so Cloudflare Pages does not treat it as a route; it exports no
// request handler. Route files import it by relative path (./_shared).

// Cloudflare Pages environment bindings (set in the Pages project → Settings → Environment variables,
// or a local .dev.vars). SUPABASE_* point at the SAME Supabase project as LeadFinderOS. REPORTS_ORIGIN
// is where the /r/ business-profile report pages live (yoursites.uk) — a DIFFERENT domain. (The
// AI-visibility AUDIT reports are a separate /a/ route; the directory now links neither — it links
// its OWN /directory/ profiles.)
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  REPORTS_ORIGIN?: string;
}

/** Supabase REST auth headers from the env-provided anon key (public key; read-only via RLS). */
export function anonHeaders(env: Env): Record<string, string> {
  return { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` };
}

/** Where the public /r/<slug> business-profile report pages are served — LeadFinderOS on yoursites.uk.
 *  (/a/<slug> is the SEPARATE AI-visibility audit route.) Currently unused: the directory links its
 *  OWN /directory/ profiles now; kept for the REPORTS_ORIGIN env + any future cross-link. */
export function reportsOrigin(env: Env): string {
  return (env.REPORTS_ORIGIN || "https://yoursites.uk").replace(/\/+$/, "");
}

export const DIRECTORY_NAME = "Findable";
export const DIRECTORY_WORDMARK = `Findable<span class="dot">.</span>`;
export const DIRECTORY_TAGLINE = "Find trusted UK businesses";

// License-free Unsplash CDN images (commercial-free, no key). BOTH IDs are proven live by the report
// pages (functions/r/[slug].ts) — office + desk/documents. Hero (w=1600) + thumbnail (w=480) variants.
export const IMG_OFFICE = "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1600&q=80";
export const IMG_DESK = "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80";
export const THUMB_OFFICE = "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=480&q=80";
export const THUMB_DESK = "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=480&q=80";
// Neutral office/desk/finance stock pool for ranked cards, chosen deterministically per business
// (stable name hash) so each business always shows the same photo and neighbours vary.
export const DIRECTORY_THUMBS = [
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&q=80",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80",
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80",
  "https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=1200&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80",
];

/** Pick a hero background for a niche. Only PROVEN-LIVE image IDs are used (office default,
 *  desk/documents for finance-type niches). Add per-niche entries here as new IDs are confirmed. */
export function nicheHeroImage(niche: string): string {
  const key = (niche || "").trim().toLowerCase();
  const map: Record<string, string> = {
    accountant: IMG_DESK, accountants: IMG_DESK, bookkeeper: IMG_DESK, bookkeepers: IMG_DESK,
  };
  return map[key] || IMG_OFFICE;
}

/** business name → clean URL slug (mirrors the generator's slugify). */
export function slugify(name: string): string {
  return String(name || "")
    .toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

/** Raw niche ("accountant", "letting agent") → display label ("Accountants", "Letting Agents"). */
export function nicheLabel(niche: string): string {
  const n = (niche || "").trim().toLowerCase();
  if (!n) return "";
  const titled = n.replace(/\b\w/g, (c) => c.toUpperCase());
  const pluralise = (w: string): string =>
    /[^aeiou]y$/i.test(w) ? w.replace(/y$/i, "ies")
    : /(s|x|z|ch|sh)$/i.test(w) ? `${w}es`
    : /s$/i.test(w) ? w
    : `${w}s`;
  const words = titled.split(" ");
  words[words.length - 1] = pluralise(words[words.length - 1]);
  return words.join(" ");
}

/** Raw area ("peterborough", "uk") → display label ("Peterborough", "UK"). URL keeps the raw area. */
export function areaLabel(area: string): string {
  const a = (area || "").trim();
  if (!a) return "";
  if (a.toLowerCase() === "uk") return "UK";
  return a.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Escape for HTML text/attribute contexts (titles, labels, attributes). */
export function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export interface BreadcrumbItem {
  label: string;
  href?: string; // omit (or leave off the last item) → renders as the current page
}

/** Breadcrumb trail. Final item renders as the current page (no link); earlier href items link. */
export function renderBreadcrumbs(items: BreadcrumbItem[]): string {
  if (!items || items.length === 0) return "";
  const parts = items.map((it, i) => {
    const isLast = i === items.length - 1;
    return it.href && !isLast
      ? `<a href="${escHtml(it.href)}">${escHtml(it.label)}</a>`
      : `<span aria-current="page">${escHtml(it.label)}</span>`;
  });
  return `<nav class="crumbs" aria-label="Breadcrumb">${parts.join('<span class="crumb-sep">/</span>')}</nav>`;
}

// Hero bottom edge is straight now (wave removed). Kept as an empty export so callers that still
// interpolate ${HERO_WAVE} compile unchanged.
export const HERO_WAVE = "";

// One directory_businesses row (all fields the pages read). Shared so category / area / business
// pages agree on shape and reuse the same card + rating + description helpers.
export interface DirectoryBiz {
  name?: string;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  category?: string | null;
  rating?: number | null;
  review_count?: number | null;
  is_client?: boolean | null;
  lead_id?: string | null;
  description?: string | null;
  area?: string | null;
  niche?: string | null;
}

/** Rating snippet: "★ 4.8 (123)" — "" when there's no rating. */
export function ratingHtml(rating: number | null | undefined, reviewCount: number | null | undefined): string {
  if (typeof rating !== "number" || !isFinite(rating)) return "";
  const rc = typeof reviewCount === "number" && reviewCount > 0 ? ` <span class="rc">(${reviewCount})</span>` : "";
  return `<span class="rating"><span class="stars">&#9733;</span>${rating.toFixed(1)}${rc}</span>`;
}

/** A FACTUAL one-line blurb from the row's OWN scraped data (no AI, no invention) — used as the
 *  ranked-card blurb and as the business-page fallback when the AI description is null. `singular`
 *  is the raw niche word (e.g. "accountant"). Deliberately does NOT use b.description (kept short). */
export function describeBusiness(b: DirectoryBiz, singular: string): string {
  const noun = ((b.category || "").trim() || singular).toLowerCase();
  const where = (b.city || "").trim() || (b.address || "").trim();
  let s = where ? `A ${noun} based in ${where}.` : `A ${noun}.`;
  if (typeof b.rating === "number" && isFinite(b.rating)) {
    const rc = typeof b.review_count === "number" && b.review_count > 0
      ? ` from ${b.review_count} review${b.review_count === 1 ? "" : "s"}` : "";
    s += ` Rated ${b.rating.toFixed(1)} out of 5${rc}.`;
  }
  return s;
}

/** One ranked, numbered "best of" business card (shared by the category + area pages so they match).
 *  `index` is 0-based (rank = index+1); imagery cycles the proven Unsplash thumbs; the name links to
 *  the business profile /directory/<niche>/<slug>. */
export function renderRankedCard(b: DirectoryBiz, index: number, niche: string): string {
  const rank = index + 1;
  const name = (b.name || "").trim();
  const href = `/directory/${encodeURIComponent(niche)}/${slugify(name)}`;
  const img = DIRECTORY_THUMBS[index % DIRECTORY_THUMBS.length];
  const badge = b.is_client ? `<span class="featured">Featured</span>` : "";
  const rating = ratingHtml(b.rating, b.review_count);
  const metaBits: string[] = [];
  if (rating) metaBits.push(rating);
  if ((b.category || "").trim()) metaBits.push(escHtml((b.category as string).trim()));
  if ((b.city || "").trim()) metaBits.push(escHtml((b.city as string).trim()));
  const meta = metaBits.join('<span class="dot">&middot;</span>');
  const desc = ((b as any).description || "").trim() || describeBusiness(b, niche);
  const website = (b.website || "").trim();
  const websiteLink = website
    ? `<a href="${escHtml(website)}" target="_blank" rel="nofollow noopener">Visit website &#8599;</a>` : "";
  return (
`<article class="rank">
<div class="rank-media"><img src="${escHtml(img)}" alt="" loading="lazy" width="1200" height="480"><span class="rank-badge" aria-label="Rank ${rank}">${rank}</span></div>
<div class="rank-body">
<div class="rank-head"><h3 class="rank-name"><a href="${escHtml(href)}">${escHtml(name)}</a></h3>${badge}</div>
${meta ? `<div class="rank-meta">${meta}</div>\n` : ""}<p class="rank-desc">${escHtml(desc)}</p>
<div class="rank-links"><a href="${escHtml(href)}">View profile &rarr;</a>${websiteLink}</div>
</div>
</article>`
  );
}

export function renderFeaturedClient(): string {
  // Link the directory's OWN profile page (same site), not the external yoursites.uk/r/ report.
  const url = "/directory/accountant/ablm-associates";
  // ABLM's real Google Maps place page. NOTE: reviews link to the SAME place page (reviews are shown
  // there) — a clean reviews-only URL isn't derivable from this Maps link (no ChIJ place_id / review slug).
  const mapsUrl = "https://www.google.com/maps/place/ABLM+Associates/@52.5006531,0.4620824,8z/data=!3m1!4b1!4m6!3m5!1s0x210a670b1e5157a1:0x155f2580c56a7fba!8m2!3d52.5006531!4d0.4620824!16s%2Fg%2F11m6bc6dpb?hl=en-GB";
  return (
`<section class="feat-client" aria-label="Featured firm">
<div class="feat-media"><img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80" alt="ABLM Associates" loading="lazy" width="1200" height="600"><span class="feat-tag">Featured</span></div>
<div class="feat-body">
<h2 class="feat-name">ABLM Associates</h2>
<p class="feat-cred">UK-wide chartered certified accountants &middot; ACCA regulated &middot; Peterborough</p>
<p class="feat-desc">ABLM Associates is a UK-wide firm of chartered certified accountants based in Peterborough, working with limited companies, small businesses and individuals on accounts, corporation tax, VAT, payroll and planning.</p>
<div class="feat-links">
<a class="feat-cta" href="${escHtml(url)}">View full profile &rarr;</a>
<a href="${escHtml(mapsUrl)}" target="_blank" rel="noopener">View on Google Maps &#8599;</a>
<a href="${escHtml(mapsUrl)}" target="_blank" rel="noopener">Read reviews &#8599;</a>
</div>
</div>
</section>`
  );
}

export interface RenderPageOpts {
  title: string;               // <title> + OG title (required — SEO enforced)
  metaDescription?: string;    // meta description + OG/twitter description
  canonical?: string;          // absolute canonical URL (also OG:url)
  jsonLd?: string;             // JSON-LD string (already JSON.stringify'd); injected in a <script>
  bodyHtml: string;            // page-specific content, injected inside <main>
  noindex?: boolean;           // set on graceful 404 / empty pages so they aren't indexed
}

// Findable palette + typography (from src/lib/aiAuditReportHtml.ts): navy --blue, yellow --yellow,
// subtle --page tint (not flat white), navy --foot footer, system font stack, tight bold headings.
const STYLE =
`:root{--blue:#1a3d7c;--blue-2:#2a5aa8;--yellow:#ffd23f;--ink:#0f172a;--body:#48505c;--muted:#5b6472;--faint:#9aa3b2;--line:#e9edf3;--page:#eef1f6;--paper:#fff;--foot:#102a58;--amber:#c2820b;--font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--page);color:var(--body);font-family:var(--font);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column}
a{color:var(--blue);text-decoration:none}
a:hover{text-decoration:underline}
img{max-width:100%;display:block}
.container{max-width:1080px;margin:0 auto;padding:0 24px}
/* header — Findable navy band + yellow wordmark */
.site-header{background:var(--blue);color:#fff;position:sticky;top:0;z-index:10}
.site-header .container{display:flex;align-items:center;justify-content:space-between;height:62px;gap:16px}
.brand{font-family:var(--font);font-weight:900;font-size:22px;letter-spacing:-.02em;color:var(--yellow);white-space:nowrap}
.brand:hover{text-decoration:none;opacity:.95}
.brand .dot{color:#fff}
.nav{display:flex;gap:22px;font-size:14px;font-weight:600}
.nav a{color:#c7d5ee}
.nav a:hover{color:#fff;text-decoration:none}
/* hero */
.hero{background:var(--blue);color:#fff;padding:52px 0 60px;text-align:center}
.hero h1{font-weight:900;font-size:clamp(28px,4.6vw,44px);line-height:1.08;letter-spacing:-.02em;margin:0 0 14px;color:#fff;text-wrap:balance}
.hero h1 .y{color:var(--yellow)}
.hero p{font-size:clamp(16px,2.1vw,19px);color:#c7d5ee;max-width:62ch;margin:0 auto}
/* hero with a background image — page sets background-image inline; navy overlay keeps text legible + wave blends into the page */
.hero.hero--img{position:relative;background-color:var(--blue);background-size:cover;background-position:center;isolation:isolate;padding-bottom:56px}
.hero.hero--img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,32,66,.72),rgba(16,32,66,.86));z-index:-1}
/* main + sections */
main{display:block;padding-bottom:56px;flex:1 0 auto}
.section{padding:44px 0}
.section-head h2{font-weight:800;font-size:clamp(21px,2.8vw,27px);letter-spacing:-.01em;color:var(--ink);margin:0 0 6px}
.section-head .sub{color:var(--muted);margin:0 0 24px}
/* category grid (homepage) */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.card{display:block;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:box-shadow .15s,border-color .15s,transform .15s}
.card:hover{text-decoration:none;border-color:#cdd8ea;box-shadow:0 8px 26px rgba(26,61,124,.10);transform:translateY(-1px)}
.card h3{font-weight:800;font-size:19px;letter-spacing:-.01em;color:var(--ink);margin:0 0 4px;text-transform:capitalize}
.card .count{font-size:13px;color:var(--muted)}
.card .arrow{color:var(--blue);font-size:13px;font-weight:700;margin-top:12px;display:inline-block}
.info{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:22px}
.info h3{font-weight:800;font-size:17px;letter-spacing:-.01em;color:var(--ink);margin:0 0 8px}
.info p{font-size:14.5px;color:var(--body);line-height:1.55;margin:0}
/* ranked business list (category page) — "best of", numbered, with imagery */
.rank-list{display:flex;flex-direction:column;gap:28px}
.rank{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:box-shadow .15s,border-color .15s,transform .15s}
.rank:hover{border-color:#cdd8ea;box-shadow:0 12px 40px rgba(26,61,124,.12);transform:translateY(-2px)}
.rank-media{position:relative;width:100%;height:300px;background:var(--page)}
.rank-media img{width:100%;height:100%;object-fit:cover;display:block}
.rank-badge{position:absolute;top:16px;left:16px;width:46px;height:46px;border-radius:50%;background:var(--blue);color:#fff;font-weight:900;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(16,32,66,.35)}
.rank-body{padding:22px 26px 26px}
.rank-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.rank-name{font-weight:800;font-size:clamp(22px,3vw,28px);letter-spacing:-.01em;color:var(--ink);margin:0}
.rank-name a{color:var(--ink)}
.rank-name a:hover{color:var(--blue);text-decoration:none}
.featured{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#6b5200;background:var(--yellow);border-radius:999px;padding:3px 11px}
.rank-meta{font-size:16px;color:var(--muted);margin:12px 0 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.rank-meta .dot{color:#cbd3e0}
.rating{color:var(--ink);font-weight:800;white-space:nowrap;font-size:17px}
.rating .stars{color:#f2b90c;margin-right:4px}
.rating .rc{color:var(--muted);font-weight:400}
.rank-desc{font-size:16px;color:var(--body);margin:14px 0 0;line-height:1.6;max-width:72ch}
.rank-links{margin-top:18px;display:flex;gap:20px;font-size:15px;font-weight:700}
.rank-links a{color:var(--blue)}
.feat-client{background:var(--paper);border:1px solid #cfe0fb;border-top:4px solid var(--yellow);border-radius:16px;overflow:hidden;margin:0 0 30px;box-shadow:0 8px 30px rgba(26,61,124,.10)}
.feat-media{position:relative;width:100%;height:300px;background:var(--page)}
.feat-media img{width:100%;height:100%;object-fit:cover;display:block}
.feat-tag{position:absolute;top:16px;left:16px;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#6b5200;background:var(--yellow);border-radius:999px;padding:5px 14px}
.feat-body{padding:24px 28px 28px}
.feat-name{font-weight:900;font-size:clamp(24px,3.4vw,32px);letter-spacing:-.02em;color:var(--ink);margin:0}
.feat-cred{font-size:15px;font-weight:700;color:var(--blue);margin:8px 0 0}
.feat-desc{font-size:16px;color:var(--body);line-height:1.6;margin:14px 0 0;max-width:72ch}
.feat-cta{display:inline-block;font-size:15px;font-weight:800;color:var(--blue)}
.feat-links{display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-top:16px;font-size:15px;font-weight:700}
.feat-links a{color:var(--blue)}
@media(max-width:560px){.feat-media{height:200px}.feat-body{padding:20px 18px 22px}}
/* business profile page */
.biz-hero-head{min-height:22px;margin-bottom:6px}
.biz-hero-meta{color:#dbe4f4;font-weight:600;margin:12px 0 0}
.biz-hero-meta .rating{color:#fff} .biz-hero-meta .rating .rc{color:#c7d5ee}
.biz-hero-meta .dot{color:rgba(255,255,255,.4)}
.biz-profile{max-width:760px;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:26px 28px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.biz-lead{font-size:18px;line-height:1.6;color:var(--ink);margin:0 0 18px}
.biz-nap{display:flex;flex-direction:column;gap:6px;font-size:15px;color:var(--body);border-top:1px solid var(--line);padding-top:16px}
.biz-nap strong{color:var(--muted);font-weight:600;display:inline-block;min-width:74px}
.biz-report{margin-top:20px;padding:16px 18px;background:#f4f8ff;border:1px solid #cfe0fb;border-left:4px solid var(--blue);border-radius:0 12px 12px 0}
.report-cta{font-size:15px;font-weight:800;color:var(--blue)}
.biz-report .note{margin:6px 0 0;font-size:13px;color:var(--muted)}
.biz-back{margin:22px 0 0;font-size:14px;font-weight:600}
/* area chips (category page "browse by area") */
.area-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:2px}
.area-links a{display:inline-block;background:var(--paper);border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:14px;font-weight:600;color:var(--blue)}
.area-links a:hover{border-color:#cdd8ea;text-decoration:none;box-shadow:0 2px 8px rgba(26,61,124,.08)}
/* empty state */
.empty{background:var(--paper);border:1px dashed #cdd8ea;border-radius:14px;padding:48px 24px;text-align:center;color:var(--muted)}
.empty h2{font-weight:800;color:var(--ink);margin:0 0 8px;font-size:22px}
/* breadcrumbs */
.crumbs{font-size:13px;color:var(--muted)}
.crumbs a{color:var(--blue)}
.crumb-sep{margin:0 8px;color:#cbd3e0}
.crumbs span[aria-current]{color:var(--body)}
/* footer — distinct darker navy */
.site-footer{background:var(--foot);color:#c7d5ee;padding:30px 0;font-size:14px}
.site-footer .brand-f{font-weight:900;letter-spacing:-.02em;color:var(--yellow);font-size:18px;display:inline-block;margin-bottom:6px}
.site-footer .brand-f .dot{color:#fff}
.site-footer .foot-nav{margin-top:10px;display:flex;gap:18px;flex-wrap:wrap;font-size:13px}
.site-footer .foot-nav a{color:var(--yellow)}
.site-footer .note{margin-top:10px;color:#8fa4c8;font-size:12px}
@media(max-width:640px){.hero{padding:40px 0 44px}.section{padding:32px 0}.site-header .container{height:56px}.nav{gap:16px}}
@media(max-width:560px){.rank-media{height:200px}.rank-body{padding:18px 18px 22px}.rank-badge{width:40px;height:40px;font-size:19px}}`;

/** The consistent shell. Every directory page passes head metadata + body HTML through here so
 *  header / nav / footer / styling stay identical — and SEO tags are always emitted (enforced). */
export function renderDirectoryPage(opts: RenderPageOpts): string {
  const { title, metaDescription, canonical, jsonLd, bodyHtml, noindex } = opts;
  const desc = (metaDescription || "").trim();
  const url = (canonical || "").trim();
  const jsonLdSafe = (jsonLd || "").trim().replace(/<\/script/gi, "<\\/script");

  // SEO enforced on EVERY page: title, description, canonical, OG + twitter, JSON-LD.
  const head =
`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
${noindex ? `<meta name="robots" content="noindex,follow">\n` : ""}${desc ? `<meta name="description" content="${escHtml(desc)}">\n` : ""}${url ? `<link rel="canonical" href="${escHtml(url)}">\n` : ""}<meta property="og:type" content="website">
<meta property="og:site_name" content="${escHtml(DIRECTORY_NAME)}">
<meta property="og:title" content="${escHtml(title)}">
${desc ? `<meta property="og:description" content="${escHtml(desc)}">\n` : ""}${url ? `<meta property="og:url" content="${escHtml(url)}">\n` : ""}<meta property="og:image" content="${escHtml(IMG_OFFICE)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(title)}">
${desc ? `<meta name="twitter:description" content="${escHtml(desc)}">\n` : ""}<meta name="twitter:image" content="${escHtml(IMG_OFFICE)}">
${jsonLdSafe ? `<script type="application/ld+json">${jsonLdSafe}</script>\n` : ""}`;

  return (
`<!doctype html>
<html lang="en">
<head>
${head}<style>${STYLE}</style>
</head>
<body>
<header class="site-header">
<div class="container">
<a class="brand" href="/directory">${DIRECTORY_WORDMARK}</a>
<nav class="nav" aria-label="Primary">
<a href="/directory">Home</a>
</nav>
</div>
</header>
<main>
${bodyHtml}
</main>
<footer class="site-footer">
<div class="container">
<span class="brand-f">${DIRECTORY_WORDMARK}</span>
<div>${escHtml(DIRECTORY_TAGLINE)} — a UK directory helping people find trusted local businesses.</div>
<nav class="foot-nav" aria-label="Footer">
<a href="/directory">Home</a>
</nav>
<div class="note">&copy; ${DIRECTORY_NAME}. Listings compiled from public business data.</div>
</div>
</footer>
</body>
</html>`
  );
}
