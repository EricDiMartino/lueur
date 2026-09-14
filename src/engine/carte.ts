import { decorParSymbole, terrain, terrainParSymbole } from '../content';
import type { Carte, Decor } from '../content/schemas';

export const TAILLE_TUILE = 32;

export interface DecorPose {
  decor: Decor;
  /** Coordonnées en cases, pas en pixels. */
  caseX: number;
  caseY: number;
}

export interface CarteConstruite {
  largeur: number;
  hauteur: number;
  /** Index de tuile dans l'atlas, prêt pour Phaser. */
  grilleTuiles: number[][];
  decorsPoses: DecorPose[];
  /** true si la case bloque le passage (terrain non traversable). */
  bloquee: boolean[][];
  departJoueur: { x: number; y: number };
}

/**
 * Transforme une carte écrite en grille de caractères en structures prêtes à
 * l'affichage. Les erreurs sont volontairement bavardes : ces fichiers sont
 * édités à la main, souvent par quelqu'un qui ne lit pas de code.
 */
export function construireCarte(source: Carte): CarteConstruite {
  const hauteur = source.sol.length;
  const largeur = source.sol[0]!.length;
  const defaut = terrain(source.solParDefaut);

  const grilleTuiles: number[][] = [];
  const bloquee: boolean[][] = [];
  const decorsPoses: DecorPose[] = [];

  for (let y = 0; y < hauteur; y++) {
    const ligneTuiles: number[] = [];
    const ligneBloquee: boolean[] = [];
    const ligneSol = source.sol[y]!;
    const ligneDecors = source.decors[y]!;

    for (let x = 0; x < largeur; x++) {
      const symboleSol = ligneSol[x]!;
      const t = terrainParSymbole.get(symboleSol);
      if (!t) {
        throw new Error(
          `Carte « ${source.nom} », ligne ${y + 1}, colonne ${x + 1} : le symbole ` +
            `« ${symboleSol} » ne correspond à aucun terrain. ` +
            `Symboles disponibles : ${[...terrainParSymbole.keys()].join(' ')}`,
        );
      }
      ligneTuiles.push(t.tuile);
      ligneBloquee.push(!t.traversable);

      const symboleDecor = ligneDecors[x];
      if (symboleDecor && symboleDecor !== ' ') {
        const d = decorParSymbole.get(symboleDecor);
        if (!d) {
          throw new Error(
            `Carte « ${source.nom} », ligne ${y + 1}, colonne ${x + 1} : le symbole ` +
              `« ${symboleDecor} » ne correspond à aucun décor. ` +
              `Symboles disponibles : ${[...decorParSymbole.keys()].join(' ')}`,
          );
        }
        decorsPoses.push({ decor: d, caseX: x, caseY: y });
      }
    }

    grilleTuiles.push(ligneTuiles);
    bloquee.push(ligneBloquee);
  }

  void defaut; // solParDefaut sert de garde-fou : il doit exister dans terrains.json
  return { largeur, hauteur, grilleTuiles, decorsPoses, bloquee, departJoueur: source.departJoueur };
}

/** Centre en pixels d'une case. */
export function centreCase(caseX: number, caseY: number): { x: number; y: number } {
  return { x: caseX * TAILLE_TUILE + TAILLE_TUILE / 2, y: caseY * TAILLE_TUILE + TAILLE_TUILE / 2 };
}
