#!/bin/sh
# Basic 認証用のパスワードファイルを作る。
#
#   ./tools/make-htpasswd.sh teacher            # 対話でパスワードを入力
#   ./tools/make-htpasswd.sh teacher ./.htpasswd
#
# htpasswd コマンドが無い環境でも動くよう、openssl でも作れるようにしてある。
set -eu

USER=${1:-}
OUT=${2:-./.htpasswd}

if [ -z "$USER" ]; then
  echo "usage: $0 <username> [output-file]" >&2
  exit 1
fi

if command -v htpasswd >/dev/null 2>&1; then
  htpasswd -c -B "$OUT" "$USER"
elif command -v openssl >/dev/null 2>&1; then
  if [ -t 0 ]; then
    printf 'password: '
    stty -echo; read -r PW; stty echo; echo
  else
    read -r PW        # パイプから受け取る場合
  fi
  printf '%s:%s\n' "$USER" "$(openssl passwd -apr1 "$PW")" > "$OUT"
  unset PW
else
  echo "htpasswd も openssl も見つかりません" >&2
  exit 1
fi

chmod 640 "$OUT"
echo "作成しました: $OUT"
echo "サーバーに置いたあと、.htaccess の AuthUserFile をその絶対パスに書きかえてください。"
