# CLAUDE.md — Règles du projet

Contrat de travail pour toute session d'assistant sur ce dépôt.
Lire ce fichier **et** `GAME_DESIGN.md` avant toute modification.

---

## Le projet

Jeu d'aventure 2D vu de dessus (nom de code : *Lueur*), destiné à une joueuse de
9 ans. Mélange de mécaniques de *Don't Starve* (récolte, craft, jour/nuit) et de
*Zelda* (exploration, combat, donjons, capacités déblocables).

Le document de référence est `GAME_DESIGN.md`. En cas de contradiction entre ce
fichier et une demande, `GAME_DESIGN.md` fait foi.

---

## Les sept invariants — à ne jamais casser

Ils priment sur toute demande de fonctionnalité. Une issue qui en casse un se
refuse par défaut ; seule une levée explicite de l'arbitre (Xavier Paolucci) les
suspend.

1. Aucun écran de game over.
2. Aucune perte irréversible (jamais les outils, l'équipement, les objets de quête).
3. Sauvegarde automatique toutes les 30 s et à chaque changement de zone.
4. Un seul objectif affiché à la fois.
5. Icônes plutôt que texte ; aucune progression ne dépend de la lecture.
6. Aucun timer stressant, aucun son agressif.
7. Mode balade disponible (désactive faim et ennemis).

Avant de livrer une fonctionnalité, vérifier explicitement ces sept points.

---

## Règle d'architecture

**Aucune donnée de contenu en dur dans `src/engine/`.**

Objets, recettes, ennemis, cartes, textes : tout vit dans `src/content/` en JSON,
validé par un schéma zod. Le moteur ne connaît que les schémas, jamais les valeurs.

Cette règle existe pour une raison précise : des non-développeurs éditent les
fichiers de `src/content/` directement depuis l'interface web de GitHub. Si une
valeur est codée en dur dans le moteur, ils ne peuvent plus l'atteindre.

Test à se poser avant chaque commit : *« ajouter un nouvel objet demande-t-il de
toucher au code ? »* Si oui, l'architecture est cassée.

---

## Structure

```
src/
  engine/     Systèmes purs, testables, sans dépendance à Phaser si possible
  scenes/     Écrans Phaser
  content/    JSON + schémas zod
  ui/         Affichage des jauges, objectif courant, menus
public/assets/  Sprites, tuiles, sons — servis tels quels
                (licences tracées dans public/assets/CREDITS.md : CC-BY-SA,
                 l'attribution est une obligation, ne rien y supprimer)
scripts/      Outils de build
tests/        Tests de la logique pure — pas du rendu
```

---

## Conventions

- **TypeScript strict.** Pas de `any`, pas de `@ts-ignore` sans commentaire justifiant.
- **Français** pour les commentaires, les messages d'erreur destinés aux
  commanditaires, et les textes du jeu. Anglais pour les noms de symboles.
- **Pas de commentaire qui paraphrase le code.** Un commentaire explique un
  *pourquoi*, jamais un *quoi*.
- Les messages d'erreur de validation du contenu sont **en français et
  actionnables** : ils s'adressent à quelqu'un qui édite un JSON, pas à un dev.
- Tests sur la logique pure uniquement (inventaire, craft, faim, dégâts).
  Ne pas tester le rendu Phaser.

---

## Commandes

```bash
npm run dev       # serveur de développement
npm run build     # typecheck + validation du contenu + build de production
npm run validate  # valide les JSON de src/content/ contre leurs schémas
npm run test      # tests unitaires
npm run check     # typecheck seul
```

`npm run build` doit passer avant tout commit.

---

## Workflow

Une demande arrive par une **issue GitHub**. Pour chacune :

1. Une branche dédiée, nommée `feat/…`, `fix/…` ou `content/…`.
2. Une pull request qui référence l'issue.
3. `npm run build` vert avant de proposer la PR.
4. Une phrase dans la PR indiquant comment tester la chose en jeu.

**Une demande à la fois.** Deux modifications simultanées sur le même fichier
créent des conflits. Si deux chantiers doivent avancer en parallèle, séparer les
périmètres (par exemple l'un sur `content/`, l'autre sur `engine/`).

---

## Arbitrage

Xavier Paolucci tranche sur le design. Un second commanditaire propose via les
issues. En cas de demandes contradictoires, signaler la contradiction dans l'issue
plutôt que de choisir soi-même.
