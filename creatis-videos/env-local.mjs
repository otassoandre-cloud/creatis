/**
 * IDENTIFIANTS DE TOURNAGE, LUS UNE FOIS POUR TOUTES.
 *
 * Les scripts qui filment l'application ont besoin d'un vrai compte : le
 * `CREATIS_EMAIL` et le `CREATIS_MDP` etaient jusqu'ici tapes dans le shell a
 * chaque lancement. Une variable d'environnement ne survit pas a la fermeture
 * du terminal, donc a chaque nouvelle session il fallait les retrouver — et le
 * jour ou on ne les retrouve pas, l'enregistrement ne peut plus etre lance du
 * tout.
 *
 * Ce module lit `creatis-videos/.env`, qui est deja dans le `.gitignore` : le
 * fichier reste sur la machine, rien ne part dans le depot. Les variables deja
 * presentes dans l'environnement gagnent toujours, pour qu'un lancement
 * ponctuel avec un autre compte reste possible sans toucher au fichier.
 *
 * Le fichier attendu, a cote de ce script :
 *
 *   CREATIS_EMAIL=...
 *   CREATIS_MDP=...
 *   SUPABASE_URL=...
 *   SUPABASE_ANON_KEY=...
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ICI = path.dirname(fileURLToPath(import.meta.url));

export function chargerEnvLocal(fichier = path.join(ICI, ".env")) {
  if (!fs.existsSync(fichier)) return 0;
  let poses = 0;
  for (const ligne of fs.readFileSync(fichier, "utf8").split(/\r?\n/)) {
    const nu = ligne.trim();
    if (!nu || nu.startsWith("#")) continue;
    const i = nu.indexOf("=");
    if (i <= 0) continue;
    const cle = nu.slice(0, i).trim();
    /* Les guillemets autour de la valeur sont tolerés : on copie souvent une
       ligne depuis une commande shell, ou ils sont indispensables. */
    const valeur = nu.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[cle] === undefined) {
      process.env[cle] = valeur;
      poses++;
    }
  }
  return poses;
}

chargerEnvLocal();
