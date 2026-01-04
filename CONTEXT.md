# プロジェクト概要: Habit Tracker 2026

## 📜 Project Rules (Strict)
1. **Language**: All artifacts (documentation, code comments, commit messages, agent responses) **MUST be written in JAPANESE**.
   - アーティファクト、コード内のコメント、コミットメッセージは全て**日本語**で記述すること。
2. **Deployment**:
   - **Frontend**: GitHub Pages (HTML/CSS/JS)
   - **Backend**: Google Apps Script (GAS) -> API endpoint
3. **Data Source**: Google Sheets (`Records`, `Goals`, `VoiceLogs`)

## 📌 プロジェクト概要
2026年の新年の抱負を達成するための、モバイルフレンドリーな習慣トラッカーWebアプリ。
「毎日コツコツ」をテーマに、習慣のチェック、日々の振り返り、月間の履歴確認ができる。
さらに、**Workspace Studioのエージェント**を活用し、朝のコーチングと夜の振り返り（音声入力含む）を自動化している。

## 🛠 技術スタック & アーキテクチャ
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (No Framework)
- **Backend:** Google Apps Script (GAS) - `Code.gs`
- **Database:** Google Sheets
- **AI Agents (Workspace Studio):**
    - **Morning Coach**: 毎朝07:00に、昨日のデータに基づいてアドバイスをChatに通知。
    - **Nightly Reflection**: 毎晩21:00に、その日の活動を振り返るよう促し、音声/テキストでの入力を受け付けて記録。

## 🚀 実装済み機能 (Status)
- [x] **習慣チェック機能:** 6つの習慣 (最重要タスク完了, 運動, etc.)
- [x] **データ同期:** GAS API経由でPC/スマホ完全同期
- [x] **履歴表示:** カレンダービュー、月間統計、コメント一覧
- [x] **抱負表示:** アコーディオン形式のリッチな抱負一覧
- [x] **目標編集機能 (NEW):**
    - **コンディション編集**: 怪我や体調不良などを記録・表示。
    - **内容編集**: 目標のタイトル、詳細、意識することをアプリ内から直接編集。

## 📂 ファイル構成
- `index.html`: アプリの骨格 (SPA構造)
- `styles.css`: デザイン (CSS変数を活用したライトモード)
- `app.js`: ロジック (API通信, UI操作, モーダル制御)
- `Code.gs`: バックエンド (doGet/doPost, シート操作API)
- `docs/`: ドキュメントフォルダ
    - `2026_resolutions.md`: 抱負の元データ定義
    - `AGENT_WALKTHROUGH.md`: エージェントの設定手順詳細

## 🔗 重要なURL
- **公開アプリ:** `https://yurugi-works.github.io/habit-tracker-2026/`
- **GAS API:** `https://script.google.com/macros/s/AKfycbzG_WauQz856-vr0S9yimRLMH-7yFJAKx4toBSQVXkTH_HfWb8MSc7n3DlXaNeKviEmjg/exec`

## � 今後の改善 (Roadmap)
詳細は `IMPROVEMENTS.md` を参照。
- [ ] 音声ログの生データ保存
- [ ] スキップ日検知のロジック強化 (Agent側)
