import { Video } from "@remotion/media";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { POLICE } from "./police";

/**
 * LE CLIP, TEL QUEL — 1080×1920, son d'origine, appel à la fin.
 *
 * ── CE QUE CE GABARIT CHANGE ─────────────────────────────────────────────
 * Demande du 18/10 : publier le clip généré sans rien par-dessus, avec SON
 * SON, et une seule carte à la fin — « t'as kiffé ce clip ? il a été généré
 * automatiquement en 30 secondes ».
 *
 * C'est l'inverse de tous les gabarits précédents, et c'est plus fort :
 *   · plus de voix de synthèse, qui était notre faiblesse la plus audible ;
 *   · le clip EST la démonstration — on ne dit pas que l'outil produit des
 *     clips regardables, on en montre un et on laisse juger ;
 *   · le son vient de l'image, donc la règle du 08/10 est respectée par
 *     construction (un son emprunté à autre chose est interdit).
 *
 * ── CE QU'IL NE FAUT PAS FAIRE ICI ───────────────────────────────────────
 * Pas de légende par-dessus : le clip porte déjà ses sous-titres incrustés,
 * et une deuxième couche de texte les rendrait illisibles. La carte finale
 * se pose donc dans la bande libre (14→48 %), au-dessus des sous-titres du
 * clip et sous la rangée d'icônes de la plateforme.
 */

export type ReglagesClipBrut = {
  /** Le clip exporté, 1080×1920, sous-titres et son compris. */
  source: string;
  /** Seconde du clip où l'on commence. */
  depart?: number;
  /** Durée totale de la pièce, en secondes. */
  duree: number;
  /** Seconde d'apparition de la carte. */
  appel: number;
  titre: string;
  sous: string;
};

const VERT = "#10b981";

export const ClipBrut: React.FC<{ r: ReglagesClipBrut }> = ({ r }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = frame / fps;

  const e = spring({
    frame: frame - Math.round(r.appel * fps),
    fps,
    config: { damping: 15, mass: 0.6 },
  });
  const visible = s >= r.appel ? e : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: POLICE }}>
      {/* Le clip, plein cadre et SONORE. Pas de `muted` : c'est tout le
          propos. Le fichier exporté fait déjà 1080×1920, il n'y a donc ni
          recadrage ni mise à l'échelle à faire. */}
      <Video
        src={staticFile(r.source)}
        trimBefore={Math.round((r.depart ?? 0) * fps)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* L'appel, dans la bande libre : au-dessus des sous-titres incrustés
          du clip, sous les icônes de la plateforme. */}
      {s >= r.appel ? (
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: height * 0.17,
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 14, padding: "0 60px",
            opacity: visible,
            transform: `translateY(${interpolate(visible, [0, 1], [34, 0])}px)`,
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.82)", borderRadius: 26,
              padding: "26px 34px", textAlign: "center",
              border: "3px solid rgba(255,255,255,0.14)",
            }}
          >
            <div
              style={{
                fontSize: 74, fontWeight: 900, color: "#fff",
                lineHeight: 1.1, letterSpacing: -2,
              }}
            >
              {r.titre}
            </div>
            <div
              style={{
                marginTop: 16, background: VERT, color: "#04120b",
                borderRadius: 16, padding: "14px 24px",
                fontSize: 46, fontWeight: 900, letterSpacing: -1, lineHeight: 1.15,
              }}
            >
              {r.sous}
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ── LES PIÈCES ──────────────────────────────────────────────────────────
   Un clip par pièce, pris sur la vidéo la plus récente disponible. La règle
   du 18/10 : « faut que ce soit récent à chaque fois pour que ça ait de
   l'impact » — on ne repasse pas sur un lot déjà publié. */

export const KIFFE_1: ReglagesClipBrut = {
  /* tr1-5 : 31,1 s. On NE prend pas tr1-1 ni tr1-3 — ils contiennent des
     extraits d oeuvres tierces incrustes dans l interview (un film muet, une
     sequence d animation). Republier l interview est une chose, rediffuser
     un extrait de film protege avec son son en est une autre. */
  source: "clip-tr1-5.mp4",
  duree: 31.0,
  appel: 25.0,
  titre: "T'as kiffé ce clip ?",
  sous: "Généré automatiquement en 30 secondes · creatis.app",
};
export const DUREE_KIFFE_1 = Math.round(KIFFE_1.duree * 30);

export const KIFFE_2: ReglagesClipBrut = {
  source: "clip-tr1-4.mp4",
  duree: 40.0,
  appel: 33.5,
  titre: "Ce clip, personne ne l'a monté.",
  sous: "Découpé, recadré et sous-titré tout seul · creatis.app",
};
export const DUREE_KIFFE_2 = Math.round(KIFFE_2.duree * 30);

export const KIFFE_3: ReglagesClipBrut = {
  source: "clip-tr1-2.mp4",
  duree: 44.0,
  appel: 37.5,
  titre: "Sorti d'une vidéo de 36 minutes.",
  sous: "En 30 secondes, sans logiciel · creatis.app",
};
export const DUREE_KIFFE_3 = Math.round(KIFFE_3.duree * 30);
