import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { POLICE } from "./police";

/**
 * ILLUSTRATIONS — de quoi MONTRER ce qu'on explique, dans les formats longs.
 *
 * ── POURQUOI CE FICHIER ──────────────────────────────────────────────────
 * Les deux premiers formats longs enchaînaient des diapos de texte sur une
 * voix off. Retour du 04/10 : « il faut que tu ajoutes du visuel […] des
 * images, des vidéos, qui montrent que tu expliques. Que ce soit pas tout
 * plat, tout doux. »
 *
 * C'est ce que je produis par défaut quand je pars d'un script : des mots qui
 * défilent. Or le matériau réel existe — neuf tournages, leurs grilles de
 * notes, et les clips exportés AVEC leur son. Chaque composant ci-dessous
 * prend de ce matériau et le met en scène.
 *
 * Règle d'usage : avant d'écrire le texte d'une scène, se demander « qu'est-ce
 * que je peux MONTRER ici ? ». Si la réponse est « rien », la scène n'a
 * probablement pas sa place.
 */

const VERT = "#10b981";
const ROUGE = "#f87171";

/**
 * UNE FORME D'ONDE, AVEC SES VRAIS SILENCES SURLIGNÉS.
 *
 * L'image vient de `ffmpeg -filter_complex showwavespic` sur l'audio réel du
 * clip, et les bornes de `silencedetect` — donc ce qu'on montre est mesuré,
 * pas dessiné à la main. C'est l'illustration du critère de RÉTENTION : on
 * voit les trous au lieu d'en parler.
 *
 *   ffmpeg -i son-clip-X.mp3 -filter_complex \
 *     "[0:a]aformat=channel_layouts=mono,showwavespic=s=1600x380:colors=#10b981" \
 *     -frames:v 1 public/onde-X.png
 *   ffmpeg -i son-clip-X.mp3 -af silencedetect=n=-32dB:d=0.25 -f null -
 *
 * ── À SAVOIR AVANT DE S'EN SERVIR ────────────────────────────────────────
 * Sur un clip de 36 s, un silence de 0,3 s fait moins de 1 % de la largeur :
 * à l'essai du 04/10, les zones rouges sont des traits fins, pas des trous
 * qu'on voit. Pour que l'illustration PROUVE, prendre une fenêtre courte de
 * l'audio (5 à 8 s autour des silences) plutôt que le clip entier, ou choisir
 * un extrait qui en contient de longs.
 */
export const FormeDOnde: React.FC<{
  image: string;
  /** Durée totale de l'audio, en secondes — pour placer les silences. */
  duree: number;
  /** Bornes des silences mesurées, en secondes : [[debut, fin], …]. */
  silences: [number, number][];
  /** Seconde où la tête de lecture entre, relative à la scène. */
  debut?: number;
  titre?: string;
}> = ({ image, duree, silences, debut = 0, titre }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, frame / fps - debut);
  /* La tête de lecture balaie la largeur en six secondes : assez lent pour
     qu'on suive, assez rapide pour ne pas endormir. */
  const avance = Math.min(1, t / 6);

  const L = 1600;
  const H = 380;

  return (
    <div style={{ position: "relative", width: L, height: H, fontFamily: POLICE }}>
      {titre ? (
        <div
          style={{
            position: "absolute", top: -58, left: 0,
            fontSize: 34, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: 1,
          }}
        >
          {titre}
        </div>
      ) : null}

      <Img src={staticFile(image)} style={{ width: L, height: H, display: "block" }} />

      {/* Les silences, en rouge : c'est le propos, il doit sauter aux yeux. */}
      {silences.map(([d, f], k) => {
        const x = (d / duree) * L;
        const l = Math.max(4, ((f - d) / duree) * L);
        const apparu = interpolate(t, [1.2 + k * 0.5, 1.7 + k * 0.5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`${d}-${f}`}
            style={{
              position: "absolute", top: 0, left: x, width: l, height: H,
              background: `${ROUGE}44`, borderLeft: `3px solid ${ROUGE}`, borderRight: `3px solid ${ROUGE}`,
              opacity: apparu,
            }}
          />
        );
      })}

      {/* La tête de lecture : elle rend la durée sensible. */}
      <div
        style={{
          position: "absolute", top: -10, left: avance * L, width: 4, height: H + 20,
          background: "#fff", boxShadow: "0 0 18px rgba(255,255,255,0.8)",
        }}
      />
    </div>
  );
};

/**
 * UN CLIP QUI JOUE, dans un cadre, avec sa note.
 *
 * Sert à illustrer n'importe quel propos sur le contenu : au lieu de décrire
 * ce qu'est un bon passage, on en montre un.
 */
export const CarteClip: React.FC<{
  source: string;
  /** Seconde de l'enregistrement où le plan commence. */
  rec: number;
  /** Rectangle utile de l'enregistrement : [x, y, l, h]. */
  cadre: [number, number, number, number];
  largeur?: number;
  hauteur?: number;
  note?: string;
}> = ({ source, rec, cadre, largeur = 560, hauteur = 980, note }) => {
  const [cx, cy, cl, ch] = cadre;
  const e = Math.min(largeur / cl, hauteur / ch);
  const tx = largeur / 2 - (cx + cl / 2) * e;
  const ty = hauteur / 2 - (cy + ch / 2) * e;
  return (
    <div
      style={{
        position: "relative", width: largeur, height: hauteur,
        borderRadius: 18, overflow: "hidden", border: `5px solid ${VERT}`,
        boxShadow: "0 22px 60px rgba(0,0,0,0.8)", fontFamily: POLICE,
      }}
    >
      <Video
        src={staticFile(source)}
        trimBefore={Math.round(rec * 30)}
        style={{
          position: "absolute", width: 1080, height: 1920,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${e})`,
        }}
        muted
      />
      {note ? (
        <div
          style={{
            position: "absolute", top: 16, left: 16,
            background: VERT, color: "#06120d", padding: "6px 16px", borderRadius: 8,
            fontSize: 40, fontWeight: 900,
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
};

/**
 * DEUX CHIFFRES DE RÉTENTION, en grand, avec leur étiquette.
 *
 * Les chiffres de Studio valent mieux qu'une phrase qui les résume : ils
 * prouvent qu'on a mesuré, et un mauvais chiffre affiché en grand accroche
 * plus qu'un bon chiffre raconté.
 */
export const DeuxChiffres: React.FC<{
  gauche: { valeur: string; etiquette: string; mauvais?: boolean };
  droite: { valeur: string; etiquette: string; mauvais?: boolean };
  debut?: number;
}> = ({ gauche, droite, debut = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, frame / fps - debut);
  const ap = (r: number) =>
    interpolate(t, [r, r + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", gap: 120, fontFamily: POLICE, alignItems: "flex-start" }}>
      {[gauche, droite].map((c, k) => (
        <div key={c.etiquette} style={{ opacity: ap(k * 1.2) }}>
          <div
            style={{
              fontSize: 156, fontWeight: 900, letterSpacing: -7, lineHeight: 0.95,
              color: c.mauvais ? ROUGE : VERT,
              transform: `scale(${interpolate(ap(k * 1.2), [0, 1], [0.9, 1])})`,
              transformOrigin: "left bottom",
            }}
          >
            {c.valeur}
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "rgba(255,255,255,0.84)", marginTop: 10, maxWidth: 520 }}>
            {c.etiquette}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * LA ZONE QUE L'INTERFACE RECOUVRE, peinte par-dessus une vraie vidéo.
 *
 * Illustration du conseil de placement : au lieu de dire « ne mets pas ton
 * texte trop bas », on peint la zone et on la montre.
 */
export const ZonesInterface: React.FC<{
  source: string;
  rec: number;
  largeur?: number;
  hauteur?: number;
  debut?: number;
}> = ({ source, rec, largeur = 540, hauteur = 960, debut = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, frame / fps - debut);
  const ap = (r: number) =>
    interpolate(t, [r, r + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "relative", width: largeur, height: hauteur, fontFamily: POLICE }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 16 }}>
        <Video
          src={staticFile(source)}
          trimBefore={Math.round(rec * 30)}
          style={{ position: "absolute", width: largeur, height: (largeur * 1920) / 1080 }}
          muted
        />
      </div>

      {/* Bas : pseudo et légende, à partir de 78 % — mesuré le 04/10. */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: hauteur * 0.78, bottom: 0,
          background: "rgba(239,68,68,0.42)", borderTop: "3px solid #ef4444",
          opacity: ap(0.2), display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 26, fontWeight: 800, textAlign: "center",
        }}
      >
        recouvert par le pseudo
      </div>

      {/* Droite : la colonne de boutons, de 53 % à 90 %. */}
      <div
        style={{
          position: "absolute", right: 0, top: hauteur * 0.53, width: largeur * 0.17, height: hauteur * 0.37,
          background: "rgba(239,68,68,0.42)", borderLeft: "3px solid #ef4444",
          opacity: ap(1.0),
        }}
      />

      {/* La bande sûre, en vert : 45 % – 65 %. */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: hauteur * 0.45, height: hauteur * 0.2,
          border: `3px dashed ${VERT}`, opacity: ap(1.8),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: VERT, fontSize: 28, fontWeight: 900,
        }}
      >
        la bande sûre
      </div>
    </div>
  );
};
