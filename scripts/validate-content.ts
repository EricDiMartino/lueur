import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  CarteSchema,
  CatalogueDecorsSchema,
  CatalogueObjetsSchema,
  CatalogueTerrainsSchema,
  CatalogueRecettesSchema,
  CatalogueEnnemisSchema,
  CatalogueMissionsSchema,
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
  { chemin: 'src/content/recettes.json', schema: CatalogueRecettesSchema },
  { chemin: 'src/content/ennemis.json', schema: CatalogueEnnemisSchema },
  { chemin: 'src/content/missions.json', schema: CatalogueMissionsSchema },
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

/**
 * Contrôle croisé : toute recette ou mission qui parle d'un objet doit parler
 * d'un objet qui existe. C'est l'erreur type d'une faute de frappe dans un id.
 */
const objets = valides.get('src/content/objets.json') as { id: string }[] | undefined;
const recettes = valides.get('src/content/recettes.json') as
  | { id: string; resultat: string; ingredients: { objet: string }[] }[]
  | undefined;
const missionsContenu = valides.get('src/content/missions.json') as
  | { id: string; condition: { type: string; objet?: string } }[]
  | undefined;

if (objets) {
  const connus = new Set(objets.map((o) => o.id));
  const inconnus: string[] = [];

  for (const r of recettes ?? []) {
    if (!connus.has(r.resultat)) {
      inconnus.push(`recette « ${r.id} » : le résultat « ${r.resultat} » n'existe pas dans objets.json`);
    }
    for (const i of r.ingredients) {
      if (!connus.has(i.objet)) {
        inconnus.push(`recette « ${r.id} » : l'ingrédient « ${i.objet} » n'existe pas dans objets.json`);
      }
    }
  }

  for (const m of missionsContenu ?? []) {
    if (m.condition.objet && !connus.has(m.condition.objet)) {
      inconnus.push(`mission « ${m.id} » : l'objet « ${m.condition.objet} » n'existe pas dans objets.json`);
    }
  }

  if (inconnus.length > 0) {
    echecs++;
    console.error(`\n❌ Références croisées`);
    for (const message of inconnus) console.error(`   • ${message}`);
  } else if (recettes && missionsContenu) {
    console.log(`✅ Recettes et missions — tous les objets référencés existent`);
  }
}

if (echecs > 0) {
  console.error(`\n${echecs} problème(s) à corriger.\n`);
  process.exit(1);
}

console.log('\nContenu valide.\n');
