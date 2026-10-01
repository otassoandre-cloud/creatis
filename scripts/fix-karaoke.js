const fs = require('fs');
let c = fs.readFileSync('clips-v2.html', 'utf8');

// ── 1. Default style: karaoke active (was wordpop) ──
c = c.replace(
  '<button class="ms-pill active" data-style="wordpop"',
  '<button class="ms-pill" data-style="wordpop"'
);
c = c.replace(
  '<button class="ms-pill" data-style="karaoke"',
  '<button class="ms-pill active" data-style="karaoke"'
);
c = c.replace("let _currentStyle = 'wordpop';", "let _currentStyle = 'karaoke';");
console.log('1. default karaoke OK');

// ── 2. Color default karaoke: texte blanc (pas jaune fixe) ──
c = c.replace(
  "karaoke:   { text: '#FFE000', bg: '#000000' },",
  "karaoke:   { text: '#ffffff', bg: '#000000' },"
);
console.log('2. karaoke color default OK');

// ── 3. _renderSubText karaoke: spans par mot avec data-wi ──
const oldKaraoke = `      case 'karaoke': {
        // Railway: texte jaune #FFE800 fixe, outline noir 3px, shadow leger
        el.textContent = text;
        el.style.color = '#FFE800';
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '700';
        el.style.fontFamily = 'inherit';
        el.style.background = 'none';
        el.style.padding = '0';
        el.style.borderRadius = '0';
        el.style.textShadow = _ol('#000000', 3) + ',' + _sh('rgba(0,0,0,0.33)', 1);
        break;
      }`;

const newKaraoke = `      case 'karaoke': {
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

if (c.includes(oldKaraoke)) { c = c.replace(oldKaraoke, newKaraoke); console.log('3. _renderSubText karaoke OK'); }
else { console.log('3. SKIP - karaoke case not found'); }

// ── 4. _subLoop: karaoke per-frame highlight + insert before _subRaf ──
const beforeRaf = `    _subRaf = requestAnimationFrame(() => _subLoop(video, clip))`;
const withKaraokeRaf = `    // Karaoke: highlight mot actuel chaque frame
    if (opts.style === 'karaoke' && seg && subEl && subEl.style.display !== 'none') {
      const segStart = seg.t0 ?? seg.start ?? 0;
      const segEnd   = seg.t1 ?? seg.end   ?? 0;
      const segDur   = Math.max(0.01, segEnd - segStart);
      const words    = Array.from(subEl.querySelectorAll('span[data-wi]'));
      if (words.length > 0) {
        const progress = Math.max(0, rel - segStart);
        const wordIdx  = Math.min(words.length - 1, Math.floor(progress / segDur * words.length));
        const ct = opts.colorText || '#ffffff';
        words.forEach((span, i) => { span.style.color = i <= wordIdx ? ct : 'rgba(255,255,255,0.35)'; });
      }
    }

    _subRaf = requestAnimationFrame(() => _subLoop(video, clip))`;

if (c.includes(beforeRaf)) { c = c.replace(beforeRaf, withKaraokeRaf); console.log('4. _subLoop karaoke per-frame OK'); }
else { console.log('4. SKIP - beforeRaf not found'); }

fs.writeFileSync('clips-v2.html', c, 'utf8');
console.log('DONE frontend');
