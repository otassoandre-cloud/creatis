const fs = require('fs');
let c = fs.readFileSync('clips-v2.html', 'utf8');

// Remplacer le bloc presets par deux color pickers (fond + texte)
const oldPresets = `          <div id="hook-presets" style="display:none;gap:8px;margin-bottom:8px">
            <button class="hook-preset" data-bg="#000000" data-fg="#ffffff" onclick="V2.setHookPreset(this)" style="flex:1;padding:7px 0;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;border:2px solid #555;background:#000;color:#fff">Noir</button>
            <button class="hook-preset" data-bg="#e60000" data-fg="#ffffff" onclick="V2.setHookPreset(this)" style="flex:1;padding:7px 0;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;border:2px solid transparent;background:#e60000;color:#fff">Rouge</button>
            <button class="hook-preset" data-bg="#ffffff" data-fg="#000000" onclick="V2.setHookPreset(this)" style="flex:1;padding:7px 0;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;border:2px solid transparent;background:#fff;color:#000">Blanc</button>
          </div>`;

const newPickers = `          <div id="hook-presets" style="display:none;gap:12px;margin-bottom:8px;align-items:center">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--texte-doux);cursor:pointer">
              <input type="color" id="modal-hook-bg" value="#000000" oninput="V2.updateClipOpt()" style="width:28px;height:28px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px">
              Fond
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--texte-doux);cursor:pointer">
              <input type="color" id="modal-hook-fg" value="#ffffff" oninput="V2.updateClipOpt()" style="width:28px;height:28px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px">
              Texte
            </label>
          </div>`;

if (c.includes(oldPresets)) {
  c = c.replace(oldPresets, newPickers);
  console.log('1. color pickers HTML OK');
} else { console.log('1. SKIP'); }

// Mettre à jour updateClipOpt pour lire les color pickers
const oldHookColor = `      hookColor: prev.hookColor || '#ffffff',
      hookBg: prev.hookBg || '#000000',`;
const newHookColor = `      hookColor: document.getElementById('modal-hook-fg')?.value || prev.hookColor || '#ffffff',
      hookBg: document.getElementById('modal-hook-bg')?.value || prev.hookBg || '#000000',`;
if (c.includes(oldHookColor)) {
  c = c.replace(oldHookColor, newHookColor);
  console.log('2. updateClipOpt colors OK');
} else { console.log('2. SKIP'); }

// Supprimer setHookPreset (plus besoin)
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

  `;
if (c.includes(setHookPresetFn)) {
  c = c.replace(setHookPresetFn, '  ');
  console.log('3. setHookPreset removed OK');
} else { console.log('3. SKIP - setHookPreset not found'); }

// Ajouter sync des color pickers quand on ouvre la modale (openModal)
// On cherche où hookEnabled et hookText sont synchronisés dans openModal/loadClipSettings
const syncHookOn = `    const hookOn = document.getElementById('modal-hook-on');
    if (hookOn) { hookOn.checked = opts.hookEnabled; V2.updateClipOpt(); }`;
if (c.includes(syncHookOn)) {
  const syncNew = `    const hookOn = document.getElementById('modal-hook-on');
    if (hookOn) { hookOn.checked = opts.hookEnabled; V2.updateClipOpt(); }
    const hookBgEl = document.getElementById('modal-hook-bg');
    const hookFgEl = document.getElementById('modal-hook-fg');
    if (hookBgEl) hookBgEl.value = opts.hookBg || '#000000';
    if (hookFgEl) hookFgEl.value = opts.hookColor || '#ffffff';`;
  c = c.replace(syncHookOn, syncNew);
  console.log('4. sync pickers on open OK');
} else {
  // Try alternate pattern
  const alt = `document.getElementById('modal-hook-on');`;
  const altIdx = c.indexOf(alt);
  console.log('4. SKIP - sync pattern not found, hookOn at:', altIdx);
}

fs.writeFileSync('clips-v2.html', c, 'utf8');
console.log('DONE');
