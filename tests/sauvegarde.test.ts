import { describe, expect, it } from 'vitest';
import {
  CLE_SAUVEGARDE,
  ecrire,
  effacer,
  lire,
  serialiser,
  VERSION_SAUVEGARDE,
  type Stockage,
} from '../src/engine/sauvegarde';

function stockageFactice(initial: Record<string, string> = {}): Stockage & { donnees: Record<string, string> } {
  const donnees = { ...initial };
  return {
    donnees,
    getItem: (c) => donnees[c] ?? null,
    setItem: (c, v) => { donnees[c] = v; },
    removeItem: (c) => { delete donnees[c]; },
  };
}

const stockageEnPanne: Stockage = {
  getItem: () => { throw new Error('stockage indisponible'); },
  setItem: () => { throw new Error('quota dépassé'); },
  removeItem: () => { throw new Error('stockage indisponible'); },
};

describe('sauvegarde', () => {
  it('fait un aller-retour fidèle', () => {
    const s = stockageFactice();
    const partie = serialiser({ x: 624, y: 464 }, { bois: 12, baie: 3 }, [4, 17]);
    expect(ecrire(s, partie)).toBe(true);
    expect(lire(s)).toEqual(partie);
  });

  it('arrondit la position : un flottant n’apporte rien et alourdit le fichier', () => {
    expect(serialiser({ x: 624.4917, y: 463.51 }, {}, []).position).toEqual({ x: 624, y: 464 });
  });

  it('ne renvoie rien quand il n’y a pas de partie', () => {
    expect(lire(stockageFactice())).toBeNull();
  });

  it('ignore une sauvegarde illisible plutôt que de planter', () => {
    expect(lire(stockageFactice({ [CLE_SAUVEGARDE]: 'ceci n’est pas du JSON' }))).toBeNull();
  });

  it('ignore une sauvegarde d’une autre version', () => {
    const ancienne = JSON.stringify({
      version: VERSION_SAUVEGARDE + 1,
      position: { x: 0, y: 0 },
      inventaire: {},
      decorsEpuises: [],
    });
    expect(lire(stockageFactice({ [CLE_SAUVEGARDE]: ancienne }))).toBeNull();
  });

  it('ignore une sauvegarde aux données aberrantes', () => {
    const abimee = JSON.stringify({
      version: VERSION_SAUVEGARDE,
      position: { x: 'ici', y: 0 },
      inventaire: { bois: -5 },
      decorsEpuises: [],
    });
    expect(lire(stockageFactice({ [CLE_SAUVEGARDE]: abimee }))).toBeNull();
  });

  it('survit à un stockage indisponible, sans jamais interrompre la partie', () => {
    expect(ecrire(stockageEnPanne, serialiser({ x: 0, y: 0 }, {}, []))).toBe(false);
    expect(lire(stockageEnPanne)).toBeNull();
    expect(() => effacer(stockageEnPanne)).not.toThrow();
  });

  it('efface ce qu’il faut', () => {
    const s = stockageFactice();
    ecrire(s, serialiser({ x: 1, y: 2 }, { bois: 1 }, []));
    effacer(s);
    expect(lire(s)).toBeNull();
  });
});
