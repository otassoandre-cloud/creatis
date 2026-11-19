#!/usr/bin/env node
// Fix double-UTF8-encoding in HTML files
// Issue: files were saved as CP1252 then re-encoded as UTF-8, producing mojibake

const fs = require('fs');
const path = require('path');

const cp1252Ext = {
  0x80:0x20AC, 0x82:0x201A, 0x83:0x0192, 0x84:0x201E, 0x85:0x2026,
  0x86:0x2020, 0x87:0x2021, 0x88:0x02C6, 0x89:0x2030, 0x8A:0x0160,
  0x8B:0x2039, 0x8C:0x0152, 0x8E:0x017D, 0x91:0x2018, 0x92:0x2019,
  0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014,
  0x98:0x02DC, 0x99:0x2122, 0x9A:0x0161, 0x9B:0x203A, 0x9C:0x0153,
  0x9E:0x017E, 0x9F:0x0178
};

const unicodeToCp1252 = {};
for (const [b, cp] of Object.entries(cp1252Ext)) unicodeToCp1252[cp] = parseInt(b);

function encodeCP1252(str) {
  const out = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7F) { out.push(cp); }
    else if (unicodeToCp1252[cp] !== undefined) { out.push(unicodeToCp1252[cp]); }
    else if (cp <= 0xFF) { out.push(cp); }
    else { out.push(0x3F); } // unmappable → '?'
  }
  return Buffer.from(out);
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node fix-encoding.js <file...>');
  process.exit(1);
}

for (const f of files) {
  const abs = path.resolve(f);
  const raw = fs.readFileSync(abs);
  const wrong = raw.toString('utf8').replace(/^﻿/, '');
  const fixedBytes = encodeCP1252(wrong);
  const fixed = fixedBytes.toString('utf8');

  // Sanity check: result should be shorter (or equal) in byte length
  console.log(`${path.basename(f)}: ${raw.length} → ${Buffer.byteLength(fixed, 'utf8')} bytes`);
  // Show first fixed accented text
  const titleMatch = fixed.match(/<title>(.+?)<\/title>/);
  if (titleMatch) console.log('  title:', titleMatch[1]);

  fs.writeFileSync(abs, fixed, 'utf8');
  console.log('  ✓ fixed');
}
