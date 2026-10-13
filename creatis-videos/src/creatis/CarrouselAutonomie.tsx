import type { Vignette } from "./Carrousel";

/**
 * CARROUSEL DU 08/10 — l'autonomie d'un passage.
 *
 * Le carrousel du 06/10 listait cinq causes de plafonnement. Celui-ci ne
 * recommence pas : il prend UN seul critère et le rend applicable ce soir.
 * C'est le même propos que le Short et le format long du jour — un carrousel
 * qui dit autre chose que la vidéo oblige à deux lectures et n'en obtient
 * aucune.
 *
 * Les répliques fautives sont écrites telles qu'on les entend au montage, pas
 * décrites : « Il m'a dit que… » se reconnaît, « un pronom sans antécédent »
 * s'oublie.
 *
 * Le chiffre de la dernière vignette est mesuré sur la chaîne, pas cité : le
 * Short d'hier est passé de 361 à 1 207 vues en vingt-quatre heures, quand le
 * précédent plafonnait à 232.
 */
export const VIGNETTES_AUTONOMIE: Vignette[] = [
  {
    titre: "Ton meilleur moment ne fera pas un bon clip",
    corps:
      "Il y a un critère qui décide avant tous les autres, et il se vérifie en dix secondes.",
    index: "",
  },
  {
    index: "LA RÈGLE",
    titre: "Un clip doit se comprendre sans la vidéo dont il sort",
    corps:
      "Ça s'appelle l'autonomie. Celui qui tombe dessus n'a rien vu avant : s'il lui manque le contexte, il part — et l'algorithme ne mesure que ça.",
  },
  {
    index: "1 / 3",
    titre: "Le pronom sans antécédent",
    corps:
      "« Il m'a dit que… »\nQui, il ? Le spectateur ne le saura jamais. Nomme la personne dans la première phrase, ou ne coupe pas là.",
  },
  {
    index: "2 / 3",
    titre: "Le prénom jamais présenté",
    corps:
      "« Et là Jordan se retourne… »\nToi tu connais la personne. Lui, non. Un prénom sans fonction ne pose rien du tout.",
  },
  {
    index: "3 / 3",
    titre: "La réponse sans sa question",
    corps:
      "« Ouais, carrément, c'est exactement ça. »\nLa plus fréquente des trois : le passage ouvre sur une réponse, et personne ne sait sur quoi.",
  },
  {
    index: "LE TEST",
    chiffre: "10 s",
    titre: "Montre-le à quelqu'un qui n'a pas vu la vidéo",
    corps:
      "S'il demande le contexte, garde le passage. Même si le moment est excellent. Surtout s'il est excellent : c'est là qu'on se ment.",
  },
  {
    chiffre: "1 207",
    titre: "Ce que ça a changé chez moi",
    corps:
      "1 207 vues pour le format qui respecte la règle, 232 pour le précédent. Même compte, même semaine, même outil.",
  },
  {
    titre: "Commence ta prochaine coupe par la situation",
    corps: "Jamais par la punchline. Garde ce carrousel pour ton prochain montage.",
    fin: true,
  },
];
