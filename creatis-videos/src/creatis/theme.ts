/**
 * Charte Créatis, reprise telle quelle du site (css/style.css et clips-v2.html)
 * pour que les vidéos et le produit se ressemblent vraiment.
 */
export const COULEURS = {
  fond: "#0a0f0a",
  fondCarte: "#10141C",
  vert: "#10b981",
  vertClair: "#34d399",
  vertSombre: "#059669",
  texte: "#f2f4f7",
  texteDoux: "#8A93A3",
  ligne: "rgba(255,255,255,0.10)",
} as const;

/**
 * Regles de mise en page video (skill remotion-create/video-layout.md) :
 * pour 1080px de large, titre >= 84px, texte de soutien >= 44px,
 * marge laterale >= 80px, haut/bas >= 100px.
 */
export const MISE_EN_PAGE = {
  margeCote: 96,
  margeHaut: 130,
  margeBas: 130,
  titre: 106,
  titrePetit: 84,
  soutien: 46,
  legende: 34,
} as const;

/** Courbe d'entree utilisee partout : demarre vite, se pose doucement. */
export const ENTREE = [0.16, 1, 0.3, 1] as const;
