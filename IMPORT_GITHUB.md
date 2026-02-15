# 🚀 Guide Rapide d'Importation GitHub

## Étape 1 : Télécharger et Dézipper

1. Téléchargez le fichier `vitatrack-project.zip`
2. Dézippez-le sur votre ordinateur
3. Vous aurez un dossier `vitatrack-project` avec tous les fichiers

## Étape 2 : Créer le Repository sur GitHub

1. Allez sur https://github.com
2. Cliquez sur le **+** en haut à droite
3. Sélectionnez **New repository**
4. Configurez :
   - **Repository name** : `vitatrack`
   - **Description** : "Application de suivi de santé personnalisé"
   - **Public** ou **Private** (au choix)
   - ⚠️ **NE COCHEZ RIEN** (pas de README, pas de .gitignore)
5. Cliquez sur **Create repository**

## Étape 3 : Importer les Fichiers

### Option A : Via l'interface Web (plus simple)

1. Sur la page de votre nouveau repository vide
2. Cliquez sur **uploading an existing file**
3. **Glissez-déposez** TOUS les fichiers et dossiers du dossier `vitatrack-project`
   - Ou cliquez sur "choose your files" et sélectionnez tout
4. En bas, dans "Commit changes" :
   - Message : `Initial commit - VitaTrack v1`
5. Cliquez sur **Commit changes**

⚠️ **IMPORTANT** : Assurez-vous d'importer :
- Le dossier `src` avec tous ses fichiers
- Le dossier `public`
- Tous les fichiers à la racine (.gitignore, package.json, etc.)

### Option B : Via GitHub Desktop (alternative)

1. Téléchargez GitHub Desktop : https://desktop.github.com
2. Connectez-vous avec votre compte GitHub
3. Cliquez sur **File** > **Add Local Repository**
4. Sélectionnez le dossier `vitatrack-project`
5. Cliquez sur **Publish repository**

## Étape 4 : Vérifier que tout est là

Sur GitHub, vérifiez que vous voyez :
```
vitatrack/
├── public/
│   └── .gitkeep
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   └── supabaseClient.js
├── .gitignore
├── index.html
├── netlify.toml
├── package.json
├── README.md
├── tailwind.config.js
└── vite.config.js
```

✅ Si vous voyez cette structure, c'est parfait !

## Étape 5 : Continuer avec Supabase et Netlify

Maintenant que votre code est sur GitHub, suivez le guide principal (`GUIDE_WEB_ONLY.md`) à partir de l'**ÉTAPE 3 : Configuration Supabase**.

---

## ⚡ Astuces

- **Drag & Drop** : La méthode la plus simple est de faire glisser tous les fichiers en une seule fois
- **Patience** : L'upload peut prendre 1-2 minutes selon votre connexion
- **Vérification** : Toujours vérifier que tous les dossiers et fichiers sont bien présents après l'upload

## 🆘 Problèmes Courants

### Les fichiers ne s'uploadent pas
- Vérifiez votre connexion internet
- Essayez par petits groupes (d'abord `src`, puis le reste)
- Utilisez GitHub Desktop si l'interface web ne fonctionne pas

### Le dossier src est vide
- Assurez-vous de glisser le CONTENU du dossier vitatrack-project
- Pas le dossier vitatrack-project lui-même

### Fichiers manquants
- Affichez les fichiers cachés sur votre ordinateur (pour voir .gitignore)
- Sur Windows : Affichage > Afficher > Éléments masqués
- Sur Mac : Cmd + Shift + . (point)

---

**Prêt ?** Une fois les fichiers sur GitHub, passez à Supabase et Netlify ! 🚀
