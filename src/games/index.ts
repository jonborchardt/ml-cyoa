const rawScenes = import.meta.glob<string>('./*/*.txt', { as: 'raw', eager: true });
const rawCovers = import.meta.glob<{ default: string }>('./*/*.png', { eager: true });

export interface GameScene {
    [sceneName: string]: string;
}

export interface Game {
    id: string;
    title: string;
    authors: string[];
    year: string;
    sceneList: string[];
    scenes: GameScene;
    coverImage?: string;
}

function startup(id: string): string {
    return rawScenes[`./${id}/startup.txt`];
}

function cover(id: string): string | undefined {
    return rawCovers[`./${id}/cover.png`]?.default;
}

export const games: Game[] = [
  {
    id: 'game1',
    title: 'The Forked Path',
    authors: ['Anonymous'],
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('game1') },
    coverImage: cover('game1'),
  },
  {
    id: 'game2',
    title: 'The Lost Signal',
    authors: ['Anonymous'],
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('game2') },
    coverImage: cover('game2'),
  },
  {
    id: 'game3',
    title: 'The Clockwork Garden',
    authors: ['Anonymous'],
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('game3') },
    coverImage: cover('game3'),
  },
];

export const gamesById: Record<string, Game> = Object.fromEntries(games.map((g) => [g.id, g]));
