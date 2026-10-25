import { loadFont } from "@remotion/google-fonts/HankenGrotesk";

/**
 * Hanken Grotesk — exactement la police du site Créatis (chargee dans
 * css/blog.css et sur toutes les pages). On ne charge que les graisses
 * reellement utilisees dans les videos pour ne pas alourdir le rendu.
 */
const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export const POLICE = fontFamily;
