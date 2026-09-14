# Lueur

Jeu d'aventure 2D vu de dessus : récolte, fabrication, exploration et donjons.
Conçu pour une joueuse de 9 ans.

Le document de référence est **[GAME_DESIGN.md](GAME_DESIGN.md)**.

---

## Jouer

La version de référence est déployée automatiquement à chaque fusion sur `main`.
Chaque pull request produit également un lien de preview jouable.

## Faire une demande

Tout passe par les **[issues](../../issues/new/choose)**, via un formulaire guidé :

| Formulaire | Pour quoi |
|---|---|
| 🎒 Nouvel objet ou recette | Ajouter un objet à ramasser, fabriquer ou équiper |
| 🐞 Quelque chose ne marche pas | Bug, blocage, comportement bizarre |
| 💡 Idée de gameplay | Mécanique, ennemi, donjon, zone |
| ⚖️ Réglage ou équilibrage | Trop dur, trop lent, trop rare |

**Xavier Paolucci arbitre le design.** En cas de demandes contradictoires,
c'est son arbitrage qui fait foi.

## Modifier le contenu sans installer quoi que ce soit

Les objets, recettes et ennemis vivent dans `src/content/` en JSON. Ils
s'éditent directement depuis l'interface web de GitHub : ouvrir le fichier,
cliquer sur le crayon, modifier, proposer la modification.

Une erreur de saisie ne casse pas le jeu : la vérification automatique refuse la
modification et explique en français ce qui ne va pas.

---

## Développement

```bash
npm install
npm run dev       # serveur local, ouvre le navigateur
npm run build     # typage + validation du contenu + build de production
npm run test      # tests unitaires
npm run validate  # vérifie seulement les fichiers de src/content/
```

**Stack** : TypeScript strict, Phaser 4, Vite, zod, Vitest.

Les règles d'architecture sont dans **[CLAUDE.md](CLAUDE.md)**. La principale :
aucune donnée de contenu codée en dur dans `src/engine/`.
