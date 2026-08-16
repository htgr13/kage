#!/bin/sh
# Supabase へデプロイする。
#
#   1) 非公開バケットを作る
#   2) 教材のファイルをアップロードする
#   3) Basic 認証つきの Edge Function を公開する
#
# 使い方(tom-sawyer ディレクトリで実行):
#
#   export SUPABASE_PROJECT_REF=xxxxxxxxxxxxxxxxxxxx
#   export SUPABASE_URL=https://$SUPABASE_PROJECT_REF.supabase.co
#   export SUPABASE_SERVICE_ROLE_KEY='...'      # 管理画面 > Project Settings > API
#   ./deploy/supabase-deploy.sh
#
# サービスロールキーは全権限を持ちます。端末の環境変数だけで扱い、
# リポジトリやチャットに貼らないでください。
set -eu

BUCKET=${READER_BUCKET:-tom-sawyer}
: "${SUPABASE_URL:?SUPABASE_URL を設定してください}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY を設定してください}"

AUTH="Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
cd "$(dirname "$0")/.."

echo "1) バケット $BUCKET を用意します(非公開)"
resp=$(curl -sS -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"id\":\"$BUCKET\",\"name\":\"$BUCKET\",\"public\":false}") || {
    echo "   $SUPABASE_URL に接続できませんでした(上の curl のエラーを参照)。" >&2
    exit 1
  }
case "$resp" in
  *'"name"'*|*'already exists'*|*'Duplicate'*) echo "   OK" ;;
  *) echo "   バケットを作れませんでした。応答:" >&2
     echo "   $resp" >&2
     echo "   SUPABASE_URL とサービスロールキーを確認してください。" >&2
     exit 1 ;;
esac

upload() {
  src=$1; dest=$2; ctype=$3
  curl -sS -o /dev/null -w "   %{http_code} $dest\n" \
    -X POST "$SUPABASE_URL/storage/v1/object/$BUCKET/$dest" \
    -H "$AUTH" -H "Content-Type: $ctype" -H 'x-upsert: true' \
    --data-binary "@$src"
}

echo "2) ファイルをアップロードします"
upload index.html index.html 'text/html; charset=utf-8'
upload data.js   data.js     'text/javascript; charset=utf-8'
for f in images/*.webp; do
  upload "$f" "$f" 'image/webp'
done

echo "3) Edge Function を公開します"
if ! command -v supabase >/dev/null 2>&1; then
  echo "   supabase CLI が見つかりません。次を実行してください:" >&2
  echo "     npm i -g supabase   (または brew install supabase/tap/supabase)" >&2
  exit 1
fi
echo "   認証情報を設定します(未設定なら誰も入れません)"
echo "     supabase secrets set BASIC_AUTH_USER=teacher BASIC_AUTH_PASSWORD='...'"
echo "   そのうえで:"
echo "     supabase functions deploy reader --no-verify-jwt"
echo
echo "公開後のURL: $SUPABASE_URL/functions/v1/reader/"
