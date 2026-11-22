// Game Configuration & State
const CHOICES = {
  rock: { emoji: '🪨', beats: 'scissors' },
  paper: { emoji: '📄', beats: 'rock' },
  scissors: { emoji: '✂️', beats: 'paper' }
};

const state = {
  playerScore: 0,
  cpuScore: 0,
  ties: 0,
  streak: 0,
  mode: 'endless', // 'endless' | 'bo3' | 'bo5'
  isAnimating: false,
  soundEnabled: true,
  history: []
};

// DOM Elements
const els = {
  playerScore: document.getElementById('player-score'),
  cpuScore: document.getElementById('cpu-score'),
  tiesCount: document.getElementById('ties-count'),
  streakCount: document.getElementById('streak-count'),
  statusText: document.getElementById('status-text'),
  playerHand: document.getElementById('player-hand'),
  cpuHand: document.getElementById('cpu-hand'),
  playerHandBox: document.getElementById('player-hand-box'),
  cpuHandBox: document.getElementById('cpu-hand-box'),
  choiceButtons: document.querySelectorAll('.choice-btn'),
  modeButtons: document.querySelectorAll('.mode-btn'),
  soundToggle: document.getElementById('sound-toggle'),
  resetBtn: document.getElementById('reset-btn'),
  historyList: document.getElementById('history-list'),
  roundCounter: document.getElementById('round-counter'),
  victoryModal: document.getElementById('victory-modal'),
  modalEmoji: document.getElementById('modal-emoji'),
  modalTitle: document.getElementById('modal-title'),
  modalSubtitle: document.getElementById('modal-subtitle'),
  playAgainBtn: document.getElementById('play-again-btn')
};

// Web Audio API Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type = 'sine', duration = 0.12, delay = 0) {
  if (!state.soundEnabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);

  gain.gain.setValueAtTime(0.12, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

const sfx = {
  tick: () => playTone(320, 'triangle', 0.08),
  win: () => {
    playTone(523.25, 'sine', 0.12, 0);
    playTone(659.25, 'sine', 0.18, 0.1);
  },
  lose: () => {
    playTone(300, 'sawtooth', 0.15, 0);
    playTone(220, 'sawtooth', 0.22, 0.12);
  },
  tie: () => playTone(400, 'triangle', 0.15)
};

// Core Gameplay Logic
function getCpuChoice() {
  const keys = Object.keys(CHOICES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function determineWinner(player, cpu) {
  if (player === cpu) return 'tie';
  return CHOICES[player].beats === cpu ? 'win' : 'lose';
}

function getTargetWins() {
  if (state.mode === 'bo3') return 2;
  if (state.mode === 'bo5') return 3;
  return Infinity;
}

async function playRound(playerChoice) {
  if (state.isAnimating) return;
  state.isAnimating = true;
  setButtonsDisabled(true);

  // Reset stage visuals
  clearArenaGlow();
  els.playerHand.textContent = '✊';
  els.cpuHand.textContent = '✊';
  els.playerHandBox.classList.add('animate-shake-player');
  els.cpuHandBox.classList.add('animate-shake-cpu');

  const steps = ['ROCK...', 'PAPER...', 'SCISSORS!'];
  for (const word of steps) {
    els.statusText.textContent = word;
    sfx.tick();
    await new Promise(r => setTimeout(r, 260));
  }

  // Stop shake & reveal choices
  els.playerHandBox.classList.remove('animate-shake-player');
  els.cpuHandBox.classList.remove('animate-shake-cpu');

  const cpuChoice = getCpuChoice();
  els.playerHand.textContent = CHOICES[playerChoice].emoji;
  els.cpuHand.textContent = CHOICES[cpuChoice].emoji;

  const outcome = determineWinner(playerChoice, cpuChoice);
  applyOutcome(outcome, playerChoice, cpuChoice);

  state.isAnimating = false;
  setButtonsDisabled(false);
  checkMatchOver();
}

function applyOutcome(outcome, playerChoice, cpuChoice) {
  if (outcome === 'win') {
    state.playerScore++;
    state.streak++;
    els.statusText.textContent = `You Win! ${capitalize(playerChoice)} beats ${cpuChoice}.`;
    els.playerHandBox.classList.add('glow-win');
    els.cpuHandBox.classList.add('glow-lose');
    sfx.win();
  } else if (outcome === 'lose') {
    state.cpuScore++;
    state.streak = 0;
    els.statusText.textContent = `CPU Wins! ${capitalize(cpuChoice)} beats ${playerChoice}.`;
    els.cpuHandBox.classList.add('glow-win');
    els.playerHandBox.classList.add('glow-lose');
    sfx.lose();
  } else {
    state.ties++;
    els.statusText.textContent = `It's a Tie! Both picked ${playerChoice}.`;
    els.playerHandBox.classList.add('glow-tie');
    els.cpuHandBox.classList.add('glow-tie');
    sfx.tie();
  }

  state.history.unshift({ outcome, playerChoice, cpuChoice });
  updateUI();
}

function checkMatchOver() {
  const target = getTargetWins();
  if (state.playerScore >= target || state.cpuScore >= target) {
    const playerWon = state.playerScore >= target;
    els.modalEmoji.textContent = playerWon ? '🏆' : '🤖';
    els.modalTitle.textContent = playerWon ? 'Match Victory!' : 'CPU Takes the Match!';
    els.modalSubtitle.textContent = `Final Score: You ${state.playerScore} — ${state.cpuScore} CPU`;
    els.victoryModal.classList.remove('hidden');
    els.victoryModal.classList.add('flex');
  }
}

function resetGame() {
  state.playerScore = 0;
  state.cpuScore = 0;
  state.ties = 0;
  state.streak = 0;
  state.history = [];
  clearArenaGlow();
  els.playerHand.textContent = '✊';
  els.cpuHand.textContent = '✊';
  els.statusText.textContent = 'Choose your weapon below!';
  els.victoryModal.classList.add('hidden');
  els.victoryModal.classList.remove('flex');
  updateUI();
}

// UI Helpers
function updateUI() {
  els.playerScore.textContent = state.playerScore;
  els.cpuScore.textContent = state.cpuScore;
  els.tiesCount.textContent = `Ties: ${state.ties}`;
  els.streakCount.textContent = `${state.streak} 🔥`;
  els.roundCounter.textContent = `${state.history.length} played`;

  if (state.history.length === 0) {
    els.historyList.innerHTML = '<span>No rounds played yet.</span>';
    return;
  }

  els.historyList.innerHTML = state.history
    .slice(0, 12)
    .map(item => {
      const badgeColor =
        item.outcome === 'win'
          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
          : item.outcome === 'lose'
          ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          : 'border-amber-500/40 bg-amber-950/40 text-amber-300';

      return `<span class="shrink-0 px-2.5 py-1 rounded-lg border ${badgeColor}">
        ${CHOICES[item.playerChoice].emoji} vs ${CHOICES[item.cpuChoice].emoji}
      </span>`;
    })
    .join('');
}

function clearArenaGlow() {
  els.playerHandBox.classList.remove('glow-win', 'glow-lose', 'glow-tie');
  els.cpuHandBox.classList.remove('glow-win', 'glow-lose', 'glow-tie');
}

function setButtonsDisabled(disabled) {
  els.choiceButtons.forEach(btn => {
    btn.disabled = disabled;
    btn.classList.toggle('opacity-50', disabled);
    btn.classList.toggle('cursor-not-allowed', disabled);
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Event Listeners
els.choiceButtons.forEach(btn => {
  btn.addEventListener('click', () => playRound(btn.dataset.choice));
});

els.modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    els.modeButtons.forEach(b => {
      b.classList.remove('active');
      b.classList.add('text-slate-400');
    });
    btn.classList.add('active');
    btn.classList.remove('text-slate-400');
    state.mode = btn.dataset.mode;
    resetGame();
  });
});

els.soundToggle.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  els.soundToggle.textContent = state.soundEnabled ? '🔊' : '🔇';
});

els.resetBtn.addEventListener('click', resetGame);
els.playAgainBtn.addEventListener('click', resetGame);

// Keyboard Shortcuts (R, P, S)
window.addEventListener('keydown', e => {
  if (!els.victoryModal.classList.contains('hidden')) return;
  const keyMap = { r: 'rock', p: 'paper', s: 'scissors' };
  const choice = keyMap[e.key.toLowerCase()];
  if (choice) playRound(choice);
});
