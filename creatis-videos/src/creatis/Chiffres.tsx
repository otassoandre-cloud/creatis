import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";
import { COULEURS } from "./theme";

/**
 * CHIFFRES — 1080x1920, MUET (son tendance posé à la publication).
 *
 * ── CE QUE CE FORMAT CORRIGE ─────────────────────────────────────────────
 * Tout ce qui a été publié jusqu'ici parlait du PRODUIT, même déguisé en
 * leçon : « un bon clip se comprend sans la vidéo », « tu as trois secondes ».
 * Des affirmations, invérifiables, suivies d'une adresse. Personne ne regarde
 * une publicité, même bien faite — et les chiffres le disaient : 54 à 99 vues
 * contre 350 à 860 pour ce que le compte produisait avant.
 *
 * Celui-ci ne vend rien. Il PARTAGE UNE MESURE qu'on est seul à avoir, prise
 * sur nos propres publications, et dont le spectateur peut se servir le soir
 * même sur son compte à lui. C'est la seule chose qu'on puisse offrir qu'il ne
 * trouve pas ailleurs.
 *
 * ── LA RÈGLE DE CE GABARIT ───────────────────────────────────────────────
 * Aucune mention du produit avant la toute dernière image, et encore : une
 * signature, pas un appel à l'action. Si la leçon ne tient pas debout sans
 * l'outil, c'est qu'elle n'en est pas une.
 *
 * ── POURQUOI DEUX BARRES ET PAS UN TEXTE ─────────────────────────────────
 * « 302 contre 494 » lu dans une phrase ne se retient pas. Dessiné, l'écart
 * se voit avant d'être lu — et c'est l'écart qui est l'information, pas les
 * nombres eux-mêmes. Les barres montent l'une après l'autre, jamais ensemble :
 * la seconde doit dépasser la première SOUS LES YEUX du spectateur.
 *
 * ── ZONES SÛRES 1080x1920 ────────────────────────────────────────────────
 *   0 -> 16 %    barre d'état et onglets
 *   16 -> 78 %   zone libre
 *   > 78 %       légende, pseudo, bandeau musical
 */

const FPS = 30;
export const DUREE_CHIFFRES = 17 * FPS; // 510 images

export type ReglageChiffres = {
  /** L'accroche : le chiffre qui légitime le propos. */
  accroche: string;
  accrocheSous: string;
  /** Les deux mesures qu'on compare. */
  gauche: { libelle: string; valeur: number; sous: string };
  droite: { libelle: string; valeur: number; sous: string };
  /** L'écart, formulé. */
  ecart: string;
  /** La leçon, en impératif. C'est ce que le spectateur emporte. */
  lecon: string;
};

export const CHIFFRES_DEFAUT: ReglageChiffres = {
  accroche: "45 vidéos",
  accrocheSous: "publiées. Voilà ce que les chiffres disent.",
  gauche: { libelle: "Légende qui VEND", valeur: 302, sous: "8 publications" },
  droite: { libelle: "Légende qui ne vend pas", valeur: 494, sous: "37 publications" },
  ecart: "63 % d'écart",
  lecon: "N'écris pas ta légende comme une pub.",
};

/** Les temps, en secondes. */
const T = {
  accroche: 0.2,
  barres: 3.6,
  droite: 6.4,
  ecart: 9.2,
  lecon: 11.8,
  signature: 15.2,
};

const ressort = (frame: number, fps: number, retard = 0) =>
  spring({ frame: frame - retard, fps, config: { damping: 26, stiffness: 140, mass: 0.7 } });

const fenetre = (s: number, a: number, b: number, f = 0.3) =>
  interpolate(s, [a, a + f, b - f, b], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const Chiffres: React.FC<{ reglage?: ReglageChiffres }> = ({
  reglage = CHIFFRES_DEFAUT,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = frame / fps;

  const max = Math.max(reglage.gauche.valeur, reglage.droite.valeur);
  const hautMax = height * 0.34;

  /* Chaque barre monte sur 1,1 s, et la seconde part presque trois secondes
     après la première : l'écart doit se creuser sous les yeux, pas apparaître
     tout fait. */
  const monte = (depart: number, valeur: number) =>
    interpolate(s, [depart, depart + 1.1], [0, (valeur / max) * hautMax], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const compte = (depart: number, valeur: number) =>
    Math.round(
      interpolate(s, [depart, depart + 1.1], [0, valeur], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      }),
    );

  const hG = monte(T.barres, reglage.gauche.valeur);
  const hD = monte(T.droite, reglage.droite.valeur);
  const larg = width * 0.3;
  const base = height * 0.68;

  const aAccroche = ressort(frame, fps, T.accroche * fps);
  const aEcart = ressort(frame, fps, T.ecart * fps);
  const aLecon = ressort(frame, fps, T.lecon * fps);
  const aSign = ressort(frame, fps, T.signature * fps);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 50% 10%, #101f18 0%, ${COULEURS.fond} 60%)`,
        fontFamily: POLICE,
        color: "#fff",
      }}
    >
      {/* ── L'accroche : le chiffre qui donne le droit de parler ── */}
      <div
        style={{
          position: "absolute",
          top: height * 0.17,
          left: 80,
          right: 80,
          textAlign: "center",
          opacity: Math.min(aAccroche, fenetre(s, T.accroche, T.lecon)),
          transform: `translateY(${interpolate(aAccroche, [0, 1], [20, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 118, fontWeight: 800, color: COULEURS.vertClair, letterSpacing: -3 }}>
          {reglage.accroche}
        </div>
        <div style={{ marginTop: 10, fontSize: 46, fontWeight: 600, color: COULEURS.texteDoux, lineHeight: 1.2 }}>
          {reglage.accrocheSous}
        </div>
      </div>

      {/* ── Les deux barres ── */}
      {s >= T.barres - 0.2 && s < T.lecon ? (
        <div style={{ opacity: fenetre(s, T.barres - 0.2, T.lecon) }}>
          {[
            { c: reglage.gauche, h: hG, x: width * 0.5 - larg - 24, depart: T.barres, vert: false },
            { c: reglage.droite, h: hD, x: width * 0.5 + 24, depart: T.droite, vert: true },
          ].map((b) => (
            <div key={b.c.libelle}>
              {/* La valeur, au-dessus de la barre, qui monte avec elle */}
              <div
                style={{
                  position: "absolute",
                  left: b.x,
                  width: larg,
                  top: base - b.h - 96,
                  textAlign: "center",
                  fontSize: 76,
                  fontWeight: 800,
                  color: b.vert ? COULEURS.vertClair : "#fff",
                }}
              >
                {compte(b.depart, b.c.valeur)}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: b.x,
                  width: larg,
                  height: b.h,
                  top: base - b.h,
                  borderRadius: "14px 14px 0 0",
                  background: b.vert
                    ? `linear-gradient(180deg, ${COULEURS.vert}, ${COULEURS.vertSombre})`
                    : "linear-gradient(180deg, #3a4550, #222a31)",
                  boxShadow: b.vert ? "0 0 50px rgba(16,185,129,0.3)" : "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: b.x - 10,
                  width: larg + 20,
                  top: base + 18,
                  textAlign: "center",
                  fontSize: 34,
                  fontWeight: 700,
                  color: b.vert ? "#fff" : COULEURS.texteDoux,
                  lineHeight: 1.15,
                }}
              >
                {b.c.libelle}
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 600, color: COULEURS.texteDoux }}>
                  {b.c.sous}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── L'écart, nommé ── */}
      <div
        style={{
          position: "absolute",
          top: height * 0.75,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: Math.min(aEcart, fenetre(s, T.ecart, T.lecon)),
          transform: `scale(${interpolate(aEcart, [0, 1], [0.86, 1])})`,
          fontSize: 82,
          fontWeight: 800,
          color: COULEURS.vertClair,
        }}
      >
        {reglage.ecart}
      </div>

      {/* ── La leçon, seule à l'écran ── */}
      {s >= T.lecon - 0.2 ? (
        <AbsoluteFill style={{ background: COULEURS.fond, opacity: Math.min(1, aLecon * 1.4) }}>
          <div
            style={{
              position: "absolute",
              top: height * 0.36,
              left: 80,
              right: 80,
              textAlign: "center",
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: -2,
              opacity: aLecon,
              transform: `translateY(${interpolate(aLecon, [0, 1], [26, 0])}px)`,
            }}
          >
            {reglage.lecon}
          </div>

          {/* La signature, discrète et tardive. Pas d'appel à l'action : si la
              leçon ne tient pas debout sans l'outil, ce n'en est pas une. */}
          <div
            style={{
              position: "absolute",
              top: height * 0.62,
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: aSign * 0.65,
              fontSize: 36,
              fontWeight: 600,
              color: COULEURS.texteDoux,
            }}
          >
            mesuré sur mon compte · creatis.app
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
