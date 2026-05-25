import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import type { VariableDef, ActionItem, InputConfig, ConditionConfig, RandomBranchEntry, EdgeData, StatEntry, Achievement } from './types';

export interface SubroutineDef {
    id: string;       // ChoiceScript label name (lowercase, underscores)
    name: string;     // human-readable display name
    params?: string[]; // parameter names for *params
    nodes: Node<NodeData>[];
    edges: Edge[];
}

export interface SceneDef {
    id: string;
    name: string;
    nodes: Node<NodeData>[];
    edges: Edge[];
    subroutines: SubroutineDef[];
}

export interface MyStory {
    id: string;
    title: string;
    authorName: string;
    authorBio?: string;
    authorPhoto?: string;
    coverImage?: string;
    scenes: SceneDef[];
    sceneOrder: string[];
    images: Record<string, string>;
    variables: VariableDef[];
    statChart: StatEntry[];
    achievements: Achievement[];
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'ml-cyoa-my-stories';

 
export function migrateStory(raw: unknown): MyStory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const story = raw as any;
    let scenes: SceneDef[] = story.scenes;
    let sceneOrder: string[] = story.sceneOrder;

    // v1 → v2: wrap top-level nodes/edges into scenes[0]
    if (!scenes) {
        scenes = [{
            id: 'startup',
            name: 'Startup',
            nodes: story.nodes ?? [],
            edges: story.edges ?? [],
            subroutines: [],
        }];
        sceneOrder = ['startup'];
    }

    // v2 → v3: add subroutines array to scenes that lack it
    scenes = scenes.map((s: SceneDef) => ({ ...s, subroutines: s.subroutines ?? [] }));

    return {
        id: story.id,
        title: story.title,
        authorName: story.authorName,
        authorBio: story.authorBio,
        authorPhoto: story.authorPhoto,
        coverImage: story.coverImage,
        scenes,
        sceneOrder: sceneOrder ?? scenes.map((s: SceneDef) => s.id),
        images: story.images ?? {},
        variables: story.variables ?? [],
        statChart: story.statChart ?? [],
        achievements: story.achievements ?? [],
        createdAt: story.createdAt,
        updatedAt: story.updatedAt,
    };
}

function load(): MyStory[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown[];
        return parsed.map(migrateStory);
    } catch {
        return [];
    }
}

function persist(stories: MyStory[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
}

export function listMyStories(): MyStory[] {
    return load();
}

export function getMyStory(id: string): MyStory | null {
    return load().find(s => s.id === id) ?? null;
}

// ─── Seed story ──────────────────────────────────────────────────────────────
// One example of every node type and edge feature implemented so far.
// Update this whenever a new milestone ships a new feature.

function makeSeedScene(): SceneDef {
    const nodes: Node<NodeData>[] = [
        // ── Start ────────────────────────────────────────────────────────────
        { id: 'start', type: 'start', position: { x: 300, y: 0 },
            data: { label: 'Start', content: '' } },

        // ── Action node: *rand + *set ─────────────────────────────────────
        { id: 'action-setup', type: 'action', position: { x: 300, y: 200 },
            data: { label: 'Set Up', content: '',
                actions: [
                    { kind: 'rand', variable: 'courage', min: 10, max: 100 },
                    { kind: 'set',  variable: 'has_key', op: '=', value: 'false' },
                ] as ActionItem[] } },

        // ── Input node: player enters their name ──────────────────────────
        { id: 'input-name', type: 'input', position: { x: 300, y: 400 },
            data: { label: 'Ask Name', content: '',
                inputConfig: {
                    prompt: 'What is your name, adventurer?',
                    variable: 'player_name',
                    inputType: 'text',
                } as InputConfig } },

        // ── Passage: ${var} and @{var …|…} substitution ──────────────────
        { id: 'passage-intro', type: 'passage', position: { x: 300, y: 600 },
            data: { label: 'Cave Entrance',
                content: 'Welcome, ${player_name}! Your courage score is ${courage}.\n\nYou stand before a crystal cave. You @{has_key already carry a key|have no key}.' } },

        // ── Action node: grab the key (reached via a conditional edge) ────
        { id: 'action-key', type: 'action', position: { x: 700, y: 800 },
            data: { label: 'Pick Up Key', content: '',
                actions: [
                    { kind: 'set', variable: 'has_key', op: '=', value: 'true' },
                ] as ActionItem[] } },

        // ── Page break ────────────────────────────────────────────────────
        { id: 'page-break-1', type: 'page_break', position: { x: 300, y: 900 },
            data: { label: 'Page Break', content: '' } },

        // ── Fake choice: cosmetic; all branches rejoin the same node ──────
        { id: 'fake-choice-1', type: 'fake_choice', position: { x: 300, y: 1100 },
            data: { label: 'How do you feel?',
                content: 'Standing at the entrance, you pause to collect yourself.' } },

        // ── Random branch ─────────────────────────────────────────────────
        { id: 'random-1', type: 'random_branch', position: { x: 300, y: 1300 },
            data: { label: 'Fork in the Path', content: '',
                randomBranches: [
                    { label: 'Left tunnel' },
                    { label: 'Right tunnel' },
                ] as RandomBranchEntry[] } },

        // ── Two passages (one per random branch) ─────────────────────────
        { id: 'passage-left', type: 'passage', position: { x: 80, y: 1520 },
            data: { label: 'Left Tunnel',
                content: 'You take the winding left tunnel, your torch casting long shadows on the crystals.' } },
        { id: 'passage-right', type: 'passage', position: { x: 520, y: 1520 },
            data: { label: 'Right Tunnel',
                content: 'You take the straight right tunnel. A cold breeze presses at your back.' } },

        // ── Condition node: *if has_key = true ───────────────────────────
        { id: 'condition-key', type: 'condition', position: { x: 300, y: 1740 },
            data: { label: 'Has Key?', content: '',
                condition: { left: 'has_key', op: '=', right: 'true' } as ConditionConfig } },

        // ── Two endings ───────────────────────────────────────────────────
        { id: 'ending-good', type: 'ending', position: { x: 600, y: 1960 },
            data: { label: 'Treasure!',
                content: 'Key in hand, you unlock the ancient door. Treasure beyond imagining fills the chamber. The End.' } },
        { id: 'ending-bad', type: 'ending', position: { x: 0, y: 1960 },
            data: { label: 'Locked Out',
                content: 'A massive locked door blocks your path. Without a key there is no way forward. The End.' } },
    ];

    const edges: Edge[] = [
        // Plain connections
        { id: 'e-start',   source: 'start',        target: 'action-setup' },
        { id: 'e-setup',   source: 'action-setup',  target: 'input-name' },
        { id: 'e-input',   source: 'input-name',    target: 'passage-intro' },
        { id: 'e-key-join',source: 'action-key',    target: 'page-break-1' },
        { id: 'e-pb',      source: 'page-break-1',  target: 'fake-choice-1' },

        // Edge with disable_reuse (*disable_reuse)
        { id: 'e-enter', source: 'passage-intro', target: 'page-break-1',
            label: 'Enter the cave',
            data: { reuseMode: 'disable' } as EdgeData },

        // Edge with selectable_if condition + hide_reuse (*selectable_if + *hide_reuse)
        { id: 'e-key', source: 'passage-intro', target: 'action-key',
            label: 'Search for a key',
            data: { condition: 'courage > 50', reuseMode: 'hide' } as EdgeData },

        // Fake-choice edges with branch prose (data.content)
        { id: 'e-fc-a', source: 'fake-choice-1', target: 'random-1',
            label: 'Ready!',
            data: { content: 'You steel yourself and stride forward.' } as EdgeData },
        { id: 'e-fc-b', source: 'fake-choice-1', target: 'random-1',
            label: 'Uneasy…',
            data: { content: 'You shiver, then push on anyway.' } as EdgeData },

        // Random-branch edges (sourceHandle = branch-N)
        { id: 'e-rand-a', source: 'random-1', target: 'passage-left',  sourceHandle: 'branch-0' },
        { id: 'e-rand-b', source: 'random-1', target: 'passage-right', sourceHandle: 'branch-1' },

        // Both paths converge on the condition node
        { id: 'e-left-cond',  source: 'passage-left',  target: 'condition-key', label: 'Reach the door' },
        { id: 'e-right-cond', source: 'passage-right', target: 'condition-key', label: 'Reach the door' },

        // Condition edges (sourceHandle = 'true' | 'false')
        { id: 'e-cond-good', source: 'condition-key', target: 'ending-good', sourceHandle: 'true' },
        { id: 'e-cond-bad',  source: 'condition-key', target: 'ending-bad',  sourceHandle: 'false' },
    ];

    return { id: 'startup', name: 'Startup', nodes, edges, subroutines: [] };
}

export function createMyStory(): MyStory {
    const id = crypto.randomUUID();
    const now = Date.now();

    const variables: VariableDef[] = [
        { name: 'courage',     type: 'number',  initialValue: 50,    scope: 'global', description: 'Bravery score (10–100, randomised on start)' },
        { name: 'has_key',     type: 'boolean', initialValue: false,  scope: 'global', description: 'True if the player found the key' },
        { name: 'player_name', type: 'text',    initialValue: 'Hero', scope: 'global', description: 'The player\'s chosen name' },
    ];

    const story: MyStory = {
        id,
        title: 'My Story',
        authorName: '',
        scenes: [makeSeedScene()],
        sceneOrder: ['startup'],
        images: {},
        variables,
        statChart: [],
        achievements: [],
        createdAt: now,
        updatedAt: now,
    };
    const stories = load();
    stories.push(story);
    persist(stories);
    return story;
}

export function updateMyStory(id: string, patch: Partial<Omit<MyStory, 'id' | 'createdAt'>>): void {
    const stories = load();
    const idx = stories.findIndex(s => s.id === id);
    if (idx === -1) return;
    stories[idx] = { ...stories[idx], ...patch, updatedAt: Date.now() };
    persist(stories);
}

export function deleteMyStory(id: string): void {
    persist(load().filter(s => s.id !== id));
}
