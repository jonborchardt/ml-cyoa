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
    id: 'mermaid_adventure',
    title: 'Mermaid Kingdom',
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
    title: 'The Adventures of Courageous Vs. Death Gears',
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
    title: 'Murder at the Mansion',
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
    title: 'Orphans on the Run',
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
    title: 'The Cracked Universe',
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
  {
    id: 'crazy_summer',
    title: 'My Crazy Summer at My Grandparents',
    authors: authors('crazy_summer', [
      { name: 'Emerson', bio: '' },
      { name: 'Harrison', bio: '' },
      { name: 'Ivan', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('crazy_summer') },
    coverImage: cover('crazy_summer'),
  },
  {
    id: 'pyramid_of_mysteries',
    title: 'The Pyramid of Mysteries',
    authors: authors('pyramid_of_mysteries', [
      { name: 'Alaya', bio: '' },
      { name: 'Liam', bio: '' },
      { name: 'Miles', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('pyramid_of_mysteries') },
    coverImage: cover('pyramid_of_mysteries'),
  },
  {
    id: 'dimension_walker',
    title: 'Dimension Walker',
    authors: authors('dimension_walker', [
      { name: 'Nia', bio: '' },
      { name: 'River', bio: '' },
      { name: 'Tor S.', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('dimension_walker') },
    coverImage: cover('dimension_walker'),
  },
  {
    id: 'your_life_takes_a_turn',
    title: 'Your Whole Life Took a Turn',
    authors: authors('your_life_takes_a_turn', [
      { name: 'Arlo', bio: '' },
      { name: 'Dade', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('your_life_takes_a_turn') },
    coverImage: cover('your_life_takes_a_turn'),
  },
  {
    id: 'ai_disaster',
    title: 'AI Disaster',
    authors: authors('ai_disaster', [{ name: 'Nolan', bio: '' }]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('ai_disaster') },
    coverImage: cover('ai_disaster'),
  },
  {
    id: 'the_lost_ice_gem',
    title: 'The Lost Ice Gem',
    authors: authors('the_lost_ice_gem', [
      { name: 'Hanna', bio: '' },
      { name: 'George', bio: '' },
      { name: 'Quinn', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('the_lost_ice_gem') },
    coverImage: cover('the_lost_ice_gem'),
  },
  {
    id: 'the_great_metal_heist',
    title: 'The Great Metal Heist',
    authors: authors('the_great_metal_heist', [
      { name: 'Tor I.', bio: '' },
      { name: 'Cole', bio: '' },
      { name: 'Wren', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('the_great_metal_heist') },
    coverImage: cover('the_great_metal_heist'),
  },
  {
    id: 'young_astronaut',
    title: 'Young Astronaut',
    authors: authors('young_astronaut', [
      { name: 'Bo', bio: '' },
      { name: 'Kai', bio: '' },
      { name: 'Webb', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('young_astronaut') },
    coverImage: cover('young_astronaut'),
  },
  {
    id: 'alien_war',
    title: 'The Battle for Humanity',
    authors: authors('alien_war', [
      { name: 'David', bio: '' },
      { name: 'Desmond', bio: '' },
      { name: 'Max', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('alien_war') },
    coverImage: cover('alien_war'),
  },
  {
    id: 'the_final_lap',
    title: 'The Final Lap',
    authors: authors('the_final_lap', [
      { name: 'Alex', bio: '' },
      { name: 'Nyla', bio: '' },
      { name: 'Shaw', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('the_final_lap') },
    coverImage: cover('the_final_lap'),
  },
  {
    id: 'ancient_flame',
    title: 'Ancient Flame',
    authors: authors('ancient_flame', [
      { name: 'Aylin', bio: '' },
      { name: 'Calla', bio: '' },
      { name: 'Heran', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('ancient_flame') },
    coverImage: cover('ancient_flame'),
  },
  {
    id: 'the_hamster_escape',
    title: 'The Hamster Escape',
    authors: authors('the_hamster_escape', [
      { name: 'Charlie', bio: '' },
      { name: 'Ellis', bio: '' },
      { name: 'Lily B.', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('the_hamster_escape') },
    coverImage: cover('the_hamster_escape'),
  },
  {
    id: 'dream_key',
    title: 'The Search for the Dream Key',
    authors: authors('dream_key', [
      { name: 'Kyaihla', bio: '' },
      { name: 'Michaela', bio: '' },
      { name: 'William', bio: '' },
    ]),
    year: '2025-2026',
    sceneList: ['startup'],
    scenes: { startup: startup('dream_key') },
    coverImage: cover('dream_key'),
  },
];

export const gamesById: Record<string, Game> = Object.fromEntries(
  games.map((g) => [g.id, g]),
);
