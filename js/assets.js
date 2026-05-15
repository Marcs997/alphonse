/* assets.js — chargement des images du jeu.
   Pour l'instant une seule image : le sprite d'Alphonse.
   Si l'image n'est pas encore prête, le jeu dessine un mouton de secours,
   donc rien ne plante. */

const Assets = {
  images: {},
  loaded: false,

  // Charge toutes les images puis appelle onReady()
  load(onReady) {
    const toLoad = [
      { key: "alphonse", src: "assets/alphonse.png" },
    ];

    let remaining = toLoad.length;
    if (remaining === 0) { this.loaded = true; onReady(); return; }

    toLoad.forEach(({ key, src }) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        if (--remaining === 0) { this.loaded = true; onReady(); }
      };
      img.onerror = () => {
        // Image manquante : on continue quand même (mouton de secours)
        if (--remaining === 0) { this.loaded = true; onReady(); }
      };
      img.src = src;
    });
  },
};
