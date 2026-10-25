/**
 * VERROU DU PROFIL CHROME — un seul travail Playwright à la fois.
 *
 * ── POURQUOI ─────────────────────────────────────────────────────────────
 * Deux fois en deux jours, une publication est morte sur
 * « Target page, context or browser has been closed » parce qu'un relevé
 * analytique ou un épinglage tournait au même moment sur
 * `.playwright-profile-social`. Le 08/10 la vidéo longue n'est pas partie ;
 * le 09/10 non plus, deux fois de suite.
 *
 * Une consigne écrite n'a pas suffi — je l'avais consignée le 08/10 et je
 * l'ai refaite le 09. Donc un verrou, qui refuse.
 *
 *   const { prendre, rendre } = require('./verrou-profil');
 *   prendre('publier-youtube');   // sort en code 6 si déjà pris
 *   …
 *   rendre();
 */
const fs = require('fs');
const path = require('path');

const FICHIER = path.join(__dirname, '..', '.verrou-profil.json');
/* Au-delà, on considère que le détenteur est mort sans rendre la main : un
   verrou éternel serait pire que la collision qu'il évite. */
const PEREMPTION_MS = 25 * 60 * 1000;

const prendre = (qui) => {
  if (fs.existsSync(FICHIER)) {
    try {
      const v = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
      const age = Date.now() - v.depuis;
      if (age < PEREMPTION_MS) {
        console.error('');
        console.error(`PROFIL CHROME OCCUPÉ par « ${v.qui} » depuis ${Math.round(age / 1000)} s.`);
        console.error('Deux travaux Playwright sur le même profil tuent le navigateur :');
        console.error('c\'est ce qui a fait échouer la vidéo longue les 08 et 09/10.');
        console.error('Attendre la fin, ou supprimer .verrou-profil.json si le travail est mort.');
        process.exit(6);
      }
      console.warn(`(verrou périmé de « ${v.qui} », ${Math.round(age / 60000)} min — on le reprend)`);
    } catch {
      /* Fichier illisible : on le remplace plutôt que de bloquer pour toujours. */
    }
  }
  fs.writeFileSync(FICHIER, JSON.stringify({ qui, depuis: Date.now(), pid: process.pid }));
  const rendre = () => { try { fs.unlinkSync(FICHIER); } catch { /* déjà rendu */ } };
  process.on('exit', rendre);
  process.on('SIGINT', () => { rendre(); process.exit(130); });
  return rendre;
};

const rendre = () => { try { fs.unlinkSync(FICHIER); } catch { /* déjà rendu */ } };

module.exports = { prendre, rendre };
