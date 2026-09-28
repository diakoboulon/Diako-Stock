# Diako Stock — démarrage

## 1. Copier les clés Supabase
Copie `.env.local.example` en `.env.local` et vérifie les deux valeurs (déjà pré-remplies avec ton projet `diako-stock-dev`).

## 2. Installer et lancer en local (si tu as un ordinateur avec Node.js)
```
npm install
npm run dev
```
Ouvre http://localhost:3000

## 3. Mettre en ligne avec Vercel (recommandé, sans ordinateur puissant)
1. Crée un dépôt sur GitHub et envoie ce dossier dedans.
2. Va sur vercel.com, connecte-toi avec GitHub.
3. "New Project" → sélectionne le dépôt.
4. Dans "Environment Variables", ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (les mêmes valeurs que dans `.env.local`)
5. Clique sur "Deploy".

## Pages incluses dans cette première version
- `/connexion`
- `/inscription` (crée le compte ET le commerce automatiquement)
- `/tableau-de-bord` (résumé du jour, alertes de stock)

## Important
Ce code n'a pas pu être testé dans cet environnement (pas d'accès réseau pour installer les paquets). Teste-le d'abord en local ou sur Vercel, et signale-moi toute erreur — je la corrige avec toi.
