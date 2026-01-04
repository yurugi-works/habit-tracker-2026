function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // シート名の定義
    const RECOR_SHEET_NAME = "Records";
    const OLD_SHEET_NAME = "シート1"; // 旧名もサポート
    const GOAL_SHEET_NAME = "Goals";

    // 1. 記録データの取得
    // Records -> シート1 -> 左端(0番目) の順で探す
    let recordSheet = ss.getSheetByName(RECOR_SHEET_NAME);
    if (!recordSheet) recordSheet = ss.getSheetByName(OLD_SHEET_NAME);
    if (!recordSheet && ss.getSheets()[0].getName() !== GOAL_SHEET_NAME) {
       recordSheet = ss.getSheets()[0];
    }
    
    const records = {};
    if (recordSheet) {
      const recordRows = recordSheet.getDataRange().getValues();
      for (let i = 1; i < recordRows.length; i++) {
        const row = recordRows[i];
        const dateKey = row[0];
        if (!dateKey) continue;
        
        let dateStr = "";
        if (dateKey instanceof Date) {
          dateStr = Utilities.formatDate(dateKey, 'Asia/Tokyo', 'yyyy-MM-dd');
        } else {
          dateStr = String(dateKey);
        }

        let habits = {};
        try {
          // B列がJSONでない場合（普通の文字列など）のエラー回避
          if (row[1] && typeof row[1] === 'string' && (row[1].startsWith('{') || row[1].startsWith('['))) {
             habits = JSON.parse(row[1]);
          }
        } catch (e) {
          console.error(`Row ${i+1}: JSON Parse Error`, e);
        }

        records[dateStr] = {
          habits: habits,
          reflection: row[2] || ""
        };
      }
    }

    // 2. 目標データの取得 (Goals)
    const goalSheet = ss.getSheetByName(GOAL_SHEET_NAME);
    const goals = [];
    
    if (goalSheet) {
      const goalRows = goalSheet.getDataRange().getValues();
      // ヘッダー: Category, Title, Detail, Mindset, Icon, Color
      for (let i = 1; i < goalRows.length; i++) {
        const row = goalRows[i];
        if (!row[0]) continue; 

        goals.push({
          category: row[0],
          title: row[1],
          detail: row[2],
          mindset: row[3],
          icon: row[4],
          color: row[5],
          condition: row[6] || "" // G列: 制約条件 (ICL期間中など)
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

  } catch (error) {
    // エラー時もJSONで返す
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
      
    const action = params.action;

    // アクション分岐
    if (action === 'updateCondition') {
      // 目標のコンディション更新
      const category = params.category;
      const title = params.title;
      const condition = params.condition || ""; 
      
      const goalSheet = ss.getSheetByName("Goals");
      if (!goalSheet) throw new Error("Goals sheet not found");
      
      const range = goalSheet.getDataRange();
      const values = range.getValues();
      
      let updated = false;
      // 2行目から探索 (Category=A列, Title=B列)
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row[0] === category && row[1] === title) {
          // G列 (index 6) を更新 -> 行番号は i+1
          goalSheet.getRange(i + 1, 7).setValue(condition);
          updated = true;
          break;
        }
      }
      
      if (!updated) {
        return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Goal not found"}))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success", message: "Condition updated"}))
        .setMimeType(ContentService.MimeType.JSON);

    } else {
      // デフォルト: 習慣データの保存 (Recordsシート)
      const dateKey = params.date;
      const habits = JSON.stringify(params.habits);
      const reflection = params.reflection || "";
      
      if (!dateKey) throw new Error("Date is required");

      const rows = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      // 既存の日付を探す
      for (let i = 1; i < rows.length; i++) {
        const rowDateVal = rows[i][0];
        let rowDateStr = "";
        
        // シートの日付を "YYYY-MM-DD" 形式の文字列に変換して比較
        if (rowDateVal instanceof Date) {
          rowDateStr = Utilities.formatDate(rowDateVal, 'Asia/Tokyo', 'yyyy-MM-dd');
        } else {
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
    }
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
// Apps Scriptのトリガー設定画面から削除してください。

// ==========================================
// Voice Reflection System (New)
// ==========================================

/**
 * Ensures the VoiceLogs sheet exists and has headers.
 */
function setupVoiceLogsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("VoiceLogs");
  if (!sheet) {
    sheet = ss.insertSheet("VoiceLogs");
    // Header: Date, Content, Processed(Boolean) - Removed Time
    sheet.appendRow(["Date", "Content", "Processed"]); 
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Logs a voice note summary to the VoiceLogs sheet.
 * Can be called by Workspace Agent.
 * @param {string} content - The summary text from Plaud/Chat.
 * @param {string} dateString - (Optional) Specific date for the log.
 * @return {string} Status message.
 */
function logVoiceNote(content, dateString) {
  const sheet = setupVoiceLogsSheet();
  const now = new Date();
  
  // Date Logic
  let targetDate;
  if (dateString) {
    targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) {
       // Fallback
       targetDate = new Date(now);
    }
  } else {
    targetDate = new Date(now);
  }

  const formattedDate = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
  
  // A:Date, B:Content, C:Processed(FALSE)
  sheet.appendRow([formattedDate, content, false]);
  return `Saved log for ${formattedDate}`;
}

/**
 * Saves the daily reflection to the 'Records' sheet.
 * @param {string} dateString - Target date (yyyy-MM-dd).
 * @param {string} reflectionContent - The reflection text generated by Gemini.
 * @return {string} Result message.
 */
function saveDailyReflection(dateString, reflectionContent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const RECOR_SHEET_NAME = "Records";
  let sheet = ss.getSheetByName(RECOR_SHEET_NAME);
  if (!sheet) sheet = ss.getSheets()[0]; // Fallback

  const data = sheet.getDataRange().getValues();
  // Header is row 0
  
  // Find column for 'reflection'
  const headers = data[0];
  let colIndex = -1;
  // Flexible search for header name
  for (let c = 0; c < headers.length; c++) {
    if (String(headers[c]).toLowerCase() === "reflection") {
      colIndex = c;
      break;
    }
  }
  
  if (colIndex === -1) {
    // If not found, imply it's column C (index 2) based on existing code structure
    // Row[2] is used in doGet/doPost as reflection.
    colIndex = 2; 
  }

  // Find row by date
  let rowIndex = -1;
  // Try to parse input date
  const targetDate = new Date(dateString);
  const isValidDate = !isNaN(targetDate.getTime());

  for (let i = 1; i < data.length; i++) {
    const rowDateVal = data[i][0];
    let match = false;
    
    // String comparison
    if (String(rowDateVal) === dateString) {
      match = true;
    } 
    // Date object comparison
    else if (isValidDate && rowDateVal instanceof Date) {
      // Compare YYYY-MM-DD
      const rowYMD = Utilities.formatDate(rowDateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const targetYMD = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      if (rowYMD === targetYMD) match = true;
    }

    if (match) {
      rowIndex = i + 1; // 1-based
      break;
    }
  }

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, colIndex + 1).setValue(reflectionContent);
    return `Success: Updated reflection for ${dateString}`;
  } else {
    // Create new row if date not found? 
    // Better to append a new row with date and reflection
    // Format: [Date, Habits(empty), Reflection]
    sheet.appendRow([dateString, "{}", reflectionContent]);
    return `Success: Created new row and saved reflection for ${dateString}`;
  }
}

/**
 * TEST FUNCTION: Simulates the entire Voice Reflection Flow.
 * Run this from the GAS Editor to verify the mechanism.
 */
function testVoiceReflectionFlow() {
  console.log("--- Starting Voice Reflection Test ---");

  // 1. Simulate logging a voice note for "Yesterday" (Jan 2nd scenario)
  console.log("Test 1: Logging with explicit past date...");
  const pastDateLog = "Log for Jan 2nd submitted on Jan 3rd.";
  const pastDate = "2024-01-02"; // Explicit date
  const logResult = logVoiceNote(pastDateLog, pastDate);
  console.log("Step 1 (Log Past):", logResult);

  // 2. Simulate saving a reflection for that past date
  console.log("Test 2: Saving reflection for past date...");
  const pastReflection = "【1月2日の振り返り】\n過去日付の指定保存のテスト成功です。";
  const saveResult = saveDailyReflection(pastDate, pastReflection);
  console.log("Step 2 (Save Past):", saveResult);

  console.log("--- Test Complete. Please check 'VoiceLogs' for 2024/01/02 entry. ---");
  return "Test Complete";
}


// ==========================================
// Workspace Agent Tool Functions
// ==========================================

/**
 * Retrieves voice logs for a specific date.
 * Designed for Workspace Agent to "Read" before summarizing.
 * Applies "Late Night Logic": Logs before 04:00 are treated as the previous day.
 * @param {string} dateString - Target date (yyyy-MM-dd).
 * @return {string} Combined logs text or "No logs found."
 */
function getDailyLogs(dateString) {
  const sheet = setupVoiceLogsSheet();
  const data = sheet.getDataRange().getValues();
  const logs = [];

  // Parse target date
  const targetDate = new Date(dateString);
  if (isNaN(targetDate.getTime())) return "Error: Invalid date format.";
  
  const targetYMD = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "yyyy-MM-dd");

  // Skip header
  for (let i = 1; i < data.length; i++) {
    // Row format: [Date, Content, Processed]
    const [dateVal, content, processed] = data[i];
    
    // Check Date Match
    let rowYMD = "";
    if (dateVal instanceof Date) {
      rowYMD = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      // Try string match
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        rowYMD = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
    }

    if (rowYMD === targetYMD) {
      logs.push(`- ${content}`);
    }
  }

  if (logs.length === 0) return "No logs found for " + targetYMD;
  return logs.join("\n");
}

// ==========================================
// Queue Processing (No-Code Agent Support)
// ==========================================

/**
 * Ensures the ReflectionsQueue sheet exists.
 * This sheet is used by the Workspace Agent to dump generated reflections.
 */
function setupReflectionsQueueSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const queueSheetName = "ReflectionsQueue";
  let sheet = ss.getSheetByName(queueSheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(queueSheetName);
    // Header: CreatedAt, TargetDate, Content, Processed
    sheet.appendRow(["CreatedAt", "TargetDate", "Content", "Processed"]);
    sheet.setFrozenRows(1);
    
    // Optional: Hide this sheet to avoid clutter?
    // sheet.hideSheet(); 
  }
  return sheet;
}

/**
 * [Trigger Function] Processes new rows in ReflectionsQueue and merges them into Records.
 * Set this to run on "On Change" or "Time-driven" (e.g. every 5 mins).
 */
function processReflectionsQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const queueSheet = setupReflectionsQueueSheet();
  const data = queueSheet.getDataRange().getValues();
  
  // Skip header
  for (let i = 1; i < data.length; i++) {
    const [createdAt, targetDate, content, processed] = data[i];
    
    if (processed === true || processed === "TRUE") continue;
    if (!targetDate || !content) continue;

    console.log(`Processing Queue Item: ${targetDate}`);
    
    // Normalize Date
    let dateStr = "";
    if (targetDate instanceof Date) {
      dateStr = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      // Try to parse string
      const d = new Date(targetDate);
      if (!isNaN(d.getTime())) {
        dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        dateStr = String(targetDate); // Fallback
      }
    }

    // Call existing save logic (Safe Merge)
    const result = saveDailyReflection(dateStr, content);
    console.log(`Merge Result: ${result}`);

    // Mark as processed
    queueSheet.getRange(i + 1, 4).setValue(true);
  }
}
