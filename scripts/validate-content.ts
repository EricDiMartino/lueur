import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  CarteSchema,
  CatalogueDecorsSchema,
  CatalogueObjetsSchema,
  CatalogueTerrainsSchema,
} from '../src/content/schemas';

/**
 * Valide les fichiers de contenu et explique les erreurs en français,
 * à destination de quelqu'un qui édite un JSON, pas d'un développeur.
 */

const fichiers = [
  { chemin: 'src/content/objets.json', schema: CatalogueObjetsSchema },
  { chemin: 'src/content/terrains.json', schema: CatalogueTerrainsSchema },
  { chemin: 'src/content/decors.json', schema: CatalogueDecorsSchema },
  { chemin: 'src/content/cartes/foret.json', schema: CarteSchema },
];

let echecs = 0;
const valides = new Map<string, unknown>();

const lire = (chemin: string): unknown => JSON.parse(readFileSync(resolve(process.cwd(), chemin), 'utf8'));

for (const { chemin, schema } of fichiers) {
  let donnees: unknown;
  try {
    donnees = lire(chemin);
  } catch (e) {
    echecs++;
    console.error(`\n❌ ${chemin}`);
    console.error(`   Le fichier n'est pas du JSON valide.`);
    console.error(`   ${(e as Error).message}`);
    console.error(`   Cause la plus fréquente : une virgule en trop ou manquante.`);
    continue;
  }

  const resultat = schema.safeParse(donnees);

  if (resultat.success) {
    const nb = Array.isArray(resultat.data) ? resultat.data.length : 1;
    console.log(`✅ ${chemin} — ${nb} entrée(s) valide(s)`);
    valides.set(chemin, resultat.data);
    continue;
  }

  echecs++;
  console.error(`\n❌ ${chemin}`);
  for (const probleme of (resultat.error as z.ZodError).issues) {
    const [index, ...reste] = probleme.path;
    const ou =
      typeof index === 'number'
        ? `entrée n°${index + 1}${reste.length ? `, champ « ${reste.join('.')} »` : ''}`
        : probleme.path.join('.') || 'racine du fichier';
    console.error(`   • ${ou} : ${probleme.message}`);
  }
}

/**
 * Contrôle croisé : chaque symbole dessiné dans une carte doit exister dans
 * terrains.json ou decors.json. C'est l'erreur la plus probable pour quelqu'un
 * qui dessine une carte à la main.
 */
const terrains = valides.get('src/content/terrains.json') as { symbole: string }[] | undefined;
const decors = valides.get('src/content/decors.json') as { symbole: string }[] | undefined;
const foret = valides.get('src/content/cartes/foret.json') as
  | { nom: string; sol: string[]; decors: string[] }
  | undefined;

if (terrains && decors && foret) {
  const symbolesSol = new Set(terrains.map((t) => t.symbole));
  const symbolesDecor = new Set(decors.map((d) => d.symbole));
  const inconnus: string[] = [];

  foret.sol.forEach((ligne, y) => {
    [...ligne].forEach((s, x) => {
      if (!symbolesSol.has(s)) {
        inconnus.push(
          `sol, ligne ${y + 1}, colonne ${x + 1} : « ${s} » n'est pas un terrain connu ` +
            `(disponibles : ${[...symbolesSol].join(' ')})`,
        );
      }
    });
  });

  foret.decors.forEach((ligne, y) => {
    [...ligne].forEach((s, x) => {
      if (s !== ' ' && !symbolesDecor.has(s)) {
        inconnus.push(
          `décors, ligne ${y + 1}, colonne ${x + 1} : « ${s} » n'est pas un décor connu ` +
            `(disponibles : ${[...symbolesDecor].join(' ')})`,
        );
      }
    });
  });

  if (inconnus.length > 0) {
    echecs++;
    console.error(`\n❌ Carte « ${foret.nom} » : symboles inconnus`);
    for (const message of inconnus.slice(0, 10)) console.error(`   • ${message}`);
    if (inconnus.length > 10) console.error(`   … et ${inconnus.length - 10} autres`);
  } else {
    console.log(`✅ Carte « ${foret.nom} » — tous les symboles sont connus`);
  }
}

if (echecs > 0) {
  console.error(`\n${echecs} problème(s) à corriger.\n`);
  process.exit(1);
}

console.log('\nContenu valide.\n');
