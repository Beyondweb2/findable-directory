// Cloudflare Pages Function for /robots.txt.
//
// Routing: the filename `robots.txt.ts` maps to the exact path /robots.txt (Pages strips the .ts,
// keeps .txt). No static /robots.txt exists in this project, so nothing shadows it.
//
// Policy: allow ALL crawlers everywhere, and EXPLICITLY welcome the major AI crawlers — the whole
// point of this directory is to be read and cited by AI search. Sitemap points at THIS host's
// /sitemap.xml (request origin → correct on .pages.dev now and findabledirectory.com later).

const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot", "Bytespider"];

export const onRequestGet = async (context: { request: Request }) => {
  const origin = new URL(context.request.url).origin;

  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
    "# AI crawlers are explicitly welcome — this directory is built to be read and cited by AI search.",
  ];
  for (const bot of AI_BOTS) {
    lines.push(`User-agent: ${bot}`, "Allow: /", "");
  }
  lines.push(`Sitemap: ${origin}/sitemap.xml`, "");

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
