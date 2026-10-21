import { initDB, addHabit, getAllHabits, updateHabit, deleteHabit, setLog, getLogsForDate, getDatesWithLogs } from './db.js';
import { initWeather, getWeatherTheme, getWeatherEmoji } from './weather.js';
import { getStage, getStageName, getMotivationalMessage, renderFrog } from './frog.js';

// ---------------------------------------------------------------------------
// App State
// ---------------------------------------------------------------------------
const state = {
  selectedDate: getLocalDateString(new Date()),
  habits: [],
  logs: [],
  currentScore: 0,
  currentWeekStart: getStartOfWeek(new Date()),
};


// ---------------------------------------------------------------------------
// DOM Elements
// ---------------------------------------------------------------------------
const els = {
  // Weather
  weatherBg: document.getElementById('weatherBg'),
  weatherBadge: document.getElementById('weatherBadge'),
  weatherEmoji: document.getElementById('weatherEmoji'),
  weatherTemp: document.getElementById('weatherTemp'),
  weatherDesc: document.getElementById('weatherDesc'),
  rainContainer: document.getElementById('rainContainer'),

  // Dashboard
  frogContainer: document.getElementById('frogContainer'),
  scoreValue: document.getElementById('scoreValue'),
  stageName: document.getElementById('stageName'),
  progressBar: document.getElementById('progressBar'),
  motivationPopup: document.getElementById('motivationPopup'),
  motivationText: document.getElementById('motivationText'),

  // Habits
  habitList: document.getElementById('habitList'),
  addHabitBtn: document.getElementById('addHabitBtn'),

  // Calendar
  calendarGrid: document.getElementById('calendarGrid'),
  monthLabel: document.getElementById('monthLabel'),
  prevMonthBtn: document.getElementById('prevMonthBtn'),
  nextMonthBtn: document.getElementById('nextMonthBtn'),
  dateIndicator: document.getElementById('dateIndicator'),
  selectedDateLabel: document.getElementById('selectedDateLabel'),
  returnToTodayBtn: document.getElementById('returnToTodayBtn'),

  // Modal
  habitModal: document.getElementById('habitModal'),
  modalTitle: document.getElementById('modalTitle'),
  habitNameInput: document.getElementById('habitName'),
  habitWeightInput: document.getElementById('habitWeight'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  saveHabitBtn: document.getElementById('saveHabitBtn'),
};

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
async function initApp() {
  await initDB();
  
  initWeather(updateWeatherUI);
  
  await loadHabits();
  await updateDashboard();
  renderCalendar();
  
  setupEventListeners();
}

document.addEventListener('DOMContentLoaded', initApp);

// ---------------------------------------------------------------------------
// Date Utilities
// ---------------------------------------------------------------------------
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

function getLocalDateString(date) {
  const tzoffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzoffset).toISOString().split('T')[0];
}

function getMonthString(date) {
  return getLocalDateString(date).substring(0, 7); // YYYY-MM
}

function isToday(dateStr) {
  return dateStr === getLocalDateString(new Date());
}

function formatDateDisplay(dateStr) {
  if (isToday(dateStr)) return 'Today';
  
  const d = new Date(dateStr);
  const tzoffset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() + tzoffset);
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (getLocalDateString(localDate) === getLocalDateString(yesterday)) {
    return 'Yesterday';
  }
  
  return localDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isHabitLiveOnDate(habit, dateStr) {
  if (!habit.createdAt) return true;
  const createdDate = habit.createdAt.split('T')[0];
  if (createdDate > dateStr) {
    return false;
  }
  if (!habit.isActive) {
    if (habit.deletedAt) {
      const deletedDate = habit.deletedAt.split('T')[0];
      if (deletedDate <= dateStr) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Weather UI
// ---------------------------------------------------------------------------
function updateWeatherUI(weather) {
  // Update badge
  els.weatherEmoji.textContent = weather.emoji;
  els.weatherTemp.textContent = weather.temperature ? Math.round(weather.temperature) + '°C' : '--°C';
  
  let desc = weather.theme.charAt(0).toUpperCase() + weather.theme.slice(1);
  els.weatherDesc.textContent = desc;

  // Update background classes
  document.body.className = `weather-${weather.theme}`;

  // Add rain/snow animations if needed
  els.rainContainer.innerHTML = '';
  if (weather.theme === 'rainy' || weather.theme === 'stormy') {
    createParticles('raindrop', 50);
  } else if (weather.theme === 'snowy') {
    createParticles('snowflake', 50);
  } else if (weather.theme === 'overcast' || weather.theme === 'foggy') {
    createParticles('cloud-particle', 10);
  }
}

function createParticles(className, count) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = className;
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (Math.random() * 1 + 0.5) + 's';
    p.style.animationDelay = (Math.random() * 2) + 's';
    if (className === 'snowflake') {
      p.style.width = Math.random() * 5 + 3 + 'px';
      p.style.height = p.style.width;
      p.style.opacity = Math.random() * 0.5 + 0.3;
      p.style.animationDuration = (Math.random() * 3 + 2) + 's';
    } else if (className === 'cloud-particle') {
      p.style.width = Math.random() * 200 + 100 + 'px';
      p.style.height = Math.random() * 50 + 20 + 'px';
      p.style.top = Math.random() * 40 + 'vh';
      p.style.animationDuration = (Math.random() * 20 + 20) + 's';
    }
    els.rainContainer.appendChild(p);
  }
}

// ---------------------------------------------------------------------------
// Dashboard UI (Score & Frog)
// ---------------------------------------------------------------------------
async function updateDashboard() {
  state.logs = await getLogsForDate(state.selectedDate);
  calculateScore();
  
  // Update Score
  els.scoreValue.textContent = Math.round(state.currentScore);
  
  // Update Frog
  renderFrog(els.frogContainer, state.currentScore);
  
  // Update Stage Name
  const stage = getStage(state.currentScore);
  els.stageName.textContent = getStageName(stage);
  
  // Update classes
  els.stageName.className = `stage-name stage-${stage}`;
  els.progressBar.className = `progress-bar-fill stage-${stage}`;
  els.progressBar.style.width = `${state.currentScore}%`;
  
  renderHabitList();
  renderCalendar(); // Update dots
}

function calculateScore() {
  // S = (Sum(W * C) / Sum(W)) * 100
  
  let totalWeight = 0;
  let earnedWeight = 0;
  
  // Determine which habits to evaluate for the selected date
  // We'll evaluate all habits that were live on this date + any habits that have logs for this date
  
  const habitsToEvaluate = new Map(); // id -> { name, weight, isCompleted }
  
  // 1. Add habits that were live on the selected date
  state.habits.forEach(h => {
    if (isHabitLiveOnDate(h, state.selectedDate)) {
      habitsToEvaluate.set(h.id, { name: h.name, weight: h.weight, isCompleted: false });
    }
  });
  
  // 2. Overlay with logs
  state.logs.forEach(log => {
    habitsToEvaluate.set(log.habitId, {
      name: log.habitName || (habitsToEvaluate.has(log.habitId) ? habitsToEvaluate.get(log.habitId).name : 'Unknown'),
      weight: log.habitWeight !== undefined ? log.habitWeight : (habitsToEvaluate.has(log.habitId) ? habitsToEvaluate.get(log.habitId).weight : 0),
      isCompleted: log.isCompleted
    });
  });
  
  if (habitsToEvaluate.size === 0) {
    state.currentScore = 0;
    return;
  }
  
  habitsToEvaluate.forEach(item => {
    totalWeight += item.weight;
    if (item.isCompleted) {
      earnedWeight += item.weight;
    }
  });
  
  state.currentScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
}

// ---------------------------------------------------------------------------
// Habits List UI
// ---------------------------------------------------------------------------
async function loadHabits() {
  state.habits = await getAllHabits();
}

function renderHabitList() {
  els.habitList.innerHTML = '';
  
  // Same logic as scoring to show the right list for historical dates
  const habitsToRender = new Map();
  
  // 1. Add habits that were live on this date
  state.habits.forEach(h => {
    if (isHabitLiveOnDate(h, state.selectedDate)) {
      habitsToRender.set(h.id, { id: h.id, name: h.name, weight: h.weight, isCompleted: false, isActive: h.isActive });
    }
  });
  
  // 2. Overlay with logs
  state.logs.forEach(log => {
    const matchingHabit = state.habits.find(h => h.id === log.habitId);
    const isCurrentlyActive = matchingHabit ? matchingHabit.isActive : false;
    habitsToRender.set(log.habitId, {
      id: log.habitId,
      name: log.habitName || (habitsToRender.has(log.habitId) ? habitsToRender.get(log.habitId).name : 'Unknown'),
      weight: log.habitWeight !== undefined ? log.habitWeight : (habitsToRender.has(log.habitId) ? habitsToRender.get(log.habitId).weight : 0),
      isCompleted: log.isCompleted,
      isActive: isCurrentlyActive
    });
  });
  
  const items = Array.from(habitsToRender.values());
  
  if (items.length === 0) {
    els.habitList.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">📝</span>
        No habits tracked for this day.<br>Add one to get started!
      </div>
    `;
    return;
  }
  
  items.sort((a, b) => b.weight - a.weight); // Sort by importance
  
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = `habit-item ${item.isCompleted ? 'completed' : ''} fade-in`;
    el.innerHTML = `
      <div class="habit-checkbox">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <div class="habit-info">
        <div class="habit-name">${item.name} ${!item.isActive ? '(Deleted)' : ''}</div>
        <div class="habit-weight-badge">Weight: ${item.weight}</div>
      </div>
      <div class="habit-actions">
        ${item.isActive ? `<button class="habit-delete-btn" data-id="${item.id}" title="Delete Habit">🗑️</button>` : ''}
      </div>
    `;
    
    // Toggle completion on tap
    el.addEventListener('click', async (e) => {
      if (e.target.closest('.habit-delete-btn')) return;
      
      const newStatus = !item.isCompleted;
      await setLog(state.selectedDate, item.id, newStatus, item.name, item.weight);
      await updateDashboard(); // Re-render
    });
    
    // Delete habit
    const delBtn = el.querySelector('.habit-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete habit "${item.name}"? Historical logs will be preserved.`)) {
          await deleteHabit(item.id);
          await loadHabits();
          await updateDashboard();
        }
      });
    }
    
    els.habitList.appendChild(el);
  });
}

// ---------------------------------------------------------------------------
// Calendar UI
// ---------------------------------------------------------------------------
async function renderCalendar() {
  const monday = new Date(state.currentWeekStart);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  // Format week range label
  let labelText = '';
  if (monday.getFullYear() !== sunday.getFullYear()) {
    labelText = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (monday.getMonth() !== sunday.getMonth()) {
    labelText = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else {
    labelText = `${monday.toLocaleDateString('en-US', { month: 'long' })} ${monday.getDate()} - ${sunday.getDate()}, ${monday.getFullYear()}`;
  }
  els.monthLabel.textContent = labelText;
  
  // Clear grid except headers
  const headers = Array.from(els.calendarGrid.querySelectorAll('.calendar-day-header'));
  els.calendarGrid.innerHTML = '';
  headers.forEach(h => els.calendarGrid.appendChild(h));
  
  const todayStr = getLocalDateString(new Date());
  
  // Fetch logged dates (handling month boundaries)
  const loggedSet = new Set();
  const month1Str = getMonthString(monday);
  const loggedDates1 = await getDatesWithLogs(month1Str);
  loggedDates1.forEach(d => loggedSet.add(d));
  
  if (monday.getMonth() !== sunday.getMonth()) {
    const month2Str = getMonthString(sunday);
    const loggedDates2 = await getDatesWithLogs(month2Str);
    loggedDates2.forEach(d => loggedSet.add(d));
  }
  
  // Render Monday through Sunday
  for (let i = 0; i < 7; i++) {
    const dateObj = new Date(monday);
    dateObj.setDate(monday.getDate() + i);
    const dateStr = getLocalDateString(dateObj);
    const d = dateObj.getDate();
    
    const el = document.createElement('div');
    el.className = 'calendar-day fade-in';
    el.textContent = d;
    
    if (dateStr > todayStr) {
      el.classList.add('future');
    } else {
      if (dateStr === todayStr) el.classList.add('today');
      if (dateStr === state.selectedDate) el.classList.add('selected');
      if (loggedSet.has(dateStr)) el.classList.add('has-data');
      
      el.addEventListener('click', async () => {
        state.selectedDate = dateStr;
        els.selectedDateLabel.textContent = formatDateDisplay(dateStr);
        if (isToday(dateStr)) {
          els.returnToTodayBtn.classList.add('hidden');
        } else {
          els.returnToTodayBtn.classList.remove('hidden');
        }
        await updateDashboard();
      });
    }
    
    els.calendarGrid.appendChild(el);
  }
}

// ---------------------------------------------------------------------------
// Modals and Interactions
// ---------------------------------------------------------------------------
function openHabitModal() {
  els.habitNameInput.value = '';
  els.habitWeightInput.value = '10';
  els.habitModal.classList.add('show');
  setTimeout(() => els.habitNameInput.focus(), 100);
}

function closeHabitModal() {
  els.habitModal.classList.remove('show');
  els.habitNameInput.blur();
}

async function handleSaveHabit() {
  const name = els.habitNameInput.value.trim();
  const weight = parseInt(els.habitWeightInput.value, 10);
  
  if (!name) return alert('Please enter a habit name.');
  if (isNaN(weight) || weight < 1 || weight > 100) return alert('Weight must be between 1 and 100.');
  
  await addHabit(name, weight);
  await loadHabits();
  closeHabitModal();
  await updateDashboard();
}

// Frog Interaction
function handleFrogTap() {
  // Visual bounce
  els.frogContainer.classList.remove('bouncing');
  void els.frogContainer.offsetWidth; // trigger reflow
  els.frogContainer.classList.add('bouncing');
  
  // Show popup
  const stage = getStage(state.currentScore);
  const msg = getMotivationalMessage(stage);
  
  els.motivationText.textContent = msg;
  els.motivationPopup.className = `motivation-popup stage-${stage}`;
  
  // Trigger animation
  els.motivationPopup.classList.remove('show');
  void els.motivationPopup.offsetWidth;
  els.motivationPopup.classList.add('show');
}

// Event Listeners
function setupEventListeners() {
  els.addHabitBtn.addEventListener('click', openHabitModal);
  els.cancelModalBtn.addEventListener('click', closeHabitModal);
  els.saveHabitBtn.addEventListener('click', handleSaveHabit);
  
  // Enter key to save
  els.habitNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSaveHabit();
  });
  els.habitWeightInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSaveHabit();
  });
  
  // Close modal on outside click
  els.habitModal.addEventListener('click', (e) => {
    if (e.target === els.habitModal) closeHabitModal();
  });
  
  // Frog tap
  els.frogContainer.addEventListener('click', handleFrogTap);
  
  // Calendar Nav
  els.prevMonthBtn.addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7);
    renderCalendar();
  });
  
  els.nextMonthBtn.addEventListener('click', () => {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7);
    renderCalendar();
  });
  
  els.returnToTodayBtn.addEventListener('click', async () => {
    state.selectedDate = getLocalDateString(new Date());
    els.selectedDateLabel.textContent = 'Today';
    els.returnToTodayBtn.classList.add('hidden');
    state.currentWeekStart = getStartOfWeek(new Date());
    await updateDashboard();
  });
}
