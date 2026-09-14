/**
 * Fabrique les sprites dérivés à partir des fichiers LPC d'origine.
 *
 * Les PNG de public/assets/sprites/ sont des dérivés, pas des originaux : ce
 * script est versionné pour que l'opération reste reproductible et vérifiable.
 *
 * Usage :
 *   node scripts/construire-sprites.mjs <dossier "LPC Base Assets">
 *
 * L'atlas de tuiles est lu depuis public/assets/tiles/terrain_atlas.png.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const source = process.argv[2];
if (!source) {
  console.error('Usage : node scripts/construire-sprites.mjs <dossier "LPC Base Assets">');
  process.exit(1);
}

const TUILE = 32;
const atlas = PNG.sync.read(readFileSync('public/assets/tiles/terrain_atlas.png'));
const colonnesAtlas = atlas.width / TUILE;

const lire = (nom) => PNG.sync.read(readFileSync(`${source}/tiles/${nom}`));

/**
 * Retire les lignes entièrement transparentes sous le sprite.
 *
 * Les décors sont posés sur la carte avec l'origine au pied — leur bord
 * inférieur doit donc coïncider avec leur base visible. Les fichiers LPC
 * laissent jusqu'à 23 px de vide sous un arbre : sans ce rognage, l'arbre
 * flotte au-dessus de sa zone de blocage et du halo de récolte, et le décalage
 * se voit immédiatement en jeu.
 */
function rognerLeBas(png) {
  let derniereLigneVisible = -1;
  for (let y = png.height - 1; y >= 0; y--) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[((y * png.width + x) << 2) + 3] > 0) { derniereLigneVisible = y; break; }
    }
    if (derniereLigneVisible >= 0) break;
  }
  if (derniereLigneVisible < 0 || derniereLigneVisible === png.height - 1) return { png, rogne: 0 };

  const hauteur = derniereLigneVisible + 1;
  const rogne = png.height - hauteur;
  const sortie = new PNG({ width: png.width, height: hauteur });
  png.data.copy(sortie.data, 0, 0, hauteur * png.width * 4);
  return { png: sortie, rogne };
}

const ecrire = (nom, pngBrut) => {
  const { png, rogne } = rognerLeBas(pngBrut);
  writeFileSync(`public/assets/sprites/${nom}.png`, PNG.sync.write(png));
  console.log(`${nom}.png — ${png.width}×${png.height}${rogne ? ` (${rogne} px de vide rognés sous le pied)` : ''}`);
};

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

function decouper(src, sx, sy, largeur, hauteur) {
  const png = new PNG({ width: largeur, height: hauteur });
  png.data.fill(0);
  composer(src, sx, sy, largeur, hauteur, png, 0, 0);
  return png;
}

const tuileAtlas = (index) =>
  decouper(atlas, (index % colonnesAtlas) * TUILE, ((index / colonnesAtlas) | 0) * TUILE, TUILE, TUILE);

// ─── Arbres ──────────────────────────────────────────────────────────────────

const houppiers = lire('treetop.png');
const troncs = lire('trunk.png');
const LARGEUR_ARBRE = 96;
const HAUTEUR_TRONC = 96;
const CELLULE_HOUPPIER = 112;
/** Le houppier doit mordre sur le haut du tronc, sinon l'arbre paraît coupé en deux. */
const CHEVAUCHEMENT = 30;

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
      if (src.data[(((sy + y) * src.width + (sx + x)) << 2) + 3] > 0) { ligneRemplie = true; break; }
    }
    if (ligneRemplie) contenuVu = true;
    else if (contenuVu) return y;
  }
  return hauteurMax;
}

for (const { nom, rangee } of [{ nom: 'arbre-feuillu', rangee: 0 }, { nom: 'arbre-sapin', rangee: 1 }]) {
  const hh = hauteurHouppier(houppiers, 0, rangee * CELLULE_HOUPPIER, LARGEUR_ARBRE, CELLULE_HOUPPIER);
  const hauteur = hh + HAUTEUR_TRONC - CHEVAUCHEMENT;
  const png = new PNG({ width: LARGEUR_ARBRE, height: hauteur });
  png.data.fill(0);
  composer(troncs, 0, 0, LARGEUR_ARBRE, HAUTEUR_TRONC, png, 0, hauteur - HAUTEUR_TRONC);
  composer(houppiers, 0, rangee * CELLULE_HOUPPIER, LARGEUR_ARBRE, hh, png, 0, 0);
  ecrire(nom, png);
}

// ─── Mare ────────────────────────────────────────────────────────────────────

/**
 * water.png n'est pas un jeu de tuiles de transition mais un jeu de mares
 * préfabriquées : en carreler une étendue donne un rectangle bleu aux bords
 * nets. On extrait donc la grande mare (3×3 tuiles, berges comprises) comme un
 * sprite unique, posé sur la carte comme un décor.
 */
ecrire('mare', decouper(lire('water.png'), 0, 64, 96, 96));

// ─── Rochers ─────────────────────────────────────────────────────────────────

const rochers = lire('rock.png');
ecrire('rocher', decouper(rochers, 0, 0, 32, 32));
// Les petits cailloux servent d'état « déjà cassé » du rocher.
ecrire('rocher-casse', decouper(rochers, 32, 0, 32, 32));

// ─── Icônes du sac ───────────────────────────────────────────────────────────

/**
 * Le sac a besoin d'icônes lisibles à 30 px. Un arbre entier réduit à cette
 * taille ne se reconnaît pas : on découpe le tronc, qui se lit comme du bois.
 * LPC ne fournit pas de jeu d'icônes d'objets, ces découpes en tiennent lieu.
 */
ecrire('icone-bois', decouper(troncs, 34, 8, 32, 32));

// ─── Végétation de l'atlas ───────────────────────────────────────────────────

const BUISSON_BAIES = 941;
ecrire('buisson-baies', tuileAtlas(BUISSON_BAIES));

// Note : les buissons et herbes hautes de l'atlas (987, 117 et voisins) sont des
// fragments d'objets multi-tuiles. Découpés seuls ils ont un bord franc et se
// voient immédiatement. Les reprendre demandera de repérer leurs blocs complets.

/**
 * État « cueilli » du buisson : l'atlas ne fournit pas la même plante sans ses
 * fruits, on les retire donc en repeignant chaque pixel rouge avec le pixel
 * non rouge le plus proche. Repeindre plutôt que rendre transparent évite de
 * percer des trous dans le feuillage.
 */
function retirerLesFruits(png) {
  const estRouge = (i) =>
    png.data[i + 3] > 0 && png.data[i] > png.data[i + 1] + 35 && png.data[i] > png.data[i + 2] + 35;

  const aRepeindre = [];
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) << 2;
      if (estRouge(i)) aRepeindre.push([x, y]);
    }
  }

  for (const [x, y] of aRepeindre) {
    let meilleur = null;
    let meilleureDistance = Infinity;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= png.width || ny >= png.height) continue;
        const j = (ny * png.width + nx) << 2;
        if (png.data[j + 3] === 0 || estRouge(j)) continue;
        const d = dx * dx + dy * dy;
        if (d < meilleureDistance) { meilleureDistance = d; meilleur = j; }
      }
    }
    const i = (y * png.width + x) << 2;
    if (meilleur === null) { png.data[i + 3] = 0; continue; }
    for (let c = 0; c < 4; c++) png.data[i + c] = png.data[meilleur + c];
  }
  return { png, retires: aRepeindre.length };
}

const { png: cueilli, retires } = retirerLesFruits(tuileAtlas(BUISSON_BAIES));
ecrire('buisson-cueilli', cueilli);
console.log(`   (${retires} pixels de fruit retirés)`);
