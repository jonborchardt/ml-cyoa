# ml-cyoa

**Middle Level Choose Your Own Adventure.** A SPA + PWA hosting a small collection of [ChoiceScript](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/) games. Built with Vite, TypeScript, React, MUI, and the official ChoiceScript engine.

## Stack

- **Vite** (v7) — build tool and dev server. `base` is `/ml-cyoa/` for GitHub Pages.
- **TypeScript** (strict mode)
- **React** 18
- **React Router** v7 (BrowserRouter with `basename = import.meta.env.BASE_URL`)
- **MUI** v7 (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- **React Flow** (`@xyflow/react`) — branching diagrams (read-only for curated games, editable for My Stories)
- **Monaco Editor** (`@monaco-editor/react`) — code/split editor mode in My Stories
- **fflate** — ZIP export of ChoiceScript files
- **ChoiceScript engine** — vendored under [public/choicescript/](public/choicescript/) (BSD-2). NOT installed via npm; copied from [dfabulich/choicescript](https://github.com/dfabulich/choicescript) `web/`.
- **Vitest** + `@testing-library/react` — unit/integration tests (pool: `forks`)
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
npm run test     # run tests once
npm run test:watch
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
  HomePage.tsx         — year-grouped card grid + My Stories section
  GameShell.tsx        — resolves :gameId; owns tab state and lazy-mounts Story/Flow/Authors panels
  GameTabHeader.tsx    — shared tab header (← Home · Story | Flow | Authors tabs)
  CoverArt.tsx         — cover image with fallback icon
  ChoiceScriptGame.tsx — mounts an iframe pointing at /choicescript/host.html and posts the game payload
  FlowPanel.tsx        — read-only React Flow branching diagram (curated games, Flow tab)
  AuthorsPanel.tsx     — alternating image/bio author grid (curated games, Authors tab)
  parseGameFlow.ts     — parses ChoiceScript scenes into React Flow nodes + edges with tree layout
  imageUtils.ts        — compressImage() helper (canvas resize + JPEG re-encode)
  github.ts            — fileGitHubIssue() — posts a GitHub issue via VITE_GITHUB_TOKEN
  types.ts             — shared TypeScript types (NodeType, VariableDef, StatEntry, Achievement, …)
  myStoryStore.ts      — localStorage CRUD for MyStory records; migrateStory() handles v1→v3 upgrades
  serializeStory.ts    — serializeStory(): MyStory → Map<sceneId, ChoiceScript text>
  serializeFlow.ts     — legacy single-scene serializer (used by validateStory)
  validateFlow.ts      — validateStory(): returns { errors, warnings, infos }
  parseChoiceScript.ts — parseScene(text): ChoiceScript text → {nodes, edges, unsupportedSyntax}
  importChoiceScript.ts — importChoiceScript(): map of scene text files → MyStory
  exportStory.ts       — downloadZip() and downloadJson() — ZIP of .txt + JSON backup
  MyStoryShell.tsx     — resolves :storyId; owns tab state and story sync for My Stories
  MyStoryFlowPanel.tsx — main editor: graph canvas, toolbar, scene tabs, all panels
  MyStoryAuthorsPanel.tsx — author preview panel for My Stories
  MonacoEditor.tsx     — lazy-loaded Monaco wrapper with ChoiceScript syntax highlighting
  NodePalette.tsx      — popover listing all addable node types
  SceneTabBar.tsx      — tab strip for switching between scenes/chapters
  NodeEditDialog.tsx   — prose + type editor for passage/ending/raw_code nodes
  EdgeEditDialog.tsx   — choice-text editor for edges
  ConditionEditDialog.tsx — *if / *elseif / *else editor
  ActionEditDialog.tsx    — *set / *rand / *award_achievement action list editor
  InputNodeEditDialog.tsx — *input_text / *input_number editor
  SceneJumpEditDialog.tsx — *goto_scene / *gosub_scene editor
  GosubCallEditDialog.tsx — *gosub editor (pick subroutine, pass params)
  RawCodeEditDialog.tsx   — free-text ChoiceScript code block editor
  RandomBranchEditDialog.tsx — random branch weight/label editor
  VariableManagerPanel.tsx   — side panel to define global/temp variables
  StatsDesigner.tsx       — side panel to design the stats screen (*stat_chart)
  AchievementsDesigner.tsx — side panel to define achievements
  SubroutineGroupManager.tsx — side panel to manage subroutines within a scene
  ImportDialog.tsx        — import ChoiceScript ZIP or JSON backup
  ExportMenu.tsx          — export-as-ZIP / export-as-JSON menu
  FindReplacePanel.tsx    — find + replace across all scenes and edges
  StoryStatsDrawer.tsx    — word count, node count, longest path stats drawer
  KeyboardShortcutsHelp.tsx — keyboard shortcuts reference dialog
  nodes/
    ConditionNode.tsx      — *if / *elseif / *else branch node
    ActionNode.tsx         — *set / *rand / award action node
    FakeChoiceNode.tsx     — *fake_choice cosmetic choice node
    InputNode.tsx          — *input_text / *input_number node
    RandomBranchNode.tsx   — random branch node
    PageBreakNode.tsx      — *page_break node
    SceneJumpNode.tsx      — *goto_scene / *gosub_scene node
    SceneLabelNode.tsx     — *label node (jump target within a scene)
    CheckAchievementsNode.tsx — *check_achievements node
    GosubCallNode.tsx      — *gosub subroutine-call node
    SubroutineEntryNode.tsx — subroutine start node
    SubroutineReturnNode.tsx — *return node
    RawCodeNode.tsx        — verbatim ChoiceScript code passthrough node
    CommentNode.tsx        — sticky-note annotation (not serialized)
  games/
    index.ts           — game registry (id, title, authors, year, sceneList, scenes, coverImage?)
    <game-id>/*.txt    — ChoiceScript scene files (imported via Vite ?raw)
    <game-id>/*.png    — optional cover/author images (imported as asset URLs)
```

Routes: `/` → `HomePage`, `/:gameId` → `GameShell` (Story tab), `/:gameId/flow` → `GameShell` (Flow tab), `/:gameId/authors` → `GameShell` (Authors tab). `/my/:storyId` → `MyStoryShell` (Story tab), `/my/:storyId/flow` → `MyStoryShell` (Flow/Editor tab), `/my/:storyId/authors` → `MyStoryShell` (Authors tab).

## In-game navigation

Every game sub-page shares `GameTabHeader`, which renders a **← Home** button, the game title, and three tabs — **Story**, **Flow**, **Authors** — that navigate between `/:gameId`, `/:gameId/flow`, and `/:gameId/authors`. The active tab is derived from `useLocation().pathname`.

## Story flow diagram (curated games)

The **Flow** tab at `/:gameId/flow` shows a read-only top-down tree diagram of the game's branching structure, built at runtime from the bundled scene text.

- `parseGameFlow.ts` walks each scene's raw text, tracking indentation to find `*choice` blocks and `#option` lines. It builds a `TreeNode` tree, then lays it out with a leaf-counting algorithm (leaves spaced left-to-right, parents centered over their children). Nodes are typed `start | passage | ending`.
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

**Node types** (all in `src/nodes/` and `NodeType` in `types.ts`):

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
- `ImportDialog` — import a ChoiceScript ZIP or JSON backup; ZIP import uses `importChoiceScript()` which calls `parseScene()` to rebuild the graph.

**Image handling**: All uploads go through `compressImage()` in `imageUtils.ts` — resized to max 1024 px at 0.75 JPEG quality. On GitHub submission, re-compressed to 300 px / 0.5 quality to fit within the 65 536-char issue body limit.

**Serialization** (`serializeStory.ts`): `serializeStory()` returns a `Map<sceneId, text>`. The startup scene always includes `*title`, `*author`, `*scene_list`, and all `*create` statements. Each scene is walked depth-first from its start node. Cycles use `*goto`. Subroutine bodies are appended after the main scene flow.

**Submission** (`github.ts`): `fileGitHubIssue(title, body)` POSTs to the GitHub Issues API using `VITE_GITHUB_TOKEN`. Set this env var in `.env.local` (never commit it).

## Adding a curated game

1. Drop scene files at `src/games/<id>/startup.txt` (and any additional `<scene>.txt`). Optionally add a square cover image.
2. Add an entry to `games` in [src/games/index.ts](src/games/index.ts) using the `authors()`, `startup()`, and `cover()` helpers:
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
npm run test           # run once
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
```

Vitest with `@testing-library/react`. Pool is set to `forks` (not `threads`) to avoid globals injection races with `globals: true`. Test files live alongside their subjects (e.g. `serializeStory.test.ts`, `FindReplacePanel.test.tsx`).

## GitHub Pages deploy

- `vite.config.ts` sets `base = '/ml-cyoa/'`. Change it if you fork to a different repo name.
- `BrowserRouter` uses `basename = import.meta.env.BASE_URL` (trailing slash stripped).
- `public/404.html` + a small decoder snippet in `index.html` implement the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) trick so deep links survive a hard refresh.
- `npm run deploy` runs `vite build` then `gh-pages -d dist -t true`.

## PWA

- [public/manifest.webmanifest](public/manifest.webmanifest) declares `display: fullscreen`, an SVG icon, and theme color.
- [public/sw.js](public/sw.js) precaches the app shell + engine files. Network-first for HTML, cache-first for everything else. Bump `CACHE_VERSION` to invalidate.
- The SW does **not** call `skipWaiting()` — activates on next navigation so active game sessions are never interrupted.
- The SW is registered from `src/main.tsx` only in production builds.

## Notable conventions / gotchas

- **Don't import the ChoiceScript engine from `src/`.** It runs only inside the iframe at `/choicescript/host.html`.
- **Don't mount ChoiceScript outside the iframe.** Its CSS and globals conflict with MUI.
- **Scene files** can be edited freely; they trigger a Vite rebuild via `?raw` and are not exposed as fetchable URLs in `dist/`.
- **`BrowserRouter`** requires GitHub Pages to serve the SPA on unknown paths — that's why `public/404.html` exists.
- **Monaco** is lazy-loaded via `React.lazy` — the graph path never loads it.
- **Monaco provider registration** is guarded with a `registered` flag so it only runs once per page load.

## ESLint

Flat config ([eslint.config.js](eslint.config.js)) using stock recommended rule sets only:

- `@eslint/js` recommended
- `typescript-eslint` recommended
- `eslint-plugin-react` recommended + `jsx-runtime` (React 18 JSX transform)
- `eslint-plugin-react-hooks` recommended
