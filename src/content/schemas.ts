import { z } from 'zod';

/**
 * Schémas de validation du contenu.
 *
 * Ces fichiers JSON sont édités par des non-développeurs, parfois directement
 * depuis l'interface web de GitHub. La validation tourne au build : une erreur
 * de saisie casse la CI avec un message lisible, au lieu de casser le jeu.
 */

const Identifiant = z
  .string()
  .regex(/^[a-z0-9_]+$/, 'uniquement des minuscules, chiffres et tirets bas (ex : "hache_bois")');

export const CategorieObjet = z.enum(
  ['ressource', 'outil', 'equipement', 'nourriture', 'quete'],
  { error: 'catégorie inconnue — valeurs acceptées : ressource, outil, equipement, nourriture, quete' },
);

export const ObjetSchema = z.object({
  id: Identifiant,
  nom: z.string().min(1, 'le nom affiché ne peut pas être vide'),
  categorie: CategorieObjet,
  description: z.string().max(120, 'maximum 120 caractères, la joueuse a 9 ans'),
  sprite: z.string().min(1, 'nom du sprite dans le pack graphique'),
  empilable: z.boolean(),
  pileMax: z.number().int().positive('un entier supérieur à 0'),

  /** Points de faim rendus. Obligatoire pour la catégorie "nourriture". */
  satiete: z.number().int().positive().optional(),
  /** Dégâts infligés. Réservé aux outils et équipements. */
  degats: z.number().int().positive().optional(),
});

export const CatalogueObjetsSchema = z
  .array(ObjetSchema)
  .refine((objets) => new Set(objets.map((o) => o.id)).size === objets.length, {
    message: 'deux objets portent le même identifiant',
  });

export type Objet = z.infer<typeof ObjetSchema>;

/** Un caractère unique servant à dessiner les cartes en texte. */
const Symbole = z
  .string()
  .length(1, 'un seul caractère : c’est ce qui sert à dessiner la carte');

export const TerrainSchema = z.object({
  id: Identifiant,
  symbole: Symbole,
  /** Index de la tuile dans public/assets/tiles/terrain_atlas.png. */
  tuile: z.number().int().nonnegative(),
  traversable: z.boolean(),
});

export const DecorSchema = z.object({
  id: Identifiant,
  symbole: Symbole,
  /** Nom du fichier dans public/assets/sprites/, sans l'extension. */
  sprite: z.string().min(1),
  solide: z.boolean(),
  /** Un décor au sol (une mare, une flaque) se dessine sous les personnages ;
   *  un décor dressé (un arbre) se range en profondeur selon son pied. */
  auSol: z.boolean().default(false),
  /** Zone de blocage au pied du décor, en pixels. Bien plus petite que le sprite :
   *  on doit pouvoir passer derrière un arbre sans se cogner à son feuillage. */
  largeurObstacle: z.number().int().positive(),
  hauteurObstacle: z.number().int().positive(),
  /** Hauteur du centre de la zone de blocage au-dessus du pied du sprite.
   *  Par défaut la zone est posée sur le pied, ce qui convient aux décors dressés. */
  centreObstacleY: z.number().int().nonnegative().optional(),
});

const symbolesUniques = (liste: { symbole: string }[]) =>
  new Set(liste.map((e) => e.symbole)).size === liste.length;

export const CatalogueTerrainsSchema = z
  .array(TerrainSchema)
  .refine(symbolesUniques, { message: 'deux terrains utilisent le même symbole' });

export const CatalogueDecorsSchema = z
  .array(DecorSchema)
  .refine(symbolesUniques, { message: 'deux décors utilisent le même symbole' });

export const CarteSchema = z
  .object({
    id: Identifiant,
    nom: z.string().min(1),
    solParDefaut: Identifiant,
    departJoueur: z.object({
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
    }),
    /** Une chaîne par ligne, un caractère par case. Se dessine à la main. */
    sol: z.array(z.string().min(1)).min(1),
    /** Même grille, pour ce qui se pose sur le sol. L'espace signifie « rien ». */
    decors: z.array(z.string()).min(1),
  })
  .refine((c) => c.decors.length === c.sol.length, {
    message: 'les grilles « sol » et « decors » n’ont pas le même nombre de lignes',
  })
  .refine((c) => new Set([...c.sol, ...c.decors].map((l) => l.length)).size === 1, {
    message: 'toutes les lignes doivent avoir exactement la même longueur',
  });

export type Terrain = z.infer<typeof TerrainSchema>;
export type Decor = z.infer<typeof DecorSchema>;
export type Carte = z.infer<typeof CarteSchema>;
