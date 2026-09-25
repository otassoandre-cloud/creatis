#!/usr/bin/env node
/**
 * Insère (ou met à jour) le sommaire par thème dans blog.html.
 *
 *   node scripts/hub-blog-themes.js
 *
 * Pourquoi : le hub liste maintenant plus de 70 articles en une seule colonne.
 * Pour le lecteur c'est illisible, et pour le maillage c'est une page qui
 * distribue son autorité à parts égales entre 70 liens sans dire lesquels vont
 * ensemble. Le sommaire regroupe par thème et donne à chaque cluster une porte
 * d'entrée nommée.
 *
 * À relancer après chaque lot de pages, en ajoutant les nouveaux liens ci-dessous
 * — sinon les pages neuves ne reçoivent aucun lien depuis le hub.
 *
 * Le bloc est délimité par des commentaires : relancer le script le remplace au
 * lieu d'en empiler un deuxième.
 */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const DEBUT = '  <!-- SOMMAIRE-THEMES:debut -->';
const FIN = '  <!-- SOMMAIRE-THEMES:fin -->';

const themes = [
  {
    titre: 'Le métier de clippeur',
    intro: 'Se faire payer pour cliper : comment ça marche, combien, et par où commencer.',
    liens: [
      ['/blog/devenir-clippeur-tiktok.html', 'Devenir clippeur', 'Le guide complet du métier'],
      ['/blog/campagnes-clipping-remunerees.html', 'Les campagnes rémunérées', 'Budget fermé, vue vérifiée, CPM'],
      ['/blog/plateformes-clipping-france.html', 'Les plateformes en France', 'Whop, PostRoyalty, Clip.farm…'],
      ['/blog/whop-clipping-guide.html', 'Whop Content Rewards', 'Le guide du clippeur francophone'],
      ['/blog/combien-paye-1000-vues-clipping.html', 'Combien paye 1 000 vues', 'Les taux réels, sans promesse'],
      ['/blog/combien-gagne-clippeur.html', 'Combien gagne un clippeur', 'Les modèles de rémunération'],
      ['/blog/clipper-sans-audience.html', 'Clipper sans audience', 'Le plan des 4 premières semaines'],
      ['/blog/clipper-pour-un-streamer.html', 'Décrocher un streamer', 'Aborder, facturer, fidéliser'],
      ['/blog/clips-sans-montrer-son-visage.html', 'Sans montrer son visage', 'Pourquoi le clipping y répond'],
      ['/blog/combien-de-clips-par-jour.html', 'Combien de clips par jour', 'Le vrai plafond du métier'],
      ['/blog/monter-equipe-clippeurs.html', 'Monter une équipe', 'Ce qui casse à l’échelle'],
    ],
  },
  {
    titre: 'Gaming et streaming',
    intro: 'La niche la plus active du clipping, et la fenêtre du 19 novembre.',
    liens: [
      ['/blog/clipper-gta-6.html', 'Clipper GTA 6', 'La vague du 19 novembre 2026'],
      ['/blog/clips-stream-gaming.html', 'Clips depuis un stream gaming', 'Signal jeu contre signal parole'],
      ['/clips-twitch.html', 'Clips depuis Twitch', 'VOD, clips natifs, autorisation'],
      ['/blog/clips-depuis-kick.html', 'Clipper un stream Kick', 'Ce qui change face à Twitch'],
    ],
  },
  {
    titre: 'D’où partir : les sources',
    intro: 'Chaque type de contenu long a ses contraintes propres. Trouve la tienne.',
    liens: [
      ['/clips-podcast.html', 'Un podcast filmé', '10 shorts depuis un épisode'],
      ['/blog/clips-depuis-podcast-audio.html', 'Un podcast sans vidéo', 'La réponse honnête'],
      ['/blog/decouper-video-longue-format-interview.html', 'Une interview', 'Découper une vidéo longue'],
      ['/blog/clips-depuis-visioconference.html', 'Une visio Zoom ou Teams', 'Vue intervenant, cadence variable'],
      ['/blog/clips-depuis-conference.html', 'Une conférence', 'On clipe une affirmation'],
      ['/blog/webinaire-en-clips.html', 'Un webinaire', 'Le registre est déjà le bon'],
      ['/blog/cours-en-ligne-en-clips.html', 'Un cours en ligne', 'Pédagogie en format court'],
      ['/blog/clips-depuis-instagram-live.html', 'Un live Instagram', 'Déjà vertical, mais éphémère'],
      ['/blog/recycler-anciennes-videos.html', 'Ton archive', 'Le stock le moins cher'],
    ],
  },
  {
    titre: 'Quand ça ne marche pas',
    intro: 'Les défauts qui reviennent le plus, et comment les diagnostiquer.',
    liens: [
      ['/blog/video-floue-apres-export.html', 'La vidéo est floue', 'Les 4 causes réelles'],
      ['/blog/video-trop-lourde-tiktok.html', 'Le fichier est refusé', 'Durée, débit, codec, cadence'],
      ['/blog/sous-titres-decales.html', 'Les sous-titres sont décalés', 'Décalage constant ou dérive ?'],
      ['/blog/pourquoi-ton-crop-9-16-est-rate.html', 'Le cadrage est raté', 'On ne garde qu’un tiers'],
      ['/blog/erreurs-qui-tuent-tes-shorts.html', 'Le clip ne prend pas', 'Les erreurs qui tuent un Short'],
    ],
  },
  {
    titre: 'Publier et diffuser',
    intro: 'Une fois les clips prêts : où, dans quelle langue, avec quel son.',
    liens: [
      ['/blog/cross-posting-clips.html', 'Publier partout', 'Le cross-posting de clips'],
      ['/blog/sous-titres-anglais-clips.html', 'Publier en anglais', 'Sous-titres traduits, audio français'],
      ['/blog/clips-pour-linkedin.html', 'Sur LinkedIn', 'Le texte compte autant que la vidéo'],
      ['/blog/clips-pour-facebook-reels.html', 'Sur Facebook Reels', 'La plateforme qu’on oublie'],
      ['/blog/clips-pour-snapchat.html', 'Sur Snapchat Spotlight', 'La plus hostile au recyclage'],
      ['/blog/musique-clips-droits.html', 'La musique', 'Trois statuts très différents'],
      ['/blog/image-couverture-clip.html', 'L’image de couverture', 'Presque rien dans le fil'],
      ['/blog/formats-video-reseaux-sociaux.html', 'Les formats par réseau', 'Le tableau complet'],
      ['/blog/specs-video-tiktok-reels-shorts.html', 'Les specs techniques', 'Durée, résolution, ratio'],
    ],
  },
  {
    titre: 'Mesurer et durer',
    intro: 'Ce qu’il faut regarder, et au bout de combien de temps ça veut dire quelque chose.',
    liens: [
      ['/blog/analyser-performance-clips.html', 'Les 3 chiffres utiles', 'Les vues ne disent rien'],
      ['/blog/combien-de-temps-avant-resultats-clips.html', 'Combien de temps avant', '3 phases, 6 semaines, 30 clips'],
      ['/blog/ameliorer-retention-short.html', 'Améliorer la rétention', 'Ce qui se joue au montage'],
      ['/blog/hook-3-secondes.html', 'Le hook de 3 secondes', 'Là où tout se décide'],
    ],
  },
  {
    titre: 'Pour les entreprises et les organisations',
    intro: 'Marques, clubs, agences : produire du format court sans équipe dédiée.',
    liens: [
      ['/blog/contenu-court-entreprise.html', 'Le contenu court en entreprise', 'Structurer la production'],
      ['/blog/clips-pour-publicite.html', 'Des créatives publicitaires', 'Qualifier plutôt que retenir'],
      ['/blog/lancer-campagne-clipping.html', 'Lancer une campagne', 'Taux, brief, garde-fous'],
      ['/blog/combien-coute-faire-clipper-ses-videos.html', 'Faire produire ses clips', 'Prestataire, forfait ou outil'],
      ['/blog/clips-pour-agences-clipping.html', 'Produire pour une agence', 'Le volume en usage pro'],
      ['/blog/clips-club-sportif.html', 'Pour un club sportif', 'Droits, terrain, régularité'],
      ['/blog/repurposing-coachs-infopreneurs.html', 'Coachs et infopreneurs', 'Recycler sa pédagogie'],
    ],
  },
  {
    titre: 'Les bases',
    intro: 'Les définitions à avoir en tête avant le reste.',
    liens: [
      ['/blog/qu-est-ce-qu-un-clip-viral.html', 'Un clip viral', 'Définition et caractéristiques'],
      ['/blog/repurposing-video-definition.html', 'Le repurposing', 'Créer une fois, publier partout'],
      ['/blog/hook-video-definition.html', 'Le hook', 'Définition et 7 formules'],
      ['/blog/short-reel-tiktok-differences.html', 'Short, Reel ou TikTok', 'Ce qui les distingue'],
      ['/blog/detecter-moments-viraux.html', 'Détecter les moments forts', 'Ce que lit une IA'],
      ['/blog/generer-sous-titres-automatiques.html', 'Les sous-titres automatiques', 'Génération et styles'],
    ],
  },
  {
    titre: 'Choisir son outil',
    intro: 'Comparatifs, critères, et ce que coûte de faire produire ses clips.',
    liens: [
      ['/blog/meilleur-logiciel-clippeur.html', 'Le meilleur logiciel', 'Les critères en usage pro'],
      ['/blog/outil-clips-ia-francais.html', 'Un outil français', 'Transcription, euros, données'],
      ['/blog/clips-sans-filigrane.html', 'Sans filigrane', 'Ce que le logo coûte vraiment'],
      ['/blog/logiciel-clips-viraux-gratuit.html', 'Les offres gratuites', 'Ce qu’elles cachent'],
      ['/alternatives/', 'Les comparatifs', 'Face à Opus Clip, Klap, Submagic…'],
    ],
  },
];

const f = path.join(RACINE, 'blog.html');
let s = fs.readFileSync(f, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';

// Contrôle : chaque lien doit exister sur le disque, sinon on ne publie rien.
const morts = [];
for (const t of themes)
  for (const [href] of t.liens) {
    const c = href.replace(/^\//, '');
    if (!fs.existsSync(path.join(RACINE, c)) && !fs.existsSync(path.join(RACINE, c + '.html')))
      morts.push(href);
  }
if (morts.length) {
  console.error('Liens morts, rien écrit :\n  ' + morts.join('\n  '));
  process.exit(1);
}

const bloc = [
  DEBUT,
  '  <section class="themes" aria-label="Parcourir par thème">',
  '    <h2>Parcourir par thème</h2>',
  ...themes.flatMap((t) => [
    `    <h3>${t.titre}</h3>`,
    `    <p class="theme-intro">${t.intro}</p>`,
    '    <ul class="pinned-grid">',
    ...t.liens.map(
      ([href, titre, sous]) =>
        `      <li><a href="${href}">${titre}<span>${sous}</span></a></li>`
    ),
    '    </ul>',
  ]),
  '  </section>',
  FIN,
  '',
].join(nl);

const style =
  '.themes { margin-bottom: 56px; }' +
  nl +
  '.themes > h2 { font-size: 1.15rem; font-weight: 700; color: var(--paper); margin-bottom: 20px; }' +
  nl +
  '.themes h3 { font-size: 1rem; font-weight: 700; color: var(--paper); margin: 28px 0 4px; }' +
  nl +
  '.theme-intro { color: var(--muted); font-size: 0.88rem; margin-bottom: 12px; }' +
  nl;

if (!s.includes('.themes {')) {
  const ancreCss = '.pinned { margin-bottom: 48px; }';
  s = s.replace(ancreCss, style + ancreCss);
}

const echappe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

if (s.includes(DEBUT)) {
  s = s.replace(new RegExp(echappe(DEBUT) + '[\\s\\S]*?' + echappe(FIN) + '\\r?\\n'), bloc);
  console.log('sommaire remplacé');
} else {
  const ancre = s.match(/([ \t]*<h2 style="font-size:1\.15rem[^>]*>Tous les articles<\/h2>)/);
  if (!ancre) {
    console.error('Ancre « Tous les articles » introuvable — rien écrit.');
    process.exit(1);
  }
  s = s.replace(ancre[1], bloc + nl + ancre[1]);
  console.log('sommaire inséré');
}

fs.writeFileSync(f, s, 'utf8');
const n = themes.reduce((a, t) => a + t.liens.length, 0);
console.log(`${themes.length} thèmes, ${n} liens, tous vérifiés sur le disque.`);
