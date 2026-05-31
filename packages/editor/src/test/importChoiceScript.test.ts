import { describe, it, expect } from 'vitest';
import { importFromChoiceScript, importFromBackupJson } from '../importChoiceScript';
import { exportAsBackupJson } from '../exportStory';
import { makeStory } from '../test/fixtures';

// ─── importFromChoiceScript ────────────────────────────────────────────────

describe('importFromChoiceScript', () => {
    it('detects *title and *author in startup.txt', () => {
        const files = new Map([['startup', '*title The Quest\n*author Jane\n']]);
        const story = importFromChoiceScript(files);
        expect(story.title).toBe('The Quest');
        expect(story.authorName).toBe('Jane');
    });

    it('creates a scene for each file', () => {
        const files = new Map([
            ['startup', '*scene_list\n  startup\n  ch1\n'],
            ['ch1', 'You arrive.\n*finish\n'],
        ]);
        const story = importFromChoiceScript(files);
        expect(story.scenes).toHaveLength(2);
        expect(story.scenes.some(s => s.id === 'ch1')).toBe(true);
    });

    it('imports *create variables into story.variables', () => {
        const files = new Map([['startup', '*create courage 50\n*create player_name "Hero"\n']]);
        const story = importFromChoiceScript(files);
        expect(story.variables).toContainEqual(expect.objectContaining({ name: 'courage', initialValue: 50 }));
        expect(story.variables).toContainEqual(expect.objectContaining({ name: 'player_name', initialValue: 'Hero' }));
    });

    it('infers variable type from initial value', () => {
        const files = new Map([['startup', '*create score 0\n*create active true\n*create name ""\n']]);
        const story = importFromChoiceScript(files);
        const byName = Object.fromEntries(story.variables.map(v => [v.name, v]));
        expect(byName.score.type).toBe('number');
        expect(byName.active.type).toBe('boolean');
        expect(byName.name.type).toBe('text');
    });

    it('imports *achievement declarations', () => {
        const files = new Map([['startup',
            '*achievement brave visible 15 Brave\n  You were brave.\n  You showed courage.\n  A hero revealed.\n',
        ]]);
        const story = importFromChoiceScript(files);
        expect(story.achievements).toContainEqual(expect.objectContaining({ id: 'brave', points: 15, isVisible: true }));
    });

    it('imports hidden achievements correctly', () => {
        const files = new Map([['startup', '*achievement secret hidden 20 Secret\n  ???\n']]);
        const story = importFromChoiceScript(files);
        expect(story.achievements[0].isVisible).toBe(false);
    });

    it('imports *stat_chart entries', () => {
        const files = new Map([['startup', '*stat_chart\n  percent courage Courage\n  text name Name\n']]);
        const story = importFromChoiceScript(files);
        expect(story.statChart).toContainEqual(expect.objectContaining({ kind: 'percent', variable: 'courage' }));
        expect(story.statChart).toContainEqual(expect.objectContaining({ kind: 'text', variable: 'name' }));
    });

    it('respects *scene_list order', () => {
        const files = new Map([
            ['startup', '*scene_list\n  startup\n  ch2\n  ch1\n'],
            ['ch1', ''],
            ['ch2', ''],
        ]);
        const story = importFromChoiceScript(files);
        expect(story.sceneOrder).toEqual(['startup', 'ch2', 'ch1']);
    });

    it('gives each story a unique id', () => {
        const files = new Map([['startup', '*title Same\n']]);
        const s1 = importFromChoiceScript(files);
        const s2 = importFromChoiceScript(files);
        expect(s1.id).not.toBe(s2.id);
    });

    it('stores unrecognised commands as raw_code nodes (within labeled sections)', () => {
        // raw_code nodes require *label sections; parseLabelless silently drops unknown commands
        const files = new Map([['startup', '*label intro\n*product premium "Bonus" 0.99\n']]);
        const story = importFromChoiceScript(files);
        const rawNode = story.scenes[0].nodes.find(n => n.type === 'raw_code');
        expect(rawNode).toBeDefined();
        expect(rawNode?.data.rawContent).toContain('*product');
    });

    it('builds a graph with at least a start node', () => {
        const files = new Map([['startup', 'Hello world.\n*finish\n']]);
        const story = importFromChoiceScript(files);
        const startNode = story.scenes[0].nodes.find(n => n.type === 'start');
        expect(startNode).toBeDefined();
    });
});

// ─── JSON backup round-trip ────────────────────────────────────────────────

describe('backup round-trip', () => {
    it('restores an exported backup to a structurally identical story', () => {
        const original = makeStory({ title: 'My Test', authorName: 'Tester' });
        const json = exportAsBackupJson(original);
        const restored = importFromBackupJson(json);
        // Strip id/timestamps that are re-assigned on import
        const omitMeta = (s: typeof original) => ({ ...s, id: '', createdAt: 0, updatedAt: 0 });
        expect(omitMeta(restored)).toEqual(omitMeta(original));
    });

    it('runs migrations on an older backup (v1 legacy)', () => {
        const legacy = JSON.stringify({
            id: 'old',
            title: 'Old Story',
            authorName: 'Author',
            nodes: [],
            edges: [],
            images: {},
            createdAt: 0,
            updatedAt: 0,
        });
        const restored = importFromBackupJson(legacy);
        expect(restored.scenes).toHaveLength(1);
        expect(restored.variables).toBeDefined();
    });

    it('exportAsBackupJson produces valid JSON', () => {
        const story = makeStory();
        const json = exportAsBackupJson(story);
        expect(() => JSON.parse(json)).not.toThrow();
    });
});
