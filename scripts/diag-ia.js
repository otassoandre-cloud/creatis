#!/usr/bin/env node
/**
 * Diagnostic de la cascade IA — quel fournisseur répond, ici et maintenant.
 *
 *   node scripts/diag-ia.js
 *
 * Le 27/09/2026 un abonné Pro est resté bloqué plusieurs jours sur « service saturé »
 * parce que les TROIS étages étaient à terre en même temps : Groq au plafond du jour,
 * Together à 402 depuis le 15/09, et Gemini figé sur le seul modèle en 429 — alors que
 * d'autres modèles Gemini répondaient 200 avec la même clé, au même instant.
 *
 * La leçon : une cascade ne vaut que si on sait, à la demande, lequel de ses étages
 * tient debout. Ce script répond à ça en quelques secondes, sans deviner.
 */

const fs = require('fs');
const path = require('path');

const E = {};
for (const l of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) E[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const QUESTION = 'Réponds exactement par le mot: OK';
const court = (s) => String(s).replace(/\s+/g, ' ').slice(0, 90);

async function groq() {
  if (!E.GROQ_API_KEY) return ['Groq', '—', 'pas de clé'];
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${E.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: E.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: QUESTION }], max_tokens: 10,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const t = await r.text();
    /* Le plafond quotidien Groq n'apparait QUE dans le corps, jamais dans les en-tetes :
       il faut lire le texte pour distinguer « minute » de « jour ». */
    const jour = /per day|TPD|tokens per day/i.test(t);
    return ['Groq', r.status, r.ok ? 'répond' : (jour ? 'PLAFOND JOURNALIER atteint' : court(t))];
  } catch (e) { return ['Groq', 'err', court(e.message)]; }
}

async function gemini(modele) {
  if (!E.GEMINI_API_KEY) return ['Gemini ' + modele, '—', 'pas de clé'];
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${E.GEMINI_API_KEY}`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: QUESTION }] }] }),
        signal: AbortSignal.timeout(20000),
      });
    const t = await r.text();
    return ['Gemini ' + modele, r.status, r.ok ? 'répond' : court(t)];
  } catch (e) { return ['Gemini ' + modele, 'err', court(e.message)]; }
}

async function together() {
  if (!E.TOGETHER_API_KEY) return ['Together', '—', 'pas de clé'];
  try {
    const r = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${E.TOGETHER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        messages: [{ role: 'user', content: QUESTION }], max_tokens: 10,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const t = await r.text();
    return ['Together', r.status, r.ok ? 'répond' : (r.status === 402 ? 'CRÉDIT ÉPUISÉ — à recharger' : court(t))];
  } catch (e) { return ['Together', 'err', court(e.message)]; }
}

(async () => {
  const modeles = [...new Set([
    E.GEMINI_MODEL || 'gemini-3.6-flash',
    ...(E.GEMINI_MODELS || 'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite').split(',').map((s) => s.trim()),
  ])].filter(Boolean);

  const lignes = [await groq(), ...(await Promise.all(modeles.map(gemini))), await together()];

  console.log('ÉTAGE                          CODE   ÉTAT');
  console.log('-'.repeat(78));
  for (const [nom, code, etat] of lignes) {
    console.log(`${String(nom).padEnd(30)} ${String(code).padEnd(6)} ${etat}`);
  }

  const debout = lignes.filter((l) => l[1] === 200).map((l) => l[0]);
  console.log('');
  if (!debout.length) {
    console.log('AUCUN ÉTAGE DEBOUT — toute analyse renverra « service saturé ».');
    process.exitCode = 1;
  } else {
    console.log(`Étages debout : ${debout.join(', ')}`);
    console.log('La chaîne peut servir une analyse.');
  }
})();
