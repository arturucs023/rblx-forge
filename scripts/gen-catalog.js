// Genera el catálogo de skills propias desde los frontmatter reales.
// Uso: node scripts/gen-catalog.js  (imprime markdown por stdout)
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd() + '/.opencode/skills';
const GROUPS = [
  ['UI/UX', ['roblox-welcome-onboarding','roblox-main-menu','roblox-pause-menu','roblox-hud','roblox-inventory-ui','roblox-shop-ui','roblox-settings-ui','roblox-character-selector','roblox-lobby-ui','roblox-quest-journal-ui','roblox-notifications-ui','roblox-leaderboard-ui','roblox-dialogue-ui','roblox-mobile-touch-ui','roblox-pets-ui','roblox-vehicle-ui']],
  ['Arte y entornos', ['roblox-exterior-architecture','roblox-interior-design','roblox-city-settlements','roblox-terrain-sculpting','roblox-vegetation-landscaping','roblox-materials-surfaces','roblox-lighting-day-night','roblox-lighting-atmosphere','roblox-props-decoration','roblox-ambient-effects']],
  ['Construcción', ['roblox-modular-building','roblox-vehicle-construction','roblox-props-creation','roblox-meshparts-geometry','roblox-model-organization']],
  ['Personajes y animación', ['roblox-character-design','roblox-rigging','roblox-locomotion-animation','roblox-combat-animation','roblox-expressive-animation','roblox-animation-systems','roblox-character-controller','roblox-parkour-traversal','roblox-land-vehicles','roblox-air-vehicles','roblox-water-vehicles']],
  ['Gameplay', ['roblox-abilities-cooldowns','roblox-resource-gathering','roblox-crafting','roblox-building-placement','roblox-pets-systems','roblox-vehicle-systems','roblox-minigames','roblox-dynamic-events','roblox-checkpoints','roblox-interaction-systems']],
  ['Géneros', ['roblox-simulator','roblox-tycoon','roblox-obby','roblox-horror','roblox-tower-defense','roblox-rpg']],
  ['Audio', ['roblox-ambient-soundscapes','roblox-dynamic-music','roblox-sfx-design','roblox-vehicle-audio','roblox-audio-mixing']],
  ['Multijugador', ['roblox-state-replication','roblox-private-servers','roblox-disconnect-recovery','roblox-coop-systems','roblox-competitive-systems']],
  ['Economía', ['roblox-rarity-collectibles']],
  ['Programación', ['roblox-design-patterns','roblox-state-machines','roblox-component-systems','roblox-code-review','roblox-error-handling']],
  ['Tooling', ['roblox-ci-cd','roblox-git-workflows']],
  ['Testing', ['roblox-testez','roblox-multiplayer-testing','roblox-ui-testing']],
];
function fm(id) {
  const raw = fs.readFileSync(path.join(ROOT, id, 'SKILL.md'), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const get = (k) => { const r = m ? m[1].match(new RegExp('^' + k + ':\\s*(.*)', 'm')) : null; return r ? r[1].trim() : '(sin ' + k + ')'; };
  const lines = raw.split('\n').length;
  return { id, name: get('name'), desc: get('description').replace(/^["']|["']$/g, ''), lines };
}
let total = 0;
for (const [title, ids] of GROUPS) {
  console.log('### ' + title + ' (' + ids.length + ')\n');
  for (const id of ids) {
    try {
      const f = fm(id);
      total++;
      console.log('- `' + id + '` — ' + f.desc + ' *(' + f.lines + ' lín)*');
    } catch (e) { console.log('- `' + id + '` — FALTA ARCHIVO'); }
  }
  console.log('');
}
console.log('<!-- total nuevas: ' + total + ' -->');
