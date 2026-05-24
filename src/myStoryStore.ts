import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';

export interface MyStory {
    id: string;
    title: string;
    authorName: string;
    authorBio?: string;
    authorPhoto?: string;
    coverImage?: string;
    nodes: Node<NodeData>[];
    edges: Edge[];
    images: Record<string, string>;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'ml-cyoa-my-stories';

function load(): MyStory[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as MyStory[]) : [];
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

export function createMyStory(): MyStory {
    const id = crypto.randomUUID();
    const now = Date.now();
    const story: MyStory = {
        id,
        title: 'My Story',
        authorName: '',
        nodes: [
            { id: 'start', type: 'start', position: { x: 200, y: 0 }, data: { label: 'Start', content: '' } },
            { id: 'p1', type: 'passage', position: { x: 200, y: 270 }, data: { label: 'Your story begins here.', content: 'Your story begins here.' } },
            { id: 'e1', type: 'ending', position: { x: 200, y: 540 }, data: { label: 'The End.', content: '' } },
        ],
        edges: [
            { id: 'start-p1', source: 'start', target: 'p1' },
            { id: 'p1-e1', source: 'p1', target: 'e1', label: 'Continue' },
        ],
        images: {},
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
