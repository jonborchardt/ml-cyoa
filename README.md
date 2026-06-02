# ml-cyoa

**Middle Level Choose Your Own Adventure.** A small collection of [ChoiceScript](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/) games rendered as a Progressive Web App — plus a full in-browser story editor so students can write and submit their own.

Built with Vite, TypeScript, React, MUI, and the official ChoiceScript engine (vendored into [apps/publishing_party/public/choicescript/](apps/publishing_party/public/choicescript/)).

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173/ml-cyoa/](http://localhost:5173/ml-cyoa/).

## Scripts

All scripts run from the workspace root and delegate to the appropriate package.

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `pnpm dev`              | Start dev server (publishing_party)              |
| `pnpm build`            | Build editor library then publishing_party app   |
| `pnpm preview`          | Serve production build locally                   |
| `pnpm lint`             | Run ESLint across all packages                   |
| `pnpm test`             | Run test suite once (editor package)             |
| `pnpm test:watch`       | Run tests in watch mode                          |
| `pnpm test:coverage`    | Coverage report                                  |
| `pnpm deploy`           | Build and push `dist/` to the `gh-pages` branch  |

## Workspace structure

This is a **pnpm workspace monorepo** with two packages:

```
packages/editor/          — @ml-cyoa/editor  (story editor library)
apps/publishing_party/    — @ml-cyoa/publishing-party  (the website)
```

To work on a package directly:

```bash
pnpm --filter editor test:watch
pnpm --filter publishing-party dev
```

## Reading a game

Each game has three tabs — **Story**, **Flow**, and **Authors** — accessible from the shared header while playing.

- **Story** — the playable ChoiceScript game inside an iframe.
- **Flow** — a read-only, pan/zoom tree diagram of all choices and endings, built at runtime from the bundled ChoiceScript text.
- **Authors** — an alternating image/bio grid for each author.

## Writing a story (My Stories)

The home page has a **My Stories** section where anyone can write their own CYOA. Stories are saved locally in the browser (localStorage).

- Click **Write a Story** to create a new story and open the editor.
- The **Flow** tab of a My Story is a full story editor with three modes:
  - **Graph** — drag-and-drop visual flow editor with 17 node types (passages, endings, conditions, actions, input, random branches, subroutines, scene jumps, raw code, comments, and more).
  - **Code** — Monaco editor with ChoiceScript syntax highlighting and autocompletion.
  - **Split** — graph and code side by side.
- **Chapters** — add multiple scenes/chapters via the scene tab bar; each has its own graph.
- **Variables** — define global and temp variables; the editor autocompletes them in conditions and actions.
- **Stats & Achievements** — design the stats screen and define achievements with a visual designer.
- **Subroutines** — define reusable subroutines (`*gosub`) within a scene.
- **Find & Replace** — search across all scenes and edge labels at once.
- **Undo / Redo** — per-scene history.
- **Auto-layout** — reflow nodes into a top-down or left-right tree with one click.
- **Import / Export** — export as a ZIP of `.txt` scene files (ready for the ChoiceScript IDE) or as a full JSON backup. Import either format back.
- **Story Stats** — word count, node count, and longest path depth.
- **Story Info** — set title, author name, bio, author photo, and cover image. All images are auto-compressed on upload.
- The **Authors** tab shows a preview of the author card.
- The **Story** tab plays the serialized ChoiceScript in the engine, updating every time you switch back to it.
- Click **Submit to GitHub** to file a GitHub issue with the story's ChoiceScript source so it can be added to the published collection.

## Adding a curated game

1. Create `apps/publishing_party/src/games/<your-game-id>/startup.txt` (and any other scene files). Optionally add a square cover image.
2. Register it in [apps/publishing_party/src/games/index.ts](apps/publishing_party/src/games/index.ts) using the `authors()`, `startup()`, and `cover()` helpers:
    ```ts
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

Scene files use the [ChoiceScript syntax](https://choicescriptdev.fandom.com/wiki/ChoiceScript_%E2%80%90_Wiki). The official engine in [apps/publishing_party/public/choicescript/](apps/publishing_party/public/choicescript/) interprets them, so all engine features (`*choice`, `*if`, `*set`, `*goto`, stats, save/load, etc.) work.

## Deploying to GitHub Pages

The site is configured for `https://jonborchardt.github.io/ml-cyoa/` (set in [apps/publishing_party/vite.config.ts](apps/publishing_party/vite.config.ts)). Clean URLs without `#` work via the standard [`404.html` SPA redirect trick](https://github.com/rafgraph/spa-github-pages).

```bash
pnpm deploy
```

This builds the site and publishes `dist/` to the `gh-pages` branch using the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package. Enable GitHub Pages in repo settings → Pages → branch `gh-pages` → folder `/ (root)`.

## PWA

The app ships a [manifest](apps/publishing_party/public/manifest.webmanifest) and a [service worker](apps/publishing_party/public/sw.js) that precaches the app shell and engine, so it can launch full-screen from the home screen and continue working offline after the first visit. Bump `CACHE_VERSION` in `sw.js` when you ship changes that should invalidate the precache.

## Stack

- **pnpm workspaces** — monorepo with `@ml-cyoa/editor` and `@ml-cyoa/publishing-party`
- **Vite** (v7), **TypeScript** (strict), **React** 18, **React Router** v7 (browser routing)
- **MUI** v7 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- **React Flow** (`@xyflow/react`) — story branching diagrams (read-only for curated games, editable for My Stories)
- **Monaco Editor** (`@monaco-editor/react`) — code/split editor mode; lazy-loaded
- **fflate** — ZIP export of ChoiceScript files
- **ChoiceScript** engine — vendored from [dfabulich/choicescript](https://github.com/dfabulich/choicescript), BSD-2 licensed
- **Vitest** + `@testing-library/react` — unit and integration tests (in `@ml-cyoa/editor`)
- Service worker + web app manifest for installability and offline play




there is a number in some adventures, 1 show it propertly on cover
    2 use it for dates 
look into correct intor
update claude and readme
get correct authors
look in each book for additiona images
ensure logic is correct
add fake iamges?
image width in actual story is wrong
test actual story content