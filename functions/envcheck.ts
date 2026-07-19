export const onRequest = (context: { env: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string } }) => {
  const { env } = context;
  const body = {
    marker: "envcheck-live",
    has_url: typeof env.SUPABASE_URL === "string" && env.SUPABASE_URL.length > 0,
    url_value: env.SUPABASE_URL ?? null,
    has_key: typeof env.SUPABASE_ANON_KEY === "string" && env.SUPABASE_ANON_KEY.length > 0,
    key_len: env.SUPABASE_ANON_KEY ? env.SUPABASE_ANON_KEY.length : 0,
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "content-type": "application/json" } });
};
