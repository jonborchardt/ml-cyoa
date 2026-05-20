# ml-cyoa

**Middle Level Choose Your Own Adventure.** A SPA + PWA hosting a small collection of [ChoiceScript](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/) games. Built with Vite, TypeScript, React, MUI, and the official ChoiceScript engine.

## Stack

- **Vite** (v7) — build tool and dev server. `base` is `/ml-cyoa/` for GitHub Pages.
- **TypeScript** (strict mode)
- **React** 18
- **React Router** v7 (BrowserRouter with `basename = import.meta.env.BASE_URL`)
- **MUI** v7 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- **ChoiceScript engine** — vendored under [public/choicescript/](public/choicescript/) (BSD-2). NOT installed via npm; copied from [dfabulich/choicescript](https://github.com/dfabulich/choicescript) `web/`.
- **gh-pages** — for deploys to the `gh-pages` branch.

Varnish is intentionally NOT used.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173/ml-cyoa/
npm run build    # type-check + bundle
npm run preview  # serve the production build locally
npm run lint
npm run lint:fix
npm run deploy   # build and publish dist/ to the gh-pages branch
```

## Project structure

```
public/
  choicescript/        — vendored ChoiceScript engine + host.html
  manifest.webmanifest — PWA manifest
  sw.js                — service worker (precache + offline)
  404.html             — SPA-redirect shim for GitHub Pages
  icon.svg             — app icon
src/
  main.tsx             — entry point; registers the service worker
  App.tsx              — MUI ThemeProvider + BrowserRouter + routes
  Layout.tsx           — thin flex-column shell wrapping <Outlet />
  HomePage.tsx         — year-grouped card grid listing all games
  GamePage.tsx         — resolves :gameId, renders GameHeader + ChoiceScriptGame
  GameHeader.tsx       — "← Home" button bar shown while a game is active
  CoverArt.tsx         — cover image with fallback icon
  ChoiceScriptGame.tsx — mounts an iframe pointing at /choicescript/host.html and posts the game payload
  games/
    index.ts           — game registry (id, title, authors, year, sceneList, scenes, coverImage?)
    <game-id>/*.txt    — ChoiceScript scene files (imported via Vite ?raw)
    <game-id>/*.png    — optional cover images (imported as asset URLs)
```

Routes: `/` → `HomePage`, `/:gameId` → `GamePage`.

## How the ChoiceScript engine is integrated

The official engine is a large native-JS app that owns the page (it manages `<title>`, body styles, scroll behavior, `window.onload`, lots of specific DOM IDs). To keep it from fighting with React/MUI, each game is rendered **inside an iframe**:

1. `ChoiceScriptGame.tsx` mounts `<iframe src="<base>choicescript/host.html?g=<id>">`. Each game gets a fresh iframe via `key={game.id}`.
2. `public/choicescript/host.html` sets `window.isFile = true` and waits for a `postMessage({type: 'load-game', ...})` from the parent. It posts `{type: 'host-ready'}` to its parent on load.
3. The parent sends the payload using `window.location.origin` as the targetOrigin (same-origin, never `'*'`). The host validates `e.source === window.parent` before acting on any message.
4. The payload includes: `title`, `author`, `coverImage`, `sceneList`, `scenes` (a map of scene name → raw text).
5. The host populates `window.uploadedFiles` (a map of `<name>.txt` → text) — this is the engine's built-in "load from in-memory blobs" mode, so no scenes are fetched over the network.
6. The host then dynamically loads the engine scripts in order, constructs `window.nav = new SceneNavigator(sceneList)` and `window.stats = {}`, and manually fires `window.onload` (since DOMContentLoaded has already fired by that point).

Scene `.txt` files are imported via Vite's `?raw` suffix and bundled into JS at build time — there is no runtime fetch of game content.

## Adding a game

1. Drop scene files at `src/games/<id>/startup.txt` (and any additional `<scene>.txt`). Optionally add a square cover image (`.png`/`.jpg`).
2. Add an entry to `games` in [src/games/index.ts](src/games/index.ts):
    ```ts
    import myStartup from './my-game/startup.txt?raw';
    import myCover from './my-game/cover.png';   // optional
    // ... include in `games`:
    {
        id: 'my-game',
        title: 'My Game',
        authors: ['Author'],
        year: '2025-2026',
        sceneList: ['startup'],            // order matters
        scenes: { startup: myStartup },
        coverImage: myCover,               // optional
    }
    ```
3. The game appears on the home page (grouped by year) and is reachable at `/<id>`.

The `sceneList` order is what ChoiceScript's `SceneNavigator` uses to determine which scene follows which when a scene ends without an explicit `*goto_scene`.

## GitHub Pages deploy

- `vite.config.ts` sets `base = '/ml-cyoa/'`. Change it if you fork to a different repo name.
- `BrowserRouter` uses `basename = import.meta.env.BASE_URL` (trailing slash stripped) so the same routes work in dev and on Pages.
- `public/404.html` + a small decoder snippet in `index.html` implement the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) trick so deep links like `/ml-cyoa/game1` survive a hard refresh on GitHub Pages.
- `npm run deploy` runs `vite build` then `gh-pages -d dist -t true` to publish (the `-t true` flag is required so dotfiles like `.nojekyll`, if you add one later, aren't dropped).

## PWA

- [public/manifest.webmanifest](public/manifest.webmanifest) declares `display: fullscreen`, an SVG icon, and theme color.
- [public/sw.js](public/sw.js) precaches the app shell + engine files at install. Strategy is network-first for HTML (so updates land on next reload) and cache-first for everything else. Bump `CACHE_VERSION` to invalidate.
- The SW does **not** call `skipWaiting()` — it activates on the next navigation rather than mid-session, so active game sessions are never interrupted by a cache swap.
- The SW is registered from `src/main.tsx` only in production builds, so dev reloads aren't intercepted.

## Notable conventions / gotchas

- **Don't import the ChoiceScript engine from `src/`.** It runs only inside the iframe at `/choicescript/host.html`. The host is hand-maintained HTML, not a Vite entry.
- **Don't mount ChoiceScript outside the iframe.** Its CSS and globals (e.g. `window.main`, `window.nav`, `window.stats`) are scoped expectations of the original page; embedding inline would conflict with MUI styling.
- **Scene files** can be edited freely; they trigger a Vite rebuild via `?raw`. They are not exposed as fetchable URLs in `dist/`.
- **`BrowserRouter`** requires GitHub Pages to serve the SPA on unknown paths — that's why `public/404.html` exists. Don't switch to `HashRouter` without removing the redirect plumbing.

## ESLint

Flat config ([eslint.config.js](eslint.config.js)) using stock recommended rule sets only:

- `@eslint/js` recommended
- `typescript-eslint` recommended
- `eslint-plugin-react` recommended + `jsx-runtime` (React 18 JSX transform)
- `eslint-plugin-react-hooks` recommended
