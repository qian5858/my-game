/**
 * 消消乐 - 微信小游戏入口
 * 使用微信开发者工具导入 match3-wxgame 目录即可运行
 */

// 获取系统信息，适配屏幕
const sysInfo = wx.getSystemInfoSync();
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 逻辑分辨率（与屏幕像素无关，统一坐标）
const W = 750;
const H = 1334;
canvas.width = W;
canvas.height = H;

// 加载游戏
const Match3Game = require('./js/game');
const audio = require('./js/audio');

const game = new Match3Game(canvas, W, H);

// 触摸事件
wx.onTouchStart((res) => {
  const touch = res.touches[0];
  const x = touch.clientX;
  const y = touch.clientY;
  audio.initAudio();
  game.onTouchStart(x, y);
});

wx.onTouchEnd((res) => {
  const touch = res.changedTouches[0];
  game.onTouchEnd(touch.clientX, touch.clientY);
});

// 主循环
function loop() {
  game.updateAnims();
  game.render();
  requestAnimationFrame(loop);
}

// 启动背景音乐（需要用户交互后）
wx.onTouchStart(function startBGM() {
  audio.initAudio();
  audio.startBGM();
  wx.offTouchStart(startBGM);
});

loop();
