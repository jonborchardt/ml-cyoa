import { describe, it, expect } from 'vitest';
import { validateStory } from '../validateFlow';
import {
    makeStory, makeScene, makeVariable, makePassageNode, makeStartNode, makeEdge, makeEndingNode, makeConditionNode,
    makeStoryWithSceneJump, makeStatEntry, makeAchievement, makeActionNode,
    makeStoryWithGosubToMissing, makeStoryWithSubroutineWithoutReturn,
    makeStoryWithRecursiveGosub, makeStoryWithSingleVisitHideReuse,
} from '../test/fixtures';

describe('variable validation', () => {
    it('warns on ${undeclared} reference in node content', () => {
        const scene = makeScene({
            id: 'startup',
            nodes: [
                makeStartNode(),
                makePassageNode({ id: 'p1', data: { label: 'hi', content: 'Hello ${ghost_var}' } }),
                makeEndingNode(),
            ],
            edges: [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Continue')],
        });
        const story = makeStory({ variables: [], scenes: [scene] });
        const { warnings } = validateStory(story);
        expect(warnings).toContainEqual(expect.objectContaining({ code: 'UNDEFINED_VARIABLE', ref: 'ghost_var' }));
    });

    it('does not warn when variable is declared', () => {
        const scene = makeScene({
            id: 'startup',
            nodes: [
                makeStartNode(),
                makePassageNode({ id: 'p1', data: { label: 'hi', content: 'Your courage: ${courage}' } }),
                makeEndingNode(),
            ],
            edges: [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Continue')],
        });
        const story = makeStory({ variables: [makeVariable({ name: 'courage' })], scenes: [scene] });
        const { warnings } = validateStory(story);
        expect(warnings.some(w => w.code === 'UNDEFINED_VARIABLE')).toBe(false);
    });

    it('errors on duplicate variable names', () => {
        const story = makeStory({ variables: [makeVariable({ name: 'score' }), makeVariable({ name: 'score' })] });
        expect(validateStory(story).errors).toContainEqual(expect.objectContaining({ code: 'DUPLICATE_VARIABLE' }));
    });

    it('errors on reserved variable name', () => {
        const story = makeStory({ variables: [makeVariable({ name: 'choice_subscribe_allowed' })] });
        expect(validateStory(story).errors).toContainEqual(expect.objectContaining({ code: 'RESERVED_VARIABLE_NAME' }));
    });

    it('errors on boolean variable with non-boolean initialValue', () => {
        const story = makeStory({ variables: [makeVariable({ type: 'boolean', initialValue: 'yes' })] });
        expect(validateStory(story).errors).toContainEqual(expect.objectContaining({ code: 'INVALID_INITIAL_VALUE' }));
    });

    it('accepts boolean true/false initial values', () => {
        const story = makeStory({ variables: [makeVariable({ name: 'a', type: 'boolean', initialValue: true }), makeVariable({ name: 'b', type: 'boolean', initialValue: false })] });
        expect(validateStory(story).errors.some(e => e.code === 'INVALID_INITIAL_VALUE')).toBe(false);
    });
});

describe('graph validation (via validateStory)', () => {
    it('errors when no start node', () => {
        const story = makeStory({ scenes: [makeScene({ id: 'startup', nodes: [], edges: [] })] });
        expect(validateStory(story).errors).toContainEqual(expect.objectContaining({ code: 'NO_START_NODE' }));
    });

    it('errors when start node has no outgoing edges', () => {
        const scene = makeScene({ id: 'startup', edges: [] });
        const story = makeStory({ scenes: [scene] });
        expect(validateStory(story).errors).toContainEqual(expect.objectContaining({ code: 'START_NO_EDGES' }));
    });

    it('warns on unreachable node', () => {
        const orphan = makePassageNode({ id: 'orphan', data: { label: 'Orphan', content: 'orphan' } });
        const baseScene = makeScene({ id: 'startup' });
        const scene = makeScene({ id: 'startup', nodes: [...baseScene.nodes, orphan], edges: baseScene.edges });
        const story = makeStory({ scenes: [scene] });
        expect(validateStory(story).warnings).toContainEqual(expect.objectContaining({ code: 'UNREACHABLE_NODE' }));
    });
});

describe('condition node validation', () => {
    it('errors when condition node has no outbound true-branch edge', () => {
        const cond = makeConditionNode({ left: 'x', op: '>', right: '0' }, { id: 'cond1' });
        const p1 = makePassageNode({ id: 'p1' });
        const e1 = makeEndingNode();
        const scene = makeScene({
            id: 'startup',
            nodes: [makeStartNode(), cond, p1, e1],
            edges: [
                makeEdge('start', 'cond1'),
                { ...makeEdge('cond1', 'e1'), sourceHandle: 'false' },
                makeEdge('p1', 'e1', 'Continue'),
            ],
        });
        const story = makeStory({ scenes: [scene] });
        expect(validateStory(story).errors).toContainEqual(
            expect.objectContaining({ code: 'CONDITION_MISSING_TRUE_BRANCH' }),
        );
    });

    it('errors when condition node has no outbound false-branch edge', () => {
        const cond = makeConditionNode({ left: 'x', op: '>', right: '0' }, { id: 'cond1' });
        const p1 = makePassageNode({ id: 'p1' });
        const e1 = makeEndingNode();
        const scene = makeScene({
            id: 'startup',
            nodes: [makeStartNode(), cond, p1, e1],
            edges: [
                makeEdge('start', 'cond1'),
                { ...makeEdge('cond1', 'p1'), sourceHandle: 'true' },
                makeEdge('p1', 'e1', 'Continue'),
            ],
        });
        const story = makeStory({ scenes: [scene] });
        expect(validateStory(story).errors).toContainEqual(
            expect.objectContaining({ code: 'CONDITION_MISSING_FALSE_BRANCH' }),
        );
    });

    it('passes when condition node has both true and false edges', () => {
        const cond = makeConditionNode({ left: 'x', op: '>', right: '0' }, { id: 'cond1' });
        const p1 = makePassageNode({ id: 'p1' });
        const e1 = makeEndingNode({ id: 'e1' });
        const e2 = makeEndingNode({ id: 'e2' });
        const scene = makeScene({
            id: 'startup',
            nodes: [makeStartNode(), cond, p1, e1, e2],
            edges: [
                makeEdge('start', 'cond1'),
                { ...makeEdge('cond1', 'p1'), sourceHandle: 'true' },
                { ...makeEdge('cond1', 'e2'), sourceHandle: 'false' },
                makeEdge('p1', 'e1', 'Continue'),
            ],
        });
        const story = makeStory({ scenes: [scene] });
        expect(validateStory(story).errors.some(e => e.code.startsWith('CONDITION_'))).toBe(false);
    });
});

describe('cross-scene validation', () => {
    it('errors when a SceneJump targets a scene that does not exist', () => {
        const story = makeStoryWithSceneJump({ targetScene: 'ghost_scene', jumpType: 'transfer' });
        expect(validateStory(story).errors).toContainEqual(
            expect.objectContaining({ code: 'SCENE_JUMP_MISSING_SCENE', ref: 'ghost_scene' }),
        );
    });

    it('warns on scenes not reachable from sceneOrder or any goto_scene', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'startup' }), makeScene({ id: 'orphan' })],
            sceneOrder: ['startup'],
        });
        expect(validateStory(story).warnings).toContainEqual(
            expect.objectContaining({ code: 'UNREACHABLE_SCENE', ref: 'orphan' }),
        );
    });

    it('errors on duplicate scene IDs', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'dup' }), makeScene({ id: 'dup' })],
            sceneOrder: ['dup'],
        });
        expect(validateStory(story).errors).toContainEqual(
            expect.objectContaining({ code: 'DUPLICATE_SCENE_ID' }),
        );
    });
});

describe('stats/achievement validation', () => {
    it('warns when stat_chart references an undeclared variable', () => {
        const story = makeStory({
            variables: [],
            statChart: [makeStatEntry({ kind: 'percent', variable: 'ghost_stat' })],
        });
        expect(validateStory(story).warnings).toContainEqual(
            expect.objectContaining({ code: 'STAT_CHART_UNDEFINED_VARIABLE', ref: 'ghost_stat' }),
        );
    });

    it('does not warn when stat_chart variable is declared', () => {
        const story = makeStory({
            variables: [makeVariable({ name: 'courage' })],
            statChart: [makeStatEntry({ kind: 'percent', variable: 'courage', label: 'Courage' })],
        });
        expect(validateStory(story).warnings.some(w => w.code === 'STAT_CHART_UNDEFINED_VARIABLE')).toBe(false);
    });

    it('errors on duplicate achievement IDs', () => {
        const story = makeStory({ achievements: [makeAchievement({ id: 'dup' }), makeAchievement({ id: 'dup' })] });
        expect(validateStory(story).errors).toContainEqual(
            expect.objectContaining({ code: 'DUPLICATE_ACHIEVEMENT_ID' }),
        );
    });

    it('warns when *achieve references an undeclared achievement', () => {
        const scene = makeScene({
            id: 'startup',
            nodes: [makeStartNode(), makeActionNode([{ kind: 'award_achievement', achievementId: 'ghost_achievement' }], { id: 'act1' }), ...makeScene({ id: 'x' }).nodes.filter(n => n.type === 'ending')],
            edges: [makeEdge('start', 'act1'), makeEdge('act1', 'e1')],
        });
        const story = makeStory({ achievements: [], scenes: [scene] });
        expect(validateStory(story).warnings).toContainEqual(
            expect.objectContaining({ code: 'UNDEFINED_ACHIEVEMENT', ref: 'ghost_achievement' }),
        );
    });

    it('warns when achievement has 0 points', () => {
        const story = makeStory({ achievements: [makeAchievement({ id: 'zero', points: 0 })] });
        expect(validateStory(story).warnings).toContainEqual(
            expect.objectContaining({ code: 'ACHIEVEMENT_ZERO_POINTS' }),
        );
    });
});

// ─── Subroutine validation ────────────────────────────────────────────────

describe('subroutine validation', () => {
    it('errors when GosubCallNode references a missing subroutine', () => {
        const story = makeStoryWithGosubToMissing('ghost_sub');
        expect(validateStory(story).errors).toContainEqual(
            expect.objectContaining({ code: 'GOSUB_MISSING_SUBROUTINE', ref: 'ghost_sub' }),
        );
    });

    it('errors when a subroutine with body nodes has no *return node', () => {
        const story = makeStoryWithSubroutineWithoutReturn();
        expect(validateStory(story).errors).toContainEqual(
            expect.objectContaining({ code: 'SUBROUTINE_NO_RETURN' }),
        );
    });

    it('warns on self-recursive subroutine call', () => {
        const story = makeStoryWithRecursiveGosub('loop_sub');
        expect(validateStory(story).warnings).toContainEqual(
            expect.objectContaining({ code: 'RECURSIVE_GOSUB' }),
        );
    });

    it('warns when reuse modifier is on a choice not reachable more than once', () => {
        const story = makeStoryWithSingleVisitHideReuse();
        expect(validateStory(story).warnings).toContainEqual(
            expect.objectContaining({ code: 'REUSE_MODIFIER_UNREACHABLE' }),
        );
    });

    it('does not error when gosub references an existing subroutine', () => {
        const story = makeStoryWithGosubToMissing('ghost_sub');
        // patch to add the subroutine so it exists
        const scene = story.scenes[0];
        story.scenes[0] = {
            ...scene,
            subroutines: [{ id: 'ghost_sub', name: 'Ghost', nodes: [], edges: [] }],
        };
        expect(validateStory(story).errors.filter(e => e.code === 'GOSUB_MISSING_SUBROUTINE')).toHaveLength(0);
    });
});
