import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Barres, CarteClip } from "./Illustrations";
import { POLICE } from "./police";

/**
 * LES QUATRE ERREURS — 1920×1080, format long du 07/10.
 *
 * ── D'OÙ VIENT LA GRILLE DES QUATRE ERREURS ──────────────────────────────
 * Des chapitres de « Personne ne veut de ton SaaS » (Leo Grindarss). Le script
 * intégral n'a pas pu être extrait — six approches, toutes en échec — mais la
 * structure suffisait, et elle décrivait exactement ce que je produisais.
 *
 * ── CE QUI REND CE FILM DIFFÉRENT D'UN RÉSUMÉ ────────────────────────────
 * Chaque erreur est prouvée par NOS chiffres, mesurés cette semaine :
 *     48 vues  la version qui montrait le produit
 *    361 vues  la version qui n'en montre rien, en 14 h
 *   4 900 vues cumulées → 12 clics → 0 inscription
 * Un résumé se contente de redire ; ici on paie de sa personne.
 *
 * Et il applique ses propres règles : aucune capture d'interface, les plans
 * illustratifs sont des clips finis.
 */

const VERT = "#10b981";
const FOND = "#0a0f0a";
const ROUGE = "#f87171";

/** Pauses relevées sur narration-quatre-erreurs.mp3 (77,3 s). */
const S = {
  constat: [0, 13.7],
  erreur1: [13.7, 27.4],
  erreur2: [27.4, 40.7],
  erreur3: [40.7, 50.2],
  erreur4: [50.2, 60.5],
  preuve: [60.5, 70.0],
  regle: [70.0, 77.3],
} as const;

export const DUREE_QUATRE = Math.round(79.5 * 30);

const entree = (frame: number, fps: number, debut: number, retard: number) =>
  spring({
    frame: frame - Math.round((debut + retard) * fps),
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

/** Un bloc d'erreur : le numéro, le nom, et ce que ça coûte. */
const Erreur: React.FC<{
  numero: number;
  nom: string;
  debut: number;
  corps: React.ReactNode;
  cout?: string;
}> = ({ numero, nom, debut, corps, cout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (r: number) => entree(frame, fps, 0, r);
  return (
    <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 26, opacity: e(0.2) }}>
        <span style={{ fontSize: 92, fontWeight: 900, color: ROUGE, letterSpacing: -4 }}>{numero}</span>
        <span style={{ fontSize: 66, fontWeight: 800, color: "#fff", letterSpacing: -2 }}>{nom}</span>
      </div>
      <div style={{ marginTop: 40, fontSize: 46, color: "rgba(255,255,255,0.84)", lineHeight: 1.38, opacity: e(2.2) }}>
        {corps}
      </div>
      {cout ? (
        <div style={{ marginTop: 36, fontSize: 56, fontWeight: 900, color: ROUGE, opacity: e(6.4) }}>
          {cout}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const QuatreErreurs: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = (debut: number, retard = 0) => entree(frame, fps, debut, retard);

  return (
    <AbsoluteFill style={{ backgroundColor: FOND, fontFamily: POLICE }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: VERT }} />

      {/* ── LE CONSTAT : trois chiffres, et ils sont de nous ─────────────── */}
      <Scene bornes={S.constat}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div style={{ fontSize: 38, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1, marginBottom: 34 }}>
            UNE SEMAINE DE PUBLICATION QUOTIDIENNE
          </div>
          <div style={{ display: "flex", gap: 110, alignItems: "flex-end" }}>
            {[
              { v: "4 900", e: "vues cumulées", m: false },
              { v: "12", e: "clics sur le site", m: true },
              { v: "0", e: "inscription", m: true },
            ].map((c, k) => (
              <div key={c.e} style={{ opacity: e(S.constat[0], 0.6 + k * 1.5) }}>
                <div
                  style={{
                    fontSize: 150, fontWeight: 900, letterSpacing: -7, lineHeight: 0.95,
                    color: c.m ? ROUGE : "#fff",
                  }}
                >
                  {c.v}
                </div>
                <div style={{ fontSize: 36, color: "rgba(255,255,255,0.72)", marginTop: 8, fontWeight: 700 }}>
                  {c.e}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 46, color: "#fff", marginTop: 54, fontWeight: 800, opacity: e(S.constat[0], 6.2) }}>
            Quatre erreurs. Et ce que chacune a coûté.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.erreur1}>
        <Erreur
          numero={1}
          nom="TON PRODUIT EST LE SUJET"
          debut={S.erreur1[0]}
          corps={
            <>
              Je montrais l&apos;interface, le bouton, le résultat affiché à l&apos;écran.
              <br />
              Personne ne se lève le matin en voulant voir une interface.
            </>
          }
          cout="48 vues."
        />
      </Scene>

      <Scene bornes={S.erreur2}>
        <Erreur
          numero={2}
          nom="TU PROMETS CE QUE L'OUTIL FAIT"
          debut={S.erreur2[0]}
          corps={
            <>
              « Dix clips notés, recadrés, sous-titrés » : ce sont des fonctions.
              <br />
              <span style={{ color: VERT, fontWeight: 800 }}>
                Le gain, c&apos;est la soirée que tu ne passes pas sur une timeline à 23 h.
              </span>
            </>
          }
        />
      </Scene>

      {/* ── ERREUR 3 : on MONTRE un clip, puisque c'est le propos ────────── */}
      <Scene bornes={S.erreur3}>
        <AbsoluteFill style={{ padding: 100, flexDirection: "row", gap: 80, alignItems: "center" }}>
          <CarteClip
            source="rec-gotaga-h264.mp4"
            rec={188}
            cadre={[150, 300, 540, 980]}
            largeur={410}
            hauteur={729}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 24, opacity: e(S.erreur3[0], 0.2) }}>
              <span style={{ fontSize: 86, fontWeight: 900, color: ROUGE }}>3</span>
              <span style={{ fontSize: 58, fontWeight: 800, color: "#fff", letterSpacing: -1.5 }}>
                LA FONCTION AU LIEU DU RÉSULTAT
              </span>
            </div>
            <div style={{ fontSize: 44, color: "rgba(255,255,255,0.84)", marginTop: 32, lineHeight: 1.38, opacity: e(S.erreur3[0], 2.4) }}>
              La commande vocale est une fonction. La grille de notes aussi.
              <br />
              <span style={{ color: VERT, fontWeight: 800 }}>
                Le résultat, c&apos;est ça : le clip fini, qui tourne.
              </span>
            </div>
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.erreur4}>
        <Erreur
          numero={4}
          nom="TU DÉVOILES TOUT D'UN COUP"
          debut={S.erreur4[0]}
          corps={
            <>
              Treize secondes qui déroulent le processus entier
              <br />
              ne laissent plus rien à vouloir. Ni raison de cliquer, ni raison de suivre.
            </>
          }
        />
      </Scene>

      {/* ── LA PREUVE : nos deux versions, à l'échelle ───────────────────── */}
      <Scene bornes={S.preuve}>
        <AbsoluteFill style={{ padding: "120px 140px", justifyContent: "center" }}>
          <div style={{ fontSize: 38, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 1, marginBottom: 36 }}>
            MÊME COMPTE, MÊME SUJET, MÊME SEMAINE
          </div>
          <Barres
            debut={0.4}
            valeurs={[
              { etiquette: "Sans le produit", valeur: 361 },
              { etiquette: "En montrant le produit", valeur: 48, mauvais: true },
            ]}
          />
          <div style={{ fontSize: 44, color: "rgba(255,255,255,0.78)", marginTop: 44, opacity: e(S.preuve[0], 4.0) }}>
            361 vues en quatorze heures. 48 pour la version qui montrait l&apos;outil.
          </div>
        </AbsoluteFill>
      </Scene>

      <Scene bornes={S.regle}>
        <AbsoluteFill style={{ padding: 140, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 86, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1.12,
              opacity: e(S.regle[0]),
            }}
          >
            Ton outil n&apos;est jamais le sujet.
          </div>
          <div style={{ fontSize: 50, color: VERT, marginTop: 30, fontWeight: 800, lineHeight: 1.3, opacity: e(S.regle[0], 2.4) }}>
            Le sujet, c&apos;est le problème de la personne en face.
            <br />
            Ton outil est la réponse — à la fin, si elle est restée.
          </div>
        </AbsoluteFill>
      </Scene>

      <Audio src={staticFile("voix/narration-quatre-erreurs.mp3")} />

      {/* Le son du clip, pendant le plan qui le montre. */}
      <Sequence
        from={Math.round(S.erreur3[0] * fps)}
        durationInFrames={Math.round((S.erreur3[1] - S.erreur3[0]) * fps)}
        layout="none"
      >
        <Audio src={staticFile("son-clip-gotaga.mp3")} trimBefore={Math.round(3.6 * fps)} volume={0.18} />
      </Sequence>
    </AbsoluteFill>
  );
};
