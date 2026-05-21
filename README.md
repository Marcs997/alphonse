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

## Page admin — journal des visites (Google Apps Script)

Une page privée `admin.html` (aucun lien depuis le jeu) liste les **100 dernières
visites** : date, IP, OS, appareil, navigateur. Les données sont stockées dans une
**Google Sheet** via un petit script Google (gratuit, pas de serveur à héberger).
Le mot de passe est vérifié **côté Google**, jamais dans la page publiée.

### Mise en place (une seule fois)

1. Va sur **sheets.google.com** → crée une feuille de calcul vide (nom au choix).
2. Menu **Extensions → Apps Script**. Une page de code s'ouvre.
3. Efface le contenu, colle **tout** le fichier [`apps-script/Code.gs`](apps-script/Code.gs).
4. En haut du code, remplace `change-moi-stp` par **ton mot de passe** admin.
5. Clique **Enregistrer** (icône disquette).
6. Bouton **Déployer → Nouveau déploiement** → type **Application Web** :
   - *Exécuter en tant que* : **Moi**
   - *Qui a accès* : **Tout le monde**
   - **Déployer** (autorise l'accès quand Google le demande).
7. Copie l'**URL du déploiement** (se termine par `/exec`).
8. Donne-moi cette URL : je la colle dans [`js/config.js`](js/config.js) et je publie.
   *(Tu peux aussi la coller toi-même à la place de `REMPLACER_PAR_TON_URL_EXEC`.)*

### Consulter les visites

Ouvre **`https://<pseudo>.github.io/alphonse/admin.html`**, tape ton mot de passe.
Aucune trace de cette page dans le jeu ; le lien ne se devine pas.

> Note : l'IP est récupérée via l'API publique `api.ipify.org` côté visiteur, puis
> envoyée au script. Le point d'enregistrement est ouvert (nécessaire pour que
> chaque visiteur logge sa visite), mais **la lecture** exige le mot de passe.

## Publier gratuitement sur GitHub Pages (on le fera ensemble)

1. Créer un dépôt GitHub (je te guiderai pas à pas).
2. Y pousser les fichiers du jeu.
3. Réglages → **Pages** → publier la branche `main`.
4. URL publique du type `https://<pseudo>.github.io/alphonse/`, ouvrable
   directement sur le téléphone. Aucun serveur, aucun coût.
