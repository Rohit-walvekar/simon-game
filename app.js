/* ═══════════════════════════════════════════════════════════════
   Simon Says — App Logic
   Preserved core game logic + premium UI layer
   ═══════════════════════════════════════════════════════════════ */

// ── Core game state (preserved) ───────────────────────────────
let gameSequence = [];
let userSequence = [];
let btnColors = ["red", "yellow", "green", "blue"];

let started = false;
let level   = 0;
let highScore = Number(localStorage.getItem("simonHighScore")) || 0;
let soundEnabled = localStorage.getItem("simonSound") !== "false";
let isPlayingSequence = false; // prevents player clicking during Simon's turn

// ── DOM References ────────────────────────────────────────────
const welcomeScreen   = document.getElementById("welcome-screen");
const gameScreen      = document.getElementById("game-screen");
const gameOverOverlay = document.getElementById("gameover-overlay");

const startBtn      = document.getElementById("start-btn");
const playAgainBtn  = document.getElementById("play-again-btn");
const homeBtn       = document.getElementById("home-btn");

const hudLevel  = document.getElementById("hud-level");
const hudScore  = document.getElementById("hud-score");
const hudBest   = document.getElementById("hud-best");

const statusMsg  = document.getElementById("status-msg");
const statusIcon = document.getElementById("status-icon");
const statusText = document.getElementById("status-text");

const modalScore = document.getElementById("modal-score");
const modalBest  = document.getElementById("modal-best");
const badgeStars = document.getElementById("badge-stars");
const badgeTitle = document.getElementById("badge-title");
const modalEmoji = document.getElementById("modal-emoji");

const soundToggle = document.getElementById("sound-toggle");
const themeToggle = document.getElementById("theme-toggle");

const btnContainer = document.querySelector(".btn-container");
const allBtns      = document.querySelectorAll(".btn");

// ── Sounds (preserved URLs) ───────────────────────────────────
const sounds = {
  red:    new Audio("https://s3.amazonaws.com/freecodecamp/simonSound1.mp3"),
  yellow: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound2.mp3"),
  green:  new Audio("https://s3.amazonaws.com/freecodecamp/simonSound3.mp3"),
  blue:   new Audio("https://s3.amazonaws.com/freecodecamp/simonSound4.mp3"),
  wrong:  new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"),
};

// Preload audio
Object.values(sounds).forEach(audio => { audio.preload = "auto"; });

// ═══════════════════════════════════════════════════════════════
// SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function showGame() {
  // Fade out welcome
  welcomeScreen.classList.remove("active");
  welcomeScreen.classList.add("exit");

  // After transition, hide welcome and show game
  setTimeout(() => {
    welcomeScreen.classList.remove("exit");
    gameScreen.classList.add("active");
    // Kick off Level 1 immediately
    beginGame();
  }, 450);
}

function showWelcome() {
  // Hide game screen and modal
  gameScreen.classList.remove("active");
  hideModal();
  reset();

  // Small delay then show welcome
  setTimeout(() => {
    welcomeScreen.classList.add("active");
  }, 100);
}

// ═══════════════════════════════════════════════════════════════
// STATUS MESSAGES
// ═══════════════════════════════════════════════════════════════

// FA icon class names for each status state
const STATUS = {
  watch:    { iconCls: "fa-solid fa-eye",          text: "Watch Carefully…",      cls: "watch"    },
  remember: { iconCls: "fa-solid fa-brain",         text: "Remember the Pattern…", cls: "watch"    },
  yourTurn: { iconCls: "fa-solid fa-hand-pointer",  text: "Your Turn!",            cls: "your-turn" },
  correct:  { iconCls: "fa-solid fa-check",         text: "Correct!",              cls: "correct"  },
  levelUp:  { iconCls: "fa-solid fa-circle-check",  text: "Level Complete!",       cls: "level-up" },
  wrong:    { iconCls: "fa-solid fa-xmark",         text: "Wrong Sequence",        cls: "wrong"    },
  gameOver: { iconCls: "fa-solid fa-skull",         text: "Game Over",             cls: "wrong"    },
};

function setStatus(key) {
  const s = STATUS[key];
  if (!s) return;

  statusMsg.classList.remove("watch", "your-turn", "correct", "level-up", "wrong");
  statusMsg.style.animation = "none";
  void statusMsg.offsetWidth;
  statusMsg.style.animation = "";

  // Swap FA icon class
  statusIcon.className = "status-icon " + s.iconCls;
  statusText.textContent = s.text;
  if (s.cls) statusMsg.classList.add(s.cls);
}

// ═══════════════════════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════════════════════

function updateHUD() {
  hudLevel.textContent = level;
  hudScore.textContent = level > 0 ? level - 1 : 0;
  hudBest.textContent  = highScore;

  // Bump animation on score elements
  [hudLevel, hudScore, hudBest].forEach(el => {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  });
}

function bumpHUDItem(el) {
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

// ═══════════════════════════════════════════════════════════════
// GAME LOGIC (Preserved + enhanced)
// ═══════════════════════════════════════════════════════════════

function beginGame() {
  started = true;
  gameSequence = [];
  userSequence = [];
  level = 0;
  updateHUD();
  levelUp();
}

function playSound(name) {
  if (!soundEnabled) return;
  try {
    sounds[name].currentTime = 0;
    sounds[name].play().catch(() => {}); // silence autoplay policy errors
  } catch (e) {}
}

function btnFlash(btn) {
  const color = btn.id;
  playSound(color);
  btn.classList.add("flash");
  setTimeout(() => btn.classList.remove("flash"), 320);
}

function levelUp() {
  userSequence = [];
  level++;

  // Update HUD
  const score = level - 1;
  hudLevel.textContent = level;
  hudScore.textContent = score;
  bumpHUDItem(hudLevel);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("simonHighScore", highScore);
    hudBest.textContent = highScore;
    bumpHUDItem(hudBest);
  }

  // Status: watch
  setStatus("watch");

  // Disable buttons while Simon plays
  lockBoard(true);

  // Pick a new random color and add to sequence
  const randomIdx   = Math.floor(Math.random() * 4);
  const randomColor = btnColors[randomIdx];
  const randomBtn   = document.querySelector(`#${randomColor}`);

  gameSequence.push(randomColor);

  // Play the full sequence with delays
  playSequence();
}

function playSequence() {
  isPlayingSequence = true;
  const baseDelay = 600;
  const flashDuration = 550;

  gameSequence.forEach((color, i) => {
    setTimeout(() => {
      const btn = document.querySelector(`#${color}`);
      btnFlash(btn);

      // After last flash, unlock board
      if (i === gameSequence.length - 1) {
        setTimeout(() => {
          isPlayingSequence = false;
          lockBoard(false);
          setStatus("yourTurn");
        }, 400);
      }
    }, i * flashDuration + baseDelay);
  });
}

function lockBoard(lock) {
  if (lock) {
    btnContainer.classList.add("disabled");
  } else {
    btnContainer.classList.remove("disabled");
  }
}

function btnPress() {
  if (isPlayingSequence) return; // Safety guard

  const btn = this;
  btnFlash(btn);
  addRipple(btn);

  const userColor = btn.id;
  userSequence.push(userColor);

  checkAns(userSequence.length - 1);
}

allBtns.forEach(btn => btn.addEventListener("click", btnPress));

// Keyboard accessibility for game buttons
allBtns.forEach(btn => {
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      btnPress.call(btn);
    }
  });
});

function checkAns(idx) {
  if (userSequence[idx] === gameSequence[idx]) {
    // Correct so far
    setStatus("correct");

    if (userSequence.length === gameSequence.length) {
      // Full sequence matched — level complete
      setStatus("levelUp");
      lockBoard(true);
      setTimeout(levelUp, 900);
    }
  } else {
    // Wrong!
    playSound("wrong");
    setStatus("wrong");

    // Board shake
    btnContainer.classList.add("shake");
    setTimeout(() => btnContainer.classList.remove("shake"), 450);

    // Body flash
    document.body.classList.add("game-over-flash");
    setTimeout(() => document.body.classList.remove("game-over-flash"), 450);

    const finalScore = level - 1;
    lockBoard(true);

    setTimeout(() => {
      showGameOverModal(finalScore);
      reset();
    }, 700);
  }
}

function reset() {
  started = false;
  gameSequence = [];
  userSequence = [];
  level = 0;
  isPlayingSequence = false;
  lockBoard(false);
}

// ═══════════════════════════════════════════════════════════════
// GAME OVER MODAL
// ═══════════════════════════════════════════════════════════════

const BADGES = [
  { min: 0,  count: 1, label: "Beginner"       },
  { min: 3,  count: 2, label: "Memory Learner"  },
  { min: 7,  count: 3, label: "Skilled Player"  },
  { min: 12, count: 4, label: "Memory Master"   },
  { min: 20, count: 5, label: "Simon Legend"    },
];

function getBadge(score) {
  let badge = BADGES[0];
  for (const b of BADGES) {
    if (score >= b.min) badge = b;
  }
  return badge;
}

function showGameOverModal(score) {
  const badge = getBadge(score);
  const modalIconEl = document.getElementById("modal-icon");
  const modalIconWrap = document.getElementById("modal-icon-wrap");

  // Set icon based on score — all Font Awesome
  if (score >= 20) {
    modalIconEl.className = "fa-solid fa-trophy";
    modalIconWrap.classList.add("win");
  } else if (score >= 12) {
    modalIconEl.className = "fa-solid fa-medal";
    modalIconWrap.classList.add("win");
  } else if (score >= 7) {
    modalIconEl.className = "fa-solid fa-star";
    modalIconWrap.classList.add("win");
  } else {
    modalIconEl.className = "fa-solid fa-skull";
    modalIconWrap.classList.remove("win");
  }

  modalScore.textContent = score;
  modalBest.textContent  = highScore;
  badgeTitle.textContent = badge.label;

  // Render FA stars
  badgeStars.innerHTML = Array.from(
    { length: badge.count },
    () => '<i class="fa-solid fa-star"></i>'
  ).join("");

  gameOverOverlay.removeAttribute("hidden");
  gameOverOverlay.setAttribute("aria-hidden", "false");

  setTimeout(() => playAgainBtn.focus(), 100);
}

function hideModal() {
  gameOverOverlay.setAttribute("hidden", "");
  gameOverOverlay.setAttribute("aria-hidden", "true");
}

playAgainBtn.addEventListener("click", () => {
  hideModal();
  reset();
  beginGame();
});

homeBtn.addEventListener("click", () => {
  showWelcome();
});

// ═══════════════════════════════════════════════════════════════
// START BUTTON
// ═══════════════════════════════════════════════════════════════

startBtn.addEventListener("click", (e) => {
  addRippleToBtn(startBtn, e);
  showGame();
});

// Keyboard shortcut on welcome screen
document.addEventListener("keydown", (e) => {
  if ((e.key === " " || e.key === "Enter") && welcomeScreen.classList.contains("active")) {
    e.preventDefault();
    startBtn.click();
  }
});

// ═══════════════════════════════════════════════════════════════
// RIPPLE EFFECT
// ═══════════════════════════════════════════════════════════════

function addRippleToBtn(btn, e) {
  const container = btn.querySelector(".ripple-container");
  if (!container) return;

  const ripple = document.createElement("span");
  ripple.className = "ripple";

  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = (e ? e.clientX : rect.left + rect.width / 2) - rect.left - size / 4;
  const y = (e ? e.clientY : rect.top + rect.height / 2) - rect.top - size / 4;

  ripple.style.cssText = `width:${size/2}px; height:${size/2}px; left:${x}px; top:${y}px;`;
  container.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

function addRipple(btn) {
  // Subtle flash ripple on color buttons (no container needed — use ::after trick)
  // Already handled by flash class
}

// ═══════════════════════════════════════════════════════════════
// SOUND TOGGLE
// ═══════════════════════════════════════════════════════════════

function updateSoundUI() {
  const icon = document.getElementById("sound-icon");
  if (soundEnabled) {
    icon.className = "fa-solid fa-volume-high";
  } else {
    icon.className = "fa-solid fa-volume-xmark";
  }
  soundToggle.title = soundEnabled ? "Sound ON — click to mute" : "Sound OFF — click to unmute";
  soundToggle.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Unmute sound");
}

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("simonSound", soundEnabled);
  updateSoundUI();
});

// ═══════════════════════════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════════════════════════

const htmlEl = document.documentElement;
const savedTheme = localStorage.getItem("simonTheme") || "dark";
htmlEl.setAttribute("data-theme", savedTheme);

function updateThemeUI() {
  const isDark = htmlEl.getAttribute("data-theme") === "dark";
  const icon = document.getElementById("theme-icon");
  icon.className = isDark ? "fa-solid fa-moon" : "fa-solid fa-sun";
  themeToggle.title = isDark ? "Dark mode — click for light" : "Light mode — click for dark";
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

themeToggle.addEventListener("click", () => {
  const isDark = htmlEl.getAttribute("data-theme") === "dark";
  const newTheme = isDark ? "light" : "dark";
  htmlEl.setAttribute("data-theme", newTheme);
  localStorage.setItem("simonTheme", newTheme);
  updateThemeUI();
});

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

// Restore high score in HUD
hudBest.textContent = highScore;

// Apply saved preferences
updateSoundUI();
updateThemeUI();

// Show welcome screen on load
welcomeScreen.classList.add("active");
