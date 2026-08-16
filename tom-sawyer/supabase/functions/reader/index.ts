// Supabase Edge Function — Basic 認証つきで教材を配信する。
//
// 非公開バケットに置いたファイルを、Basic 認証を通した相手にだけ返す。
// 認証情報は Supabase のシークレットから読む(コードには書かない)。
//
//   supabase secrets set BASIC_AUTH_USER=teacher BASIC_AUTH_PASSWORD='...'
//   supabase functions deploy reader --no-verify-jwt
//
// --no-verify-jwt が必要な理由: ブラウザから直接開くため、Supabase の
// apikey ヘッダーを付けられない。かわりにこの関数の Basic 認証で守る。

import { checkBasicAuth, contentType, NOINDEX, objectPath, TYPES } from "./lib.ts";

const BUCKET = Deno.env.get("READER_BUCKET") ?? "tom-sawyer";
const USER = Deno.env.get("BASIC_AUTH_USER") ?? "";
const PASSWORD = Deno.env.get("BASIC_AUTH_PASSWORD") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!checkBasicAuth(req.headers.get("authorization"), USER, PASSWORD)) {
    return new Response("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Tom Sawyer Reader", charset="UTF-8"',
        "X-Robots-Tag": NOINDEX,
      },
    });
  }

  const key = objectPath(new URL(req.url).pathname);
  if (key === null) return new Response("Bad Request", { status: 400 });

  if (key === "robots.txt") {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": TYPES.txt, "X-Robots-Tag": NOINDEX },
    });
  }

  const upstream = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`,
    { method: req.method, headers: { Authorization: `Bearer ${SERVICE_KEY}` } },
  );

  if (!upstream.ok) {
    return new Response(upstream.status === 404 ? "Not Found" : "Upstream error", {
      status: upstream.status === 404 ? 404 : 502,
      headers: { "X-Robots-Tag": NOINDEX },
    });
  }

  const isHtml = key.endsWith(".html");
  const headers = new Headers({
    "Content-Type": contentType(key),
    "X-Robots-Tag": NOINDEX,
    "X-Content-Type-Options": "nosniff",
    // 認証済みの相手だけが見るページなので、共有キャッシュには載せない
    "Cache-Control": isHtml ? "private, no-cache" : "private, max-age=86400",
  });
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  return new Response(req.method === "HEAD" ? null : upstream.body, { headers });
});
