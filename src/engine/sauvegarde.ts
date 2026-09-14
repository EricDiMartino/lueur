import { z } from 'zod';
import type { Inventaire } from './inventaire';
import { COEURS_MAX, FAIM_MAX, type Survie } from './survie';
import { MISSIONS_NEUVES, type EtatMissions } from './missions';

/**
 * Sauvegarde locale.
 *
 * Invariant 3 de GAME_DESIGN.md : sauvegarde automatique, jamais demandée à la
 * joueuse. Elle n'a pas à savoir que ça existe, elle doit juste retrouver sa
 * partie en rouvrant l'onglet.
 *
 * La lecture est volontairement tolérante : une sauvegarde illisible, d'une
 * version antérieure ou corrompue, est ignorée et la partie repart proprement.
 * Refuser de démarrer serait le pire comportement possible pour une enfant
 * seule devant l'écran.
 */

export const CLE_SAUVEGARDE = 'lueur.partie';
/** À incrémenter quand la forme des données change de façon incompatible. */
export const VERSION_SAUVEGARDE = 2;

const SurvieSchema = z.object({
  coeurs: z.number().int().min(0).max(COEURS_MAX),
  faim: z.number().min(0).max(FAIM_MAX),
  secondesVentreVide: z.number().min(0),
});

const CompteursSchema = z.object({
  ramasses: z.record(z.string(), z.number().int().nonnegative()),
  fabriques: z.record(z.string(), z.number().int().nonnegative()),
  vaincus: z.number().int().nonnegative(),
  manges: z.number().int().nonnegative(),
  jour: z.number().int().positive(),
});

const PartieSchema = z.object({
  version: z.literal(VERSION_SAUVEGARDE),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  inventaire: z.record(z.string(), z.number().int().nonnegative()),
  /** Identifiants des décors récoltés, pour ne pas les faire réapparaître pleins. */
  decorsEpuises: z.array(z.number().int().nonnegative()),
  survie: SurvieSchema,
  secondesEcoulees: z.number().nonnegative(),
  missions: z.object({ index: z.number().int().nonnegative(), compteurs: CompteursSchema }),
  modeBalade: z.boolean(),
});

export type Partie = z.infer<typeof PartieSchema>;

export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

/** Stockage inerte : tout s'écrit dans le vide, la partie continue sans sauvegarde. */
const STOCKAGE_INERTE: Stockage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * Accès au stockage du navigateur.
 *
 * Dans certains modes de confidentialité, la simple lecture de
 * `window.localStorage` lève une exception : il faut donc la tenter, et non
 * seulement protéger les appels qui suivent.
 */
export function stockageDuNavigateur(): Stockage {
  try {
    const test = window.localStorage;
    const sonde = '__lueur_test__';
    test.setItem(sonde, '1');
    test.removeItem(sonde);
    return test;
  } catch {
    return STOCKAGE_INERTE;
  }
}

export interface EtatDeJeu {
  survie: Survie;
  secondesEcoulees: number;
  missions: EtatMissions;
  modeBalade: boolean;
}

export function serialiser(
  position: { x: number; y: number },
  inventaire: Inventaire,
  decorsEpuises: readonly number[],
  etat: EtatDeJeu = {
    survie: { coeurs: COEURS_MAX, faim: FAIM_MAX, secondesVentreVide: 0 },
    secondesEcoulees: 0,
    missions: MISSIONS_NEUVES,
    modeBalade: false,
  },
): Partie {
  return {
    version: VERSION_SAUVEGARDE,
    position: { x: Math.round(position.x), y: Math.round(position.y) },
    inventaire: { ...inventaire },
    decorsEpuises: [...decorsEpuises],
    survie: etat.survie,
    // Arrondi à la seconde : la précision au centième n'apporte rien.
    secondesEcoulees: Math.round(etat.secondesEcoulees),
    missions: { index: etat.missions.index, compteurs: etat.missions.compteurs },
    modeBalade: etat.modeBalade,
  };
}

/** Écrit la partie. Un stockage indisponible n'est jamais une erreur fatale. */
export function ecrire(stockage: Stockage, partie: Partie): boolean {
  try {
    stockage.setItem(CLE_SAUVEGARDE, JSON.stringify(partie));
    return true;
  } catch {
    // Navigation privée, quota plein, stockage désactivé : on continue à jouer.
    return false;
  }
}

/** Relit la partie. Renvoie null dès que quoi que ce soit cloche. */
export function lire(stockage: Stockage): Partie | null {
  let brut: string | null;
  try {
    brut = stockage.getItem(CLE_SAUVEGARDE);
  } catch {
    return null;
  }
  if (!brut) return null;

  try {
    const resultat = PartieSchema.safeParse(JSON.parse(brut));
    return resultat.success ? resultat.data : null;
  } catch {
    return null;
  }
}

export function effacer(stockage: Stockage): void {
  try {
    stockage.removeItem(CLE_SAUVEGARDE);
  } catch {
    // Rien à faire : l'absence de sauvegarde est déjà l'état voulu.
  }
}
