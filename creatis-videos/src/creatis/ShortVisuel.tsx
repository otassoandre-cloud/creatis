import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Adresse, BrollVertical, ClipPlein, LegendeCourte } from "./VisuelCourt";

/**
 * SHORT VISUEL — 1080×1920, le style validé le 09/10 porté au format court.
 *
 * ── CE QUI CHANGE PAR RAPPORT AUX SHORTS PRÉCÉDENTS ──────────────────────
 * Les trois derniers étaient un clip unique du début à la fin. Ils marchent
 * (697 à 1 208 vues), mais ils sont monotones : une seule image, sombre,
 * pendant treize secondes.
 *
 * Ici on alterne B-ROLL LUMINEUX et clip fini, au rythme de la voix. C'est la
 * direction validée sur la maquette 16:9 : ce sont les plans clairs qui
 * cassent la monotonie, et le montage cesse de ressembler à une image fixe.
 *
 * ── LES BORNES VIENNENT DE LA VOIX ───────────────────────────────────────
 * `silencedetect` sur narration-quarante.mp3 (13,7 s) : 3,1 — 5,9 — 8,0.
 * Chaque plan change exactement là où la voix respire.
 */

const PLANS = [
  { a: 0, b: 3.1 },
  { a: 3.1, b: 5.9 },
  { a: 5.9, b: 8.0 },
  { a: 8.0, b: 14.2 },
] as const;

export const DUREE_SHORT_VISUEL = Math.round(14.2 * 30);

const Plan: React.FC<{ i: number; children: React.ReactNode }> = ({ i, children }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence
      from={Math.round(PLANS[i].a * fps)}
      durationInFrames={Math.round((PLANS[i].b - PLANS[i].a) * fps)}
      layout="none"
    >
      {children}
    </Sequence>
  );
};

/** Apparition nette et rapide : un fondu lent ferait mou sur un format court. */
const paraitre = (frame: number, fps: number, retard = 0.15) =>
  interpolate(frame - retard * fps, [0, 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const ShortVisuel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#04060a" }}>
      {/* 1 — B-roll lumineux : le hook sur la vraie vidéo source. */}
      <Plan i={0}>
        <BrollVertical source="broll-amixem-h264.mp4" depart={0} duree={3.1} centre={0.5} />
        <Accroche gros>
          Tu regardes 40 minutes
          <br />
          pour en garder 3.
        </Accroche>
      </Plan>

      {/* 2 — le clip fini : voilà ce qu'on en sort. */}
      <Plan i={1}>
        <ClipPlein source="rec-amixem2-h264.mp4" depart={0} duree={2.8} />
        <Accroche>
          C&apos;est là que partent tes soirées.
          <br />
          Pas au montage.
        </Accroche>
      </Plan>

      {/* 3 — retour au B-roll, plus loin dans la vidéo. */}
      <Plan i={2}>
        <BrollVertical source="broll-amixem-h264.mp4" depart={6} duree={2.1} centre={0.5} />
        <Accroche>Pars de la source, pas de ton idée.</Accroche>
      </Plan>

      {/* 4 — le clip, et le calcul qui tient en une ligne. */}
      <Plan i={3}>
        <ClipPlein source="rec-amixem2-h264.mp4" depart={4} duree={6.2} />
        <Accroche>
          1 vidéo = 10 passages.
          <br />
          3 sources = tes 30 clips.
        </Accroche>
      </Plan>

      <Adresse
        visible={interpolate(s, [12.9, 13.3], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        })}
      />

      <Audio src={staticFile("voix/narration-quarante.mp3")} />
    </AbsoluteFill>
  );
};

/** La légende du plan courant, qui paraît juste après la coupe. */
const Accroche: React.FC<{ children: React.ReactNode; gros?: boolean }> = ({ children, gros }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <LegendeCourte gros={gros} visible={paraitre(frame, fps)}>
      {children}
    </LegendeCourte>
  );
};
