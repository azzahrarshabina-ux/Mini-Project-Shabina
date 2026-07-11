// ============================================================
// POMODORO TIMER — index.js
// ============================================================

// ------------------------------------------------------------
// 1. KONFIGURASI DURASI (dalam detik)
// ------------------------------------------------------------
const DURATIONS = {
    focus:      25 * 60,  // 25 menit
    shortBreak:  5 * 60,  // 5 menit
    longBreak:  15 * 60,  // 15 menit
};

// Setelah 4 sesi fokus → long break otomatis
const SESSIONS_BEFORE_LONG_BREAK = 4;

// Panjang keliling lingkaran SVG (2 * π * r = 2 * 3.14159 * 88 ≈ 553)
const CIRCLE_CIRCUMFERENCE = 553;

// ------------------------------------------------------------
// 2. STATE APLIKASI
// ------------------------------------------------------------
let currentMode    = 'focus';      // 'focus' | 'shortBreak' | 'longBreak'
let timeLeft       = DURATIONS.focus;
let totalTime      = DURATIONS.focus;
let isRunning      = false;
let intervalId     = null;

let completedSessions = 0;         // jumlah sesi fokus selesai
let totalMinutesLog   = 0;         // total menit fokus
let streak            = 0;         // sesi berturut-turut tanpa reset manual
let sessionInCycle    = 0;         // posisi dalam siklus (0-3)

// ------------------------------------------------------------
// 3. AMBIL ELEMEN DOM
// ------------------------------------------------------------
const timerDisplay   = document.getElementById('timerDisplay');
const modeLabel      = document.getElementById('modeLabel');
const progressCircle = document.getElementById('progressCircle');
const pulseRing      = document.getElementById('pulseRing');
const startPauseBtn  = document.getElementById('startPauseBtn');
const resetBtn       = document.getElementById('resetBtn');
const skipBtn        = document.getElementById('skipBtn');
const iconPlay       = document.getElementById('iconPlay');
const iconPause      = document.getElementById('iconPause');
const sessionDots    = document.getElementById('sessionDots');
const completedCount = document.getElementById('completedCount');
const totalMinutesEl = document.getElementById('totalMinutes');
const currentStreak  = document.getElementById('currentStreak');
const appBody        = document.getElementById('appBody');

const btnFocus       = document.getElementById('btnFocus');
const btnShortBreak  = document.getElementById('btnShortBreak');
const btnLongBreak   = document.getElementById('btnLongBreak');

// ------------------------------------------------------------
// 4. TEMA WARNA PER MODE
// ------------------------------------------------------------
const THEMES = {
    focus: {
        bg:         'bg-gradient-to-br from-rose-50 via-rose-100 to-pink-200',
        accent:     '#e11d48',
        accentSoft: 'rgba(225,29,72,0.15)',
        label:      'Focus Time',
        tabClass:   'bg-rose-500 text-white shadow-md',
        textClass:  'text-rose-600',
        subtextClass: 'text-rose-400',
    },
    shortBreak: {
        bg:         'bg-gradient-to-br from-cyan-50 via-cyan-100 to-sky-200',
        accent:     '#0891b2',
        accentSoft: 'rgba(8,145,178,0.15)',
        label:      'Short Break',
        tabClass:   'bg-cyan-500 text-white shadow-md',
        textClass:  'text-cyan-600',
        subtextClass: 'text-cyan-400',
    },
    longBreak: {
        bg:         'bg-gradient-to-br from-violet-50 via-violet-100 to-purple-200',
        accent:     '#7c3aed',
        accentSoft: 'rgba(124,58,237,0.15)',
        label:      'Long Break',
        tabClass:   'bg-violet-500 text-white shadow-md',
        textClass:  'text-violet-600',
        subtextClass: 'text-violet-400',
    },
};

// ------------------------------------------------------------
// 5. FORMAT WAKTU → "MM:SS"
// ------------------------------------------------------------
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ------------------------------------------------------------
// 6. UPDATE TAMPILAN TIMER & PROGRESS CIRCLE
// ------------------------------------------------------------
function updateDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);

    // Progress: semakin waktu berkurang, dashoffset semakin besar
    const progress = timeLeft / totalTime;
    const offset   = CIRCLE_CIRCUMFERENCE * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;

    // Update tab title browser
    document.title = `${formatTime(timeLeft)} — ${THEMES[currentMode].label}`;
}

// ------------------------------------------------------------
// 7. TERAPKAN TEMA SESUAI MODE
// ------------------------------------------------------------
function applyTheme(mode) {
    const theme = THEMES[mode];

    // Ganti background body
    appBody.className = `min-h-screen flex items-center justify-center transition-colors duration-700 ${theme.bg}`;

    // Ganti warna lingkaran progress
    progressCircle.setAttribute('stroke', theme.accent);
    pulseRing.style.background = theme.accentSoft;

    // Ganti warna teks timer
    timerDisplay.className = `text-6xl font-extrabold tabular-nums tracking-tight ${theme.textClass}`;
    modeLabel.className    = `text-xs font-medium ${theme.subtextClass} mt-1 uppercase tracking-widest`;
    modeLabel.textContent  = theme.label;

    // Ganti warna tombol utama
    startPauseBtn.className = `w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${mode === 'focus' ? 'bg-rose-500' : mode === 'shortBreak' ? 'bg-cyan-500' : 'bg-violet-500'}`;

    // Reset semua tab ke tidak aktif
    const inactiveStyle = 'background: rgba(255,255,255,0.4);';
    [btnFocus, btnShortBreak, btnLongBreak].forEach(btn => {
        btn.className = `flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${theme.subtextClass}`;
        btn.style.cssText = inactiveStyle;
    });

    // Aktifkan tab yang sesuai
    const activeBtn = mode === 'focus' ? btnFocus : mode === 'shortBreak' ? btnShortBreak : btnLongBreak;
    activeBtn.className = `flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${theme.tabClass}`;
    activeBtn.style.cssText = '';
}

// ------------------------------------------------------------
// 8. RENDER SESSION DOTS (● = selesai, ○ = belum)
// ------------------------------------------------------------
function renderSessionDots() {
    sessionDots.innerHTML = '';
    for (let i = 0; i < SESSIONS_BEFORE_LONG_BREAK; i++) {
        const dot = document.createElement('div');
        dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${
            i < sessionInCycle
                ? (currentMode === 'focus' ? 'bg-rose-500' : currentMode === 'shortBreak' ? 'bg-cyan-500' : 'bg-violet-500')
                : 'bg-white/50'
        }`;
        sessionDots.appendChild(dot);
    }
}

// ------------------------------------------------------------
// 9. UPDATE STATS
// ------------------------------------------------------------
function updateStats() {
    completedCount.textContent = completedSessions;
    totalMinutesEl.textContent = totalMinutesLog;
    currentStreak.textContent  = streak;
}

// ------------------------------------------------------------
// 10. TOGGLE PLAY/PAUSE ICON
// ------------------------------------------------------------
function setPlayPauseIcon(running) {
    if (running) {
        iconPlay.classList.add('hidden');
        iconPause.classList.remove('hidden');
        pulseRing.classList.remove('hidden');
        pulseRing.classList.add('pulse-ring');
    } else {
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
        pulseRing.classList.add('hidden');
        pulseRing.classList.remove('pulse-ring');
    }
}

// ------------------------------------------------------------
// 11. GANTI MODE (fokus / short break / long break)
// ------------------------------------------------------------
function switchMode(mode) {
    // Stop timer dulu kalau sedang jalan
    clearInterval(intervalId);
    isRunning = false;
    setPlayPauseIcon(false);

    currentMode = mode;
    timeLeft    = DURATIONS[mode];
    totalTime   = DURATIONS[mode];

    applyTheme(mode);
    updateDisplay();
    renderSessionDots();
}

// ------------------------------------------------------------
// 12. LOGIKA SAAT SATU SESI SELESAI
// ------------------------------------------------------------
function onSessionComplete() {
    clearInterval(intervalId);
    isRunning = false;
    setPlayPauseIcon(false);

    // Bunyi notifikasi sederhana (Web Audio API)
    playBeep();

    if (currentMode === 'focus') {
        completedSessions++;
        totalMinutesLog += 25;
        streak++;
        sessionInCycle++;

        updateStats();

        // Setelah 4 sesi → long break, lalu reset siklus
        if (sessionInCycle >= SESSIONS_BEFORE_LONG_BREAK) {
            sessionInCycle = 0;
            switchMode('longBreak');
        } else {
            switchMode('shortBreak');
        }
    } else {
        // Setelah break → kembali ke fokus
        switchMode('focus');
    }

    renderSessionDots();
}

// ------------------------------------------------------------
// 13. START / PAUSE
// ------------------------------------------------------------
function startPause() {
    if (isRunning) {
        // PAUSE
        clearInterval(intervalId);
        isRunning = false;
        setPlayPauseIcon(false);
    } else {
        // START
        isRunning = true;
        setPlayPauseIcon(true);

        intervalId = setInterval(() => {
            timeLeft--;
            updateDisplay();

            if (timeLeft <= 0) {
                onSessionComplete();
            }
        }, 1000);
    }
}

// ------------------------------------------------------------
// 14. RESET
// ------------------------------------------------------------
function reset() {
    clearInterval(intervalId);
    isRunning = false;
    setPlayPauseIcon(false);

    // Reset streak kalau di sesi fokus
    if (currentMode === 'focus') {
        streak = 0;
        updateStats();
    }

    timeLeft  = DURATIONS[currentMode];
    totalTime = DURATIONS[currentMode];
    updateDisplay();
}

// ------------------------------------------------------------
// 15. SKIP — lompat ke mode berikutnya
// ------------------------------------------------------------
function skip() {
    if (currentMode === 'focus') {
        sessionInCycle++;
        if (sessionInCycle >= SESSIONS_BEFORE_LONG_BREAK) {
            sessionInCycle = 0;
            switchMode('longBreak');
        } else {
            switchMode('shortBreak');
        }
    } else {
        switchMode('focus');
    }
}

// ------------------------------------------------------------
// 16. BUNYI NOTIFIKASI (Web Audio API — tanpa file eksternal)
// ------------------------------------------------------------
function playBeep() {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type      = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);           // nada A5
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
        // browser tidak support AudioContext — skip bunyi
    }
}

// ------------------------------------------------------------
// 17. EVENT LISTENERS
// ------------------------------------------------------------
startPauseBtn.addEventListener('click', startPause);
resetBtn.addEventListener('click', reset);
skipBtn.addEventListener('click', skip);

btnFocus.addEventListener('click', () => switchMode('focus'));
btnShortBreak.addEventListener('click', () => switchMode('shortBreak'));
btnLongBreak.addEventListener('click', () => switchMode('longBreak'));

// ------------------------------------------------------------
// 18. INISIALISASI AWAL
// ------------------------------------------------------------
applyTheme('focus');
updateDisplay();
renderSessionDots();
updateStats();
