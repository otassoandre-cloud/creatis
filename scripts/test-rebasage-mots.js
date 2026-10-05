/* Vérifie la logique de rebasage des mots (SPEC §3 et §4) sur les cas limites,
 * hors navigateur. Reproduit exactement le code de patchedSegments.
 */
function rebaser(motsSource, ss, se, start, end) {
  const D = end - start;
  let words = [];
  for (const w of motsSource) {
    const mot = String(w.word ?? '').trim();
    if (!mot) continue;
    const ws = (w.start ?? ss) - start;
    const we = (w.end ?? se) - start;
    if (we <= 0 || ws >= D) continue;
    let a = Math.max(0, ws);
    let b = Math.min(D, we);
    if (b <= a) b = a + 0.04;
    const prec = words[words.length - 1];
    if (prec && a < prec.end) a = prec.end;
    if (b - a <= 0.01) continue;
    words.push({ word: mot, start: +a.toFixed(3), end: +b.toFixed(3) });
  }
  if (!words.length) words = null;
  return { words, text: words ? words.map(w => w.word).join(' ') : '(texte d origine)' };
}

const cas = [
  {
    nom: 'mot à cheval sur le DÉBUT du clip -> conservé, borné à 0',
    clip: [10, 70],
    mots: [{ word: 'BONJOUR', start: 9.6, end: 10.4 }, { word: 'TOUT', start: 10.4, end: 10.8 }]
  },
  {
    nom: 'mot à cheval sur la FIN -> conservé, borné à D',
    clip: [10, 70],
    mots: [{ word: 'FIN', start: 69.7, end: 70.5 }]
  },
  {
    nom: 'mot entièrement AVANT le clip -> supprimé + texte régénéré',
    clip: [10, 70],
    mots: [{ word: 'AVANT', start: 8.0, end: 9.0 }, { word: 'APRES', start: 11.0, end: 11.5 }]
  },
  {
    nom: 'bornes qui se chevauchent -> monotonie forcée',
    clip: [0, 60],
    mots: [{ word: 'GRAND.', start: 1.5, end: 2.02 }, { word: "C'EST", start: 1.98, end: 2.4 }]
  },
  {
    nom: 'mot réduit à moins de 10 ms par la coupe -> supprimé',
    clip: [10, 70],
    mots: [{ word: 'RESIDU', start: 9.995, end: 10.004 }, { word: 'VRAI', start: 10.1, end: 10.5 }]
  },
  {
    nom: 'aucun timing exploitable -> words = null (repli assumé)',
    clip: [10, 70],
    mots: [{ word: 'HORS', start: 100, end: 101 }]
  }
];

for (const c of cas) {
  const r = rebaser(c.mots, c.clip[0], c.clip[1], c.clip[0], c.clip[1]);
  console.log('\n' + c.nom);
  console.log('   words :', r.words ? JSON.stringify(r.words) : 'null');
  console.log('   text  :', r.text);
}
