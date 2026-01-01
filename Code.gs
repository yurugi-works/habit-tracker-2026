function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // シート名の定義（ユーザーに合わせて変更）
  const RECOR_SHEET_NAME = "Records"; // 旧 "シート1"
  const GOAL_SHEET_NAME = "Goals";

  // 1. 記録データの取得 (Records)
  const recordSheet = ss.getSheetByName(RECOR_SHEET_NAME) || ss.getSheets()[0]; // 見つからなければ左端
  const recordRows = recordSheet.getDataRange().getValues();
  const records = {};
  
  for (let i = 1; i < recordRows.length; i++) {
    const row = recordRows[i];
    const dateKey = row[0];
    if (!dateKey) continue;
    
    // 日付を文字列として正規化（以前のロジックを踏襲）
    let dateStr = "";
    if (dateKey instanceof Date) {
      dateStr = Utilities.formatDate(dateKey, 'Asia/Tokyo', 'yyyy-MM-dd');
    } else {
      dateStr = String(dateKey); // 既に文字列の場合
    }

    records[dateStr] = {
      habits: row[1] ? JSON.parse(row[1]) : {},
      reflection: row[2] || ""
    };
  }

  // 2. 目標データの取得 (Goals)
  const goalSheet = ss.getSheetByName(GOAL_SHEET_NAME);
  const goals = [];
  
  if (goalSheet) {
    const goalRows = goalSheet.getDataRange().getValues();
    // ヘッダー: Category, Title, Detail, Mindset, Icon, Color
    for (let i = 1; i < goalRows.length; i++) {
      const row = goalRows[i];
      if (!row[0]) continue; // Categoryが空ならスキップ

      goals.push({
        category: row[0],
        title: row[1],
        detail: row[2],  // 具体的なアクション (箇条書き想定)
        mindset: row[3], // 意識すること
        icon: row[4],
        color: row[5]    // CSSクラス用 (career, health etc)
      });
    }
  }

  // 両方のデータを返す
  const response = {
    records: records,
    goals: goals
  };
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const RECOR_SHEET_NAME = "Records"; // 旧 "シート1"
    
    // 名前で取得し、無ければ左端を使う（安全策）
    const sheet = ss.getSheetByName(RECOR_SHEET_NAME) || ss.getSheets()[0];
    
    // ログ出力（GASの「実行数」から確認可能）
    console.log("doPost called");
    
    if (!e.postData) {
      console.error("No postData received");
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "No postData"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const params = JSON.parse(e.postData.contents);
    console.log("Received params:", params);

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
      console.log(`Updating row ${rowIndex} for date ${dateKey}`);
      sheet.getRange(rowIndex, 2).setValue(habits);
      sheet.getRange(rowIndex, 3).setValue(reflection);
    } else {
      // 新規追加
      console.log(`Appending new row for date ${dateKey}`);
      sheet.appendRow([dateKey, habits, reflection]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error in doPost:", error);
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// Googleチャット通知機能 (Workspace Studioへ移行済み)
// ==========================================

// 通知ロジックは "Habit Tracker 2026" Agent に移行しました。
// 以前のGASトリガー（sendMorningNotification, sendEveningReminder）は
// Apps Scriptのトリガー設定画面から削除してください。
