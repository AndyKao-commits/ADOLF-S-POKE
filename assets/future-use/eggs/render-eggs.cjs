// Synchronize named lucky egg assets to stable legacy paths. Run from any cwd.
const fs = require('node:fs');
const path = require('node:path');
const tiers = ['common', 'rare', 'legendary', 'epic'];
for (let i = 0; i < tiers.length; i++) {
  fs.copyFileSync(path.join(__dirname, '../lucky-eggs/lucky-egg-' + tiers[i] + '.png'), path.join(__dirname, 'egg-level-' + (i + 1) + '.png'));
}
console.log('Updated egg-level-1..4: common, rare, legendary, epic.');
