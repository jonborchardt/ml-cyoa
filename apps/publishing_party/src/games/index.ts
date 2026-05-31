import type { Game, Author } from '@ml-cyoa/editor';

export type { Game, Author };

const rawScenes = import.meta.glob<string>('./*/*.txt', {
  as: 'raw',
  eager: true,
});
const rawCovers = import.meta.glob<{ default: string }>('./*/*.png', {
  eager: true,
});

function startup(id: string): string {
  return rawScenes[`./${id}/startup.txt`];
}

function cover(id: string): string | undefined {
  return rawCovers[`./${id}/cover.png`]?.default;
}

function authorImage(id: string, index: number): string | undefined {
  return rawCovers[`./${id}/author-${index}.png`]?.default;
}

function authors(
  id: string,
  entries: { name: string; bio: string }[],
): Author[] {
  return entries.map(({ name, bio }, i) => ({
    name,
    bio,
    image: authorImage(id, i),
  }));
}

export const games: Game[] = [
  {
    hidden: true,
    id: 'game1',
    title: 'The Forked Path',
    authors: authors('game1', [
      {
        name: 'Maren Voss',
        bio: 'Maren loves hiking and spending time outdoors. She enjoys writing stories that feel like a walk through an unfamiliar forest.',
      },
      {
        name: 'Tobias Keld',
        bio: 'Tobias is a big fan of history and adventure books. He likes writing characters who have to make tough choices.',
      },
      {
        name: 'Sable Orin',
        bio: 'Sable has been writing short stories since middle school. She finds branching narratives especially fun to puzzle out.',
      },
      {
        name: 'Petra Halcyn',
        bio: 'Petra plays piano and likes to think about how music and storytelling have a lot in common.',
      },
    ]),
    year: 'examples',
    sceneList: ['startup'],
    scenes: { startup: startup('game1') },
    coverImage: cover('game1'),
  },
  {
    hidden: true,
    id: 'game2',
    title: 'The Lost Signal',
    authors: authors('game2', [
      {
        name: 'Davan Morce',
        bio: 'Davan got into coding a few years ago and loves mixing technology with creative writing.',
      },
      {
        name: 'Ilya Strenn',
        bio: 'Ilya enjoys mystery novels and podcasts. Writing suspenseful scenes is their favorite part of the process.',
      },
      {
        name: 'Cleo Farwick',
        bio: 'Cleo has always enjoyed making up stories with friends. This project gave her a great excuse to write one down.',
      },
      {
        name: 'Noel Ashvane',
        bio: "Noel writes poetry in his spare time. He brought a lot of care to the game's dialogue and descriptions.",
      },
    ]),
    year: 'examples',
    sceneList: ['startup'],
    scenes: { startup: startup('game2') },
    coverImage: cover('game2'),
  },
  {
    hidden: true,
    id: 'game3',
    title: 'The Clockwork Garden',
    authors: authors('game3', [
      {
        name: 'Rynn Calder',
        bio: 'Rynn loves plants and gardens and wanted to write a world where nature and machines coexist.',
      },
      {
        name: 'Vesna Thrope',
        bio: "Vesna is fascinated by how things work. She enjoyed designing the mechanical logic behind the story's puzzles.",
      },
      {
        name: 'Ossian Mure',
        bio: 'Ossian draws and illustrates in his free time. He helped shape the visual mood of the story through its descriptions.',
      },
      {
        name: 'Lira Bekket',
        bio: "Lira reads constantly and brought a wide range of influences to the team. She wrote many of the story's quieter, reflective moments.",
      },
    ]),
    year: 'examples',
    sceneList: ['startup'],
    scenes: { startup: startup('game3') },
    coverImage: cover('game3'),
  },
  {
    id: 'mermaid_adventure',
    title: 'Mermaid Adventure',
    authors: authors('mermaid_adventure', [
      {
        name: 'Ada',
        bio: '',
      },
      {
        name: 'Inara',
        bio: '',
      },
      {
        name: 'Willow',
        bio: '',
      },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('mermaid_adventure') },
    coverImage: cover('mermaid_adventure'),
  },
  {
    id: 'the_olympian_war',
    title: 'The Olympian War',
    authors: authors('the_olympian_war', [
      {
        name: 'Ewan',
        bio: '',
      },
      {
        name: 'Nella',
        bio: '',
      },
      {
        name: 'Stellan',
        bio: '',
      },
      {
        name: 'Valentin',
        bio: '',
      },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('the_olympian_war') },
    coverImage: cover('the_olympian_war'),
  },
];

export const gamesById: Record<string, Game> = Object.fromEntries(
  games.map((g) => [g.id, g]),
);
