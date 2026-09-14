# Lueur — Document de design

> Nom de code provisoire. Le nom définitif est à faire choisir par la joueuse.

**Version** : 0.1 (proposition, à valider)
**Date** : 14 septembre 2026

---

## 1. Pitch

Un jeu d'aventure 2D vu de dessus. On explore une forêt enchantée, on récolte,
on fabrique son équipement, on affronte des créatures et on perce des donjons.
La survie donne le rythme ; elle ne punit jamais.

**Le mélange, concrètement** : la récolte, le craft et le cycle jour/nuit viennent
de *Don't Starve*. L'exploration, le combat à l'épée, les donjons et les capacités
à débloquer viennent de *Zelda*. On retire de *Don't Starve* tout ce qui est
hostile : la mort définitive, la santé mentale, la faim punitive, l'ambiance sombre.

**Ton visuel** : pixel art coloré et chaleureux. Créatures expressives, jamais
effrayantes. Pas de sang, pas d'ambiance angoissante.

**Direction de référence** (14 septembre 2026) : une illustration peinte de forêt
habitée — cabane, feu de camp, animaux, interface en panneaux arrondis vert
sombre. Le rendu peint lui-même n'est pas atteignable avec des assets libres et
n'est pas visé. Ce qui l'est, et qui produit l'essentiel de l'effet : l'interface,
la composition du monde, la vie ambiante et la densité de décor.

---

## 2. La joueuse

Une enfant de 9 ans, seule devant l'écran, sans adulte pour l'aider.
Tout le design découle de cette contrainte.

### Invariants d'accessibilité — non négociables

Ces sept règles ne se discutent pas. Une demande d'évolution qui en casse une est
refusée par défaut ; il faut une décision explicite de l'arbitre pour la lever.

1. **Aucun écran de game over.** Mourir renvoie au campement, rien de plus.
2. **Aucune perte irréversible.** À la mort : la moitié des ressources brutes.
   Jamais les outils, l'équipement ni les objets de quête.
3. **Sauvegarde automatique** toutes les 30 secondes, à chaque récolte et à la
   fermeture de l'onglet. Jamais demandée à la joueuse : elle n'a pas à savoir
   que ça existe, elle doit simplement retrouver sa partie en revenant.
   Une sauvegarde illisible est ignorée et la partie repart proprement — refuser
   de démarrer serait le pire comportement possible.
4. **Un seul objectif affiché à la fois**, en haut à gauche, en une phrase courte.
5. **Icônes plutôt que texte.** Aucune progression ne dépend de la lecture d'un
   texte long. Police large et lisible partout.
   Corollaire appris à l'usage : **aucune touche ne doit être devinée**. Les
   commandes sont affichées à l'accueil, rappelées dans le menu de pause, et
   surtout proposées en contexte — la touche apparaît au moment où elle sert,
   à côté de la chose qu'elle concerne.
6. **Aucun timer stressant**, aucun son agressif, aucune pression temporelle.
7. **Mode balade**, touche **B** : gèle la faim, efface les créatures et rend le
   plein jour. Pour explorer tranquillement, sans rien à gérer.

---

## 3. Boucle de jeu

```
Explorer  →  Récolter  →  Fabriquer  →  S'équiper  →  Percer un donjon
    ↑                                                        │
    └──────────  Débloquer une capacité et une zone  ◄────────┘
```

Une boucle complète : environ 20 à 30 minutes au MVP.

### Survie douce

- **Faim** : une jauge qui se vide en ~15 minutes de jeu. À vide, le personnage
  ralentit et perd un cœur toutes les 20 secondes. Jamais de mort brutale.
- **Nuit** : l'écran s'assombrit, les créatures sont plus nombreuses. Le
  campement reste sûr et éclairé. La nuit dure 2 minutes contre 6 pour le jour.
- **Créatures de jour** : il y en a aussi en pleine journée, loin du campement.
  N'en mettre que la nuit revenait à n'en montrer aucune avant six minutes de
  jeu, et la joueuse concluait qu'il n'y avait pas de méchants du tout.
- **Écarté du MVP** : saisons, température, santé mentale, faim des compagnons.

### Récolte

Un bouton unique, **E**, agit sur la ressource la plus proche dans un rayon
généreux. Un halo signale en permanence ce qui est à portée : à 9 ans on appuie
en étant approximativement au bon endroit, viser juste serait frustrant.

**Les ressources repoussent toujours.** Un arbre récolté s'éclaircit puis
redevient normal, un buisson perd ses fruits puis les retrouve. La forêt ne peut
pas être détruite, et rien n'est définitivement perdu — c'est l'invariant 2
appliqué au monde et non seulement au sac.

Quand le sac est plein, le surplus est **refusé** et annoncé, jamais absorbé en
silence : une récolte qui disparaît sans explication est incompréhensible.

### Combat

Un bouton d'attaque, une épée à fabriquer d'abord, court délai de récupération.
Trois cœurs au départ. Chaque créature **annonce son coup** : elle s'immobilise
et clignote une demi-seconde avant de frapper. S'éloigner pendant l'annonce
suffit à l'éviter — sans ce signal, se faire toucher paraît arbitraire.

Tomber à zéro cœur réveille au campement. Ni écran, ni compte à rebours : on
perd la moitié de ses ressources brutes, jamais les outils, l'équipement ni la
nourriture.

### Découvrabilité

Un écran d'accueil ouvre le jeu et affiche les commandes avant même de
commencer. Le menu de pause (Échap) les rappelle et donne accès au mode balade
sans raccourci à connaître. Tout y est cliquable autant que navigable au
clavier : à 9 ans on tend la main vers la souris avant de chercher une touche.

En jeu, une bulle affiche une seule aide à la fois, choisie selon la situation :
la plus utile sur l'instant. Enchaîner les conseils reviendrait à ne rien dire.

### Le campement

Un feu de camp au centre de la clairière. Il sert de trois choses : point de
réveil, seule station de fabrication, et refuge — les créatures n'y frappent
pas, et sa lueur perce la nuit.

### Donjon

Une carte fermée de 4 à 6 salles. Une clé à trouver, une énigme simple (pousser des
blocs, allumer des torches dans le bon ordre), un mini-boss, et une récompense qui
**débloque une capacité** ouvrant une nouvelle zone du monde — le ressort de Zelda.

---

## 4. Périmètre du MVP

### Dedans

| Élément | Quantité |
|---|---|
| Biome | 1 (forêt) |
| Donjon | 1 |
| Objets | 12 |
| Recettes de craft | 6 |
| Ennemis | 3 + 1 mini-boss |
| Capacité déblocable | 1 |

Plus : déplacement, collisions, récolte, inventaire, cycle jour/nuit, faim, cœurs,
campement, sauvegarde automatique, mode balade.

### Dehors (explicitement)

Multijoueur, monde procédural, saisons, compagnons, PNJ marchands, dialogues
ramifiés, sons et musique (palier 3), manette (palier 3), tactile (palier 3).

**Estimation** : 4 à 6 semaines pour atteindre la fin du palier 2.

---

## 5. Contrôles

| Action | Touche |
|---|---|
| Déplacement | Flèches **et** ZQSD **et** WASD (les trois actifs) |
| Récolter | E |
| Manger | A |
| Fabriquer | C |
| Attaquer | Espace |
| Mode balade | B |

Une touche, une action, sans menu à parcourir. Fabriquer produit la première
recette réalisable et dit ce qui manque sinon ; manger consomme l'aliment le
plus nourrissant. À 9 ans, une liste à naviguer coûte plus qu'elle n'apporte.

Manette au palier 3, tactile au palier 3.

---

## 6. Architecture technique

**Stack** : TypeScript (mode strict) + Phaser 4 + Vite. Tout tourne dans le
navigateur, rien à installer pour jouer.

```
src/
  engine/     Systèmes purs : input, physique, inventaire, craft, combat, save
  scenes/     Écrans Phaser : boot, menu, monde, donjon, inventaire
  content/    Données JSON : objets, recettes, ennemis, cartes, textes
  ui/         Barres de vie, faim, objectif courant, menus
public/assets/  Sprites, tuiles, sons — servis tels quels, crédits inclus
scripts/      Outils de build (validation du contenu, fabrication des sprites)
tests/        Tests de la logique pure (pas du rendu)

GAME_DESIGN.md  Ce document — la référence du projet
CLAUDE.md       Les règles que suit l'assistant qui code
```

### Règle d'or

**Aucune donnée de contenu en dur dans `engine/`.** Un objet, une recette, un
ennemi, une carte : tout vit dans `content/` en JSON.

Conséquence directe : ajouter un objet ou régler l'équilibrage se fait en éditant
une ligne de JSON, **depuis l'interface web de GitHub**, sans installer quoi que
ce soit et sans passer par moi.

### Garde-fou

Chaque fichier de `content/` est validé par un schéma (zod) **au moment du build**.
Un JSON mal édité fait échouer le build avec un message clair en français, au lieu
de casser le jeu en silence. C'est indispensable dès lors que des non-développeurs
éditent directement ces fichiers.

### Assets

**Liberated Pixel Cup (LPC)**, sous CC-BY-SA 3.0 / GPL 3.0 : tuiles de 32 px,
personnages de 64 px animés en quatre directions, ennemis inclus.

L'attribution nominative est obligatoire : elle est livrée avec le jeu dans
`public/assets/CREDITS.md` et `public/assets/licences/`. Le partage à l'identique
n'a pas d'effet pratique pour un usage familial privé, mais il interdirait une
diffusion sous licence fermée — décision actée le 14 septembre 2026.

---

## 7. Paliers

| Palier | Contenu | Livrable |
|---|---|---|
| **0 — Fondations** | Repo privé, CI, déploiement automatique, formulaires de demande | Un lien qui affiche une page |
| **1 — Le monde** | Déplacement, carte, récolte, inventaire, craft, faim, jour/nuit, 3 ennemis, sauvegarde | Jouable, une boucle complète |
| **2 — Le donjon** | Donjon, clé, énigme, mini-boss, capacité débloquée, 2e zone | Le MVP est atteint |
| **3 — Confort** | Sons, musique, manette, tactile, écran-titre | Version présentable |
| **4 — À la demande** | Biomes, objets, ennemis, quêtes | Contenu ajouté en continu |

---

## 8. Workflow de demandes

1. Une demande = une **issue GitHub**, déposée via un formulaire guidé
   (nouvel objet, bug, idée de gameplay, équilibrage).
2. Je traite une issue à la fois : une branche, une **pull request**, un **lien de
   preview** jouable rattaché à la PR.
3. Le demandeur teste via le lien, valide ou recale.
4. Fusion → déploiement automatique de la version de référence.

**Déploiement** : Cloudflare Pages (gratuit, compatible repo privé).
GitHub Pages ne sert pas les repos privés sur un compte gratuit.

### Arbitrage

**Xavier Paolucci tranche sur le design du jeu.** L'autre commanditaire propose,
via une issue. En cas de demandes contradictoires, c'est son arbitrage qui fait foi.

Le seul veto automatique est celui des sept invariants d'accessibilité de la
section 2 : une demande qui en casse un est refusée, sauf levée explicite de
l'arbitre.

### Parallélisme

Deux sessions qui modifient le même fichier en même temps créent des conflits.
Règle : **une demande à la fois**, ou des périmètres qui ne se recouvrent pas
(par exemple l'un sur `content/`, l'autre sur `engine/`).

---

## 9. Points laissés ouverts

- Nom définitif du jeu — à faire choisir par la joueuse.
- Apparence du personnage principal (dépend du pack d'assets retenu).
