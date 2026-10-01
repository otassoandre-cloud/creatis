const fs = require('fs');
let c = fs.readFileSync('clips-v2.html', 'utf8');

// 1. Ajouter les presets dans la section hook HTML
const hookSection = `          <input type="text" id="modal-hook-txt" class="opt-input" placeholder="Texte d'accroche…" maxlength="80" oninput="V2.updateClipOpt()" style="display:none;margin-bottom:8px">
          <button onclick="V2.autoHook()" style="font-size:12px;font-weight:700;color:var(--texte-doux);background:transparent;border:none;cursor:pointer;padding:0">⚡ Auto depuis le clip</button>`;

const hookSectionNew = `          <input type="text" id="modal-hook-txt" class="opt-input" placeholder="Texte d'accroche…" maxlength="80" oninput="V2.updateClipOpt()" style="display:none;margin-bottom:8px">
          <div id="hook-presets" style="display:none;gap:8px;margin-bottom:8px">
            <button class="hook-preset" data-bg="#000000" data-fg="#ffffff" onclick="V2.setHookPreset(this)" style="flex:1;padding:7px 0;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;border:2px solid #555;background:#000;color:#fff">Noir</button>
            <button class="hook-preset" data-bg="#e60000" data-fg="#ffffff" onclick="V2.setHookPreset(this)" style="flex:1;padding:7px 0;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;border:2px solid transparent;background:#e60000;color:#fff">Rouge</button>
            <button class="hook-preset" data-bg="#ffffff" data-fg="#000000" onclick="V2.setHookPreset(this)" style="flex:1;padding:7px 0;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;border:2px solid transparent;background:#fff;color:#000">Blanc</button>
          </div>
          <button onclick="V2.autoHook()" style="font-size:12px;font-weight:700;color:var(--texte-doux);background:transparent;border:none;cursor:pointer;padding:0">⚡ Auto depuis le clip</button>`;

if (c.includes(hookSection)) {
  c = c.replace(hookSection, hookSectionNew);
  console.log('1. hook presets HTML OK');
} else { console.log('1. SKIP - not found'); }

// 2. Ajouter hookBg dans updateClipOpt (après hookColor)
const hookColorLine = `      hookColor: prev.hookColor || '#ffffff',`;
const hookColorLineNew = `      hookColor: prev.hookColor || '#ffffff',
      hookBg: prev.hookBg || '#000000',`;
if (c.includes(hookColorLine)) {
  c = c.replace(hookColorLine, hookColorLineNew);
  console.log('2. hookBg in updateClipOpt OK');
} else { console.log('2. SKIP - hookColor not found'); }

// 3. Ajouter hook_bg dans l'export FormData
const exportHookColor = `    form.append('hook_color', opts.hookColor || '#ffffff');`;
const exportHookColorNew = `    form.append('hook_color', opts.hookColor || '#ffffff');
    form.append('hook_bg',    opts.hookBg    || '#000000');`;
if (c.includes(exportHookColor)) {
  c = c.replace(exportHookColor, exportHookColorNew);
  console.log('3. hook_bg in export OK');
} else { console.log('3. SKIP - export line not found'); }

// 4. Mettre à jour le preview _subLoop — fond dynamique selon opts.hookBg
const previewBg1 = `          hookEl.style.background = inWindow ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.3)';`;
const previewBg1New = `          const _hbg = opts.hookBg || '#000000'; const _hr=parseInt(_hbg.slice(1,3),16),_hg=parseInt(_hbg.slice(3,5),16),_hb=parseInt(_hbg.slice(5,7),16);
          hookEl.style.background = inWindow ? \`rgba(\${_hr},\${_hg},\${_hb},0.93)\` : \`rgba(\${_hr},\${_hg},\${_hb},0.3)\`;`;
if (c.includes(previewBg1)) {
  c = c.replace(previewBg1, previewBg1New);
  console.log('4a. preview bg paused OK');
} else { console.log('4a. SKIP - paused bg not found'); }

const previewBg2 = `          hookEl.style.background = 'rgba(0,0,0,0.82)';`;
const previewBg2New = `          hookEl.style.background = \`rgba(\${_hr},\${_hg},\${_hb},0.93)\`;`;
// Note: _hr,_hg,_hb now defined in the previous branch — we need to also define them in the else branch
// So let's use a different approach: find the full else block
const elseBlock = `        } else {
          hookEl.style.display = inWindow ? 'block' : 'none';
          hookEl.style.outline = 'none';
          hookEl.style.background = 'rgba(0,0,0,0.82)';`;
const elseBlockNew = `        } else {
          hookEl.style.display = inWindow ? 'block' : 'none';
          hookEl.style.outline = 'none';
          const _hbg2 = opts.hookBg || '#000000'; const _hr2=parseInt(_hbg2.slice(1,3),16),_hg2=parseInt(_hbg2.slice(3,5),16),_hb2=parseInt(_hbg2.slice(5,7),16);
          hookEl.style.background = \`rgba(\${_hr2},\${_hg2},\${_hb2},0.93)\`;`;
if (c.includes(elseBlock)) {
  c = c.replace(elseBlock, elseBlockNew);
  console.log('4b. preview bg playing OK');
} else { console.log('4b. SKIP - else block not found'); }

// 5. Ajouter la fonction setHookPreset + fix toggleHook pour afficher presets
const toggleHookFn = `  function toggleHook(on) {
    const inp = document.getElementById('opt-hook-text');
    const row = document.getElementById('opt-hook-style-row');
    if (inp) inp.style.display = on ? 'block' : 'none';`;

// Find the real toggleHook in clips-v2.html
const thIdx = c.indexOf('function toggleHook');
if (thIdx !== -1) {
  // Find it and show context
  console.log('5. toggleHook found at', thIdx, ':', JSON.stringify(c.slice(thIdx, thIdx+200)));
}

// Insert setHookPreset function right after updateClipOpt closing brace
const afterUpdateClipOpt = `  function autoHook() {`;
const setHookPresetFn = `  function setHookPreset(btn) {
    if (_modalIdx === null) return;
    const fg = btn.dataset.fg; const bg = btn.dataset.bg;
    const prev = _clipSettings[_modalIdx] || {};
    _clipSettings[_modalIdx] = { ...prev, hookColor: fg, hookBg: bg };
    // Active state
    document.querySelectorAll('.hook-preset').forEach(b => {
      b.style.border = '2px solid transparent';
      if (b.dataset.bg === '#000000') b.style.border = '2px solid #555';
    });
    btn.style.border = '2px solid #fff';
  }

  function autoHook() {`;
if (c.includes(afterUpdateClipOpt)) {
  c = c.replace(afterUpdateClipOpt, setHookPresetFn);
  console.log('5. setHookPreset OK');
} else { console.log('5. SKIP - autoHook not found'); }

// 6. Modifier updateClipOpt pour afficher les presets + marquer l'actif quand hookEnabled
// Find where hookTxt.style.display is set and add presets show/hide + active state
const hookTxtDisplay = `    const hookTxt = document.getElementById('modal-hook-txt');
    if (hookTxt) hookTxt.style.display = hookOn ? 'block' : 'none';`;
const hookTxtDisplayNew = `    const hookTxt = document.getElementById('modal-hook-txt');
    if (hookTxt) hookTxt.style.display = hookOn ? 'block' : 'none';
    const presetsEl = document.getElementById('hook-presets');
    if (presetsEl) presetsEl.style.display = hookOn ? 'flex' : 'none';`;
if (c.includes(hookTxtDisplay)) {
  c = c.replace(hookTxtDisplay, hookTxtDisplayNew);
  console.log('6. show presets on toggle OK');
} else { console.log('6. SKIP'); }

fs.writeFileSync('clips-v2.html', c, 'utf8');
console.log('DONE');
