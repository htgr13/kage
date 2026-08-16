// deno test supabase/functions/reader/lib_test.ts
/** 外部の依存を持ちこまないための、ごく小さな検査関数。 */
function assertEquals<T>(got: T, want: T, msg = ""): void {
  if (got !== want) {
    throw new Error(`${msg}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
  }
}

import { checkBasicAuth, contentType, objectPath } from "./lib.ts";

Deno.test("パスをバケット内の場所に直す", () => {
  const cases: [string, string | null][] = [
    ["/functions/v1/reader", "index.html"],
    ["/functions/v1/reader/", "index.html"],
    ["/functions/v1/reader/index.html", "index.html"],
    ["/functions/v1/reader/data.js", "data.js"],
    ["/functions/v1/reader/images/illust-04.webp", "images/illust-04.webp"],
    ["/reader", "index.html"],
    ["/reader/", "index.html"],
    ["/reader/images/illust-29.webp", "images/illust-29.webp"],
    ["/", "index.html"],
    ["/data.js", "data.js"],
  ];
  for (const [input, want] of cases) {
    assertEquals(objectPath(input), want, input);
  }
});

Deno.test("ディレクトリを抜け出すパスは拒否する", () => {
  for (
    const bad of [
      "/functions/v1/reader/../../secret",
      "/reader/%2e%2e/%2e%2e/secret",
      "/reader/a\\b",
      "/reader/%2e%2e%2fsecret",
    ]
  ) {
    assertEquals(objectPath(bad), null, bad);
  }
});

Deno.test("Basic 認証: 正しいときだけ通す", () => {
  const ok = "Basic " + btoa("teacher:s3cret");
  assertEquals(checkBasicAuth(ok, "teacher", "s3cret"), true);
  assertEquals(checkBasicAuth(ok, "teacher", "wrong"), false);
  assertEquals(checkBasicAuth(ok, "other", "s3cret"), false);
  assertEquals(checkBasicAuth(null, "teacher", "s3cret"), false);
  assertEquals(checkBasicAuth("Bearer xyz", "teacher", "s3cret"), false);
  assertEquals(checkBasicAuth("Basic !!notbase64!!", "teacher", "s3cret"), false);
  assertEquals(checkBasicAuth("Basic " + btoa("teacher"), "teacher", "s3cret"), false);
});

Deno.test("Basic 認証: 未設定なら誰も通さない", () => {
  const header = "Basic " + btoa(":");
  assertEquals(checkBasicAuth(header, "", ""), false);
  assertEquals(checkBasicAuth("Basic " + btoa("teacher:s3cret"), "", ""), false);
});

Deno.test("パスワードにコロンが入っていても扱える", () => {
  const header = "Basic " + btoa("teacher:a:b:c");
  assertEquals(checkBasicAuth(header, "teacher", "a:b:c"), true);
});

Deno.test("拡張子から Content-Type を決める", () => {
  assertEquals(contentType("index.html"), "text/html; charset=utf-8");
  assertEquals(contentType("data.js"), "text/javascript; charset=utf-8");
  assertEquals(contentType("images/illust-01.webp"), "image/webp");
  assertEquals(contentType("noext"), "application/octet-stream");
});
