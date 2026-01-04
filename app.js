/* ===================================
   2026年 習慣トラッカー - アプリロジック
   =================================== */

// 習慣データ定義
const HABITS = [
    { id: 'study', icon: '📚', label: '勉強（30分〜）' },
    { id: 'exercise', icon: '💪', label: '運動' },
    { id: 'weight', icon: '⚖️', label: '体重測定' },
    { id: 'sideproject', icon: '💻', label: '副業開発' },
    { id: 'work', icon: '🏢', label: '仕事で成果' },
    { id: 'finance', icon: '💰', label: '家計簿チェック' }
];

// 曜日名
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAYS_FULL = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

// ===================================
// ユーティリティ関数
// ===================================

function formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = WEEKDAYS_FULL[date.getDay()];
    return `${year}年${month}月${day}日（${WEEKDAYS[date.getDay()]}）`;
}

function formatMonth(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

// Google Sheets API URL
const API_URL = 'https://script.google.com/macros/s/AKfycbzG_WauQz856-vr0S9yimRLMH-7yFJAKx4toBSQVXkTH_HfWb8MSc7n3DlXaNeKviEmjg/exec';

// キャッシュ用データ
let cachedData = {};
let cachedGoals = []; // 目標データのキャッシュ
let isDataLoaded = false;

// ===================================
// データ通信処理
// ===================================

async function fetchAllData() {
    showLoading(true);
    try {
        const response = await fetch(API_URL);
        const json = await response.json();

        // 新しいレスポンス形式 { records: {}, goals: [] } に対応
        if (json.records) {
            // 日付キーの正規化などの処理は records に対して行う
            // (以前のロジックでは API から直接正規化されたキーが返る想定だったが、
            //  念のためここでもチェックしてもよい。今回はシンプルに代入)
            cachedData = json.records;

            // 目標データのレンダリング
            cachedGoals = json.goals || [];
            renderResolutions(cachedGoals);
        } else {
            // 旧形式のフォールバック
            cachedData = json;
        }

        isDataLoaded = true;
        console.log('Data loaded:', cachedData);

        // UI更新
        renderToday();
        renderCalendar();
        renderStats();
        renderComments();

        return cachedData;
    } catch (error) {
        console.error('Error fetching data:', error);
        showToast('データの読み込みに失敗しました', 'error');
        return {};
    } finally {
        showLoading(false);
    }
}

// 抱負のレンダリング
// 抱負のレンダリング
function renderResolutions(goals) {
    const container = document.querySelector('.resolutions-container');

    if (!goals || goals.length === 0) {
        container.innerHTML = '<div class="no-data">目標が設定されていません。<br>スプレッドシートの "Goals" タブに入力してください。</div>';
        return;
    }

    container.innerHTML = ''; // クリア

    goals.forEach((goal, index) => {
        // 具体的なアクション（改行や中黒区切りをリスト化）
        const actionsHtml = (goal.detail || '').split('\n').map(line => {
            const cleanLine = line.replace(/^[・-]\s*/, ''); // 先頭の記号を削除
            return cleanLine ? `<li>${escapeHtml(cleanLine)}</li>` : '';
        }).join('');

        const card = document.createElement('div');
        card.className = `resolution-card ${goal.color || 'gray'}`;
        card.onclick = function () { toggleResolution(this); };

        // コンディション表示用バッジ
        const conditionHtml = goal.condition
            ? `<div class="condition-badge">⚠️ ${escapeHtml(goal.condition)}</div>`
            : '';

        // JS引数用にエスケープ (シングルクォートとバックスラッシュをエスケープ)
        const safeCat = (goal.category || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const safeTitle = (goal.title || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const safeCond = (goal.condition || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        card.innerHTML = `
            <div class="card-main">
                <div class="icon-wrapper">${goal.icon || '🎯'}</div>
                <div class="header-content">
                    <h3>${escapeHtml(goal.category)}</h3>
                    <p class="main-goal">${escapeHtml(goal.title)}</p>
                    ${conditionHtml}
                </div>
                <div class="toggle-icon">▼</div>
            </div>
            <div class="card-details">
                <div class="detail-block">
                    <h4>🎯 具体的なアクション</h4>
                    <ul>
                        ${actionsHtml}
                    </ul>
                </div>
                <div class="detail-block">
                    <h4>💭 意識すること</h4>
                    <p>${escapeHtml(goal.mindset)}</p>
                </div>
                <div class="resolution-actions">
                    <button class="btn-edit-condition" onclick="event.stopPropagation(); openGoalEditModal('${safeCat}', '${safeTitle}')">
                        📝 内容編集
                    </button>
                    &nbsp;&nbsp;
                    <button class="btn-edit-condition" onclick="event.stopPropagation(); openConditionModal('${safeCat}', '${safeTitle}', '${safeCond}')">
                        ⚠️ コンディション編集
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function syncData(dateKey, dayData) {
    // まずキャッシュを即時更新（楽観的UI更新）
    cachedData[dateKey] = dayData;

    // 全習慣IDについて true/false を明確にする
    const completeHabits = {};
    HABITS.forEach(h => {
        // 既存の値があればそれを使う、なければ false
        completeHabits[h.id] = !!dayData.habits[h.id];
    });

    // バックグラウンドで送信
    try {
        const payload = {
            date: dateKey,
            habits: completeHabits,
            reflection: dayData.reflection
        };

        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // CORS回避のためno-cors（レスポンスは読めないが送信はできる）
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        console.log('Data synced for', dateKey);
    } catch (error) {
        console.error('Error syncing data:', error);
        showToast('保存に失敗しました。ネット接続を確認してください', 'error');
    }
}

function getDayData(dateKey) {
    return cachedData[dateKey] || { habits: {}, reflection: '' };
}

// 読み込み中表示
function showLoading(isLoading) {
    const loader = document.getElementById('loader');
    if (isLoading) {
        if (!loader) createLoader();
        document.getElementById('loader').style.display = 'flex';
    } else {
        if (loader) loader.style.display = 'none';
    }
}

function createLoader() {
    const div = document.createElement('div');
    div.id = 'loader';
    div.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(div);
}

let currentDate = new Date();
let currentMonth = new Date();

// ===================================
// チェックリスト機能
// ===================================

function renderChecklist() {
    const checklist = document.getElementById('checklist');
    const dateKey = getDateKey(currentDate);
    const dayData = getDayData(dateKey);

    checklist.innerHTML = HABITS.map(habit => {
        const isChecked = dayData.habits[habit.id] || false;
        return `
            <div class="checklist-item ${isChecked ? 'checked' : ''}" data-habit-id="${habit.id}">
                <div class="checkbox"></div>
                <span class="icon">${habit.icon}</span>
                <span class="label">${habit.label}</span>
            </div>
        `;
    }).join('');

    // イベントリスナー追加
    checklist.querySelectorAll('.checklist-item').forEach(item => {
        item.addEventListener('click', () => toggleHabit(item.dataset.habitId));
    });

    updateProgress();
}

function toggleHabit(habitId) {
    const dateKey = getDateKey(currentDate);
    const dayData = getDayData(dateKey);

    // habitsオブジェクトがない場合の初期化
    if (!dayData.habits) dayData.habits = {};

    dayData.habits[habitId] = !dayData.habits[habitId];
    syncData(dateKey, dayData);

    renderChecklist();
}

function updateProgress() {
    const dateKey = getDateKey(currentDate);
    const dayData = getDayData(dateKey);

    const completed = HABITS.filter(h => dayData.habits[h.id]).length;
    const total = HABITS.length;
    const percentage = Math.round((completed / total) * 100);

    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('progress-text').textContent = `達成率: ${percentage}% (${completed}/${total})`;
}

// ===================================
// 振り返り機能
// ===================================

function loadReflection() {
    const dateKey = getDateKey(currentDate);
    const dayData = getDayData(dateKey);
    document.getElementById('reflection-text').value = dayData.reflection || '';
}

function saveReflection() {
    const dateKey = getDateKey(currentDate);
    const dayData = getDayData(dateKey);
    dayData.reflection = document.getElementById('reflection-text').value;
    syncData(dateKey, dayData);
    showToast('保存しました！');
}

// ===================================
// 日付ナビゲーション
// ===================================

function updateDateDisplay() {
    document.getElementById('current-date').textContent = formatDate(currentDate);
}

function goToPrevDay() {
    currentDate.setDate(currentDate.getDate() - 1);
    refreshTodayView();
}

function goToNextDay() {
    currentDate.setDate(currentDate.getDate() + 1);
    refreshTodayView();
}

function refreshTodayView() {
    updateDateDisplay();
    renderChecklist();
    loadReflection();
}

// ===================================
// 月間履歴機能
// ===================================

function renderHabitLegend() {
    const legend = document.getElementById('habit-legend');
    legend.innerHTML = HABITS.map(habit => `
        <div class="legend-item">
            <span class="icon">${habit.icon}</span>
            <span>${habit.label.split('（')[0]}</span>
        </div>
    `).join('');
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const todayKey = getDateKey(today);

    let html = '';

    // ヘッダー行（空白 + 曜日）
    html += '<div class="calendar-row-label"></div>';
    WEEKDAYS.forEach(day => {
        html += `<div class="calendar-header">${day}</div>`;
    });

    // 各週のレンダリング
    let dayCounter = 1;
    const totalWeeks = Math.ceil((daysInMonth + firstDay) / 7);

    for (let week = 0; week < totalWeeks; week++) {
        // 週ラベル（週番号）
        const weekStart = dayCounter;
        html += `<div class="calendar-row-label">${week + 1}週</div>`;

        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            if ((week === 0 && dayOfWeek < firstDay) || dayCounter > daysInMonth) {
                html += '<div class="calendar-cell empty"></div>';
            } else {
                const date = new Date(year, month, dayCounter);
                const dateKey = getDateKey(date);
                const dayData = getDayData(dateKey);
                const completed = HABITS.filter(h => dayData.habits[h.id]).length;
                const total = HABITS.length;

                let statusClass = '';
                let statusEmoji = '';

                if (completed === total && completed > 0) {
                    statusClass = 'full';
                    statusEmoji = '✨';
                } else if (completed > 0) {
                    statusClass = 'partial';
                    statusEmoji = `${completed}`;
                } else if (date <= today) {
                    statusClass = 'none';
                    statusEmoji = '−';
                }

                const isToday = dateKey === todayKey;

                html += `
                    <div class="calendar-cell ${statusClass} ${isToday ? 'today' : ''}" 
                         data-date="${dateKey}" title="${dayCounter}日: ${completed}/${total}達成">
                        <span class="day-number">${dayCounter}</span>
                        <span class="achievement">${statusEmoji}</span>
                    </div>
                `;
                dayCounter++;
            }
        }
    }

    grid.innerHTML = html;

    // カレンダーセルのクリックイベント
    grid.querySelectorAll('.calendar-cell:not(.empty)').forEach(cell => {
        cell.addEventListener('click', () => {
            if (cell.dataset.date) {
                // YYYY-MM-DD形式からローカル日付を作成
                const [y, m, d] = cell.dataset.date.split('-').map(Number);
                currentDate = new Date(y, m - 1, d);
                switchView('today');
                refreshTodayView();
            }
        });
    });
}

function renderStats() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);

    let totalCompleted = 0;
    let totalPossible = 0;
    let perfectDays = 0;
    let activeDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (date > new Date()) break; // 未来の日付はスキップ

        const dateKey = getDateKey(date);
        const dayData = getDayData(dateKey);
        // habitsが未定義の場合のガード
        const habits = dayData.habits || {};
        const completed = HABITS.filter(h => habits[h.id]).length;

        if (completed > 0) activeDays++;
        if (completed === HABITS.length) perfectDays++;
        totalCompleted += completed;
        totalPossible += HABITS.length;
    }

    const avgRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card">
            <div class="value">${avgRate}%</div>
            <div class="label">平均達成率</div>
        </div>
        <div class="stat-card">
            <div class="value">${perfectDays}</div>
            <div class="label">完全達成日</div>
        </div>
        <div class="stat-card">
            <div class="value">${activeDays}</div>
            <div class="label">活動日数</div>
        </div>
    `;
}

function updateMonthDisplay() {
    document.getElementById('current-month').textContent = formatMonth(currentMonth);
}

function renderComments() {
    const commentsList = document.getElementById('comments-list');
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const today = new Date();

    let commentsHtml = '';
    let hasComments = false;

    // 月の各日をチェック（新しい順）
    for (let day = daysInMonth; day >= 1; day--) {
        const date = new Date(year, month, day);
        if (date > today) continue; // 未来の日付はスキップ

        const dateKey = getDateKey(date);
        const dayData = getDayData(dateKey);

        if (dayData.reflection && dayData.reflection.trim()) {
            hasComments = true;
            const habits = dayData.habits || {};
            const completed = HABITS.filter(h => habits[h.id]).length;
            const total = HABITS.length;
            const dateStr = `${month + 1}/${day}（${WEEKDAYS[date.getDay()]}）`;

            commentsHtml += `
                <div class="comment-item" data-date="${dateKey}">
                    <div class="comment-date">
                        📅 ${dateStr}
                        <span class="achievement-badge">${completed}/${total}達成</span>
                    </div>
                    <div class="comment-text">${escapeHtml(dayData.reflection)}</div>
                </div>
            `;
        }
    }

    if (!hasComments) {
        commentsHtml = '<div class="no-comments">今月の振り返りはまだありません</div>';
    }

    commentsList.innerHTML = commentsHtml;

    // コメントクリックでその日に移動
    commentsList.querySelectorAll('.comment-item').forEach(item => {
        item.addEventListener('click', () => {
            const [y, m, d] = item.dataset.date.split('-').map(Number);
            currentDate = new Date(y, m - 1, d);
            switchView('today');
            refreshTodayView();
        });
    });
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function goToPrevMonth() {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    refreshHistoryView();
}

function goToNextMonth() {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    refreshHistoryView();
}

function refreshHistoryView() {
    updateMonthDisplay();
    renderCalendar();
    renderStats();
    renderComments();
}

// ===================================
// ビュー切り替え
// ===================================

function switchView(viewName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}-view`);
    });

    if (viewName === 'history') {
        refreshHistoryView();
    }
}

function toggleResolution(card) {
    // 他の開いているカードを閉じる（アコーディオン挙動）
    document.querySelectorAll('.resolution-card.active').forEach(c => {
        if (c !== card) c.classList.remove('active');
    });

    // クリックされたカードの開閉
    card.classList.toggle('active');
}

// ===================================
// トースト通知
// ===================================

function showToast(message) {
    // 既存のトーストを削除
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // アニメーション
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ===================================
// 初期化
// ===================================

// ===================================
// コンディション編集モーダル機能
// ===================================

let editingGoal = { category: '', title: '' };

function openConditionModal(category, title, currentCondition) {
    editingGoal = { category, title };
    const modal = document.getElementById('condition-modal');
    const textarea = document.getElementById('condition-limit');

    textarea.value = currentCondition || '';
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
}

function closeConditionModal() {
    const modal = document.getElementById('condition-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        editingGoal = { category: '', title: '' };
    }, 300);
}

async function saveCondition() {
    const condition = document.getElementById('condition-limit').value;
    const { category, title } = editingGoal;

    if (!category || !title) return;

    showLoading(true);
    closeConditionModal();

    try {
        const payload = {
            action: 'updateCondition',
            category: category,
            title: title,
            condition: condition
        };

        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        showToast('更新しました！反映まで数秒かかります...');

        setTimeout(async () => {
            await fetchAllData();
        }, 2000);

    } catch (error) {
        console.error('Update failed:', error);
        showToast('更新に失敗しました', 'error');
    } finally {
        showLoading(false);
    }
}

// ===================================
// 目標内容編集モーダル機能
// ===================================

let editingGoalContent = { category: '', currentTitle: '' };

function openGoalEditModal(category, title) {
    editingGoalContent = { category, currentTitle: title };

    // 現在の目標データを検索
    const goal = cachedGoals.find(g => g.category === category && g.title === title);
    if (!goal) return;

    const modal = document.getElementById('goal-edit-modal');
    document.getElementById('goal-title-input').value = goal.title || '';
    document.getElementById('goal-detail-input').value = goal.detail || '';
    document.getElementById('goal-mindset-input').value = goal.mindset || '';

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
}

function closeGoalEditModal() {
    const modal = document.getElementById('goal-edit-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        editingGoalContent = { category: '', currentTitle: '' };
    }, 300);
}

async function saveGoalContent() {
    const newTitle = document.getElementById('goal-title-input').value;
    const detail = document.getElementById('goal-detail-input').value;
    const mindset = document.getElementById('goal-mindset-input').value;
    const { category, currentTitle } = editingGoalContent;

    if (!category || !currentTitle || !newTitle) {
        showToast('タイトルは必須です', 'error');
        return;
    }

    showLoading(true);
    closeGoalEditModal();

    try {
        const payload = {
            action: 'updateGoalContent',
            category: category,
            currentTitle: currentTitle,
            newTitle: newTitle,
            detail: detail,
            mindset: mindset
        };

        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        showToast('更新しました！');

        // 再取得
        setTimeout(async () => {
            await fetchAllData();
        }, 2000);

    } catch (error) {
        console.error('Update failed:', error);
        showToast('更新に失敗しました', 'error');
    } finally {
        showLoading(false);
    }
}

// ===================================
// 初期化
// ===================================

async function init() {
    // 今日の日付を設定
    currentDate = new Date();
    currentMonth = new Date();

    // イベントリスナー設定
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    document.getElementById('prev-day').addEventListener('click', goToPrevDay);
    document.getElementById('next-day').addEventListener('click', goToNextDay);
    document.getElementById('prev-month').addEventListener('click', goToPrevMonth);
    document.getElementById('next-month').addEventListener('click', goToNextMonth);
    document.getElementById('save-reflection').addEventListener('click', saveReflection);

    // モーダル用リスナー
    const closeModalBtn = document.getElementById('close-condition-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeConditionModal);

    const cancelModalBtn = document.getElementById('cancel-condition');
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeConditionModal);

    const saveModalBtn = document.getElementById('save-condition');
    if (saveModalBtn) saveModalBtn.addEventListener('click', saveCondition);

    // モーダル外クリックで閉じる
    const modal = document.getElementById('condition-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'condition-modal') closeConditionModal();
        });
    }

    // 目標編集モーダル用リスナー
    const closeGoalEditBtn = document.getElementById('close-goal-edit-modal');
    if (closeGoalEditBtn) closeGoalEditBtn.addEventListener('click', closeGoalEditModal);

    const cancelGoalEditBtn = document.getElementById('cancel-goal-edit');
    if (cancelGoalEditBtn) cancelGoalEditBtn.addEventListener('click', closeGoalEditModal);

    const saveGoalContentBtn = document.getElementById('save-goal-content');
    if (saveGoalContentBtn) saveGoalContentBtn.addEventListener('click', saveGoalContent);

    const goalEditModal = document.getElementById('goal-edit-modal');
    if (goalEditModal) {
        goalEditModal.addEventListener('click', (e) => {
            if (e.target.id === 'goal-edit-modal') closeGoalEditModal();
        });
    }

    // データ読み込み
    await fetchAllData();

    // 初期表示
    refreshTodayView();
    renderHabitLegend();
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
