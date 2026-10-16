const fs = require('fs');
let c = fs.readFileSync('clips-v2.html', 'utf8');

// Find and replace the karaoke case using indexOf
const startMarker = "case 'karaoke': {\n        el.textContent = text;\n        el.style.color = '#FFE800';";
const endMarker = "el.style.textShadow = _ol('#000000', 3) + ',' + _sh('rgba(0,0,0,0.33)', 1);\n        break;\n      }";

const startIdx = c.indexOf(startMarker);
const endIdx = c.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log('markers not found:', startIdx, endIdx);
  // Try to show what's there
  const idx = c.indexOf("case 'karaoke'");
  console.log(JSON.stringify(c.slice(idx, idx+500)));
  process.exit(1);
}

const newKaraoke = `case 'karaoke': {
        // Karaoke mot par mot: spans avec data-wi, highlight animé dans _subLoop
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '900';
        el.style.fontFamily = 'inherit';
        el.style.background = 'none';
        el.style.padding = '0';
        el.style.borderRadius = '0';
        el.style.textShadow = _ol(cb, 3) + ',' + _sh('rgba(0,0,0,0.5)', 1);
        text.split(' ').forEach((word, wi) => {
          const span = document.createElement('span');
          span.textContent = word + ' ';
          span.dataset.wi = wi;
          span.style.color = 'rgba(255,255,255,0.35)';
          el.appendChild(span);
        });
        break;
      }`;

const before = c.slice(0, startIdx);
const after = c.slice(endIdx + endMarker.length);
c = before + newKaraoke + after;

fs.writeFileSync('clips-v2.html', c, 'utf8');
console.log('karaoke case replaced OK');
console.log('verify:', c.includes("span.dataset.wi = wi"));
