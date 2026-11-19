import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Barres, CarteClip } from "./Illustrations";
import { POLICE } from "./police";

/**
 * POURQUOI TES SHORTS FONT ZÉRO VUE — 1920×1080, 114 s.
 *
 * ── CE FILM EXISTE PARCE QUE LES NEUF PRÉCÉDENTS ONT ÉCHOUÉ ──────────────
 * Mesure du 08/10, en Mode avancé de Studio (l'onglet Couverture s'affiche
 * VIDE sur ces vidéos, il a fallu cliquer « Mode avancé ») :
 *
 *     1 537 impressions · 0,5 % de clics · 14 vues
 *     1 100 impressions · 0,6 % de clics · 31 vues
 *       396 impressions · 0,8 % de clics ·  6 vues
 *     … puis 11, 10, 5, 2 impressions sur les dernières.
 *
 * YouTube MONTRAIT les vidéos. Personne ne cliquait. Sous 2 % de clics la
 * distribution se coupe, d'où l'effondrement — une spirale, pas un plafond.
 *
 * Deux conclusions, contre ce que je croyais :
 *  · les quatre miniatures refaites n'ont jamais été testées, elles sont
 *    arrivées sur des vidéos déjà tombées à 5-11 impressions ;
 *  · nos titres n'étaient pas des REQUÊTES. Le seul qui en était une
 *    (« Transformer une vidéo YouTube en Short ») a reçu le plus
 *    d'impressions de toute la chaîne.
 *
 * Ce film vise donc une requête relevée dans les suggestions YouTube —
 * « pourquoi mes shorts font 0 vues » — et y répond vraiment.
 *
 * ── POURQUOI UN RAIL PERSISTANT ──────────────────────────────────────────
 * Les bornes viennent du `silencedetect`, mais entre 27 s et 59 s la voix ne
 * respire pas assez pour découper au mot près. Plutôt que de deviner une
 * borne — et de couper une phrase en deux, ce qui s'entend —, les trois
 * causes restent affichées en colonne et c'est la SURBRILLANCE qui change.
 * Une dérive de deux secondes devient alors invisible.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";

const S = {
  intro: [0, 8.0],
  chiffres: [8.0, 20.5],
  annonce: [20.5, 27.2],
  cause1: [27.2, 46.5],
  cause2: [46.5, 63.9],
  test: [63.9, 71.3],
  cause3: [71.3, 86.5],
  plateformes: [86.5, 101.3],
  cesoir: [101.3, 112.1],
} as const;

export const DUREE_ZERO = Math.round(114 * 30);

const CADRE: [number, number, number, number] = [150, 300, 540, 980];

const CAUSES = [
  "Ta vidéo parle de toi",
  "Le passage ne tient pas seul",
  "C'est trop long",
];

const entree = (frame: number, fps: number, retard: number) =>
  spring({
    frame: frame - Math.round(retard * fps),
    fps,
    config: { damping: 200 },
    durationInFrames: 14,
  });

const Scene: React.FC<{ bornes: readonly [number, number]; children: React.ReactNode }> = ({
  bornes,
  children,
}) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence
      from={Math.round(bornes[0] * fps)}
      durationInFrames={Math.round((bornes[1] - bornes[0]) * fps)}
      layout="none"
    >
      {children}
    </Sequence>
  );
};

/** La colonne des trois causes. `active` vaut -1 avant qu'on en parle. */
const Rail: React.FC<{ active: number }> = ({ active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ width: 470, display: "flex", flexDirection: "column", gap: 22 }}>
      {CAUSES.map((c, k) => {
        const vif = k === active;
        return (
          <div
            key={c}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "20px 24px",
              borderRadius: 16,
              background: vif ? "rgba(16,185,129,0.14)" : "transparent",
              border: `3px solid ${vif ? VERT : "rgba(255,255,255,0.12)"}`,
              opacity: interpolate(entree(frame, fps, 0.1 + k * 0.22), [0, 1], [0, vif ? 1 : 0.42]),
            }}
          >
            <span
              style={{
                fontSize: 44,
                fontWeight: 900,
                color: vif ? VERT : "rgba(255,255,255,0.45)",
                minWidth: 36,
              }}
            >
              {k + 1}
            </span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: vif ? "#fff" : "rgba(255,255,255,0.55)",
                lineHeight: 1.2,
              }}
            >
              {c}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Gabarit « rail à gauche, démonstration à droite ». */
const AvecRail: React.FC<{ active: number; children: React.ReactNode }> = ({
  active,
  children,
}) => (
  <AbsoluteFill
    style={{ padding: "90px 110px", flexDirection: "row", gap: 70, alignItems: "center" }}
  >
    <Rail active={active} />
    <div style={{ flex: 1 }}>{children}</div>
  </AbsoluteFill>
);

export const ZeroVues: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (retard: number) => entree(frame, fps, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      {/* ── LA QUESTION, telle qu'on la tape ─────────────────────────────── */}
      <Scene bornes={S.intro}>
        <AbsoluteFill style={{ padding: 150, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: -4,
              lineHeight: 1.08,
              opacity: e(0.1),
            }}
          >
            Pourquoi tes Shorts
            <br />
            font <span style={{ color: ROUGE }}>zéro vue</span>
          </div>
          <div
            style={{
              fontSize: 48,
              color: VERT,
              fontWeight: 800,
              marginTop: 34,
              opacity: e(2.6),
            }}
          >
            Trois causes, mesurées cette semaine sur ma chaîne.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LA PREUVE AVANT TOUT LE RESTE ────────────────────────────────── */}
      <Scene bornes={S.chiffres}>
        <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 1,
              marginBottom: 34,
            }}
          >
            MÊME CHAÎNE, MÊME OUTIL, MÊME SUJET — SEPT JOURS D'ÉCART
          </div>
          <Barres
            debut={0.4}
            valeurs={[
              { etiquette: "Ma vidéo la plus travaillée", valeur: 48, mauvais: true },
              { etiquette: "Sept jours plus tard", valeur: 1207 },
            ]}
          />
          <div
            style={{
              fontSize: 44,
              color: "rgba(255,255,255,0.82)",
              marginTop: 44,
              opacity: e(8.4),
            }}
          >
            Rien n&apos;a changé dans la production.{" "}
            <span style={{ color: VERT, fontWeight: 800 }}>Trois choses ont changé dans le contenu.</span>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── LES TROIS CAUSES ANNONCÉES ───────────────────────────────────── */}
      <Scene bornes={S.annonce}>
        <AbsoluteFill style={{ padding: "90px 110px", justifyContent: "center", alignItems: "center" }}>
          <Rail active={-1} />
        </AbsoluteFill>
      </Scene>

      {/* ── CAUSE 1 : le produit contre le spectateur ─────────────────────── */}
      <Scene bornes={S.cause1}>
        <AvecRail active={0}>
          <div style={{ display: "flex", gap: 54, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 46, color: "rgba(255,255,255,0.84)", lineHeight: 1.35, opacity: e(0.2) }}>
                Je montrais un logiciel, une interface, un bouton qu&apos;on clique.
              </div>
              <div style={{ fontSize: 118, fontWeight: 900, color: ROUGE, letterSpacing: -6, marginTop: 20, opacity: e(3.0) }}>
                48 vues
              </div>
              <div style={{ fontSize: 44, color: "#fff", lineHeight: 1.35, marginTop: 34, opacity: e(7.0) }}>
                Personne ne se lève le matin en voulant voir une interface.
                <br />
                <span style={{ color: VERT, fontWeight: 800 }}>
                  Celui qui fait défiler a un problème à lui.
                </span>
              </div>
              <div style={{ fontSize: 100, fontWeight: 900, color: VERT, letterSpacing: -5, marginTop: 22, opacity: e(13.0) }}>
                1 207 vues
              </div>
            </div>
            <CarteClip source="rec-croce-h264.mp4" rec={239.2} cadre={CADRE} largeur={330} hauteur={587} />
          </div>
        </AvecRail>
      </Scene>

      {/* ── CAUSE 2 : les trois fautes, montrées comme on les entend ──────── */}
      <Scene bornes={S.cause2}>
        <AvecRail active={1}>
          <div style={{ fontSize: 46, color: "#fff", fontWeight: 800, opacity: e(0.2) }}>
            Celui qui tombe dessus n&apos;a rien vu avant.
          </div>
          {[
            { r: "« Il m'a dit que… »", p: "Qui, il ? On ne le saura jamais.", d: 4.6 },
            { r: "« Et là Jordan se retourne… »", p: "Toi tu connais la personne, lui non.", d: 9.2 },
            { r: "« Ouais, carrément… »", p: "Une réponse, et personne ne sait sur quoi.", d: 12.6 },
          ].map((f) => (
            <div key={f.r} style={{ marginTop: 26, opacity: e(f.d) }}>
              <span style={{ fontSize: 46, fontWeight: 900, color: ROUGE }}>{f.r}</span>
              <span style={{ fontSize: 38, color: "rgba(255,255,255,0.72)", marginLeft: 18 }}>
                {f.p}
              </span>
            </div>
          ))}
        </AvecRail>
      </Scene>

      {/* ── LE TEST ──────────────────────────────────────────────────────── */}
      <Scene bornes={S.test}>
        <AbsoluteFill
          style={{ padding: "80px 120px", flexDirection: "row", gap: 70, alignItems: "center" }}
        >
          <CarteClip source="rec-domingo-h264.mp4" rec={758} cadre={CADRE} largeur={370} hauteur={658} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: VERT, letterSpacing: 2, opacity: e(0.15) }}>
              LE TEST — DIX SECONDES
            </div>
            <div
              style={{
                fontSize: 62,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.18,
                letterSpacing: -2,
                marginTop: 22,
                opacity: e(0.6),
              }}
            >
              Montre le passage à quelqu&apos;un
              <br />
              qui n&apos;a pas vu la vidéo.
            </div>
            <div style={{ fontSize: 50, fontWeight: 900, color: ROUGE, marginTop: 34, opacity: e(4.2) }}>
              S&apos;il demande le contexte, garde-le.
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── CAUSE 3 : la rétention mesurée ───────────────────────────────── */}
      <Scene bornes={S.cause3}>
        <AvecRail active={2}>
          <div style={{ fontSize: 42, color: "rgba(255,255,255,0.76)", opacity: e(0.2) }}>
            Rétention relevée sur toute la chaîne
          </div>
          <div style={{ display: "flex", gap: 70, marginTop: 28, alignItems: "flex-end" }}>
            <div style={{ opacity: e(1.6) }}>
              <div style={{ fontSize: 124, fontWeight: 900, color: "#fff", letterSpacing: -6, lineHeight: 0.95 }}>
                55 %
              </div>
              <div style={{ fontSize: 34, color: "rgba(255,255,255,0.68)", fontWeight: 700, marginTop: 8 }}>
                médiane regardée
              </div>
            </div>
            <div style={{ opacity: e(5.2) }}>
              <div style={{ fontSize: 124, fontWeight: 900, color: VERT, letterSpacing: -6, lineHeight: 0.95 }}>
                13 s
              </div>
              <div style={{ fontSize: 34, color: "rgba(255,255,255,0.68)", fontWeight: 700, marginTop: 8 }}>
                la seule vue à 100 %
              </div>
            </div>
          </div>
          <div style={{ fontSize: 44, color: "#fff", lineHeight: 1.35, marginTop: 40, opacity: e(9.6) }}>
            Une vidéo courte n&apos;est pas une histoire, c&apos;est une vitrine.
            <br />
            <span style={{ color: VERT, fontWeight: 800 }}>
              Si elle a besoin de respirer, elle est déjà trop longue.
            </span>
          </div>
        </AvecRail>
      </Scene>

      {/* ── L'AVERTISSEMENT QUE PERSONNE NE DONNE ────────────────────────── */}
      <Scene bornes={S.plateformes}>
        <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1, opacity: e(0.1) }}>
            LE MÊME CONTENU, LE MÊME JOUR
          </div>
          <div style={{ display: "flex", gap: 80, marginTop: 40 }}>
            {[
              { t: "Un réseau qui plafonne", v: "240 → 260", s: "quoi que je poste", bon: false, r: 1.6 },
              { t: "Un réseau qui réagit", v: "×5", s: "sur le même changement", bon: true, r: 5.4 },
            ].map((c) => (
              <div
                key={c.t}
                style={{
                  flex: 1,
                  padding: "36px 42px",
                  borderRadius: 22,
                  border: `4px solid ${c.bon ? VERT : "rgba(255,255,255,0.18)"}`,
                  opacity: e(c.r),
                }}
              >
                <div style={{ fontSize: 34, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{c.t}</div>
                <div
                  style={{
                    fontSize: 88,
                    fontWeight: 900,
                    letterSpacing: -4,
                    marginTop: 10,
                    color: c.bon ? VERT : ROUGE,
                  }}
                >
                  {c.v}
                </div>
                <div style={{ fontSize: 32, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>{c.s}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 44, color: "#fff", fontWeight: 800, marginTop: 44, opacity: e(10.2) }}>
            Ne juge jamais une modification sur un réseau qui plafonne.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── CE SOIR, DANS L'ORDRE ────────────────────────────────────────── */}
      <Scene bornes={S.cesoir}>
        <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: VERT, letterSpacing: 2, opacity: e(0.1) }}>
            CE SOIR, DANS L&apos;ORDRE
          </div>
          {[
            "Réécris ta première phrase : la situation de celui qui regarde.",
            "Fais le test des dix secondes sur ton passage.",
            "Coupe à treize secondes au lieu de trente.",
          ].map((t, k) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 22,
                marginTop: 26,
                opacity: e(1.0 + k * 1.9),
              }}
            >
              <span style={{ fontSize: 52, fontWeight: 900, color: ROUGE }}>{k + 1}</span>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{t}</span>
            </div>
          ))}
          <div style={{ fontSize: 42, color: "rgba(255,255,255,0.78)", marginTop: 44, opacity: e(7.6) }}>
            Trois gestes, pas un outil. Ils marchent avec le logiciel que tu utilises déjà.
          </div>
        </AbsoluteFill>
      </Scene>

      <Audio src={staticFile("voix/narration-zero-vues.mp3")} />

      {[
        { b: S.cause1, f: "son-clip-croce.mp3", d: 12.6 },
        { b: S.test, f: "son-clip-domingo.mp3", d: 9.5 },
      ].map((s) => (
        <Sequence
          key={s.f}
          from={Math.round(s.b[0] * fps)}
          durationInFrames={Math.round((s.b[1] - s.b[0]) * fps)}
          layout="none"
        >
          <Audio src={staticFile(s.f)} trimBefore={Math.round(s.d * fps)} volume={0.13} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
