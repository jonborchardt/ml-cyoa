import { describe, it, expect, beforeEach } from 'vitest';
import { migrateStory } from '../myStoryStore';
import { minimalLegacyStory, makePassageNode, makeEdge, makeStartNode } from '../test/fixtures';

describe('migrateStory v1 (legacy with nodes/edges)', () => {
    it('migrates a story without variables by adding an empty array', () => {
        const legacy = minimalLegacyStory();
        const migrated = migrateStory(legacy);
        expect(migrated.variables).toEqual([]);
    });

    it('preserves an existing variables array', () => {
        const legacy = {
            ...minimalLegacyStory(),
            variables: [{ name: 'score', type: 'number' as const, initialValue: 0, scope: 'global' as const }],
        };
        const migrated = migrateStory(legacy);
        expect(migrated.variables).toHaveLength(1);
        expect(migrated.variables[0].name).toBe('score');
    });
});

describe('migrateStory v1→v2 (multi-scene)', () => {
    it('wraps top-level nodes/edges into scenes[0] named startup', () => {
        const legacy = {
            ...minimalLegacyStory(),
            nodes: [makeStartNode(), makePassageNode({ id: 'p1' })],
            edges: [makeEdge('start', 'p1')],
        };
        const migrated = migrateStory(legacy);
        expect(migrated.scenes).toHaveLength(1);
        expect(migrated.scenes[0].id).toBe('startup');
        expect(migrated.scenes[0].nodes).toHaveLength(2);
    });

    it('sets sceneOrder to ["startup"] after migration', () => {
        const migrated = migrateStory(minimalLegacyStory());
        expect(migrated.sceneOrder).toEqual(['startup']);
    });

    it('removes top-level nodes and edges from the story object', () => {
        const migrated = migrateStory(minimalLegacyStory());
        expect((migrated as unknown as Record<string, unknown>).nodes).toBeUndefined();
        expect((migrated as unknown as Record<string, unknown>).edges).toBeUndefined();
    });

    it('preserves a story that already has scenes (no double-migration)', () => {
        const alreadyMigrated = {
            id: 'x',
            title: 'T',
            authorName: 'A',
            scenes: [{ id: 'startup', name: 'Startup', nodes: [], edges: [] }],
            sceneOrder: ['startup'],
            images: {},
            variables: [],
            createdAt: 0,
            updatedAt: 0,
        };
        const migrated = migrateStory(alreadyMigrated);
        expect(migrated.scenes).toHaveLength(1);
        expect(migrated.sceneOrder).toEqual(['startup']);
    });
});

describe('migrateStory v3 (statChart/achievements)', () => {
    it('migrates story without statChart/achievements by adding empty arrays', () => {
        const legacy = { ...minimalLegacyStory() };
        const migrated = migrateStory(legacy as unknown as Parameters<typeof migrateStory>[0]);
        expect(migrated.statChart).toEqual([]);
        expect(migrated.achievements).toEqual([]);
    });

    it('preserves existing statChart and achievements arrays', () => {
        const withFields = {
            ...minimalLegacyStory(),
            statChart: [{ kind: 'percent' as const, variable: 'score', label: 'Score' }],
            achievements: [{ id: 'hero', title: 'Hero', points: 50, shortDescription: 'You did it.', isVisible: true }],
        };
        const migrated = migrateStory(withFields as unknown as Parameters<typeof migrateStory>[0]);
        expect(migrated.statChart).toHaveLength(1);
        expect(migrated.achievements).toHaveLength(1);
        expect(migrated.achievements[0].id).toBe('hero');
    });
});

describe('localStorage isolation', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('createMyStory initializes scenes with a startup scene', async () => {
        const { createMyStory, getMyStory } = await import('../myStoryStore');
        const story = createMyStory();
        const fetched = getMyStory(story.id);
        expect(fetched?.scenes).toHaveLength(1);
        expect(fetched?.scenes[0].id).toBe('startup');
        expect(fetched?.sceneOrder).toEqual(['startup']);
    });

    it('createMyStory initializes seed variables (courage, has_key, player_name)', async () => {
        const { createMyStory, getMyStory } = await import('../myStoryStore');
        const story = createMyStory();
        const fetched = getMyStory(story.id);
        const names = fetched?.variables.map(v => v.name) ?? [];
        expect(names).toContain('courage');
        expect(names).toContain('has_key');
        expect(names).toContain('player_name');
    });
});

// ─── Subroutine migration ─────────────────────────────────────────────────

describe('migrateStory subroutine migration', () => {
    it('migrates scenes without subroutines field by adding empty array', () => {
        const legacy = {
            ...minimalLegacyStory(),
            scenes: [{ id: 'startup', name: 'Startup', nodes: [], edges: [] }],
            sceneOrder: ['startup'],
        };
        const migrated = migrateStory(legacy as unknown);
        expect(migrated.scenes[0].subroutines).toEqual([]);
    });

    it('preserves existing subroutines array', () => {
        const sub = { id: 'heal', name: 'Heal', nodes: [], edges: [] };
        const raw = {
            ...minimalLegacyStory(),
            scenes: [{ id: 'startup', name: 'Startup', nodes: [], edges: [], subroutines: [sub] }],
            sceneOrder: ['startup'],
        };
        const migrated = migrateStory(raw as unknown);
        expect(migrated.scenes[0].subroutines).toHaveLength(1);
        expect(migrated.scenes[0].subroutines[0].id).toBe('heal');
    });

    it('v1 legacy story (no scenes field) gets subroutines: [] on the auto-created startup scene', () => {
        const legacy = minimalLegacyStory();
        const migrated = migrateStory(legacy);
        expect(migrated.scenes[0].subroutines).toEqual([]);
    });
});
