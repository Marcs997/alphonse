/* assets.js — chargement des images du jeu.
   - alphonse.png : le mouton (détouré, fond transparent)
   - les .svg : décor (arbres, mares, cabane, herbe, bois, fleurs...)
   Les SVG sont dessinés directement sur le canvas (le navigateur les rend nets
   à n'importe quelle taille). Si une image manque, le jeu continue quand même. */

const Assets = {
  images: {},
  loaded: false,

  load(onReady) {
    const list = [
      ["alphonse", "assets/alphonse.png"],
      ["tile", "assets/tile-grass.svg"],
      ["tree", "assets/tree.svg"],
      ["pond", "assets/pond.svg"],
      ["cabin", "assets/cabin.svg"],
      ["grass", "assets/grass.svg"],
      ["wood", "assets/wood.svg"],
      ["bush", "assets/bush.svg"],
      ["flower", "assets/flower.svg"],
      ["mushroom", "assets/mushroom.svg"],
      ["stone", "assets/stone.svg"],
      ["fence", "assets/fence-post.svg"],
      ["cloud", "assets/cloud.svg"],
      ["sparkle", "assets/sparkle.svg"],
    ];

    let remaining = list.length;
    const done = () => { if (--remaining === 0) { this.loaded = true; onReady(); } };

    list.forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; done(); };
      img.onerror = () => { done(); }; // on continue même si une image manque
      img.src = src;
    });
  },

  // Dessine une image centrée en (x,y) à une hauteur voulue (garde le ratio).
  // anchor : 0 = centré, 1 = posé au sol (le bas de l'image touche y).
  draw(ctx, key, x, y, h, anchor = 0) {
    const img = this.images[key];
    if (!img || !img.width) return false;
    const w = h * (img.width / img.height);
    ctx.drawImage(img, x - w / 2, y - h * (anchor ? 0.93 : 0.5), w, h);
    return true;
  },
};
