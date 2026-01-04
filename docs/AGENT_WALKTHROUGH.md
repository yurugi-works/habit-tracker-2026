# Habit Tracker 2026 - AIエージェント システム仕様書

## 📝 概要
このプロジェクトは、**Google Sheets**、**Google Apps Script (GAS)**、そして **Google Workspace Studio** を統合し、あなた専用のAIコーチ付き習慣トラッカーを構築したものです。

従来のコード依存型（GASですべて完結）から、**ノーコードAIエージェント (Workspace Studio)** を活用する形へ移行し、管理が簡単で柔軟なシステムになりました。

## 🏗 アーキテクチャ

```mermaid
graph TD
    User((ユーザー))
    App[Webアプリ (GitHub Pages)]
    Sheet[Googleスプレッドシート]
    GAS[Google Apps Script]
    Agent[Workspace Studio エージェント]
    Chat[Google Chat]

    User -->|記録| App
    App -->|データ同期| GAS
    GAS -->|更新| Sheet
    
    subgraph "AIコーチ (毎日)"
    Sheet --"IsActiveWeek=TRUE"--> Agent
    Agent --"分析 & アドバイス"--> Gemini[Gemini 2.0]
    Gemini --> Agent
    Agent -->|通知| Chat
    end
```

## 🤖 エージェント設定
Workspace Studio にて、以下の2つのワークフローを設定済みです。

### 1. 朝のコーチ (Habit Tracker 2026)
- **トリガー**: 毎日 朝 7:00
- **目的**: 昨日の実績を「昨日〜過去」のデータから分析し、今日へのモチベーションを高める。
- **ロジック**: スプレッドシートの `IsActiveWeek` 列を参照。

#### 詳細設定 (Workspace Studio)
1.  **Starter**: `Schedule` → 毎日 7:00 ~ 8:00
2.  **Step 1**: `Google Sheets` → `Get sheet contents`
    - Sheet: `Goals` (目標リスト)
    - *※ 抱負リストを全件取得します*
3.  **Step 2**: `Google Sheets` → `Get sheet contents`
    - Sheet: `Records`
    - Filter: `IsRecent` = `TRUE` (直近1週間のデータ)
4.  **Step 3**: `GenAI` → `Generate text` (Ask Gemini)
    - **Prompt**:
        ```text
        あなたは親身なライフコーチです。
        
        【情報源1：ユーザーの今年の抱負】
        [Step 1: Output]

        【情報源2：直近1週間の習慣記録】
        [Step 2: Output]

        【重要：スキップ日の確認】
        今日は [Starter: Today] です。
        「昨日（[Starter: Today] の1日前）」のデータが【情報源2】の中に存在しない場合は、
        「昨日はアプリを開かず、記録すらしなかった（スキップした）」と判断してください。

        【タスク】
        1. まず、昨日の結果（またはスキップした事実）について触れてください。
        2. ユーザーの「抱負」と「最近の傾向」を照らし合わせ、今日へのモチベーションを高めるメッセージを作成してください。

        【条件】
        - 日本語で出力してください。
        - 文字数は最大300文字です。
        - 昨日はサボってしまった場合でも、責めすぎず、「今日はリフレッシュして再開しましょう」前向きに促してください。
        - 今日「これだけは達成しよう」という具体的なアクションを、抱負に基づいて提案してください。
        ```
5.  **Step 4**: `Google Chat` → `Send message to me`

---

### 2. 夜のリマインダー (habit tracker reminder)
- **トリガー**: 毎日 夜 21:00
- **目的**: 「今日」の進捗を確認し、やり残しがあればラストスパートを促す。
- **ロジック**: スプレッドシートの `IsActiveWeek` 列（今日＋過去6日間）を参照。

#### 詳細設定 (Workspace Studio)
1.  **Starter**: `Schedule` → 毎日 21:00 ~ 22:00
2.  **Step 1**: `Google Sheets` → `Get sheet contents`
    - Sheet: `Goals` (目標リスト)
    - *※ 抱負と「制約条件(Condition)」を取得します*
3.  **Step 2**: `Google Sheets` → `Get sheet contents`
    - Sheet: `Records`
    - Filter: `IsActiveWeek` = `TRUE` (今日を含む直近1週間のデータ)
4.  **Step 3**: `GenAI` → `Generate text` (Ask Gemini)
    - **Prompt**:
        ```text
        あなたは親しくて優しい、パーソナライズされたライフコーチです。
        
        【情報源1：ユーザーの目標と制約条件】
        [Step 1: Output] (ここにGoalsシートのデータ。ICL中、怪我などのConditionを含む)

        【情報源2：直近1週間の習慣記録】
        [Step 2: Output] (ここにRecordsシートのデータ)

        【今日のコンテキスト】
        今日は [Starter: Today] です。
        【情報源2】の中で、日付が [Starter: Today] の行が「今日の記録」です。
        もし今日の行でまだチェックがついていない（FALSEの）項目があれば、それは「まだやっていない」ことです。

        【タスク】
        今日の進捗を確認し、夜のリマインダーメッセージを作成してください。

        【重要：行動指針】
        1. **制約の確認 (最重要)**:
           - もし目標に「ICL中」「怪我」「静養」などのCondition記号やコメントがあれば、その項目の未達成は**絶対に咎めない**でください。
           - 「今は静養が大事だね」「焦らなくていいよ」と優しく労ってください。

        2. **現状分析 & アドバイス**:
           - 制約のない項目については、通常通りモチベーションを上げてください。
           - (例: 「運動はお休み中だけど、その分読書は進んでるね！素晴らしい！」)
           - まだ達成していない項目があれば、「寝る前にこれだけはやってみない？」と軽く背中を押してください。

        3. **トーン & スタイル**:
           - 親しみやすく、ポジティブに。無理をさせない優しさを忘れずに。
           - **目標名（例: -10kg）をそのまま読み上げないでください**。あなたの言葉で「ダイエット」や「体重管理」のように自然に噛み砕いてください。
           - **毎回同じ構成にしないでください**。文頭の挨拶、語尾のニュアンス、注目するポイント（昨日はこうだったけど今日は…など）を工夫し、バリエーションを持たせてください。
        ```
5.  **Step 4**: `Google Chat` → `Send message to me`


## 🛠 運用・メンテナンス

### スプレッドシートの補助列 (Helper Columns)
AIエージェントが複雑な日付計算をしなくて済むよう、スプレッドシート側で「どの行を見るべきか」を判定しています。

| 列 | 見出し | 数式 (2行目) | 役割 |
|---|--------|-----------------|---------|
| **E** | `IsToday` | `=ARRAYFORMULA(IF(A2:A="",,IF(INT(A2:A)=INT(TODAY()), "TRUE", "FALSE")))` | 今日の行だけを特定 |
| **F** | `IsActiveWeek` | `=ARRAYFORMULA(IF(A2:A="",,IF((INT(A2:A)>=INT(TODAY()-6)) * (INT(A2:A)<=INT(TODAY())), "TRUE", "FALSE")))` | 今日を含む過去1週間を特定 |

### Goals シート (目標管理)
AIが読み込む目標データです。

| 列 | 見出し | 説明 |
|---|--------|------|
| **A-F**| Category etc | 目標の詳細情報 |
| **G** | **Condition** | **制約条件** (例:「ICLで運動休止中」「土日休み」など)。これを書くとAIが配慮してくれます。 |

### トラブルシューティング
- **通知が来ない場合**
  - Workspace Studio の "Run History"（実行履歴）を確認してください（エラー内容が出ています）。
  - トリガーが「Active」になっているか確認してください。
- **データの内容がおかしい場合**
  - スプレッドシートの補助列 (E列/F列) が正しく `TRUE` になっているか確認してください。
  - Webアプリからスプレッドシートへの同期が成功しているか確認してください。

## 🎙 Voice Reflection System (New)

Plaud AIによる音声記録を活用した振り返りシステムの全体像です。

```mermaid
graph TD
    User((User))
    Plaud[Plaud AI (Device)]
    Chat[Google Chat]
    Agent[Workspace Agent]
    Sheet_Voice[Google Sheet: VoiceLogs]
    Sheet_Goals[Google Sheet: Goals]
    Sheet_Records[Google Sheet: Records]
    Gemini[Gemini API]

    User -->|Record Voice| Plaud
    Plaud -->|Export Summary Text| User
    User -->|Post Text to Chat| Chat
    Chat -->|Trigger| Agent
    Agent -->|Append Log| Sheet_Voice
    
    subgraph Nightly Process
        Agent -->|Read Daily Logs| Sheet_Voice
        Agent -->|Read Personal Data| Sheet_Goals
        Agent -->|Summarize & Reflect| Gemini
        Gemini -->|Reflection Text| Agent
        Agent -->|Update Day's Record| Sheet_Records
    end
```

### システム構成要素
1.  **Accumulation (蓄積)**: 日々の気づきやPlaudの要約テキストをGoogle Chatに投稿し、`VoiceLogs`シートに溜めます。
2.  **Processing (処理)**: 夜間にエージェントがその日のログをまとめてGeminiに投げ、1日の振り返りを生成します。
3.  **Storage (保存)**: 生成された振り返りは`Records`シートの`reflection`カラムに保存され、アプリから閲覧可能になります。

### ⚙️ Nightly Reflection Agent 設定ガイド
Workspace Studioで「夜間の振り返りエージェント」を作成する手順です。

#### 1. Agent Definition (エージェント定義)
- **Name**: `Nightly Reflection Agent`
### ⚙️ Workspace Studio 設定ガイド (Pure No-Code)
GAS（コード）を一切使わず、Workspace Studioの標準機能だけで完結させる構成です。
ユーザー様の検証により、`Update rows` アクション等で十分に実現可能であると判断しました。

#### 1. データ記録フロー (Recorder)
チャットからログを保存するフローです。

1.  **Trigger**: `Chat` -> `Message received`
2.  **Extract**: `TargetDate` と `LogContent` をAI抽出
3.  **Action**: `Google Sheets` -> `Add a row`
    - シート: `VoiceLogs`
    - Column Mapping: `Date` -> `[TargetDate]`, `Content` -> `[LogContent]`

#### 2. Step 2: Nightly Reflection Agent (振り返り作成)
蓄積されたログを読み、一日の終わりに自動で振り返りを生成するフローです。

**フローの作成**:
- Name: `Nightly Reflection`
- Description: `Daily log summarizer`

**手順 (Steps):**

1.  **Trigger (Starter)**:
    - **Type**: `Schedule` (スケジュール)
    - **Settings**: 毎日 `23:30` (Daily)

2.  **Action 1: Get Logs (ログ取得)**
    - **App**: `Google Sheets`
    - **Action**: `Get sheet contents`
    - **Sheet**: `VoiceLogs`
    - **Filter**: `Date` **equals** `[Starter: Today]` (または開始日時の変数 YYYY-MM-DD)
    - **Limit**: `100`

3.  **Action 2: Reflect (AI分析)**
    - **App**: `GenAI` (Gemini)
    - **Action**: `Generate text`
    - **Prompt**:
        ```text
        あなたは親身なライフコーチです。
        以下はユーザーの「今日」のボイスログです:
        [Step 2: Output] (取得したデータを差し込む)

        【重要：日付の確認】
        今日の日付は [Starter: Today] です。
        もしログの中に、[Starter: Today] のデータが1件も存在しない場合は、「今日はまだ記録がないようですね」と判断してください。

        【タスク】
        今日一日を要約し、励みになる「一日の振り返り」を書いてください。
        
        【条件】
        - 日本語で出力してください。
        - 文字数は最大200文字です。
        - ユーザーの努力を褒め、必要であれば小さな改善点を1つだけ提案してください。
        - **もし記録がない場合**は、「まだ記録していませんが、今日はどんな一日でしたか？」と優しく問いかけてください。
        ```

4.  **Action 3: Save (保存)**
    - **App**: `Google Sheets`
    - **Action**: `Add a row`
    - **Sheet**: `Records` (カレンダー形式のシート)
    - **Column Mapping**:
        - **Date**: `[Current Date]`
        - **Reflection**: `[Step 3: Generated text]`

これで、「毎日23:30に、その日のログを拾って、振り返りをRecordsシートに書き込む」完全自動化が完成します！

次回の開発や、使いながら改善したいポイントをまとめています。

- **振り返り機能 (View History)**: 過去のコメントや記録を「読み返す」ための専用画面の追加。
- **目標エディタ**: アプリ内で「今年の抱負」を直接編集できるようにし、スプレッドシートの手動更新を不要にする。
- **AIコーチのパーソナライズ**:
    - AIの回答履歴を保存し、マンネリ化を防ぐ（「昨日と同じことは言わない」）。
    - 日替わりで「厳しい鬼コーチ」や「優しい癒やし系」を選べる機能。
- **データの視覚化**: 習慣の継続をグラフやバッジで表示し、視覚的な達成感を高める。

## 🎉 さいごに
いつでも機能追加や改修の相談に乗りますので、お気軽に声をかけてください。
よい習慣ライフを！💪✨
