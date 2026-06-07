const fs = require('fs');
let c = fs.readFileSync('clips-v2.html', 'utf8');

// Fix hook left/right: outer box edge = (MarginL - Outline)*sc = (30-18)*sc = 12*sc
// (matches Railway ASS box outer position)
const old30 = 'hookEl.style.left = `${Math.round(30 * sc)}px`;\n        hookEl.style.right = `${Math.round(30 * sc)}px`;';
const new12 = 'hookEl.style.left = `${Math.round(12 * sc)}px`;\n        hookEl.style.right = `${Math.round(12 * sc)}px`;';

if (c.includes(old30)) {
  c = c.replace(old30, new12);
  console.log('left/right fixed: 30*sc -> 12*sc OK');
} else {
  console.log('NOT FOUND, searching raw...');
  const idx = c.indexOf('hookEl.style.left');
  console.log(JSON.stringify(c.slice(idx, idx+120)));
}

fs.writeFileSync('clips-v2.html', c, 'utf8');
console.log('DONE');
