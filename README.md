# Qualiconsult Habitations — code source

Cette archive contient le code source de la version 11 du site **Qualiconsult Habitations**.

## Technologies

- React / Next.js compatible Vinext
- TypeScript et TSX pour la structure HTML et les interactions
- CSS pour toute l’identité visuelle et l’impression du rapport
- Vite pour le développement et la compilation

## Fichiers principaux

- `app/page.tsx` : interface, navigation, formulaire et rapport imprimable
- `app/regulations.ts` : moteur des règles réglementaires et résultats de conformité
- `app/globals.css` : styles du site, responsive et mise en page du rapport
- `app/layout.tsx` : structure générale et métadonnées HTML
- `public/` : logo et photographies utilisées par le site

## Installation locale

Prérequis : Node.js 20 ou une version ultérieure.

```bash
npm install
npm run dev
```

Puis ouvrir l’adresse affichée dans le terminal.

## Vérification de production

```bash
npm run lint
npm run build
```

## Remarque

La structure visible dans le navigateur est écrite en TSX. Elle est transformée automatiquement en HTML lors de l’exécution ou de la compilation. Les données saisies dans l’outil sont conservées localement dans le navigateur de l’utilisateur.
