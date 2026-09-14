import { defineConfig } from 'vite';

export default defineConfig({
  // Chemins relatifs : le build fonctionne quel que soit le sous-dossier
  // sur lequel l'hébergeur le sert (previews de PR incluses).
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    // Phaser pèse ~1,4 Mo à lui seul : le seuil par défaut n'a pas de sens ici.
    chunkSizeWarningLimit: 2000,
  },
  server: {
    open: true,
  },
});
