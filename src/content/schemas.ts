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
  /** Sprite servant d'icône dans le sac. Doit être un sprite déjà utilisé par
   *  un décor : on n'a pas de jeu d'icônes dédié, on montre donc ce qui produit
   *  la ressource — lisible sans savoir lire. */
  icone: z.string().min(1).optional(),
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

export const RecolteSchema = z.object({
  /** Identifiant d'un objet de objets.json. */
  objet: Identifiant,
  quantite: z.number().int().positive(),
  /** Sprite affiché une fois récolté, le temps que ça repousse. */
  spriteEpuise: z.string().min(1),
  /** Délai de repousse. La ressource revient toujours : rien n'est définitivement
   *  perdu dans ce jeu (invariant 2 de GAME_DESIGN.md). */
  repousseSecondes: z.number().int().positive(),
});

export const DecorSchema = z
  .object({
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
    largeurObstacle: z.number().int().positive().optional(),
    hauteurObstacle: z.number().int().positive().optional(),
    /** Hauteur du centre de la zone de blocage au-dessus du pied du sprite.
     *  Par défaut la zone est posée sur le pied, ce qui convient aux décors dressés. */
    centreObstacleY: z.number().int().nonnegative().optional(),
    /** Présent si le décor se récolte. Absent sinon. */
    recolte: RecolteSchema.optional(),
  })
  .refine((d) => !d.solide || (d.largeurObstacle !== undefined && d.hauteurObstacle !== undefined), {
    message: 'un décor solide doit indiquer largeurObstacle et hauteurObstacle',
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

export const RecetteSchema = z.object({
  id: Identifiant,
  /** Identifiant d'un objet de objets.json. */
  resultat: Identifiant,
  quantite: z.number().int().positive(),
  ingredients: z
    .array(z.object({ objet: Identifiant, quantite: z.number().int().positive() }))
    .min(1, 'une recette sans ingrédient n’a pas de sens'),
  /** Les recettes au feu de camp donnent une raison de rentrer au campement. */
  auFeuDeCamp: z.boolean(),
});

export const EnnemiSchema = z.object({
  id: Identifiant,
  nom: z.string().min(1),
  /** Nom du fichier dans public/assets/sprites/monstres/, sans l'extension. */
  sprite: z.string().min(1),
  pointsDeVie: z.number().int().positive(),
  degats: z.number().int().positive(),
  vitesse: z.number().int().positive(),
  /** Distance à laquelle la créature frappe. */
  porteeAttaque: z.number().int().positive(),
  /** Distance à laquelle elle remarque la joueuse et se met à la suivre. */
  distanceDeReveil: z.number().int().positive(),
});

const ConditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ramasser'), objet: Identifiant, quantite: z.number().int().positive() }),
  z.object({ type: z.literal('fabriquer'), objet: Identifiant, quantite: z.number().int().positive() }),
  z.object({ type: z.literal('vaincre'), quantite: z.number().int().positive() }),
  z.object({ type: z.literal('manger'), quantite: z.number().int().positive() }),
  z.object({ type: z.literal('survivre'), jours: z.number().int().positive() }),
]);

export const MissionSchema = z.object({
  id: Identifiant,
  /** Phrase courte, à la deuxième personne, sans jargon. Lue par une enfant. */
  texte: z.string().min(1).max(60, 'maximum 60 caractères : ça doit tenir en un coup d’œil'),
  condition: ConditionSchema,
});

const idsUniques = (liste: { id: string }[]) => new Set(liste.map((e) => e.id)).size === liste.length;

export const CatalogueRecettesSchema = z
  .array(RecetteSchema)
  .refine(idsUniques, { message: 'deux recettes portent le même identifiant' });

export const CatalogueEnnemisSchema = z
  .array(EnnemiSchema)
  .refine(idsUniques, { message: 'deux créatures portent le même identifiant' });

export const CatalogueMissionsSchema = z
  .array(MissionSchema)
  .min(1)
  .refine(idsUniques, { message: 'deux missions portent le même identifiant' });

export type Ennemi = z.infer<typeof EnnemiSchema>;
