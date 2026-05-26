# ml-cyoa

**Middle Level Choose Your Own Adventure.** A pnpm workspace monorepo hosting a small collection of [ChoiceScript](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/) games as a SPA + PWA, plus a full in-browser story editor. Built with Vite, TypeScript, React, MUI, and the official ChoiceScript engine.

## Stack

- **pnpm workspaces** — two packages: `@ml-cyoa/editor` and `@ml-cyoa/publishing-party`
- **Vite** (v7) — build tool and dev server. `base` is `/ml-cyoa/` for GitHub Pages.
- **TypeScript** (strict mode)
- **React** 18
- **React Router** v7 (BrowserRouter with `basename = import.meta.env.BASE_URL`)
- **MUI** v7 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- **React Flow** (`@xyflow/react`) — branching diagrams (read-only for curated games, editable for My Stories)
- **Monaco Editor** (`@monaco-editor/react`) — code/split editor mode in My Stories
- **fflate** — ZIP export of ChoiceScript files
- **ChoiceScript engine** — vendored under [apps/publishing_party/public/choicescript/](apps/publishing_party/public/choicescript/) (BSD-2). NOT installed via npm; copied from [dfabulich/choicescript](https://github.com/dfabulich/choicescript) `web/`.
- **Vitest** + `@testing-library/react` — unit/integration tests (pool: `forks`), live in `@ml-cyoa/editor`
- **gh-pages** — for deploys to the `gh-pages` branch.

Varnish is intentionally NOT used.

## Getting started

```bash
pnpm install
pnpm dev         # http://localhost:5173/ml-cyoa/
pnpm build       # build editor lib, then publishing_party app
pnpm preview     # serve the production build locally
pnpm lint
pnpm test        # run tests once (editor package)
pnpm test:watch
pnpm deploy      # build and publish dist/ to the gh-pages branch
```

To work on a specific package:

```bash
pnpm --filter editor test:watch
pnpm --filter publishing-party dev
```

## Workspace structure

```
ml-cyoa/                              ← workspace root
├── package.json                      ← delegates all scripts to packages
├── pnpm-workspace.yaml               ← ["packages/*", "apps/*"]
├── tsconfig.base.json                ← shared compiler options
├── eslint.config.js                  ← shared ESLint flat config
├── packages/
│   └── editor/                       ← @ml-cyoa/editor
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts            ← library-mode build + vitest config
│       └── src/
│           ├── index.ts              ← public API barrel
│           ├── layout.ts             ← NodeData, NODE_W/H, applyTreeLayout
│           ├── types.ts              ← shared types (NodeType, VariableDef, Game, …)
│           ├── myStoryStore.ts
│           ├── useUndoableState.ts
│           ├── parseChoiceScript.ts
│           ├── importChoiceScript.ts
│           ├── serializeStory.ts
│           ├── serializeFlow.ts
│           ├── validateFlow.ts
│           ├── exportStory.ts
│           ├── imageUtils.ts
│           ├── choicescriptLanguage.ts
│           ├── MonacoEditor.tsx
│           ├── GameTabHeader.tsx     ← shared nav header (used by both shells)
│           ├── MyStoryShell.tsx
│           ├── MyStoryFlowPanel.tsx
│           ├── MyStoryAuthorsPanel.tsx
│           ├── SceneOutlinePanel.tsx
│           ├── … (all editor dialogs, panels, menus)
│           ├── nodes/                ← React Flow node renderers
│           └── test/                 ← setup, fixtures, all *.test.* files
└── apps/
    └── publishing_party/             ← @ml-cyoa/publishing-party
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts            ← app mode; base: '/ml-cyoa/'; alias @ml-cyoa/editor → editor src
        ├── index.html
        ├── public/
        │   ├── choicescript/         ← vendored engine (unchanged)
        │   ├── manifest.webmanifest
        │   ├── sw.js
        │   ├── 404.html
        │   └── icon.svg
        └── src/
            ├── main.tsx
            ├── App.tsx               ← wires MyStoryShell props (onSubmitStory, renderGamePreview)
            ├── Layout.tsx
            ├── HomePage.tsx
            ├── GameShell.tsx
            ├── ChoiceScriptGame.tsx
            ├── CoverArt.tsx
            ├── AuthorsPanel.tsx
            ├── FlowPanel.tsx         ← read-only curated-game flow
            ├── parseGameFlow.ts      ← curated-game parser (imports layout constants from editor)
            ├── github.ts             ← fileGitHubIssue() via VITE_GITHUB_TOKEN
            ├── vite-env.d.ts
            └── games/
                ├── index.ts          ← game registry; re-exports Game/Author from @ml-cyoa/editor
                └── <game-id>/        ← *.txt scenes + cover/author images
```

Routes: `/` → `HomePage`, `/:gameId` → `GameShell` (Story tab), `/:gameId/flow` → `GameShell` (Flow tab), `/:gameId/authors` → `GameShell` (Authors tab). `/my/:storyId` → `MyStoryShell` (Story tab), `/my/:storyId/flow` → `MyStoryShell` (Flow/Editor tab), `/my/:storyId/authors` → `MyStoryShell` (Authors tab).

## Package boundaries

`@ml-cyoa/editor` is a React + MUI component library. It has **no** dependency on the app — no `github.ts`, no `ChoiceScriptGame`, no curated game registry. Two props break the circular dependency:

- **`onSubmitStory?: (title, body) => Promise<void>`** — passed from `App.tsx` as `fileGitHubIssue`. When undefined, the Submit button is hidden.
- **`renderGamePreview?: RenderGamePreview`** — passed from `App.tsx` as a closure over `ChoiceScriptGame`. Used for the Story tab in `MyStoryShell` and the split-pane preview in `MyStoryFlowPanel`.

`GameTabHeader` lives in the editor (not the app) because `MyStoryShell` renders it; `GameShell` imports it from `@ml-cyoa/editor`.

`Game`, `Author`, `GameScene` types are defined in the editor's `types.ts` and re-exported by the app's `games/index.ts`.

## Cross-package imports

The app's `vite.config.ts` aliases `@ml-cyoa/editor` directly to `src/packages/editor/src/index.ts` so no pre-build of the editor is needed during `pnpm dev` or `pnpm build`. All imports from the app into the editor use `@ml-cyoa/editor`, never relative paths.

## In-game navigation

Every game sub-page shares `GameTabHeader` (in `@ml-cyoa/editor`), which renders a **← Home** button, the game title, and three tabs — **Story**, **Flow**, **Authors** — that navigate between `/:gameId`, `/:gameId/flow`, and `/:gameId/authors`. The active tab is derived from `useLocation().pathname`.

## Story flow diagram (curated games)

The **Flow** tab at `/:gameId/flow` shows a read-only top-down tree diagram of the game's branching structure, built at runtime from the bundled scene text.

- `parseGameFlow.ts` (publishing_party) walks each scene's raw text, tracking indentation to find `*choice` blocks and `#option` lines. It builds a `TreeNode` tree, laid out with a leaf-counting algorithm.
- Layout constants and the `applyTreeLayout` Sugiyama-style DAG layout used by the story editor live in the editor's `layout.ts` and are imported by `parseGameFlow.ts` via `@ml-cyoa/editor`.
- `FlowPanel.tsx` renders the tree with `@xyflow/react`. Custom node components style each type: green for Start, blue-bordered for passages, amber for endings. A custom `FlowEdge` component places choice-text labels at 78% of the way toward the target node so sibling labels spread apart.
- ChoiceScript commands recognised: `*choice`, `#option`, `*finish`, `*ending`, `*end_game`. Commands `*page_break`, `*image`, `*title`, `*author`, `*comment` are skipped. `*goto` / `*goto_scene` / `*if` are not parsed — they appear as narrative text in the node label.

## How the ChoiceScript engine is integrated

The official engine is a large native-JS app that owns the page. To keep it from fighting with React/MUI, each game is rendered **inside an iframe**:

1. `ChoiceScriptGame.tsx` mounts `<iframe src="<base>choicescript/host.html?g=<id>">`. Each game gets a fresh iframe via `key={game.id}`.
2. `public/choicescript/host.html` sets `window.isFile = true` and waits for a `postMessage({type: 'load-game', ...})`. It posts `{type: 'host-ready'}` to its parent on load.
3. The parent sends the payload using `window.location.origin` as the targetOrigin (same-origin, never `'*'`). The host validates `e.source === window.parent` before acting.
4. The payload includes: `title`, `author`, `coverImage`, `sceneList`, `scenes` (scene name → raw text).
5. The host populates `window.uploadedFiles` — the engine's built-in in-memory blobs mode, so no scenes are fetched over the network.
6. The host dynamically loads engine scripts, constructs `window.nav` and `window.stats`, and manually fires `window.onload`.

Scene `.txt` files are imported via Vite's `?raw` suffix and bundled into JS at build time.

## My Stories feature

Students can write their own CYOA stories in the browser. Stories are persisted in `localStorage` under `ml-cyoa-my-stories` as an array of `MyStory` objects.

**Data model** (`MyStory` in `myStoryStore.ts`):

| Field | Type | Notes |
|---|---|---|
| `id`, `title`, `authorName` | string | core identity |
| `authorBio?`, `authorPhoto?`, `coverImage?` | string | base64 images |
| `scenes` | `SceneDef[]` | one per chapter |
| `sceneOrder` | `string[]` | chapter ordering |
| `images` | `Record<string, string>` | node images keyed by filename |
| `variables` | `VariableDef[]` | global/temp variables |
| `statChart` | `StatEntry[]` | stats screen layout |
| `achievements` | `Achievement[]` | achievement definitions |
| `layoutDirection` | `'TB' \| 'LR'` | graph layout direction |
| `createdAt`, `updatedAt` | number | timestamps |

`SceneDef` contains `id`, `name`, `nodes`, `edges`, and `subroutines: SubroutineDef[]`.

`migrateStory()` handles upgrades: v1 (flat nodes/edges) → v2 (scenes array) → v3 (subroutines on each scene).

**Node types** (all in `src/packages/editor/src/nodes/` and `NodeType` in `types.ts`):

| Type | Color | ChoiceScript |
|---|---|---|
| `start` | green | beginning of scene |
| `passage` | blue | prose + `*choice` block |
| `ending` | amber | `*finish` / `*ending` |
| `condition` | yellow | `*if` / `*elseif` / `*else` |
| `action` | teal | `*set`, `*rand`, `*award_achievement` |
| `fake_choice` | blue | `*fake_choice` |
| `input` | purple | `*input_text` / `*input_number` |
| `random_branch` | magenta | `*rand` + if-chain |
| `page_break` | gray | `*page_break` |
| `check_achievements` | green | `*check_achievements` |
| `gosub` | violet | `*gosub` call |
| `subroutine_entry` | violet | subroutine start |
| `subroutine_return` | violet | `*return` |
| `scene_jump` | gray | `*goto_scene` / `*gosub_scene` |
| `scene_label` | gray | `*label` |
| `raw_code` | yellow | verbatim ChoiceScript |
| `comment` | yellow dashed | annotation only (not serialized) |

**Editor modes** (`MyStoryFlowPanel`):
- **Graph** (default) — editable React Flow canvas.
- **Code** — full-pane Monaco editor with ChoiceScript syntax highlighting/completion. Switching to code serializes the graph; switching back parses it.
- **Split** — graph and code side by side.

**Editor features**:
- Scene/chapter tabs (`SceneTabBar`) — add, rename, reorder scenes.
- Node palette (`NodePalette`) — popover with all addable node types.
- Undo/redo (`useUndoableState`) — per-scene history; `reset(value)` clears history on scene switch.
- Auto-layout (`applyTreeLayout`) — TB or LR direction, persisted as `layoutDirection`.
- Find & replace (`FindReplacePanel`) — searches node content and edge labels across all scenes.
- Variable manager (`VariableManagerPanel`) — define `*create` variables with type and default.
- Stats designer (`StatsDesigner`) — design the stats screen layout.
- Achievements designer (`AchievementsDesigner`) — define achievements.
- Subroutine manager (`SubroutineGroupManager`) — add/rename subroutines within a scene.
- Story stats (`StoryStatsDrawer`) — word count, node count, longest path depth.
- Keyboard shortcuts (`KeyboardShortcutsHelp`) — reference dialog.
- Bulk delete confirmation dialog (shown when deleting > 3 nodes at once).
- Auto-saves with 1 s debounce; shows "Saving…" / "Saved ✓"; error snackbar on quota exceeded.
- Live validation banner (`validateStory`) — errors block submission, warnings are non-blocking.

**Import / Export**:
- `ExportMenu` — ZIP of `.txt` scene files + `images/` folder, or full JSON backup.
- `ImportDialog` — import a ChoiceScript ZIP or JSON backup; ZIP import uses `importFromChoiceScript()` which calls `parseScene()` to rebuild the graph.

**Image handling**: All uploads go through `compressImage()` in `imageUtils.ts` — resized to max 1024 px at 0.75 JPEG quality. On GitHub submission, re-compressed to 300 px / 0.5 quality to fit within the 65 536-char issue body limit.

**Serialization** (`serializeStory.ts`): `serializeStory()` returns a `Map<sceneId, text>`. The startup scene always includes `*title`, `*author`, `*scene_list`, and all `*create` statements. Each scene is walked depth-first from its start node. Cycles use `*goto`. Subroutine bodies are appended after the main scene flow.

**Submission** (`github.ts` in publishing_party): `fileGitHubIssue(title, body)` POSTs to the GitHub Issues API using `VITE_GITHUB_TOKEN`. Set this env var in `src/apps/publishing_party/.env.local` (never commit it). It is passed into the editor as the `onSubmitStory` prop on `MyStoryShell`.

## Adding a curated game

1. Drop scene files at `src/apps/publishing_party/src/games/<id>/startup.txt` (and any additional `<scene>.txt`). Optionally add a square cover image.
2. Add an entry to `games` in [src/apps/publishing_party/src/games/index.ts](src/apps/publishing_party/src/games/index.ts) using the `authors()`, `startup()`, and `cover()` helpers:
    ```ts
    {
        id: 'my-game',
        title: 'My Game',
        authors: authors('my-game', [
            { name: 'Author One', bio: 'Short bio.' },
        ]),
        year: '2025-2026',
        sceneList: ['startup'],
        scenes: { startup: startup('my-game') },
        coverImage: cover('my-game'),   // undefined if no cover.png
    }
    ```
3. The game appears on the home page (grouped by year) and is reachable at `/<id>`.

The `sceneList` order is what ChoiceScript's `SceneNavigator` uses to determine which scene follows which when a scene ends without an explicit `*goto_scene`.

## Tests

```bash
pnpm test              # run once
pnpm test:watch        # watch mode
pnpm test:coverage     # coverage report
```

Vitest with `@testing-library/react`. Pool is set to `forks` (not `threads`) to avoid globals injection races with `globals: true`. Test files live in `src/packages/editor/src/test/`.

## GitHub Pages deploy

- `vite.config.ts` in publishing_party sets `base = '/ml-cyoa/'`. Change it if you fork to a different repo name.
- `BrowserRouter` uses `basename = import.meta.env.BASE_URL` (trailing slash stripped).
- `public/404.html` + a small decoder snippet in `index.html` implement the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) trick so deep links survive a hard refresh.
- `pnpm deploy` builds the app and publishes `dist/` to the `gh-pages` branch via `gh-pages -d dist -t true`.

## PWA

- [src/apps/publishing_party/public/manifest.webmanifest](src/apps/publishing_party/public/manifest.webmanifest) declares `display: fullscreen`, an SVG icon, and theme color.
- [src/apps/publishing_party/public/sw.js](src/apps/publishing_party/public/sw.js) precaches the app shell + engine files. Network-first for HTML, cache-first for everything else. Bump `CACHE_VERSION` to invalidate.
- The SW does **not** call `skipWaiting()` — activates on next navigation so active game sessions are never interrupted.
- The SW is registered from `src/main.tsx` only in production builds.

## Notable conventions / gotchas

- **Don't import the ChoiceScript engine from the editor package.** It runs only inside the iframe at `/choicescript/host.html`.
- **Don't mount ChoiceScript outside the iframe.** Its CSS and globals conflict with MUI.
- **Don't add imports from publishing_party into the editor package.** The editor must stay a self-contained library. App concerns (github.ts, ChoiceScriptGame) are injected via props.
- **Scene files** can be edited freely; they trigger a Vite rebuild via `?raw` and are not exposed as fetchable URLs in `dist/`.
- **`BrowserRouter`** requires GitHub Pages to serve the SPA on unknown paths — that's why `public/404.html` exists.
- **Monaco** is lazy-loaded via `React.lazy` — the graph path never loads it.
- **Monaco provider registration** is guarded with a `registered` flag so it only runs once per page load.
- **No pre-build needed** — the publishing_party vite config aliases `@ml-cyoa/editor` directly to the editor's `src/index.ts`, so `pnpm dev` and `pnpm build` work without running `pnpm --filter editor build` first.

## ESLint

Flat config ([eslint.config.js](eslint.config.js)) at the workspace root, discovered by both packages via ancestor lookup:

- `@eslint/js` recommended
- `typescript-eslint` recommended
- `eslint-plugin-react` recommended + `jsx-runtime` (React 18 JSX transform)
- `eslint-plugin-react-hooks` recommended
