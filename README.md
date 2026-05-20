# ml-cyoa

**Middle Level Choose Your Own Adventure.** A small collection of [ChoiceScript](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/) games rendered as a Progressive Web App.

Built with Vite, TypeScript, React, MUI, and the official ChoiceScript engine (vendored into [public/choicescript/](public/choicescript/)).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/ml-cyoa/](http://localhost:5173/ml-cyoa/).

## Scripts

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Start dev server                             |
| `npm run build`    | Type-check and bundle                        |
| `npm run preview`  | Serve production build locally               |
| `npm run lint`     | Run ESLint                                   |
| `npm run lint:fix` | Run ESLint with auto-fix                     |
| `npm run deploy`   | Build and push `dist/` to the `gh-pages` branch |

## Adding a game

1. Create `src/games/<your-game-id>/startup.txt` (and any other scene files).
2. Register it in [src/games/index.ts](src/games/index.ts):
    ```ts
    import myStartup from './my-game/startup.txt?raw';

    export const games: Game[] = [
        // ...
        {
            id: 'my-game',
            title: 'My Game',
            authors: ['Your Name'],
            sceneList: ['startup'], // order matters: scenes flow in order
            scenes: { startup: myStartup },
        },
    ];
    ```
3. The game becomes available at `/<base>/<your-game-id>` and appears in the left menu.

Scene files use the [ChoiceScript syntax](https://choicescriptdev.fandom.com/wiki/ChoiceScript_%E2%80%90_Wiki). The official engine in [public/choicescript/](public/choicescript/) interprets them, so all engine features (`*choice`, `*if`, `*set`, `*goto`, stats, save/load, etc.) work.

## Deploying to GitHub Pages

The site is configured for `https://jonborchardt.github.io/ml-cyoa/` (set in [vite.config.ts](vite.config.ts)). Clean URLs without `#` work via the standard [`404.html` SPA redirect trick](https://github.com/rafgraph/spa-github-pages).

```bash
npm run deploy
```

This builds the site and publishes `dist/` to the `gh-pages` branch using the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package. Enable GitHub Pages in repo settings → Pages → branch `gh-pages` → folder `/ (root)`.

## PWA

The app ships a [manifest](public/manifest.webmanifest) and a [service worker](public/sw.js) that precaches the app shell and engine, so it can launch full-screen from the home screen and continue working offline after the first visit. Bump `CACHE_VERSION` in `public/sw.js` when you ship changes that should invalidate the precache.

## Stack

- **Vite** (v7), **TypeScript** (strict), **React** 18, **React Router** v7 (browser routing)
- **MUI** v7 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- **ChoiceScript** engine — vendored from [dfabulich/choicescript](https://github.com/dfabulich/choicescript), BSD-2 licensed
- Service worker + web app manifest for installability and offline play
