// Edge Function の中身のうち、サーバーを起動せずに試せる部分。
// (index.ts から読みこんで使う)

export const NOINDEX = "noindex, nofollow, noarchive, nosnippet, noimageindex";

export const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  svg: "image/svg+xml",
};

/** 文字列の比較にかかる時間を一定にして、総当たりの手がかりを与えない。 */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ea = enc.encode(a);
  const eb = enc.encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) {
    diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return diff === 0;
}

/** Authorization ヘッダーが、設定した利用者名とパスワードに一致するか。 */
export function checkBasicAuth(
  header: string | null,
  user: string,
  password: string,
): boolean {
  if (!user || !password) return false; // 未設定なら常に拒否する
  const [scheme, encoded] = (header ?? "").split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return false;
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  return safeEqual(decoded.slice(0, sep), user) &&
    safeEqual(decoded.slice(sep + 1), password);
}

/** リクエストのパスを、バケット内のファイルの場所に直す。危険なパスは null。 */
export function objectPath(pathname: string): string | null {
  let p = pathname
    .replace(/^\/functions\/v1\/[^/]+/, "") // https://<ref>.supabase.co/functions/v1/reader/...
    .replace(/^\/reader(?=\/|$)/, "");      // https://<ref>.functions.supabase.co/reader/...
  try {
    p = decodeURIComponent(p);
  } catch {
    return null;
  }
  if (p === "" || p === "/") p = "/index.html";
  if (p.includes("..") || p.includes("\\") || p.includes("\0")) return null;
  return p.replace(/^\/+/, "");
}

/** 拡張子から Content-Type を決める。 */
export function contentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[ext] ?? "application/octet-stream";
}
