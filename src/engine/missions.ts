/**
 * Missions. Logique pure, sans Phaser.
 *
 * Invariant 4 : un seul objectif affiché à la fois. Les missions s'enchaînent
 * donc en file, et la suivante n'apparaît qu'une fois la précédente validée.
 */

export type Condition =
  | { type: 'ramasser'; objet: string; quantite: number }
  | { type: 'fabriquer'; objet: string; quantite: number }
  | { type: 'vaincre'; quantite: number }
  | { type: 'manger'; quantite: number }
  | { type: 'survivre'; jours: number };

export interface Mission {
  id: string;
  /** Phrase courte, à la deuxième personne, sans jargon. */
  texte: string;
  condition: Condition;
}

/** Compteurs cumulés depuis le début de la partie. */
export interface Compteurs {
  ramasses: Readonly<Record<string, number>>;
  fabriques: Readonly<Record<string, number>>;
  vaincus: number;
  manges: number;
  jour: number;
}

export const COMPTEURS_NEUFS: Compteurs = Object.freeze({
  ramasses: {},
  fabriques: {},
  vaincus: 0,
  manges: 0,
  jour: 1,
});

export function progression(condition: Condition, compteurs: Compteurs): { fait: number; total: number } {
  switch (condition.type) {
    case 'ramasser':
      return { fait: compteurs.ramasses[condition.objet] ?? 0, total: condition.quantite };
    case 'fabriquer':
      return { fait: compteurs.fabriques[condition.objet] ?? 0, total: condition.quantite };
    case 'vaincre':
      return { fait: compteurs.vaincus, total: condition.quantite };
    case 'manger':
      return { fait: compteurs.manges, total: condition.quantite };
    case 'survivre':
      return { fait: compteurs.jour, total: condition.jours };
  }
}

export function estRemplie(condition: Condition, compteurs: Compteurs): boolean {
  const { fait, total } = progression(condition, compteurs);
  return fait >= total;
}

export interface EtatMissions {
  /** Index de la mission courante dans la liste. Au-delà de la liste : tout est fait. */
  index: number;
  compteurs: Compteurs;
}

export const MISSIONS_NEUVES: EtatMissions = Object.freeze({
  index: 0,
  compteurs: COMPTEURS_NEUFS,
});

export function missionCourante(missions: readonly Mission[], etat: EtatMissions): Mission | null {
  return missions[etat.index] ?? null;
}

/**
 * Fait avancer la file après une modification des compteurs.
 *
 * Plusieurs missions peuvent se valider d'un coup — ramasser dix bûches remplit
 * aussi « ramasse trois bûches ». On renvoie donc la liste de ce qui vient
 * d'être validé, pour pouvoir toutes les annoncer.
 */
export function reevaluer(
  missions: readonly Mission[],
  etat: EtatMissions,
): { etat: EtatMissions; validees: Mission[] } {
  const validees: Mission[] = [];
  let index = etat.index;

  while (index < missions.length && estRemplie(missions[index]!.condition, etat.compteurs)) {
    validees.push(missions[index]!);
    index++;
  }

  return { etat: { ...etat, index }, validees };
}

const incrementer = (
  registre: Readonly<Record<string, number>>,
  cle: string,
  n: number,
): Record<string, number> => ({ ...registre, [cle]: (registre[cle] ?? 0) + n });

export function noterRamassage(c: Compteurs, objet: string, n: number): Compteurs {
  return { ...c, ramasses: incrementer(c.ramasses, objet, n) };
}

export function noterFabrication(c: Compteurs, objet: string, n: number): Compteurs {
  return { ...c, fabriques: incrementer(c.fabriques, objet, n) };
}

export function noterVictoire(c: Compteurs, n = 1): Compteurs {
  return { ...c, vaincus: c.vaincus + n };
}

export function noterRepas(c: Compteurs, n = 1): Compteurs {
  return { ...c, manges: c.manges + n };
}

export function noterJour(c: Compteurs, jour: number): Compteurs {
  return { ...c, jour: Math.max(c.jour, jour) };
}
