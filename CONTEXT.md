# 🎍 Habit Tracker 2026 - Project Context & Handover

> [!IMPORTANT]
> **LANGUAGE RULE**: All artifacts (plans, walkthroughs, docs) and agent responses MUST be written in **Japanese**.

## 📌 プロジェクト概要
2026年の新年の抱負を達成するための、モバイルフレンドリーな習慣トラッカーWebアプリ。
「毎日コツコツ」をテーマに、習慣のチェック、日々の振り返り、月間の履歴確認ができる。

## 🛠 技術スタック & 構成
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (No Framework)
- **Backend/DB:** Google Apps Script (GAS) + Google Sheets
- **Hosting:** GitHub Pages
- **Styling:** CSS Variables (Light Mode Only), Responsive Design

## 🚀 現在の実装状況 (Status)
- [x] **習慣チェック機能:** 6つの習慣のON/OFF
- [x] **データ同期:** GAS API経由でGoogleスプレッドシートに保存（PC/スマホ完全同期）
- [x] **履歴表示:** カレンダービュー、月間統計、コメント一覧
- [x] **抱負表示:** アコーディオン形式のリッチな抱負一覧タブ
- [x] **デプロイ:** GitHub Pagesで公開済み

## 🔗 重要なURL
- **公開アプリ:** `https://yurugi-works.github.io/habit-tracker-2026/`
- **GAS API:** `https://script.google.com/macros/s/AKfycbzG_WauQz856-vr0S9yimRLMH-7yFJAKx4toBSQVXkTH_HfWb8MSc7n3DlXaNeKviEmjg/exec`
- **Google Chat Webhook:** (Code.gs内に設定済み)

## 📂 ファイル構成
- `index.html`: アプリの骨格
- `styles.css`: デザイン（ライトモード、アニメーション）
- `app.js`: ロジック（API通信、UI操作）
- `Code.gs`: バックエンド（GAS用コード、チャット通知機能含む）
- `2026_resolutions.md`: 抱負の元データ

## 📝 次のステップ・残課題
1. **Googleチャット連携の稼働確認**
   - GASへのコード貼り付けとトリガー設定が完了しているか確認が必要。
2. **通知のカスタマイズ**
   - 必要に応じて通知メッセージやタイミングを調整。

---
*このファイルは、開発環境（ワークスペース）を移行した際に、AIが文脈を即座に理解するための引き継ぎ書です。新しい環境で「CONTEXT.mdを見て」と指示してください。*
