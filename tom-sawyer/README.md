# Tom Sawyer Reader — 中1向け英語リーダー教材

『The Adventures of Tom Sawyer』(短縮版・全6章)を、タブレットで「本のように通して読める」形にした英語学習教材です。

## 使い方

`index.html` をブラウザで開くだけで動きます(サーバー不要・オフライン可)。

- 英文の**文をタップ**すると、画面下のパネルに「日本語訳・語句・文法」の解説が開きます。本文のレイアウトは動きません。
- パネルの `‹` `›` で前後の文の解説に移動、`✕` か同じ文の再タップで閉じます。
- 右上の **Aa** から文字サイズ・タップ印の表示・昼/夜テーマを変更できます。
- 読んでいた章は自動で記憶されます。

## ファイル構成

```
tom-sawyer/
├── index.html   … リーダー本体(UI)
├── data.js      … 教材データ(本文+解説+挿絵の対応)
├── images/      … 挿絵29点(illust-01〜29.webp)
├── source/      … 章ごとの原文テキスト(データ生成の元)
├── .htaccess    … Basic 認証 + noindex(Apache 用)
├── robots.txt   … 全ページ巡回禁止
├── deploy/      … nginx 用の設定例・Supabase デプロイ手順
├── supabase/    … Basic 認証つき Edge Function
├── tools/       … パスワードファイル作成スクリプト
└── README.md
```

## 挿絵

原書のスキャンから29点の挿絵を切り出し、`images/illust-01.webp` 〜 `illust-29.webp` として
本文中の該当位置に配置ずみです(印刷されたキャプションは画像に含めず、UI側で英日の文字として表示)。
見開きをまたぐ2点(illust-04・illust-22)は左右を連結してあります。

差し替えるときは `data.js` の該当キャプションの `img` を書きかえてください。

```json
{"type": "caption", "en": "Aunt Polly put out her hand and stopped him.",
 "ja": "ポリーおばさんはさっと手を出して彼をつかまえた。",
 "img": "images/illust-01.webp"}
```

暗色テーマでは明るさを落として表示します(`--illust-filter`)。

## データ形式

`data.js` は `window.BOOK_DATA` に本全体を持ちます。

- `chapters[].items[]` は `para`(段落)/ `caption`(挿絵)/ `break`(場面の区切り)のいずれか
- `para.units[]` が解説の最小単位(1〜2センテンス)
  - `en` 英文(units の `en` を連結すると段落の原文と一致)
  - `ja` 日本語訳
  - `vocab[]` 語句 `{w, ja}`
  - `grammar` 文法解説(中1向け)

本文テキストを直したいときは `source/chN.txt` を直し、`data.js` の該当箇所も合わせて更新してください。

## 公開時の保護(Basic 認証・検索よけ)

教材は限られた生徒だけに見せる前提で、次の3重で保護しています。

**1. ページ側**  `index.html` に `noindex, nofollow, noarchive, nosnippet, noimageindex` を指定ずみ。
**2. サーバー側**  レスポンスヘッダー `X-Robots-Tag` と `robots.txt`(全巡回禁止)。
**3. Basic 認証**  下記のとおり設定。

### Apache(レンタルサーバーなど)

```sh
./tools/make-htpasswd.sh teacher        # パスワードファイルを作る
```

できた `.htpasswd` を公開ディレクトリの外に置き、`.htaccess` の `AuthUserFile` を
その絶対パスに書きかえます。`mod_headers` が有効なら `X-Robots-Tag` も同時に効きます。

### nginx

`deploy/nginx.conf.example` を参照してください(`auth_basic` と `auth_basic_user_file`)。

### 注意

- `.htpasswd` は `.gitignore` 済みです。パスワードはリポジトリに入れないでください。
- Basic 認証は通信が暗号化されていないと平文で流れます。必ず **HTTPS** で公開してください。
- GitHub Pages は Basic 認証に対応していません。認証をかけるなら Apache / nginx / Cloudflare Access
  などを使ってください。

### Supabase にデプロイする

Supabase Storage は静的ファイルを置けますが、Basic 認証の仕組みがありません。
そこで、非公開バケットに教材を置き、その前に **Basic 認証つきの Edge Function** を立てます。

```
ブラウザ ──(Basic 認証)──> Edge Function ──(サービスロールキー)──> 非公開バケット
```

```sh
export SUPABASE_PROJECT_REF=xxxxxxxxxxxxxxxxxxxx
export SUPABASE_URL=https://$SUPABASE_PROJECT_REF.supabase.co
export SUPABASE_SERVICE_ROLE_KEY='...'          # 管理画面 > Project Settings > API

./deploy/supabase-deploy.sh                     # バケット作成 + ファイル転送

supabase login
supabase link --project-ref $SUPABASE_PROJECT_REF
supabase secrets set BASIC_AUTH_USER=teacher BASIC_AUTH_PASSWORD='任意のパスワード'
supabase functions deploy reader --no-verify-jwt
```

公開URLは `https://<project-ref>.supabase.co/functions/v1/reader/` です。

**この構成のポイント**

- バケットは非公開なので、Storage の直リンクを知られても開けません。
- 認証情報は Supabase のシークレットに置き、コードには書きません。未設定のときは誰も通しません。
- 応答には `X-Robots-Tag: noindex` が付き、`/robots.txt` も全巡回禁止を返します。
- `--no-verify-jwt` は、ブラウザから apikey ヘッダーを送れないために必要です。守りは関数内の Basic 認証が担います。

関数の中身のテスト:

```sh
deno test --allow-env supabase/functions/reader/lib_test.ts
```

パスの正規化(ディレクトリ抜けの拒否を含む)と Basic 認証の判定を6件で検証しています。
