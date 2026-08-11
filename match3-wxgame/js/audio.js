/**
 * 消消乐 - 音效系统（微信小游戏适配）
 */

let audioCtx = null;
let musicOn = true;
let bgmTimer = null;

function initAudio() {
  if (audioCtx) return;
  // 微信小游戏支持 WebAudio
  if (typeof wx !== 'undefined' && wx.createWebAudioContext) {
    audioCtx = wx.createWebAudioContext();
  } else if (typeof WebAudioContext !== 'undefined') {
    audioCtx = new WebAudioContext();
  }
}

function playNote(freq, duration, type, vol, delay) {
  if (!audioCtx || !musicOn) return;
  try {
    const t = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch (e) { /* 忽略音频错误 */ }
}

function sfxSwap() {
  initAudio();
  playNote(520, 0.1, 'sine', 0.10);
  playNote(680, 0.1, 'sine', 0.10, 0.06);
}

function sfxMatch(comboN) {
  initAudio();
  const base = 600 + comboN * 80;
  playNote(base, 0.15, 'sine', 0.12);
  playNote(base * 1.25, 0.15, 'sine', 0.10, 0.07);
  playNote(base * 1.5, 0.18, 'sine', 0.08, 0.14);
}

function sfxBadSwap() {
  initAudio();
  playNote(200, 0.15, 'square', 0.06);
  playNote(160, 0.2, 'square', 0.05, 0.1);
}

function sfxLevelUp() {
  initAudio();
  [523, 659, 784, 1047].forEach((f, i) => playNote(f, 0.25, 'sine', 0.12, i * 0.12));
}

function sfxFail() {
  initAudio();
  playNote(400, 0.2, 'sawtooth', 0.06);
  playNote(300, 0.25, 'sawtooth', 0.05, 0.15);
  playNote(200, 0.35, 'sawtooth', 0.04, 0.3);
}

function startBGM() {
  stopBGM();
  if (!audioCtx) initAudio();
  const melody = [
    523, 0, 659, 0, 784, 0, 659, 0,
    523, 0, 784, 0, 659, 0, 523, 0,
    587, 0, 698, 0, 880, 0, 698, 0,
    587, 0, 880, 0, 698, 0, 587, 0,
  ];
  let idx = 0;
  bgmTimer = setInterval(() => {
    if (!musicOn) return;
    const freq = melody[idx % melody.length];
    if (freq > 0) playNote(freq, 0.22, 'sine', 0.04);
    idx++;
  }, 280);
}

function stopBGM() {
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
}

function toggleMusic() {
  musicOn = !musicOn;
  if (musicOn) { initAudio(); startBGM(); } else { stopBGM(); }
}

function isMusicOn() { return musicOn; }

module.exports = {
  initAudio, sfxSwap, sfxMatch, sfxBadSwap, sfxLevelUp, sfxFail,
  startBGM, stopBGM, toggleMusic, isMusicOn
};
