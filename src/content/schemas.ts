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
