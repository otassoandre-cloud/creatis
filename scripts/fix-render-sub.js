const fs = require('fs');
let content = fs.readFileSync('clips-v2.html', 'utf8');

const newFn = `  function _renderSubText(el, text, opts) {
    const sc = _previewScale();
    const fs = Math.round((opts.fontSize || 70) * sc);
    const ct = opts.colorText || '#ffffff';
    const cb = opts.colorBg || '#000000';
    const style = opts.style || 'bold';

    // Simule ASS BorderStyle=1 Outline=N px avec 8 text-shadows directionnels
    function _ol(color, n) {
      const p = Math.max(1, Math.round(n * sc));
      const d = Math.round(p * 0.71);
      return \`0 \${p}px 0 \${color},0 -\${p}px 0 \${color},\${p}px 0 0 \${color},-\${p}px 0 0 \${color},\${d}px \${d}px 0 \${color},-\${d}px -\${d}px 0 \${color},\${d}px -\${d}px 0 \${color},-\${d}px \${d}px 0 \${color}\`;
    }
    function _sh(color, n) {
      const p = Math.max(1, Math.round(n * sc));
      return \`\${p}px \${p}px \${p}px \${color}\`;
    }
    const bp = \`\${Math.round(4*sc)}px \${Math.round(12*sc)}px\`;

    el.innerHTML = '';

    switch(style) {
      case 'bold':
      case 'wordpop':
      case 'shake': {
        el.textContent = text;
        el.style.color = ct;
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '900';
        el.style.fontFamily = 'inherit';
        el.style.background = 'none';
        el.style.padding = '0';
        el.style.borderRadius = '0';
        el.style.textShadow = _ol(cb, 4) + ',' + _sh('rgba(0,0,0,0.5)', 2);
        break;
      }
      case 'minimal': {
        el.textContent = text;
        el.style.color = ct;
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '700';
        el.style.fontFamily = 'inherit';
        el.style.background = 'rgba(0,0,0,0.60)';
        el.style.padding = bp;
        el.style.borderRadius = '0';
        el.style.textShadow = 'none';
        break;
      }
      case 'karaoke': {
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
      }
      case 'neon': {
        el.textContent = text;
        el.style.color = ct;
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '900';
        el.style.fontFamily = 'inherit';
        el.style.background = 'none';
        el.style.padding = '0';
        el.style.borderRadius = '0';
        const np = Math.round(6 * sc);
        el.style.textShadow = _ol(cb, 6) + \`,0 0 \${np*2}px \${cb},0 0 \${np*3}px \${cb}\`;
        break;
      }
      case 'spotlight': {
        el.textContent = text;
        el.style.color = ct;
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '700';
        el.style.fontFamily = 'inherit';
        el.style.background = 'rgba(0,0,0,0.816)';
        el.style.padding = bp;
        el.style.borderRadius = '0';
        el.style.textShadow = 'none';
        break;
      }
      case 'typewriter': {
        el.style.fontFamily = 'monospace';
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '800';
        el.style.color = ct;
        el.style.background = 'none';
        el.style.padding = '0';
        el.style.borderRadius = '0';
        el.style.textShadow = _ol(cb, 3) + ',' + _sh('rgba(0,0,0,0.5)', 1);
        text.split(' ').forEach((word, wi, arr) => {
          const span = document.createElement('span');
          span.textContent = word + (wi < arr.length - 1 ? ' ' : '');
          span.style.cssText = \`display:inline;opacity:0;animation:typeChar 0.12s forwards;animation-delay:\${wi * 0.09}s\`;
          el.appendChild(span);
        });
        break;
      }
      case 'slide': {
        el.textContent = text;
        el.style.color = ct;
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '700';
        el.style.fontFamily = 'inherit';
        el.style.background = 'rgba(0,0,0,0.749)';
        el.style.padding = bp;
        el.style.borderRadius = '0';
        el.style.textShadow = 'none';
        break;
      }
      case 'wave': {
        el.textContent = text;
        el.style.color = '#6BFF6B';
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '900';
        el.style.fontFamily = 'inherit';
        el.style.background = 'none';
        el.style.padding = '0';
        el.style.borderRadius = '0';
        el.style.textShadow = _ol(cb, 4) + ',' + _sh('rgba(0,0,0,0.5)', 2);
        break;
      }
      default: {
        el.textContent = text;
        el.style.color = ct;
        el.style.fontSize = fs + 'px';
        el.style.fontWeight = '900';
        el.style.fontFamily = 'inherit';
        el.style.background = 'none';
        el.style.padding = '0';
        el.style.borderRadius = '0';
        el.style.textShadow = _ol(cb, 4) + ',' + _sh('rgba(0,0,0,0.5)', 2);
      }
    }
    el.style.position = 'absolute';
    el.style.left = '4%';
    el.style.right = '4%';
    el.style.width = 'auto';
    el.style.transform = 'none';
    el.style.textAlign = 'center';
    el.style.zIndex = '5';
    el.style.wordWrap = 'break-word';
    el.style.maxWidth = '92%';
    el.style.display = text ? 'block' : 'none';
    el.style.cursor = 'grab';
    el.style.pointerEvents = 'all';
    el.title = 'Glisser pour déplacer';
  }`;

const replaced = content.replace(/  function _renderSubText\(el, text, opts\) \{[\s\S]*?\n  \}/, newFn);
if (replaced === content) { console.log('NO CHANGE - pattern not found'); process.exit(1); }
fs.writeFileSync('clips-v2.html', replaced, 'utf8');
console.log('OK');
