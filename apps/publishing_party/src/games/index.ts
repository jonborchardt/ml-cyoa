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
  {
    id: 'quest_for_the_pearl_of_water',
    title: 'The Quest for the Pearl of Water',
    authors: authors('quest_for_the_pearl_of_water', [
      { name: 'Audrey', bio: '' },
      { name: 'Asne', bio: '' },
      { name: 'Vivian', bio: '' },
      { name: 'Judah', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('quest_for_the_pearl_of_water') },
    coverImage: cover('quest_for_the_pearl_of_water'),
  },
  {
    id: 'the_game',
    title: 'The Game',
    authors: authors('the_game', [
      { name: 'James', bio: '' },
      { name: 'Neill', bio: '' },
      { name: 'Margaret', bio: '' },
      { name: 'Naomi', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('the_game') },
    coverImage: cover('the_game'),
  },
  {
    id: 'secrets_of_the_multi_diamond',
    title: 'Secrets of the Multi Diamond',
    authors: authors('secrets_of_the_multi_diamond', [
      { name: 'Oliver', bio: '' },
      { name: 'Stella', bio: '' },
      { name: 'Calvin', bio: '' },
      { name: 'Asher', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('secrets_of_the_multi_diamond') },
    coverImage: cover('secrets_of_the_multi_diamond'),
  },
  {
    id: 'the_legends_of_london',
    title: 'The Legends of London',
    authors: authors('the_legends_of_london', [
      { name: 'Ellie', bio: '' },
      { name: 'Rue', bio: '' },
      { name: 'Harry', bio: '' },
      { name: 'Bella', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('the_legends_of_london') },
    coverImage: cover('the_legends_of_london'),
  },
  {
    id: 'lost_in_africa',
    title: 'Lost in Africa',
    authors: authors('lost_in_africa', [
      { name: 'Dallas', bio: '' },
      { name: 'Josie', bio: '' },
      { name: 'Lucia', bio: '' },
      { name: 'Uma', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('lost_in_africa') },
    coverImage: cover('lost_in_africa'),
  },
  {
    id: 'the_tunnle_of_time',
    title: 'The Tunnel of Time',
    authors: authors('the_tunnle_of_time', [
      { name: 'Calen', bio: '' },
      { name: 'Camille', bio: '' },
      { name: 'Marcus', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('the_tunnle_of_time') },
    coverImage: cover('the_tunnle_of_time'),
  },
  {
    id: 'the_dragon_king_of_the_goodness_tree',
    title: 'The Dragon King of the Goodness Tree',
    authors: authors('the_dragon_king_of_the_goodness_tree', [
      { name: 'Cecilia', bio: '' },
      { name: 'Clara', bio: '' },
      { name: 'David', bio: '' },
      { name: 'William', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('the_dragon_king_of_the_goodness_tree') },
    coverImage: cover('the_dragon_king_of_the_goodness_tree'),
  },
  {
    id: 'the_maze',
    title: 'The Maze',
    authors: authors('the_maze', [
      { name: 'Severn', bio: '' },
      { name: 'Michael', bio: '' },
      { name: 'Avery', bio: '' },
      { name: 'Max S.', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('the_maze') },
    coverImage: cover('the_maze'),
  },
  {
    id: 'adventures_of_agent_rex',
    title: 'Adventures of Agent Rex',
    authors: authors('adventures_of_agent_rex', [
      { name: 'Sophie', bio: '' },
      { name: 'Mia', bio: '' },
      { name: 'Max', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('adventures_of_agent_rex') },
    coverImage: cover('adventures_of_agent_rex'),
  },
  {
    id: 'death_gears',
    title: 'Death Gears',
    authors: authors('death_gears', [
      { name: 'Addi B.', bio: '' },
      { name: 'Nathaniel', bio: '' },
      { name: 'Neby', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('death_gears') },
    coverImage: cover('death_gears'),
  },
  {
    id: 'jedi_escape',
    title: 'Jedi Escape',
    authors: authors('jedi_escape', [
      { name: 'Evan', bio: '' },
      { name: 'Jaxon', bio: '' },
      { name: 'Lucas', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('jedi_escape') },
    coverImage: cover('jedi_escape'),
  },
  {
    id: 'mansion_mystery',
    title: 'Mansion Mystery',
    authors: authors('mansion_mystery', [
      { name: 'Eloise', bio: '' },
      { name: 'Evelyn', bio: '' },
      { name: 'Luke', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('mansion_mystery') },
    coverImage: cover('mansion_mystery'),
  },
  {
    id: 'missing_parents_at_sea',
    title: 'Missing Parents at Sea',
    authors: authors('missing_parents_at_sea', [
      { name: 'Ben', bio: '' },
      { name: 'Elisha', bio: '' },
      { name: 'Henry', bio: '' },
      { name: 'Mc', bio: '' },
      { name: 'Mayuko', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('missing_parents_at_sea') },
    coverImage: cover('missing_parents_at_sea'),
  },
  {
    id: 'portals',
    title: 'Portals',
    authors: authors('portals', [
      { name: 'Declan', bio: '' },
      { name: 'Henry C.', bio: '' },
      { name: 'Sam', bio: '' },
    ]),
    year: '2018-2019',
    sceneList: ['startup'],
    scenes: { startup: startup('portals') },
    coverImage: cover('portals'),
  },
];

export const gamesById: Record<string, Game> = Object.fromEntries(
  games.map((g) => [g.id, g]),
);
