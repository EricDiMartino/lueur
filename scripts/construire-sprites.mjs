/**
 * Fabrique les sprites dérivés à partir des fichiers LPC d'origine.
 *
 * LPC livre les houppiers (treetop.png) et les troncs (trunk.png) séparément.
 * Ce script les compose en sprites prêts à l'emploi. Il est versionné pour que
 * l'opération reste reproductible : les PNG générés dans public/assets/ sont
 * des dérivés, pas des originaux.
 *
 * Usage :
 *   node scripts/construire-sprites.mjs <dossier "LPC Base Assets">
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const source = process.argv[2];
if (!source) {
  console.error('Usage : node scripts/construire-sprites.mjs <dossier "LPC Base Assets">');
  process.exit(1);
}

const LARGEUR = 96;
const HAUTEUR_TRONC = 96;
const HAUTEUR_CELLULE_HOUPPIER = 112;
/** Le houppier doit mordre sur le haut du tronc, sinon l'arbre paraît coupé en deux. */
const CHEVAUCHEMENT = 30;

const houppiers = PNG.sync.read(readFileSync(`${source}/tiles/treetop.png`));
const troncs = PNG.sync.read(readFileSync(`${source}/tiles/trunk.png`));

/**
 * Les cellules de treetop.png contiennent un fragment détaché sous le houppier.
 * On ne garde que le bloc de lignes non vides parti du haut — sans ça, le
 * fragment se retrouve collé sur le tronc de chaque arbre de la carte.
 */
function hauteurHouppier(src, sx, sy, largeur, hauteurMax) {
  let contenuVu = false;
  for (let y = 0; y < hauteurMax; y++) {
    let ligneRemplie = false;
    for (let x = 0; x < largeur; x++) {
      if (src.data[(((sy + y) * src.width + (sx + x)) << 2) + 3] > 0) {
        ligneRemplie = true;
        break;
      }
    }
    if (ligneRemplie) contenuVu = true;
    else if (contenuVu) return y;
  }
  return hauteurMax;
}

function composer(src, sx, sy, largeur, hauteur, dest, dx, dy) {
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const si = ((sy + y) * src.width + (sx + x)) << 2;
      const alpha = src.data[si + 3] / 255;
      if (alpha === 0) continue;
      const di = ((dy + y) * dest.width + (dx + x)) << 2;
      if (di < 0 || di >= dest.data.length) continue;
      for (let c = 0; c < 3; c++) {
        dest.data[di + c] = src.data[si + c] * alpha + dest.data[di + c] * (1 - alpha);
      }
      dest.data[di + 3] = Math.max(dest.data[di + 3], src.data[si + 3]);
    }
  }
}

const arbres = [
  { nom: 'arbre-feuillu', colonne: 0, rangee: 0 },
  { nom: 'arbre-sapin', colonne: 0, rangee: 1 },
];

for (const { nom, colonne, rangee } of arbres) {
  const hh = hauteurHouppier(
    houppiers,
    colonne * LARGEUR,
    rangee * HAUTEUR_CELLULE_HOUPPIER,
    LARGEUR,
    HAUTEUR_CELLULE_HOUPPIER,
  );
  const hauteur = hh + HAUTEUR_TRONC - CHEVAUCHEMENT;

  const sortie = new PNG({ width: LARGEUR, height: hauteur });
  sortie.data.fill(0);
  composer(troncs, colonne * LARGEUR, 0, LARGEUR, HAUTEUR_TRONC, sortie, 0, hauteur - HAUTEUR_TRONC);
  composer(houppiers, colonne * LARGEUR, rangee * HAUTEUR_CELLULE_HOUPPIER, LARGEUR, hh, sortie, 0, 0);

  writeFileSync(`public/assets/sprites/${nom}.png`, PNG.sync.write(sortie));
  console.log(`${nom}.png — ${LARGEUR}×${hauteur} (houppier ${hh} px)`);
}

/**
 * La mare.
 *
 * water.png n'est pas un jeu de tuiles de transition mais un jeu de mares
 * préfabriquées : on ne peut pas en carreler une étendue aux bords nets sans
 * obtenir un rectangle bleu. On extrait donc la grande mare (3×3 tuiles, berges
 * comprises) comme un sprite unique, posé sur la carte comme un décor.
 */
const eau = PNG.sync.read(readFileSync(`${source}/tiles/water.png`));
const MARE = { x: 0, y: 64, largeur: 96, hauteur: 96 };

const mare = new PNG({ width: MARE.largeur, height: MARE.hauteur });
mare.data.fill(0);
composer(eau, MARE.x, MARE.y, MARE.largeur, MARE.hauteur, mare, 0, 0);
writeFileSync('public/assets/sprites/mare.png', PNG.sync.write(mare));
console.log(`mare.png — ${MARE.largeur}×${MARE.hauteur}`);
