import { describe, it, expect } from 'vitest';
import { serializeStory } from '../serializeStory';
import { serializeStartupPreamble, serializeActionNode, serializeSubroutine, serializeFlow } from '../serializeFlow';
import {
    makeStory, makeScene, makeVariable, makePassageNode, makeEndingNode, makeStartNode, makeEdge, makeSceneJumpNode,
    makeStatEntry, makeAchievement, makeActionNode, makeSubroutine, makeGosubCallNode,
} from '../test/fixtures';
import type { SubroutineDef } from '../myStoryStore';

// ─── Multi-scene output ───────────────────────────────────────────────────

describe('serializeStory (multi-scene)', () => {
    it('returns a Map with one entry per scene', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'startup' }), makeScene({ id: 'chapter_1' })],
            sceneOrder: ['startup', 'chapter_1'],
        });
        const files = serializeStory(story);
        expect([...files.keys()]).toEqual(['startup', 'chapter_1']);
    });

    it('emits *scene_list in startup when there are multiple scenes', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'startup' }), makeScene({ id: 'ch2' }), makeScene({ id: 'ch1' })],
            sceneOrder: ['startup', 'ch2', 'ch1'],
        });
        expect(serializeStory(story).get('startup')).toContain('*scene_list\n  startup\n  ch2\n  ch1');
    });

    it('emits *title and *author in startup preamble', () => {
        const story = makeStory({ title: 'My Story', authorName: 'Jane' });
        const startup = serializeStory(story).get('startup')!;
        expect(startup).toContain('*title My Story');
        expect(startup).toContain('*author Jane');
    });

    it('emits *create variables only in startup', () => {
        const story = makeStory({
            variables: [makeVariable({ name: 'courage', scope: 'global' })],
            scenes: [makeScene({ id: 'startup' }), makeScene({ id: 'ch1' })],
            sceneOrder: ['startup', 'ch1'],
        });
        expect(serializeStory(story).get('startup')).toContain('*create courage');
        expect(serializeStory(story).get('ch1')).not.toContain('*create courage');
    });

    it('does not emit *scene_list for a single-scene story', () => {
        const story = makeStory();
        expect(serializeStory(story).get('startup')).not.toContain('*scene_list');
    });

    it('emits scenes not in sceneOrder after the ordered ones', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'startup' }), makeScene({ id: 'extra' })],
            sceneOrder: ['startup'],
        });
        const keys = [...serializeStory(story).keys()];
        expect(keys).toContain('startup');
        expect(keys).toContain('extra');
        expect(keys.indexOf('startup')).toBeLessThan(keys.indexOf('extra'));
    });
});

// ─── Scene jump serialization ─────────────────────────────────────────────

describe('scene_jump node serialization', () => {
    function makeSceneWithJump(jumpData: Parameters<typeof makeSceneJumpNode>[0]) {
        const jumpNode = makeSceneJumpNode(jumpData, { id: 'sj1' });
        return makeScene({
            id: 'startup',
            nodes: [makeStartNode(), makePassageNode(), jumpNode],
            edges: [makeEdge('start', 'p1'), makeEdge('p1', 'sj1')],
        });
    }

    it('emits *goto_scene for transfer jumps', () => {
        const story = makeStory({
            scenes: [makeSceneWithJump({ targetScene: 'chapter_2', jumpType: 'transfer' })],
        });
        const out = serializeStory(story).get('startup')!;
        expect(out).toContain('*goto_scene chapter_2');
    });

    it('emits *goto_scene with label when label is set', () => {
        const story = makeStory({
            scenes: [makeSceneWithJump({ targetScene: 'chapter_2', targetLabel: 'the_duel', jumpType: 'transfer' })],
        });
        expect(serializeStory(story).get('startup')).toContain('*goto_scene chapter_2 the_duel');
    });

    it('emits *gosub_scene for subroutine jumps', () => {
        const story = makeStory({
            scenes: [makeSceneWithJump({ targetScene: 'utils', jumpType: 'subroutine' })],
        });
        expect(serializeStory(story).get('startup')).toContain('*gosub_scene utils');
    });
});

// ─── serializeFlow (single-scene) backward compat ────────────────────────

describe('serializeFlow compatibility via serializeStory', () => {
    it('single scene story still produces valid choicescript body', () => {
        const story = makeStory();
        const text = serializeStory(story).get('startup')!;
        expect(text).toContain('*label');
    });

    it('includes global *create vars in startup', () => {
        const story = makeStory({ variables: [makeVariable({ name: 'hp', initialValue: 100, scope: 'global' })] });
        expect(serializeStory(story).get('startup')).toContain('*create hp 100');
    });
});

// ─── Scene ordering ───────────────────────────────────────────────────────

describe('serializeStory scene ordering', () => {
    it('respects sceneOrder even when scenes array is in different order', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'ch2' }), makeScene({ id: 'startup' })],
            sceneOrder: ['startup', 'ch2'],
        });
        const keys = [...serializeStory(story).keys()];
        expect(keys[0]).toBe('startup');
        expect(keys[1]).toBe('ch2');
    });

    it('handles an empty scene gracefully', () => {
        const emptyScene = makeScene({
            id: 'empty',
            nodes: [],
            edges: [],
        });
        const story = makeStory({
            scenes: [makeScene({ id: 'startup' }), emptyScene],
            sceneOrder: ['startup', 'empty'],
        });
        const files = serializeStory(story);
        expect(files.has('empty')).toBe(true);
    });
});

// ─── Stat chart serialization ────────────────────────────────────────────

describe('serializeStatChart', () => {
    it('emits *stat_chart with percent entries', () => {
        const story = makeStory({ statChart: [makeStatEntry({ kind: 'percent', variable: 'leadership', label: 'Leadership' })] });
        expect(serializeStartupPreamble(story)).toContain('*stat_chart\n  percent leadership "Leadership"');
    });

    it('emits opposed_pair entries', () => {
        const story = makeStory({ statChart: [makeStatEntry({ kind: 'opposed_pair', variable: 'bold', variable2: 'cautious', label: 'Bold', label2: 'Cautious' })] });
        expect(serializeStartupPreamble(story)).toContain('  opposed_pair bold cautious "Bold" "Cautious"');
    });

    it('emits text entries', () => {
        const story = makeStory({ statChart: [makeStatEntry({ kind: 'text', variable: 'player_name', label: 'Name' })] });
        expect(serializeStartupPreamble(story)).toContain('  text player_name "Name"');
    });

    it('omits *stat_chart block entirely when statChart is empty', () => {
        const story = makeStory({ statChart: [] });
        expect(serializeStartupPreamble(story)).not.toContain('*stat_chart');
    });
});

// ─── Achievement serialization ────────────────────────────────────────────

describe('serializeAchievements', () => {
    it('emits visible *achievement declaration', () => {
        const story = makeStory({ achievements: [makeAchievement({ id: 'loyal_friend', title: 'Loyal Friend', points: 15, isVisible: true, shortDescription: 'You stood by your companion.' })] });
        const out = serializeStartupPreamble(story);
        expect(out).toContain('*achievement loyal_friend visible 15 Loyal Friend');
        expect(out).toContain('  You stood by your companion.');
    });

    it('emits hidden *achievement with correct modifier', () => {
        const story = makeStory({ achievements: [makeAchievement({ id: 'secret', isVisible: false, shortDescription: 'Mystery.' })] });
        expect(serializeStartupPreamble(story)).toContain('hidden');
    });

    it('emits no achievements when array is empty', () => {
        const story = makeStory({ achievements: [] });
        expect(serializeStartupPreamble(story)).not.toContain('*achievement');
    });
});

// ─── award_achievement action ─────────────────────────────────────────────

describe('award_achievement action serialization', () => {
    it('emits *achieve id for an award_achievement action', () => {
        const node = makeActionNode([{ kind: 'award_achievement', achievementId: 'loyal_friend' }]);
        expect(serializeActionNode(node)).toBe('*achieve loyal_friend');
    });
});

// ─── Passage content ─────────────────────────────────────────────────────

describe('serializeStory passage content', () => {
    it('includes passage content in output', () => {
        const p1 = makePassageNode({ data: { label: 'Hello', content: 'Hello world.' } });
        const e1 = makeEndingNode();
        const scene = makeScene({
            id: 'startup',
            nodes: [makeStartNode(), p1, e1],
            edges: [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Continue')],
        });
        const story = makeStory({ scenes: [scene] });
        expect(serializeStory(story).get('startup')).toContain('Hello world.');
    });
});

// ─── serializeSubroutine ──────────────────────────────────────────────────

describe('serializeSubroutine', () => {
    it('emits *label at entry and *return at end', () => {
        const sub = makeSubroutine({
            id: 'heal',
            nodes: [makeActionNode([{ kind: 'set', variable: 'hp', op: '+', value: '20' }])],
        });
        const out = serializeSubroutine(sub);
        expect(out).toMatch(/^\*label heal\n/);
        expect(out).toMatch(/\*return\s*$/);
    });

    it('emits *set action in body', () => {
        const sub = makeSubroutine({
            id: 'heal',
            nodes: [makeActionNode([{ kind: 'set', variable: 'hp', op: '+', value: '20' }])],
        });
        expect(serializeSubroutine(sub)).toContain('*set hp +20');
    });

    it('emits *params line when params are declared', () => {
        const sub = makeSubroutine({ id: 'boost_stat', params: ['stat_var', 'amount'] });
        expect(serializeSubroutine(sub)).toContain('*params stat_var amount');
    });

    it('returns just *label and *return when body is empty', () => {
        const sub = makeSubroutine({ id: 'empty_sub' });
        expect(serializeSubroutine(sub)).toBe('*label empty_sub\n*return');
    });

    it('serializes multiple actions in order', () => {
        const sub = makeSubroutine({
            id: 'multi',
            nodes: [makeActionNode([
                { kind: 'set', variable: 'courage', op: '+', value: '5' },
                { kind: 'set', variable: 'hp', op: '-', value: '3' },
            ])],
        });
        const out = serializeSubroutine(sub);
        const lines = out.split('\n');
        const idx1 = lines.findIndex(l => l.includes('*set courage +5'));
        const idx2 = lines.findIndex(l => l.includes('*set hp -3'));
        expect(idx1).toBeGreaterThanOrEqual(0);
        expect(idx2).toBeGreaterThan(idx1);
    });
});

// ─── gosub call node in serializeFlow ────────────────────────────────────

describe('gosub call node in serializeFlow', () => {
    it('emits *gosub <subroutineId>', () => {
        const start = makeStartNode();
        const gosub = makeGosubCallNode({ subroutineId: 'stat_boost' });
        const ending = makeEndingNode({ id: 'e1' });
        const out = serializeFlow([start, gosub, ending], [makeEdge('start', 'gosub1'), makeEdge('gosub1', 'e1')]);
        expect(out).toContain('*gosub stat_boost');
    });

    it('emits *gosub with params when params are set', () => {
        const start = makeStartNode();
        const gosub = makeGosubCallNode({ subroutineId: 'boost_stat', params: ['"courage"', '10'] });
        const ending = makeEndingNode({ id: 'e1' });
        const out = serializeFlow([start, gosub, ending], [makeEdge('start', 'gosub1'), makeEdge('gosub1', 'e1')]);
        expect(out).toContain('*gosub boost_stat "courage" 10');
    });

    it('continues flow after the gosub call', () => {
        const start = makeStartNode();
        const gosub = makeGosubCallNode({ subroutineId: 'heal' });
        const passage = makePassageNode({ id: 'p_after', data: { label: 'After', content: 'You feel better.' } });
        const ending = makeEndingNode({ id: 'e1' });
        const out = serializeFlow(
            [start, gosub, passage, ending],
            [makeEdge('start', 'gosub1'), makeEdge('gosub1', 'p_after'), makeEdge('p_after', 'e1', 'Continue')],
        );
        const gosubIdx = out.indexOf('*gosub heal');
        const passageIdx = out.indexOf('You feel better.');
        expect(gosubIdx).toBeGreaterThanOrEqual(0);
        expect(passageIdx).toBeGreaterThan(gosubIdx);
    });
});

// ─── subroutines in serializeStory ───────────────────────────────────────

describe('serializeStory with subroutines', () => {
    it('appends subroutines after the main scene flow', () => {
        const healSub: SubroutineDef = {
            id: 'heal',
            name: 'Heal',
            nodes: [makeActionNode([{ kind: 'set', variable: 'hp', op: '+', value: '10' }])],
            edges: [],
        };
        const scene = makeScene({ id: 'startup', subroutines: [healSub] });
        const story = makeStory({ scenes: [scene], sceneOrder: ['startup'] });
        const text = serializeStory(story).get('startup') ?? '';
        expect(text).toContain('*label heal');
        expect(text).toContain('*set hp +10');
        expect(text).toContain('*return');
    });

    it('appends multiple subroutines in order', () => {
        const sub1: SubroutineDef = { id: 'sub_a', name: 'Sub A', nodes: [], edges: [] };
        const sub2: SubroutineDef = { id: 'sub_b', name: 'Sub B', nodes: [], edges: [] };
        const scene = makeScene({ id: 'startup', subroutines: [sub1, sub2] });
        const story = makeStory({ scenes: [scene], sceneOrder: ['startup'] });
        const text = serializeStory(story).get('startup') ?? '';
        expect(text.indexOf('*label sub_a')).toBeLessThan(text.indexOf('*label sub_b'));
    });

    it('produces no subroutine output when subroutines array is empty', () => {
        const scene = makeScene({ id: 'startup', subroutines: [] });
        const story = makeStory({ scenes: [scene], sceneOrder: ['startup'] });
        const text = serializeStory(story).get('startup') ?? '';
        expect(text).not.toContain('*return');
    });
});
