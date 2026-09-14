import { describe, expect, it } from 'vitest';
import {
  COMPTEURS_NEUFS,
  MISSIONS_NEUVES,
  missionCourante,
  noterRamassage,
  noterVictoire,
  progression,
  reevaluer,
  type Mission,
} from '../src/engine/missions';

const missions: Mission[] = [
  { id: 'bois', texte: 'Ramasse 3 bûches', condition: { type: 'ramasser', objet: 'bois', quantite: 3 } },
  { id: 'bois10', texte: 'Ramasse 10 bûches', condition: { type: 'ramasser', objet: 'bois', quantite: 10 } },
  { id: 'creature', texte: 'Écarte une créature', condition: { type: 'vaincre', quantite: 1 } },
];

describe('missions', () => {
  it('affiche la première mission au départ', () => {
    expect(missionCourante(missions, MISSIONS_NEUVES)?.id).toBe('bois');
  });

  it('mesure la progression', () => {
    const c = noterRamassage(COMPTEURS_NEUFS, 'bois', 2);
    expect(progression(missions[0]!.condition, c)).toEqual({ fait: 2, total: 3 });
  });

  it('ne valide pas avant le compte', () => {
    const etat = { index: 0, compteurs: noterRamassage(COMPTEURS_NEUFS, 'bois', 2) };
    expect(reevaluer(missions, etat).validees).toEqual([]);
  });

  it('valide et passe à la suivante', () => {
    const etat = { index: 0, compteurs: noterRamassage(COMPTEURS_NEUFS, 'bois', 3) };
    const r = reevaluer(missions, etat);
    expect(r.validees.map((m) => m.id)).toEqual(['bois']);
    expect(missionCourante(missions, r.etat)?.id).toBe('bois10');
  });

  it('valide plusieurs missions d’un coup et les annonce toutes', () => {
    const etat = { index: 0, compteurs: noterRamassage(COMPTEURS_NEUFS, 'bois', 12) };
    const r = reevaluer(missions, etat);
    expect(r.validees.map((m) => m.id)).toEqual(['bois', 'bois10']);
    expect(missionCourante(missions, r.etat)?.id).toBe('creature');
  });

  it('n’a plus rien à afficher une fois tout terminé', () => {
    let compteurs = noterRamassage(COMPTEURS_NEUFS, 'bois', 12);
    compteurs = noterVictoire(compteurs);
    const r = reevaluer(missions, { index: 0, compteurs });
    expect(r.validees).toHaveLength(3);
    expect(missionCourante(missions, r.etat)).toBeNull();
  });
});
