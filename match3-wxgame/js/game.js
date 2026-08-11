/**
 * 消消乐 - 核心游戏逻辑 + Canvas 渲染（微信小游戏）
 */
const { ROWS, COLS, ALL_GEMS, LEVELS } = require('./config');
const audio = require('./audio');

class Match3Game {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = width;
    this.H = height;

    // 计算棋盘布局（居中）
    this.CELL = Math.floor(Math.min(width, height) / 10);
    this.GAP = Math.floor(this.CELL * 0.08);
    this.GEM_SIZE = Math.floor(this.CELL * 0.78);
    this.BOARD_W = COLS * (this.CELL + this.GAP);
    this.BOARD_H = ROWS * (this.CELL + this.GAP);
    this.BOARD_X = Math.floor((width - this.BOARD_W) / 2);
    this.BOARD_Y = Math.floor(height * 0.22);

    // 状态
    this.grid = [];
    this.GEMS = [];
    this.selected = null;
    this.score = 0;
    this.moves = 0;
    this.combo = 0;
    this.currentLevel = 0;
    this.busy = false;
    this.gameState = 'playing'; // playing | result

    // 动画状态
    this.gemAnims = {}; // key: "r,c" -> { x, y, targetX, targetY, scale, alpha, removing }
    this.floatScores = []; // { x, y, text, alpha, vy, life }
    this.comboText = '';
    this.comboAlpha = 0;
    this.comboScale = 1;

    // 结果弹窗
    this.resultData = null;

    // 触摸状态
    this.touchStartPos = null;
    this.touchStartCell = null;

    this.loadLevel(0);
  }

  /* ---- 关卡管理 ---- */
  loadLevel(lv) {
    this.currentLevel = lv;
    const cfg = LEVELS[lv];
    this.GEMS = ALL_GEMS.slice(0, cfg.gems);
    this.score = 0;
    this.moves = cfg.moves;
    this.combo = 0;
    this.selected = null;
    this.busy = false;
    this.gameState = 'playing';
    this.resultData = null;
    this.gemAnims = {};
    this.floatScores = [];
    this.comboAlpha = 0;
    this.initGrid();
    this.buildAnims();
  }

  initGrid() {
    this.grid = [];
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        let type;
        do {
          type = Math.floor(Math.random() * this.GEMS.length);
        } while (
          (c >= 2 && this.grid[r][c-1] === type && this.grid[r][c-2] === type) ||
          (r >= 2 && this.grid[r-1][c] === type && this.grid[r-2][c] === type)
        );
        this.grid[r][c] = type;
      }
    }
  }

  buildAnims() {
    this.gemAnims = {};
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] >= 0) {
          const pos = this.cellPos(r, c);
          this.gemAnims[r + ',' + c] = { x: pos.x, y: pos.y, scale: 1, alpha: 1, removing: false };
        }
      }
    }
  }

  cellPos(r, c) {
    return {
      x: this.BOARD_X + c * (this.CELL + this.GAP) + (this.CELL - this.GEM_SIZE) / 2,
      y: this.BOARD_Y + r * (this.CELL + this.GAP) + (this.CELL - this.GEM_SIZE) / 2,
    };
  }

  cellFromPos(px, py) {
    const c = Math.floor((px - this.BOARD_X) / (this.CELL + this.GAP));
    const r = Math.floor((py - this.BOARD_Y) / (this.CELL + this.GAP));
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return { r, c };
    return null;
  }

  /* ---- 触摸处理 ---- */
  onTouchStart(x, y) {
    if (this.busy || this.gameState !== 'playing') return;
    // 检查是否点击音乐按钮
    const btnX = this.W - 50, btnY = 10, btnR = 22;
    if (Math.abs(x - btnX) < btnR && Math.abs(y - btnY) < btnR) {
      audio.toggleMusic();
      return;
    }
    // 检查是否点击弹窗按钮
    if (this.resultData) {
      this.handleResultTap(x, y);
      return;
    }
    const cell = this.cellFromPos(x, y);
    if (!cell) return;
    this.touchStartPos = { x, y };
    this.touchStartCell = cell;

    if (!this.selected) {
      this.selected = cell;
    } else {
      const prev = this.selected;
      if (prev.r === cell.r && prev.c === cell.c) {
        this.selected = null;
        return;
      }
      const dist = Math.abs(prev.r - cell.r) + Math.abs(prev.c - cell.c);
      if (dist === 1) {
        this.selected = null;
        audio.sfxSwap();
        this.trySwap(prev.r, prev.c, cell.r, cell.c);
      } else {
        this.selected = cell;
      }
    }
  }

  onTouchEnd(x, y) {
    // 滑动手势支持
    if (!this.touchStartPos || !this.touchStartCell) return;
    const dx = x - this.touchStartPos.x;
    const dy = y - this.touchStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.CELL * 0.5) {
      const { r, c } = this.touchStartCell;
      let tr, tc;
      if (Math.abs(dx) > Math.abs(dy)) {
        tr = r; tc = c + (dx > 0 ? 1 : -1);
      } else {
        tr = r + (dy > 0 ? 1 : -1); tc = c;
      }
      if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
        this.selected = null;
        audio.sfxSwap();
        this.trySwap(r, c, tr, tc);
      }
    }
    this.touchStartPos = null;
    this.touchStartCell = null;
  }

  handleResultTap(x, y) {
    if (!this.resultData || !this.resultData.buttons) return;
    for (const btn of this.resultData.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        btn.action();
        return;
      }
    }
  }

  /* ---- 交换 & 匹配 ---- */
  async trySwap(r1, c1, r2, c2) {
    this.busy = true;
    this.swap(r1, c1, r2, c2);
    await this.animateSwap(r1, c1, r2, c2);

    const matches = this.findMatches();
    if (matches.length === 0) {
      audio.sfxBadSwap();
      this.swap(r1, c1, r2, c2);
      await this.animateSwap(r1, c1, r2, c2);
      this.busy = false;
      return;
    }

    this.moves--;
    this.combo = 0;
    await this.resolveMatches();
    this.busy = false;

    if (this.moves <= 0) this.checkLevelResult();
  }

  swap(r1, c1, r2, c2) {
    [this.grid[r1][c1], this.grid[r2][c2]] = [this.grid[r2][c2], this.grid[r1][c1]];
  }

  async animateSwap(r1, c1, r2, c2) {
    const key1 = r1 + ',' + c1, key2 = r2 + ',' + c2;
    const a1 = this.gemAnims[key1], a2 = this.gemAnims[key2];
    const p1 = this.cellPos(r1, c1), p2 = this.cellPos(r2, c2);
    if (a1) { a1.targetX = p1.x; a1.targetY = p1.y; }
    if (a2) { a2.targetX = p2.x; a2.targetY = p2.y; }
    // 更新 grid 映射
    if (a1) { a1.r = r1; a1.c = c1; }
    if (a2) { a2.r = r2; a2.c = c2; }
    await this.sleep(250);
    // 重建 key 映射
    this.rebuildAnimKeys();
  }

  rebuildAnimKeys() {
    // gemAnims 的 key 需要和 grid 位置对应
    // 由于 swap 后 grid 已更新，这里不需要额外处理
  }

  findMatches() {
    const matched = new Set();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const t = this.grid[r][c];
        if (t < 0) continue;
        if (this.grid[r][c+1] === t && this.grid[r][c+2] === t) {
          let end = c + 2;
          while (end + 1 < COLS && this.grid[r][end+1] === t) end++;
          for (let i = c; i <= end; i++) matched.add(r * COLS + i);
        }
      }
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const t = this.grid[r][c];
        if (t < 0) continue;
        if (this.grid[r+1][c] === t && this.grid[r+2][c] === t) {
          let end = r + 2;
          while (end + 1 < ROWS && this.grid[end+1][c] === t) end++;
          for (let i = r; i <= end; i++) matched.add(i * COLS + c);
        }
      }
    }
    return [...matched].map(v => ({ r: Math.floor(v / COLS), c: v % COLS }));
  }

  async resolveMatches() {
    let matches = this.findMatches();
    while (matches.length > 0) {
      this.combo++;
      if (this.combo >= 2) {
        const labels = ['','','双连击！','三连击！','四连击！','五连击！','超级连击！','无敌连击！！'];
        this.comboText = '🔥 ' + (labels[this.combo] || this.combo + '连击！！！');
        this.comboAlpha = 1;
        this.comboScale = 1.3;
      }

      audio.sfxMatch(this.combo);
      const pts = matches.length * 10 * this.combo;
      this.score += pts;

      // 飘分
      const mid = matches[Math.floor(matches.length / 2)];
      const midPos = this.cellPos(mid.r, mid.c);
      this.floatScores.push({ x: midPos.x + this.GEM_SIZE / 2, y: midPos.y, text: '+' + pts, alpha: 1, vy: -1.5, life: 50 });

      // 消除动画
      for (const { r, c } of matches) {
        const key = r + ',' + c;
        if (this.gemAnims[key]) {
          this.gemAnims[key].removing = true;
          this.gemAnims[key].removeT = 20;
        }
      }
      await this.sleep(350);

      // 移除
      for (const { r, c } of matches) {
        this.grid[r][c] = -1;
        delete this.gemAnims[r + ',' + c];
      }

      await this.dropAndFill();
      matches = this.findMatches();
    }
  }

  async dropAndFill() {
    // 下落
    for (let c = 0; c < COLS; c++) {
      let emptyRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c] >= 0) {
          if (r !== emptyRow) {
            const oldKey = r + ',' + c;
            const newKey = emptyRow + ',' + c;
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[r][c] = -1;
            if (this.gemAnims[oldKey]) {
              this.gemAnims[newKey] = this.gemAnims[oldKey];
              this.gemAnims[newKey].r = emptyRow;
              this.gemAnims[newKey].c = c;
              const target = this.cellPos(emptyRow, c);
              this.gemAnims[newKey].targetY = target.y;
              delete this.gemAnims[oldKey];
            }
          }
          emptyRow--;
        }
      }
      // 填充
      for (let r = emptyRow; r >= 0; r--) {
        const type = Math.floor(Math.random() * this.GEMS.length);
        this.grid[r][c] = type;
        const pos = this.cellPos(r, c);
        this.gemAnims[r + ',' + c] = {
          r, c, x: pos.x, y: this.BOARD_Y - this.CELL,
          targetX: pos.x, targetY: pos.y,
          scale: 1, alpha: 1, removing: false,
        };
      }
    }
    await this.sleep(320);
  }

  checkLevelResult() {
    const cfg = LEVELS[this.currentLevel];
    setTimeout(() => {
      this.gameState = 'result';
      if (this.score >= cfg.target) {
        audio.sfxLevelUp();
        const isLast = this.currentLevel >= LEVELS.length - 1;
        const buttons = [];
        if (isLast) {
          buttons.push({ text: '从头开始', action: () => { this.loadLevel(0); this.gameState = 'playing'; } });
        } else {
          buttons.push({ text: '下一关 ▶', action: () => { this.loadLevel(this.currentLevel + 1); this.gameState = 'playing'; } });
        }
        this.resultData = {
          title: isLast ? '🎊 恭喜通关！' : '⭐ 关卡通过！',
          msg: isLast ? `全部通关！得分：${this.score}` : `第 ${this.currentLevel + 1} 关完成！得分：${this.score} / ${cfg.target}`,
          buttons,
        };
      } else {
        audio.sfxFail();
        this.resultData = {
          title: '💫 挑战失败',
          msg: `得分 ${this.score} / 目标 ${cfg.target}，差 ${cfg.target - this.score} 分`,
          buttons: [
            { text: '重新挑战', action: () => { this.loadLevel(this.currentLevel); this.gameState = 'playing'; } },
            { text: '回到第1关', action: () => { this.loadLevel(0); this.gameState = 'playing'; } },
          ],
        };
      }
      // 计算按钮位置
      this.layoutResultButtons();
    }, 400);
  }

  layoutResultButtons() {
    if (!this.resultData) return;
    const btnW = 140, btnH = 44, gap = 16;
    const totalW = this.resultData.buttons.length * btnW + (this.resultData.buttons.length - 1) * gap;
    let startX = (this.W - totalW) / 2;
    const btnY = this.H / 2 + 60;
    for (const btn of this.resultData.buttons) {
      btn.x = startX; btn.y = btnY; btn.w = btnW; btn.h = btnH;
      startX += btnW + gap;
    }
  }

  /* ---- 动画更新 ---- */
  updateAnims() {
    const speed = 0.18;
    for (const key in this.gemAnims) {
      const a = this.gemAnims[key];
      if (a.targetX !== undefined) {
        a.x += (a.targetX - a.x) * speed;
        a.y += (a.targetY - a.y) * speed;
        if (Math.abs(a.x - a.targetX) < 0.5) a.x = a.targetX;
        if (Math.abs(a.y - a.targetY) < 0.5) a.y = a.targetY;
      }
      if (a.removing) {
        a.removeT--;
        a.scale = Math.max(0, a.removeT / 20);
        a.alpha = Math.max(0, a.removeT / 20);
      }
    }
    // 飘分
    for (const f of this.floatScores) {
      f.y += f.vy;
      f.life--;
      f.alpha = Math.max(0, f.life / 50);
    }
    this.floatScores = this.floatScores.filter(f => f.life > 0);
    // 连击文字
    if (this.comboAlpha > 0) {
      this.comboAlpha -= 0.02;
      this.comboScale += (1 - this.comboScale) * 0.1;
    }
  }

  /* ---- 渲染 ---- */
  render() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    // 背景
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0f0c29');
    bgGrad.addColorStop(0.5, '#302b63');
    bgGrad.addColorStop(1, '#24243e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.floor(W * 0.06)}px sans-serif`;
    const titleGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
    titleGrad.addColorStop(0, '#ff6b6b');
    titleGrad.addColorStop(0.3, '#feca57');
    titleGrad.addColorStop(0.6, '#48dbfb');
    titleGrad.addColorStop(1, '#ff9ff3');
    ctx.fillStyle = titleGrad;
    ctx.fillText('✨ 消 消 乐 ✨', W / 2, H * 0.06);

    // 信息栏
    this.drawInfoBar(ctx);

    // 进度条
    this.drawProgressBar(ctx);

    // 棋盘背景
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this.roundRect(ctx, this.BOARD_X - 10, this.BOARD_Y - 10, this.BOARD_W + 20, this.BOARD_H + 20, 16);
    ctx.fill();

    // 连击文字
    if (this.comboAlpha > 0) {
      ctx.globalAlpha = this.comboAlpha;
      ctx.font = `bold ${Math.floor(W * 0.05)}px sans-serif`;
      ctx.fillStyle = '#ff6b6b';
      ctx.save();
      ctx.translate(this.W / 2, this.BOARD_Y - 20);
      ctx.scale(this.comboScale, this.comboScale);
      ctx.fillText(this.comboText, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // 宝石
    this.drawGems(ctx);

    // 飘分
    for (const f of this.floatScores) {
      ctx.globalAlpha = f.alpha;
      ctx.font = `bold ${Math.floor(W * 0.04)}px sans-serif`;
      ctx.fillStyle = '#feca57';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // 音乐按钮
    this.drawMusicBtn(ctx);

    // 结果弹窗
    if (this.resultData) this.drawResult(ctx);
  }

  drawInfoBar(ctx) {
    const cfg = LEVELS[this.currentLevel];
    const items = [
      { label: '⭐ 关卡', value: `${this.currentLevel + 1}/10` },
      { label: '🏆 分数', value: this.score },
      { label: '🎯 目标', value: cfg.target },
      { label: '🔄 步数', value: this.moves },
      { label: '🔥 连击', value: this.combo },
    ];
    const fontSize = Math.floor(this.W * 0.03);
    ctx.font = `${fontSize}px sans-serif`;
    const itemW = this.W / items.length;
    const y = this.H * 0.1;

    for (let i = 0; i < items.length; i++) {
      const x = itemW * i + itemW / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(items[i].label, x, y);
      ctx.fillStyle = '#feca57';
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillText(items[i].value, x, y + fontSize + 4);
      ctx.font = `${fontSize}px sans-serif`;
    }
  }

  drawProgressBar(ctx) {
    const cfg = LEVELS[this.currentLevel];
    const barW = this.W * 0.7;
    const barH = 12;
    const barX = (this.W - barW) / 2;
    const barY = this.H * 0.17;
    const pct = Math.min(1, this.score / cfg.target);

    // 背景
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.roundRect(ctx, barX, barY, barW, barH, 6);
    ctx.fill();

    // 填充
    if (pct > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(0.5, '#feca57');
      grad.addColorStop(1, '#48dbfb');
      ctx.fillStyle = grad;
      this.roundRect(ctx, barX, barY, barW * pct, barH, 6);
      ctx.fill();
    }

    // 文字
    const fs = Math.floor(this.W * 0.025);
    ctx.font = `${fs}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(`${this.score} / ${cfg.target}`, barX, barY + barH + fs + 2);
    ctx.textAlign = 'right';
    ctx.fillText(`宝石: ${this.GEMS.length}种`, barX + barW, barY + barH + fs + 2);
  }

  drawGems(ctx) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = this.grid[r][c];
        if (type < 0) continue;
        const key = r + ',' + c;
        const anim = this.gemAnims[key];
        if (!anim) continue;

        const gem = this.GEMS[type];
        const isSelected = this.selected && this.selected.r === r && this.selected.c === c;
        const cx = anim.x + this.GEM_SIZE / 2;
        const cy = anim.y + this.GEM_SIZE / 2;
        const radius = this.GEM_SIZE / 2;

        ctx.save();
        ctx.globalAlpha = anim.alpha;
        ctx.translate(cx, cy);
        ctx.scale(anim.scale * (isSelected ? 1.1 : 1), anim.scale * (isSelected ? 1.1 : 1));

        // 3D 球体
        const grad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, radius * 0.1, 0, 0, radius);
        grad.addColorStop(0, gem.lightColor);
        grad.addColorStop(0.7, gem.color);
        grad.addColorStop(1, gem.darkColor);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(-radius * 0.15, -radius * 0.25, radius * 0.4, radius * 0.25, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // 图标
        ctx.font = `${Math.floor(this.GEM_SIZE * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gem.icon, 0, 2);

        // 选中发光
        if (isSelected) {
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    }
  }

  drawMusicBtn(ctx) {
    const x = this.W - 50, y = 30, r = 22;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(audio.isMusicOn() ? '🔊' : '🔇', x, y);
  }

  drawResult(ctx) {
    const d = this.resultData;
    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.W, this.H);

    // 弹窗
    const mw = this.W * 0.75, mh = 200;
    const mx = (this.W - mw) / 2, my = (this.H - mh) / 2 - 20;
    const grad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    grad.addColorStop(0, '#1a1a3e');
    grad.addColorStop(1, '#2d2b55');
    ctx.fillStyle = grad;
    this.roundRect(ctx, mx, my, mw, mh, 20);
    ctx.fill();

    // 标题
    ctx.font = `bold ${Math.floor(this.W * 0.055)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#feca57';
    ctx.fillText(d.title, this.W / 2, my + 50);

    // 描述
    ctx.font = `${Math.floor(this.W * 0.035)}px sans-serif`;
    ctx.fillStyle = '#aaa';
    ctx.fillText(d.msg, this.W / 2, my + 90);

    // 按钮
    for (const btn of d.buttons) {
      const btnGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x + btn.w, btn.y + btn.h);
      btnGrad.addColorStop(0, '#feca57');
      btnGrad.addColorStop(1, '#ff6b6b');
      ctx.fillStyle = btnGrad;
      this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
      ctx.fill();

      ctx.font = `bold ${Math.floor(this.W * 0.035)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1a1a3e';
      ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

module.exports = Match3Game;
