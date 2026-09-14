import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { CatalogueObjetsSchema } from '../src/content/schemas';

/**
 * Valide les fichiers de contenu et explique les erreurs en français,
 * à destination de quelqu'un qui édite un JSON, pas d'un développeur.
 */

const fichiers = [{ chemin: 'src/content/objets.json', schema: CatalogueObjetsSchema }];

let echecs = 0;

for (const { chemin, schema } of fichiers) {
  const absolu = resolve(process.cwd(), chemin);

  let donnees: unknown;
  try {
    donnees = JSON.parse(readFileSync(absolu, 'utf8'));
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

if (echecs > 0) {
  console.error(`\n${echecs} fichier(s) à corriger.\n`);
  process.exit(1);
}

console.log('\nContenu valide.\n');
