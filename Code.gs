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
    
    // 既存の日付を探す
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === dateKey || String(rows[i][0]) === dateKey) {
        rowIndex = i + 1; // 1始まりの行番号
        break;
      }
    }
    
    // 行が見つからなければ、日付オブジェクトとして比較してみる（GASの自動変換対策）
    if (rowIndex === -1) {
       for (let i = 1; i < rows.length; i++) {
         const rowDate = new Date(rows[i][0]);
         const targetDate = new Date(dateKey);
         if (!isNaN(rowDate) && !isNaN(targetDate) && 
             rowDate.getFullYear() === targetDate.getFullYear() &&
             rowDate.getMonth() === targetDate.getMonth() &&
             rowDate.getDate() === targetDate.getDate()) {
             rowIndex = i + 1;
             break;
         }
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

// 1. Googleチャットのスペース設定で「Webhookを管理」からURLを取得してここに貼る
const WEBHOOK_URL = 'ここにWEBHOOK_URLを貼り付けてください';

// アプリのURL
const APP_URL = 'https://yurugi-works.github.io/habit-tracker-2026/';

// 毎朝の通知（トリガー設定が必要）
function sendMorningNotification() {
  if (WEBHOOK_URL.includes('ここに')) return; // 設定されていなければ終了

  const today = new Date();
  const dateStr = Utilities.formatDate(today, 'Asia/Tokyo', 'MM/dd');
  
  // ランダムな抱負を選ぶ
  const resolutions = [
    "🔥 コンサルタント昇格に向けて、今日のタスクで+αの価値を出そう！",
    "📚 ITストラテジスト合格へ、10分でも勉強時間を確保！",
    "💪 体重75kgへの道！今日の食事と運動を意識しよう。",
    "💰 毎日資産チェック！お金の流れを把握できていますか？",
    "🤝 周りの人への感謝を忘れずに。ワクワクする関係を作ろう。"
  ];
  const randomResolution = resolutions[Math.floor(Math.random() * resolutions.length)];

  const message = {
    "cards": [
      {
        "header": {
          "title": `🎍 ${dateStr} 今日の習慣チェック`,
          "subtitle": "2026年の目標達成に向けて"
        },
        "sections": [
          {
            "widgets": [
              {
                "textParagraph": {
                  "text": `おはようございます！今日も一日積み上げましょう。\n\n**今日の意識:**\n${randomResolution}`
                }
              },
              {
                "buttons": [
                  {
                    "textButton": {
                      "text": "アプリを開いてチェック",
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
  if (WEBHOOK_URL.includes('ここに')) return;

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
