import { Fragment } from "react";
import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { POLICE } from "./police";

/**
 * SE FAIRE RÉMUNÉRER EN CLIPPING — 1920×1080, 126 s.
 *
 * ── CE QUE CE FILM FAIT, ET QUE LES NEUF PRÉCÉDENTS NE FAISAIENT PAS ─────
 * Il APPREND un métier au lieu de commenter nos propres statistiques. La
 * demande du 08/10 : montrer comment on se fait payer en clipping, avec des
 * enregistrements d'écran — Whop, le site, le rendu — comme si on présentait
 * sur son ordinateur.
 *
 * Le titre reprend une requête relevée dans les suggestions YouTube :
 * « gagner de l'argent avec le clipping ». Les neuf vidéos précédentes avaient
 * des titres-affirmations et un taux de clic de zéro virgule cinq pour cent.
 *
 * ── D'OÙ VIENNENT LES CHIFFRES ───────────────────────────────────────────
 * · « 4,6 milliards $ versés » : lu à l'écran sur whop.com le 08/10, et le
 *   plan le montre — ce n'est pas une incrustation.
 * · Fourchette 0,20 $ à 6 $ pour mille vues, moyenne ~1 $ : relevé public des
 *   campagnes Content Rewards (openclip.app, findclout.com, 2026).
 * · Roobet 1,50 $/1000 avec 250 000 $ de budget, Mutuum 6 $/1000 : exemples
 *   nommés dans ces mêmes relevés.
 * · 1 207 vues : notre Short du 07/10, mesuré sur la chaîne.
 *
 * Les campagnes elles-mêmes vivent derrière un compte Whop. On ne les met
 * donc PAS en scène comme une capture : les chiffres sont affichés et
 * attribués. Filmer une interface qu'on n'a pas ouverte serait une
 * démonstration fabriquée, et c'est précisément ce qu'on reproche aux autres.
 *
 * ── LES BORNES ───────────────────────────────────────────────────────────
 * `silencedetect` sur narration-clipping.mp3 (124,3 s). Jamais estimées.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";
const OR = "#fbbf24";

const S = {
  modele: [0, 10.9],
  whop: [10.9, 27.3],
  tarifs: [27.3, 40.0],
  arithmetique: [40.0, 54.8],
  volume: [54.8, 66.8],
  etapes1: [66.8, 76.3],
  etapes2: [76.3, 89.6],
  outil: [89.6, 106.0],
  autonomie: [106.0, 117.6],
  cesoir: [117.6, 124.3],
} as const;

export const DUREE_CLIPPING = Math.round(126 * 30);

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

/**
 * Un enregistrement d'écran présenté comme un écran : cadre arrondi, filet
 * clair, ombre portée. Sans ce cadre, une capture plein écran se confond avec
 * le film lui-même et on ne sait plus ce qu'on regarde.
 */
const Ecran: React.FC<{
  source: string;
  depart: number;
  largeur: number;
  legende?: string;
}> = ({ source, depart, largeur, legende }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = entree(frame, fps, 0.1);
  const hauteur = Math.round((largeur * 9) / 16);
  return (
    <div style={{ opacity: v, transform: `scale(${interpolate(v, [0, 1], [0.97, 1])})` }}>
      <div
        style={{
          width: largeur,
          height: hauteur,
          borderRadius: 16,
          overflow: "hidden",
          border: "3px solid rgba(255,255,255,0.22)",
          boxShadow: "0 26px 70px rgba(0,0,0,0.75)",
          background: "#000",
        }}
      >
        <Video
          src={staticFile(source)}
          trimBefore={Math.round(depart * 30)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </div>
      {legende ? (
        <div style={{ fontSize: 30, color: "rgba(255,255,255,0.62)", marginTop: 14, fontWeight: 700 }}>
          {legende}
        </div>
      ) : null}
    </div>
  );
};

/** Une ligne d'étape numérotée, qui apparaît à son tour. */
const Etape: React.FC<{ n: number; titre: string; detail?: string; retard: number }> = ({
  n,
  titre,
  detail,
  retard,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = entree(frame, fps, retard);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 24,
        marginTop: 26,
        opacity: v,
        transform: `translateX(${interpolate(v, [0, 1], [-22, 0])}px)`,
      }}
    >
      <span
        style={{
          minWidth: 58, height: 58, borderRadius: 14, background: VERT, color: "#06120d",
          fontSize: 34, fontWeight: 900, display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
        }}
      >
        {n}
      </span>
      <div>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{titre}</div>
        {detail ? (
          <div style={{ fontSize: 32, color: "rgba(255,255,255,0.64)", marginTop: 6, lineHeight: 1.3 }}>
            {detail}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const Clipping: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (retard: number) => entree(frame, fps, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      {/* ── 1. LE MODÈLE, en trois cases ─────────────────────────────────── */}
      <Scene bornes={S.modele}>
        <AbsoluteFill style={{ padding: "100px 120px", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 76, fontWeight: 900, color: "#fff", letterSpacing: -3,
              lineHeight: 1.1, opacity: e(0.1),
            }}
          >
            Des marques paient pour que tu
            <br />
            découpes leurs vidéos.
          </div>
          <div style={{ display: "flex", gap: 30, alignItems: "center", marginTop: 54 }}>
            {[
              { t: "La marque", d: "dépose un budget", r: 2.0 },
              { t: "Toi", d: "publies un clip", r: 3.4 },
              { t: "Les vues", d: "déclenchent le paiement", r: 4.8 },
            ].map((c, k) => (
              <Fragment key={c.t}>
                {k > 0 ? (
                  <span style={{ fontSize: 54, color: VERT, opacity: e(2.0 + k * 1.4) }}>→</span>
                ) : null}
                <div
                  style={{
                    flex: 1, padding: "30px 34px", borderRadius: 20,
                    border: `3px solid ${k === 2 ? VERT : "rgba(255,255,255,0.18)"}`,
                    opacity: e(c.r),
                  }}
                >
                  <div style={{ fontSize: 42, fontWeight: 900, color: k === 2 ? VERT : "#fff" }}>
                    {c.t}
                  </div>
                  <div style={{ fontSize: 30, color: "rgba(255,255,255,0.64)", marginTop: 8 }}>
                    {c.d}
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
          <div style={{ fontSize: 40, color: OR, fontWeight: 800, marginTop: 40, opacity: e(7.4) }}>
            Pas au contrat, pas au forfait. Aux vues.
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 2. WHOP, FILMÉ : le chiffre est à l'écran, pas incrusté ──────── */}
      <Scene bornes={S.whop}>
        <AbsoluteFill
          style={{ padding: "70px 100px", flexDirection: "row", gap: 60, alignItems: "center" }}
        >
          <Ecran source="whop-h264.mp4" depart={0} largeur={1040} legende="whop.com — filmé le 8 octobre 2026" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 54, fontWeight: 900, color: "#fff", letterSpacing: -2, opacity: e(0.3) }}>
              La place de marché
              <br />
              s&apos;appelle Whop.
            </div>
            <div style={{ fontSize: 34, color: "rgba(255,255,255,0.74)", marginTop: 26, lineHeight: 1.35, opacity: e(4.0) }}>
              Une marque ouvre une campagne, dépose un budget, fixe un tarif pour mille vues et écrit ses règles.
            </div>
            <div
              style={{
                marginTop: 30, padding: "22px 26px", borderRadius: 16,
                background: "rgba(16,185,129,0.14)", border: `3px solid ${VERT}`,
                opacity: e(9.0),
              }}
            >
              <div style={{ fontSize: 38, fontWeight: 900, color: VERT }}>
                Pas de minimum d&apos;abonnés
              </div>
              <div style={{ fontSize: 30, color: "rgba(255,255,255,0.72)", marginTop: 6 }}>
                c&apos;est la vue qui paie, pas ton compte
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 3. LES TARIFS RÉELS ──────────────────────────────────────────── */}
      <Scene bornes={S.tarifs}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1, opacity: e(0.1) }}>
            CE QUE PAIENT LES CAMPAGNES, POUR MILLE VUES
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 30, marginTop: 28, opacity: e(0.7) }}>
            <span style={{ fontSize: 130, fontWeight: 900, color: "#fff", letterSpacing: -6 }}>0,20 $</span>
            <span style={{ fontSize: 60, color: "rgba(255,255,255,0.5)" }}>→</span>
            <span style={{ fontSize: 130, fontWeight: 900, color: VERT, letterSpacing: -6 }}>6 $</span>
            <span style={{ fontSize: 40, color: OR, fontWeight: 800 }}>moyenne ≈ 1 $</span>
          </div>
          <div style={{ display: "flex", gap: 40, marginTop: 50 }}>
            {[
              { n: "Roobet", v: "1,50 $", d: "budget 250 000 $", r: 4.6 },
              { n: "Mutuum", v: "6 $", d: "le haut de la fourchette", r: 7.2 },
            ].map((c) => (
              <div
                key={c.n}
                style={{
                  flex: 1, padding: "28px 34px", borderRadius: 18,
                  border: "3px solid rgba(255,255,255,0.18)", opacity: e(c.r),
                }}
              >
                <div style={{ fontSize: 34, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{c.n}</div>
                <div style={{ fontSize: 74, fontWeight: 900, color: VERT, letterSpacing: -3, marginTop: 4 }}>
                  {c.v}
                </div>
                <div style={{ fontSize: 30, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{c.d}</div>
              </div>
            ))}
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 4. L'ARITHMÉTIQUE, SANS L'ADOUCIR ────────────────────────────── */}
      <Scene bornes={S.arithmetique}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: ROUGE, letterSpacing: 1, opacity: e(0.1) }}>
            L&apos;ARITHMÉTIQUE, ET ELLE EST SÉVÈRE
          </div>
          <div style={{ display: "flex", gap: 70, marginTop: 36, alignItems: "flex-end" }}>
            <div style={{ opacity: e(0.8) }}>
              <div style={{ fontSize: 104, fontWeight: 900, color: "#fff", letterSpacing: -5, lineHeight: 1 }}>
                1 000 000
              </div>
              <div style={{ fontSize: 34, color: "rgba(255,255,255,0.64)", marginTop: 8 }}>vues</div>
            </div>
            <span style={{ fontSize: 70, color: VERT, fontWeight: 900, opacity: e(3.0) }}>=</span>
            <div style={{ opacity: e(3.4) }}>
              <div style={{ fontSize: 104, fontWeight: 900, color: VERT, letterSpacing: -5, lineHeight: 1 }}>
                1 000 $
              </div>
              <div style={{ fontSize: 34, color: "rgba(255,255,255,0.64)", marginTop: 8 }}>à un dollar les mille</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 48, padding: "26px 32px", borderRadius: 18,
              border: `3px solid ${ROUGE}`, opacity: e(7.6),
            }}
          >
            <div style={{ fontSize: 40, color: "#fff", fontWeight: 800 }}>
              Mon meilleur Short de la semaine : <span style={{ color: ROUGE }}>1 207 vues</span>.
            </div>
            <div style={{ fontSize: 44, color: ROUGE, fontWeight: 900, marginTop: 8 }}>
              Soit 1,20 $.
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      {/* ── 5. LE VRAI MÉTIER : LE VOLUME ────────────────────────────────── */}
      <Scene bornes={S.volume}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 68, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1.12, opacity: e(0.1) }}>
            Le métier n&apos;est pas de réussir un clip viral.
          </div>
          <div style={{ fontSize: 60, fontWeight: 900, color: VERT, marginTop: 14, opacity: e(2.4) }}>
            Le métier, c&apos;est le volume.
          </div>
          <div style={{ display: "flex", gap: 26, alignItems: "center", marginTop: 46, opacity: e(5.2) }}>
            {[
              ["30", "clips / semaine"],
              ["×", ""],
              ["5 000", "vues chacun"],
              ["=", ""],
              ["150 000", "vues"],
              ["=", ""],
              ["150 $", ""],
            ].map(([a, b], k) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: a.length > 3 ? 64 : 72, fontWeight: 900, letterSpacing: -3,
                    color: k === 6 ? VERT : "#fff",
                  }}
                >
                  {a}
                </div>
                {b ? (
                  <div style={{ fontSize: 26, color: "rgba(255,255,255,0.58)", marginTop: 4 }}>{b}</div>
                ) : null}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 40, color: OR, fontWeight: 800, marginTop: 44, opacity: e(9.0) }}>
            C&apos;est répétable. Un clip viral ne l&apos;est pas.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.etapes1}>
        <AbsoluteFill style={{ padding: "90px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: VERT, letterSpacing: 2, opacity: e(0.1) }}>
            LES ÉTAPES, DANS L&apos;ORDRE
          </div>
          <Etape n={1} titre="Crée ton compte" retard={0.8} />
          <Etape n={2} titre="Relie tes comptes de publication" retard={2.4} />
          <Etape
            n={3}
            titre="Choisis une campagne"
            detail="Regarde le budget restant, pas seulement le tarif — une campagne presque vide ne te paiera pas."
            retard={4.2}
          />
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.etapes2}>
        <AbsoluteFill style={{ padding: "90px 130px", justifyContent: "center" }}>
          <Etape
            n={4}
            titre="Lis les règles"
            detail="Elles disent quelle source tu as le droit d'utiliser, et ce qui est interdit."
            retard={0.4}
          />
          <Etape n={5} titre="Publie, puis soumets le lien tout de suite" retard={3.6} />
          <Etape
            n={6}
            titre="Capture tes statistiques"
            detail="À 24 h, 72 h et 7 jours. C'est ta preuve si la vérification coince."
            retard={6.4}
          />
        </AbsoluteFill>
      </Scene>

      {/* ── 8. L'OUTIL, FILMÉ EN VRAI, EN TROIS TEMPS ───────────────────────
          L'enregistrement complet dure 3 min 57 : l'analyse en occupe plus de
          deux minutes et demie. On ne montre pas l'attente — mais on ne la
          masque pas non plus : les trois plans sont étiquetés, et le dernier
          est le CLIP FINI qui tourne, pas l'écran de téléchargement. */}
      {[
        { b: [S.outil[0], 94.6] as const, f: "tuto-lien-h264.mp4", l: "1 — on colle le lien d'une vidéo longue" },
        { b: [94.6, 100.6] as const, f: "tuto-grille-h264.mp4", l: "2 — dix passages trouvés et notés" },
        { b: [100.6, S.outil[1]] as const, f: "tuto-clip-h264.mp4", l: "3 — le clip fini, recadré et sous-titré" },
      ].map((p, k) => (
        <Scene key={p.f} bornes={p.b}>
          <AbsoluteFill style={{ padding: "54px 90px", justifyContent: "center", alignItems: "center" }}>
            {k === 0 ? (
              <div
                style={{
                  fontSize: 44, fontWeight: 900, color: "#fff", letterSpacing: -1.5,
                  marginBottom: 20, textAlign: "center",
                }}
              >
                Trente clips par semaine à la main,{" "}
                <span style={{ color: ROUGE }}>c&apos;est trente soirées de montage.</span>
              </div>
            ) : null}
            <Ecran source={p.f} depart={0} largeur={1180} legende={`creatis.app · ${p.l}`} />
          </AbsoluteFill>
        </Scene>
      ))}

      {/* ── 9. LE CRITÈRE QUI DÉCIDE ─────────────────────────────────────── */}
      <Scene bornes={S.autonomie}>
        <AbsoluteFill style={{ padding: "100px 130px", justifyContent: "center" }}>
          <div style={{ fontSize: 62, fontWeight: 900, color: "#fff", letterSpacing: -2, lineHeight: 1.14, opacity: e(0.1) }}>
            Un clip doit se comprendre
            <br />
            <span style={{ color: VERT }}>sans la vidéo dont il sort.</span>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
            {[
              "Pas de pronom sans antécédent",
              "Pas de prénom jamais présenté",
              "Pas de réponse sans sa question",
            ].map((t, k) => (
              <div
                key={t}
                style={{
                  flex: 1, padding: "22px 26px", borderRadius: 16,
                  border: `3px solid ${ROUGE}`, fontSize: 32, fontWeight: 800,
                  color: "rgba(255,255,255,0.88)", lineHeight: 1.25, opacity: e(2.4 + k * 0.9),
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 40, color: OR, fontWeight: 800, marginTop: 40, opacity: e(6.4) }}>
            S&apos;il demande le contexte, il ne fera pas de vues — donc il ne te paiera pas.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.cesoir}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: VERT, letterSpacing: 2, opacity: e(0.1) }}>
            CE SOIR
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1.14, marginTop: 18, opacity: e(0.6) }}>
            Ouvre une campagne, lis ses règles,
            <br />
            et produis dix clips sur sa source.
          </div>
          <div style={{ fontSize: 58, fontWeight: 900, color: ROUGE, marginTop: 26, opacity: e(3.4) }}>
            Pas un. Dix.
          </div>
        </AbsoluteFill>
      </Scene>

      <Audio src={staticFile("voix/narration-clipping.mp3")} />
    </AbsoluteFill>
  );
};
