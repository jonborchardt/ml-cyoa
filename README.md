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

## In-game tabs

Each game has three tabs — **Story**, **Flow**, and **Authors** — accessible from the shared header while playing. The **Flow** tab shows a read-only, pan/zoom tree diagram of all choices and endings, built at runtime from the bundled ChoiceScript text. The **Authors** tab shows an alternating image/bio grid for each author.

## Adding a game

1. Create `src/games/<your-game-id>/startup.txt` (and any other scene files). Optionally add a square cover image.
2. Register it in [src/games/index.ts](src/games/index.ts). Use the `authors()` helper to attach optional bio text and images (named `author-0.png`, `author-1.png`, …):
    ```ts
    // At the top of games/index.ts the helpers are already defined:
    //   startup(id)          — loads <id>/startup.txt via Vite ?raw
    //   cover(id)            — loads <id>/cover.png (optional)
    //   authors(id, entries) — maps name/bio pairs + author-N.png images

    // Add to the games array:
    {
        id: 'my-game',
        title: 'My Game',
        authors: authors('my-game', [
            { name: 'Author One', bio: 'Short bio.' },
            { name: 'Author Two', bio: 'Short bio.' },
        ]),
        year: '2025-2026',
        sceneList: ['startup'],          // order matters: scenes flow in order
        scenes: { startup: startup('my-game') },
        coverImage: cover('my-game'),    // undefined if no cover.png
    },
    ```
3. The game becomes available at `/<base>/<your-game-id>` and appears on the home page, grouped by year.

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
- **React Flow** (`@xyflow/react`) — story branching diagrams
- **ChoiceScript** engine — vendored from [dfabulich/choicescript](https://github.com/dfabulich/choicescript), BSD-2 licensed
- Service worker + web app manifest for installability and offline play
