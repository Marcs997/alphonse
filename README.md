# Alphonse 🐑

Mini-jeu cozy navigateur. Alphonse le mouton récolte de l'herbe et du bois
dans une prairie, et construit des cabanes pour bâtir un petit village.
**100 % HTML / CSS / JavaScript — aucune installation, aucun serveur, aucun backend.**

## Jouer

- **Le plus simple** : double-clique `index.html` → ça s'ouvre dans ton navigateur.
- **Sur téléphone** : une fois publié (voir plus bas), ouvre l'URL dans le navigateur
  du téléphone. C'est l'usage principal du jeu.

Comment on joue : on touche la prairie, Alphonse y va. Il ramasse l'herbe
(Score +10) et le bois (Bois +3). À 50 de bois, le bouton **Construire** s'active :
touche-le, puis touche un endroit pour poser une cabane (Bois −50). Autant de
cabanes que tu veux → un village.

## Contenu

| Élément       | Rôle                                             |
|---------------|--------------------------------------------------|
| `index.html`  | la page                                          |
| `style.css`   | l'apparence (plein écran mobile)                 |
| `js/`         | le code du jeu (vanilla JS, commenté)            |
| `assets/`     | l'image d'Alphonse détourée                      |
| `.nojekyll`   | sert les fichiers tels quels sur GitHub Pages    |
| `tools/`      | **outils de fabrication/test — pas dans le jeu** |

Le dossier `tools/` (scripts de détourage d'image et de test automatique)
est exclu via `.gitignore` : il ne sera **pas** publié.

## Publier gratuitement sur GitHub Pages (on le fera ensemble)

1. Créer un dépôt GitHub (je te guiderai pas à pas).
2. Y pousser les fichiers du jeu.
3. Réglages → **Pages** → publier la branche `main`.
4. URL publique du type `https://<pseudo>.github.io/alphonse/`, ouvrable
   directement sur le téléphone. Aucun serveur, aucun coût.
