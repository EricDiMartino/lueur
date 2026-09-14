import objetsBruts from './objets.json';
import { CatalogueObjetsSchema, type Objet } from './schemas';

/**
 * Point d'entrée unique du contenu.
 *
 * Le moteur n'importe jamais un JSON directement : il passe par ici, ce qui
 * garantit que toute donnée qu'il manipule a été validée.
 */

export const objets: readonly Objet[] = CatalogueObjetsSchema.parse(objetsBruts);

const parId = new Map(objets.map((o) => [o.id, o]));

export function objet(id: string): Objet {
  const trouve = parId.get(id);
  if (!trouve) {
    throw new Error(`Objet inconnu : "${id}". Vérifier src/content/objets.json.`);
  }
  return trouve;
}
