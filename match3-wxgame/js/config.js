/**
 * 消消乐 - 游戏配置数据
 */

const ROWS = 8;
const COLS = 8;

// 宝石定义（7种）
const ALL_GEMS = [
  { icon: '🍓', color: '#d32f2f', lightColor: '#ff8a80', darkColor: '#8b0000', name: '草莓' },
  { icon: '🍀', color: '#2e7d32', lightColor: '#b9f6ca', darkColor: '#1b5e20', name: '四叶草' },
  { icon: '💙', color: '#1565c0', lightColor: '#82b1ff', darkColor: '#0d47a1', name: '蓝心' },
  { icon: '⭐', color: '#f9a825', lightColor: '#fff9c4', darkColor: '#e65100', name: '星星' },
  { icon: '🔮', color: '#8e24aa', lightColor: '#ea80fc', darkColor: '#4a148c', name: '水晶球' },
  { icon: '🍊', color: '#e65100', lightColor: '#ffcc80', darkColor: '#bf360c', name: '橘子' },
  { icon: '💎', color: '#00838f', lightColor: '#80deea', darkColor: '#004d40', name: '钻石' },
];

// 10个关卡配置：宝石种类递增、步数递减、目标分数递增
const LEVELS = [
  { gems: 4, moves: 35, target: 300 },
  { gems: 4, moves: 33, target: 500 },
  { gems: 5, moves: 32, target: 750 },
  { gems: 5, moves: 30, target: 1000 },
  { gems: 5, moves: 28, target: 1300 },
  { gems: 6, moves: 27, target: 1650 },
  { gems: 6, moves: 25, target: 2000 },
  { gems: 6, moves: 23, target: 2400 },
  { gems: 7, moves: 22, target: 2900 },
  { gems: 7, moves: 20, target: 3500 },
];

module.exports = { ROWS, COLS, ALL_GEMS, LEVELS };
