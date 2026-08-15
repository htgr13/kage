# トム・ソーヤの冒険 — 中1英語リーダー

『The Adventures of Tom Sawyer』を題材にした中学1年生向けの英語学習教材(静的Webサイト)です。
英文を1〜2センテンスの「学習ユニット」に区切り、各ユニットの **「解説」ボタン** を押すと
**語句・文法(中1範囲)・日本語訳** が表示されます。

## 使い方

ブラウザの制限により `file://` で直接開くと JSON が読み込めないため、簡易サーバー経由で開いてください。

```bash
python3 -m http.server 8000
# → http://localhost:8000 を開く
```

GitHub Pages で公開する場合は、リポジトリの Settings → Pages でブランチを指定するだけで動きます(ビルド不要)。

## ファイル構成

```
index.html            画面(目次+章リーダー、1枚のSPA)
css/style.css         スタイル(スマホファースト)
js/app.js             JSON読込・ルーティング・解説の開閉
data/index.json       章一覧
data/chapters/chNN.json  各章の本文+語句・文法・日本語訳
```

## データ形式

```json
{
  "chapter": 1,
  "title": "Tom and Aunt Polly",
  "units": [
    {
      "id": "1-1",
      "en": "英文(1〜2センテンス)",
      "vocab": [{ "word": "語句", "pos": "品詞", "ja": "意味" }],
      "grammar": "文法解説(中1の学習項目に対応)",
      "ja": "日本語訳"
    }
  ]
}
```

章を追加するには `data/chapters/` に JSON を置き、`data/index.json` の `chapters` に1行追加します。

## 現在の状態

現在 `data/` にはサンプル章のみが入っています。本文全文のデータ作成が完了し次第、差し替えます。
