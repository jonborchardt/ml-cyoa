import { describe, it, expect } from 'vitest';
import { serializeFlow, serializeStartupPreamble, serializeActionNode, serializeConditionNode, serializeChoiceEdge } from '../serializeFlow';
import { makeStory, makeVariable, makePassageNode, makeEndingNode, makeStartNode, makeEdge, makeConditionNode, makeActionNode, makeFakeChoiceNode } from '../test/fixtures';

// ─── Preamble ──────────────────────────────────────────────────────────────

describe('serializeStartupPreamble', () => {
    it('emits *create for each global variable', () => {
        const story = makeStory({
            variables: [
                makeVariable({ name: 'leadership', type: 'number', initialValue: 50, scope: 'global' }),
                makeVariable({ name: 'player_name', type: 'text', initialValue: 'Hero', scope: 'global' }),
                makeVariable({ name: 'has_sword', type: 'boolean', initialValue: false, scope: 'global' }),
            ],
        });
        const preamble = serializeStartupPreamble(story);
        expect(preamble).toBe('*create leadership 50\n*create player_name "Hero"\n*create has_sword false');
    });

    it('returns empty string when no global variables', () => {
        expect(serializeStartupPreamble(makeStory())).toBe('');
    });

    it('omits temp variables from preamble', () => {
        const story = makeStory({ variables: [makeVariable({ name: 'bonus', scope: 'temp', initialValue: 0 })] });
        expect(serializeStartupPreamble(story)).toBe('');
    });

    it('escapes double quotes in text variable initial values', () => {
        const story = makeStory({ variables: [makeVariable({ name: 'greeting', type: 'text', initialValue: 'say "hi"', scope: 'global' })] });
        expect(serializeStartupPreamble(story)).toContain('*create greeting "say \\"hi\\""');
    });
});

// ─── Action node ──────────────────────────────────────────────────────────

describe('serializeActionNode', () => {
    it('emits *set for set actions (= operator)', () => {
        const node = makeActionNode([{ kind: 'set', variable: 'leadership', op: '=', value: '10' }]);
        expect(serializeActionNode(node)).toBe('*set leadership 10');
    });

    it('emits *set with +value for + operator', () => {
        const node = makeActionNode([{ kind: 'set', variable: 'leadership', op: '+', value: '10' }]);
        expect(serializeActionNode(node)).toBe('*set leadership +10');
    });

    it('emits *rand for rand actions', () => {
        const node = makeActionNode([{ kind: 'rand', variable: 'luck', min: 1, max: 6 }]);
        expect(serializeActionNode(node)).toBe('*rand luck 1 6');
    });

    it('emits *input_text for player text input', () => {
        const node = makeActionNode([{ kind: 'input_text', variable: 'player_name' }]);
        expect(serializeActionNode(node)).toBe('*input_text player_name');
    });

    it('emits *input_number with bounds for player number input', () => {
        const node = makeActionNode([{ kind: 'input_number', variable: 'age', min: 1, max: 120 }]);
        expect(serializeActionNode(node)).toBe('*input_number age 1 120');
    });

    it('emits *page_break for page_break action', () => {
        const node = makeActionNode([{ kind: 'page_break' }]);
        expect(serializeActionNode(node)).toBe('*page_break');
    });

    it('emits multiple actions in sequence', () => {
        const node = makeActionNode([
            { kind: 'set', variable: 'hp', op: '-', value: '5' },
            { kind: 'set', variable: 'xp', op: '+', value: '10' },
        ]);
        expect(serializeActionNode(node)).toBe('*set hp -5\n*set xp +10');
    });
});

// ─── Condition node ───────────────────────────────────────────────────────

describe('serializeConditionNode', () => {
    it('emits *if / *goto for true branch and *else / *goto for false branch', () => {
        const node = makeConditionNode({ left: 'leadership', op: '>', right: '50' });
        const out = serializeConditionNode(node, 'cond_true_1', 'cond_false_1');
        expect(out).toContain('*if leadership > 50');
        expect(out).toContain('  *goto cond_true_1');
        expect(out).toContain('*else');
        expect(out).toContain('  *goto cond_false_1');
    });

    it('emits *elseif chain when elseIfs are defined', () => {
        const node = makeConditionNode({
            left: 'score', op: '>=', right: '90',
            elseIfs: [{ left: 'score', op: '>=', right: '70', content: '' }],
        });
        const out = serializeConditionNode(node, 'lA', 'lB', ['lC']);
        expect(out).toContain('*elseif score >= 70');
        expect(out).toContain('  *goto lC');
    });

    it('includes inline true content before the *goto when provided', () => {
        const node = makeConditionNode({ left: 'brave', op: '=', right: 'true', trueContent: 'You charge forward.' });
        const out = serializeConditionNode(node, 'tLabel', 'fLabel');
        expect(out).toContain('  You charge forward.\n  *goto tLabel');
    });
});

// ─── Edge serializer ─────────────────────────────────────────────────────

describe('serializeChoiceEdge', () => {
    it('emits *selectable_if before the option when condition is set', () => {
        const edge = makeEdge('p1', 'p2', 'Take the sword', { condition: 'has_sword = false' });
        expect(serializeChoiceEdge(edge)).toContain('*selectable_if (has_sword = false) #Take the sword');
    });

    it('emits *hide_reuse for reuseMode hide', () => {
        const edge = makeEdge('p1', 'p2', 'Try again', { reuseMode: 'hide' });
        const out = serializeChoiceEdge(edge);
        expect(out).toContain('*hide_reuse');
        expect(out).toContain('#Try again');
    });

    it('emits *disable_reuse for reuseMode disable', () => {
        const edge = makeEdge('p1', 'p2', 'Try again', { reuseMode: 'disable' });
        expect(serializeChoiceEdge(edge)).toContain('*disable_reuse');
    });

    it('emits *allow_reuse for reuseMode allow', () => {
        const edge = makeEdge('p1', 'p2', 'Try again', { reuseMode: 'allow' });
        expect(serializeChoiceEdge(edge)).toContain('*allow_reuse');
    });

    it('emits plain #label when no condition or reuse mode', () => {
        const edge = makeEdge('p1', 'p2', 'Go north');
        expect(serializeChoiceEdge(edge)).toBe('#Go north');
    });
});

// ─── Fake choice ──────────────────────────────────────────────────────────

describe('serializeFlow fake_choice', () => {
    it('emits *fake_choice with indented option branches', () => {
        const start = makeStartNode();
        const fc1 = makeFakeChoiceNode({ id: 'fc1' });
        const merge1 = makePassageNode({ id: 'merge1', data: { label: 'You continue on.', content: 'You continue on.' } });
        const nodes = [start, fc1, merge1];
        const edges = [
            makeEdge('start', 'fc1'),
            makeEdge('fc1', 'merge1', 'I smile.'),
            makeEdge('fc1', 'merge1', 'I frown.'),
        ];
        const out = serializeFlow(nodes, edges);
        expect(out).toContain('*fake_choice');
        expect(out).toContain('  #I smile.');
        expect(out).toContain('  #I frown.');
    });
});

// ─── Variable pass-through ────────────────────────────────────────────────

describe('serializeFlow with variables', () => {
    it('includes *create preamble at top when story is provided', () => {
        const story = makeStory({ variables: [makeVariable({ name: 'courage', type: 'number', initialValue: 10, scope: 'global' })] });
        const scene = story.scenes[0];
        const out = serializeFlow(scene.nodes, scene.edges, story);
        expect(out.startsWith('*create courage 10')).toBe(true);
    });

    it('includes *temp declarations when story has temp vars', () => {
        const story = makeStory({ variables: [makeVariable({ name: 'bonus', type: 'number', initialValue: 0, scope: 'temp' })] });
        const scene = story.scenes[0];
        const out = serializeFlow(scene.nodes, scene.edges, story);
        expect(out).toContain('*temp bonus 0');
    });

    it('passes ${varName} and @{...} substitutions through unchanged', () => {
        const start = makeStartNode();
        const p1 = makePassageNode({ data: { label: 'Hello', content: 'Hello ${player_name}, you have @{has_sword a sword|no sword}.' } });
        const e1 = makeEndingNode();
        const out = serializeFlow([start, p1, e1], [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Continue')]);
        expect(out).toContain('Hello ${player_name}');
        expect(out).toContain('@{has_sword a sword|no sword}');
    });
});
