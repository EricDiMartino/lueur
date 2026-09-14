import objetsBruts from './objets.json';
import terrainsBruts from './terrains.json';
import decorsBruts from './decors.json';
import foretBrute from './cartes/foret.json';
import {
  CarteSchema,
  CatalogueDecorsSchema,
  CatalogueObjetsSchema,
  CatalogueTerrainsSchema,
  type Carte,
  type Decor,
  type Objet,
  type Terrain,
} from './schemas';

/**
 * Point d'entrée unique du contenu.
 *
 * Le moteur n'importe jamais un JSON directement : il passe par ici, ce qui
 * garantit que toute donnée qu'il manipule a été validée.
 */

export const objets: readonly Objet[] = CatalogueObjetsSchema.parse(objetsBruts);
export const terrains: readonly Terrain[] = CatalogueTerrainsSchema.parse(terrainsBruts);
export const decors: readonly Decor[] = CatalogueDecorsSchema.parse(decorsBruts);
export const cartes: readonly Carte[] = [CarteSchema.parse(foretBrute)];

function indexer<T extends { id: string }>(liste: readonly T[], quoi: string, fichier: string) {
  const parId = new Map(liste.map((e) => [e.id, e]));
  return (id: string): T => {
    const trouve = parId.get(id);
    if (!trouve) throw new Error(`${quoi} inconnu : "${id}". Vérifier ${fichier}.`);
    return trouve;
  };
}

export const objet = indexer(objets, 'Objet', 'src/content/objets.json');
export const terrain = indexer(terrains, 'Terrain', 'src/content/terrains.json');
export const decor = indexer(decors, 'Décor', 'src/content/decors.json');
export const carte = indexer(cartes, 'Carte', 'src/content/cartes/');

export const terrainParSymbole = new Map(terrains.map((t) => [t.symbole, t]));
export const decorParSymbole = new Map(decors.map((d) => [d.symbole, d]));
