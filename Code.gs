function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  const data = {};
  
  // 1行目はヘッダーなのでスキップ
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateKey = row[0]; // A列: 日付
    if (!dateKey) continue;
    
    // 日付フォーマットの正規化などが必要ならここで行うが、
    // クライアント側で対応したので基本はそのままでOK
    
    data[dateKey] = {
      habits: row[1] ? JSON.parse(row[1]) : {},
      reflection: row[2] || ""
    };
  }
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const params = JSON.parse(e.postData.contents);
    const dateKey = params.date;
    const habits = JSON.stringify(params.habits);
    const reflection = params.reflection || "";
    
    const rows = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    // 既存の日付を探す（日付比較を強化）
    for (let i = 1; i < rows.length; i++) {
      const rowDateVal = rows[i][0];
      let rowDateStr = "";
      
      // シートの日付を "YYYY-MM-DD" 形式の文字列に変換して比較
      if (rowDateVal instanceof Date) {
        rowDateStr = Utilities.formatDate(rowDateVal, 'Asia/Tokyo', 'yyyy-MM-dd');
      } else {
        // 文字列などの場合も、Dateにしてからフォーマットするか、そのまま比較
        const parsed = new Date(rowDateVal);
        if (!isNaN(parsed)) {
          rowDateStr = Utilities.formatDate(parsed, 'Asia/Tokyo', 'yyyy-MM-dd');
        } else {
          rowDateStr = String(rowDateVal);
        }
      }

      if (rowDateStr === dateKey) {
        rowIndex = i + 1; // 1始まりの行番号
        break;
      }
    }
    
    if (rowIndex > 0) {
      // 更新
      // 日付列は更新しない（フォーマット崩れ防止）
      sheet.getRange(rowIndex, 2).setValue(habits);
      sheet.getRange(rowIndex, 3).setValue(reflection);
    } else {
      // 新規追加
      sheet.appendRow([dateKey, habits, reflection]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// Googleチャット通知機能
// ==========================================

// 1. Googleチャットのスペース設定で「Webhookを管理」からURLを取得
// 2. GASのエディタ左側「プロジェクトの設定」>「スクリプトプロパティ」に以下のキーと値を追加してください
//    プロパティ: WEBHOOK_URL
//    値: (取得したWebhook URL)
const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

// アプリのURL
const APP_URL = 'https://yurugi-works.github.io/habit-tracker-2026/';

// 毎朝の通知（トリガー設定が必要）
// 習慣の定義（app.jsと同じIDとラベル）
const HABIT_DEFS = {
  'study': '勉強',
  'exercise': '運動',
  'weight': '体重測定',
  'sideproject': '副業開発',
  'work': '仕事で成果',
  'finance': '家計簿'
};

// 毎朝の通知（トリガー設定が必要）
function sendMorningNotification() {
  if (!WEBHOOK_URL) {
    console.error('エラー: スクリプトプロパティ "WEBHOOK_URL" が設定されていません。');
    return;
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  const dateStr = Utilities.formatDate(today, 'Asia/Tokyo', 'MM/dd');
  const yesterdayStr = Utilities.formatDate(yesterday, 'Asia/Tokyo', 'yyyy-MM-dd'); // 検索用
  
  // 昨日のデータを確認
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  let yesterdayHabits = null;
  let yesterdayReflection = "";

  // 1行目(ヘッダー)以降を後ろから検索
  for (let i = rows.length - 1; i >= 1; i--) {
     const rowDateVal = rows[i][0];
     let rowDateStr = "";
     if (rowDateVal instanceof Date) {
       rowDateStr = Utilities.formatDate(rowDateVal, 'Asia/Tokyo', 'yyyy-MM-dd');
     } else {
       rowDateStr = String(rowDateVal);
     }

     if (rowDateStr === yesterdayStr) {
       try {
         yesterdayHabits = JSON.parse(rows[i][1]); // B列: Habits JSON
       } catch (e) {
         yesterdayHabits = {};
       }
       yesterdayReflection = rows[i][2] || ""; // C列: Reflection
       break;
     }
  }

  // メッセージの作成
  let mainMessage = "";
  let subMessage = "";
  
  // 未達成の習慣・達成した習慣を整理
  const missedHabits = [];
  const completedHabits = [];
  
  if (yesterdayHabits) {
    Object.keys(HABIT_DEFS).forEach(key => {
      if (!yesterdayHabits[key]) {
        missedHabits.push(HABIT_DEFS[key]);
      } else {
        completedHabits.push(HABIT_DEFS[key]);
      }
    });
  }

  // Gemini呼び出し
  let geminiMessage = null;
  if (GEMINI_API_KEY) {
    geminiMessage = getGeminiAdvice(yesterdayStr, completedHabits, missedHabits, yesterdayReflection);
  }

  if (geminiMessage) {
    // Geminiのメッセージを採用
    mainMessage = geminiMessage;
  } else {
    // フォールバック（以前のロジック）
    if (!yesterdayHabits) {
      mainMessage = "おはようございます！昨日の記録がありませんでした😢\n今日は記録をつけるところから始めましょう！";
    } else {
      if (missedHabits.length === 0) {
        mainMessage = "おはようございます！\n昨日は**パーフェクト達成**でしたね！🎉素晴らしいです。\nこの調子で今日も積み上げましょう！";
      } else if (missedHabits.length === Object.keys(HABIT_DEFS).length) {
        mainMessage = "おはようございます。\n昨日は習慣チェックが0でした...。\n「まずは1つ」からで大丈夫。今日こそリスタートしましょう！💪";
      } else {
        mainMessage = `おはようございます！\n昨日は **${missedHabits.join('、')}** ができませんでしたね。\n今日はこれらを優先して、昨日の分を取り返しましょう！🔥`;
      }
    }
  }

  // ランダムな一言（固定のアドバイス）
  const resolutions = [
    "🔥 コンサルタント昇格に向けて、アウトプットを意識！",
    "📚 ITストラテジスト、1問でも解けば前進です。",
    "💪 体重75kgへの道は一日にして成らず。",
    "💰 資産形成は「使わないこと」から。",
    "🤝 誰かの役に立つことが、自分の価値になる。"
  ];
  const randomResolution = resolutions[Math.floor(Math.random() * resolutions.length)];

  const message = {
    "cards": [
      {
        "header": {
          "title": `🎍 ${dateStr} 今日の習慣チェック`,
          "subtitle": "AIコーチからのアドバイス"
        },
        "sections": [
          {
            "widgets": [
              {
                "textParagraph": {
                  "text": `${mainMessage}\n\n**今日の意識:**\n${randomResolution}`
                }
              },
              {
                "buttons": [
                  {
                    "textButton": {
                      "text": "アプリを開く",
                      "onClick": {
                        "openLink": {
                          "url": APP_URL
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  sendToChat(message);
}

// 毎晩の未達成通知（トリガー設定が必要）
function sendEveningReminder() {
  if (!WEBHOOK_URL) return;

  // 今日のデータを取得して未達成なら通知...の実装は少し複雑になるため
  // まずはシンプルなリマインダーを送る
  
  const message = {
    "text": "🌙 こんばんは！今日の習慣チェックは完了していますか？\n寝る前の振り返りを忘れずに！ " + APP_URL
  };
  
  sendToChat(message);
}

function sendToChat(payload) {
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  UrlFetchApp.fetch(WEBHOOK_URL, options);
}

// Gemini APIを叩いてアドバイスを取得する関数
function getGeminiAdvice(dateVal, completed, missed, reflection) {
  // モデル名を変更 (gemini-2.5-flash -> gemma-3-27b-it)
  // ※ リストにある gemma-3-27b のインストラクションチューニング版を指定
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GEMINI_API_KEY}`;
  
  const systemPrompt = `
あなたはユーザーの習慣形成を支援する親身なAIコーチです。
ユーザーの昨日の実績データと、ユーザー自身が書いた振り返りコメントをもとに、今日のやる気を引き出す短いメッセージ（140文字程度）を作成してください。

# ユーザーの状況
- 達成した習慣: ${completed.length > 0 ? completed.join(', ') : 'なし'}
- 未達成の習慣: ${missed.length > 0 ? missed.join(', ') : 'すべて'}
- 昨日のユーザーのコメント: "${reflection ? reflection : '（コメントなし）'}"

# 指示
- ユーザーのコメントがある場合は、必ずその内容に触れて共感したり反応したりしてください。
- 未達成の習慣がある場合は、それを責めるのではなく「じゃあ今日はこれを一つだけ頑張ろう」と具体的に励ましてください。
- 絵文字を適度に使って、明るくフレンドリーな口調で話しかけてください。
- 冒頭の挨拶（おはようございます等）は不要です。本文だけ出力してください。
`;

  const payload = {
    "contents": [{
      "parts": [{"text": systemPrompt}]
    }]
  };

  try {
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    
    if (code === 200) {
      const json = JSON.parse(response.getContentText());
      const text = json.candidates[0].content.parts[0].text;
      return text.trim(); // 成功
    } else {
      console.error(`Gemini API Error: ${code} - ${response.getContentText()}`);
      return null; // 失敗
    }
  } catch (e) {
    console.error(`Gemini API Exception: ${e.toString()}`);
    return null;
  }
}

// ==========================================
// トリガー設定用関数
// ==========================================

// この関数を一度だけ実行してください。
// 既存のトリガーを削除し、新しい朝(7時)と夜(22時)のトリガーを設定します。
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  // 重複防止のため、既存の同名トリガーを削除
  triggers.forEach(trigger => {
    const handlerName = trigger.getHandlerFunction();
    if (handlerName === 'sendMorningNotification' || handlerName === 'sendEveningReminder') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 朝の通知: 毎日 7:00 - 8:00 の間
  ScriptApp.newTrigger('sendMorningNotification')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone('Asia/Tokyo')
    .create();

  // 夜のリマインダー: 毎日 22:00 - 23:00 の間
  ScriptApp.newTrigger('sendEveningReminder')
    .timeBased()
    .atHour(22)
    .everyDays(1)
    .inTimezone('Asia/Tokyo')
    .create();
    
  console.log('トリガーの設定が完了しました。朝7時と夜22時に通知が届きます。');
}
