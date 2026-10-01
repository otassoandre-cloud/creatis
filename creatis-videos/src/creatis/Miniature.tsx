import { Video } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * MINIATURE YOUTUBE — 1280x720, une seule image.
 *
 *   npx remotion still Miniature out/mini.png --props=p.json
 *
 * ── POURQUOI ─────────────────────────────────────────────────────────────
 * Sans miniature personnalisée, YouTube prélève une image au hasard de la
 * vidéo. Sur nos films, ça tombe presque toujours sur un plan sombre ou sur du
 * texte en cours de fondu : la vignette ne dit rien et ne se clique pas. Le
 * tableau de bord du 01/10 le montrait — trois vidéos, trois vignettes noires,
 * 2 à 8 vues chacune.
 *
 * ── LES RÈGLES D'UNE VIGNETTE QUI SE CLIQUE ──────────────────────────────
 *  1. TROIS À CINQ MOTS, pas une phrase. La vignette est vue à 210 px de large
 *     dans une liste de recommandations : au-delà de cinq mots, plus rien n'est
 *     lisible. Le titre de la vidéo porte le reste.
 *  2. UN SEUL POINT DE FIXATION. Un chiffre énorme, ou un visage. Pas les deux
 *     en concurrence.
 *  3. DU CONTRASTE, pas de la nuance. Texte blanc ou vert vif sur fond très
 *     sombre. Les dégradés subtils disparaissent à petite taille.
 *  4. UNE VRAIE IMAGE à côté du texte — un clip de l'outil, avec un visage.
 *     Une vignette entièrement typographique se lit comme une publicité.
 *  5. RIEN DANS LE COIN BAS-DROIT : la durée de la vidéo s'y incruste.
 */

export const LARGEUR_MINI = 1280;
export const HAUTEUR_MINI = 720;

export type ReglageMini = {
  /** Trois à cinq mots. Au-delà, ce n'est plus lisible en vignette. */
  accroche: string;
  /** La ligne de soutien, en petit. Facultative. */
  soutien?: string;
  /** Un vrai clip de l'outil, posé à droite. */
  clip?: string;
  /** Seconde du clip à montrer — choisir un plan clair, avec un visage. */
  clipA?: number;
  /** La note affichée sur le clip, si on en montre un. */
  note?: number;
};

export const MINI_DEFAUT: ReglageMini = {
  accroche: "1 400 000 $",
  soutien: "versés à 303 clippeurs",
  clip: "clip-fastfood-2809.mp4",
  clipA: 2,
  note: 92,
};

export const Miniature: React.FC<{ reglage?: ReglageMini }> = ({
  reglage = MINI_DEFAUT,
}) => {
  const { accroche, soutien, clip, clipA = 0, note } = reglage;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 110% at 18% 30%, #11261d 0%, ${COULEURS.fond} 60%)`,
        fontFamily: POLICE,
        color: "#fff",
      }}
    >
      {/* Une diagonale verte derrière le clip : elle sépare les deux moitiés et
          donne un point de couleur, qui est ce qui attrape l'œil dans une liste
          de vignettes toutes sombres. */}
      <div
        style={{
          position: "absolute",
          right: -120,
          top: -80,
          width: 760,
          height: 900,
          transform: "rotate(-9deg)",
          background: `linear-gradient(150deg, rgba(16,185,129,0.22), transparent 62%)`,
        }}
      />

      {/* ── Le texte, à gauche, sur un peu plus de la moitié ── */}
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 0,
          bottom: 0,
          width: 700,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            /* La taille SUIT la longueur, elle n'est pas choisie par paliers.
               « 1 400 000 $ » fait onze caractères et débordait à 136 px : le
               « $ » passait à la ligne tout seul, ce qui casse le seul point de
               fixation de la vignette. Un caractère de cette graisse occupe
               environ 0,58 fois sa hauteur ; on résout donc pour la largeur
               disponible, et on plafonne à 140 pour les textes très courts. */
            fontSize: Math.min(140, Math.floor(700 / (Math.max(6, accroche.length) * 0.58))),
            whiteSpace: "nowrap",
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: -4,
            color: COULEURS.vertClair,
            textShadow: "0 8px 40px rgba(0,0,0,0.8)",
          }}
        >
          {accroche}
        </div>
        {soutien ? (
          <div
            style={{
              marginTop: 22,
              fontSize: 44,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.15,
            }}
          >
            {soutien}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 40,
            display: "inline-block",
            alignSelf: "flex-start",
            background: COULEURS.vert,
            color: "#04150d",
            padding: "10px 22px",
            borderRadius: 10,
            fontSize: 34,
            fontWeight: 800,
          }}
        >
          creatis.app
        </div>
      </div>

      {/* ── Le clip, à droite, légèrement incliné ── */}
      {clip ? (
        <div
          style={{
            position: "absolute",
            right: 92,
            top: 48,
            width: 352,
            height: 626,
            borderRadius: 22,
            overflow: "hidden",
            transform: "rotate(4deg)",
            border: `4px solid ${COULEURS.vert}`,
            boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
          }}
        >
          <Video
            src={staticFile(clip)}
            trimBefore={Math.round(clipA * 30)}
            style={{ width: "100%", height: "100%" }}
            objectFit="cover"
            muted
          />
          {note ? (
            <div
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                background: COULEURS.vert,
                color: "#04150d",
                padding: "8px 18px",
                borderRadius: 10,
                fontSize: 40,
                fontWeight: 800,
              }}
            >
              {note}
            </div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
