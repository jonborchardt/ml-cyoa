import { describe, it, expect } from 'vitest';
import { parseScene } from './parseChoiceScript';
import { getCommandCompletions, getVariableCompletions, getSceneCompletions } from './choicescriptLanguage';
import { makeVariable } from './test/fixtures';
import type { MyStory } from './myStoryStore';

// ─── parseScene ────────────────────────────────────────────────────────────

describe('parseScene', () => {
    it('parses a simple passage → choice → two branches', () => {
        const cs = `
*label node_start
You stand at a crossroads.
*choice
  #Go left.
    *label node_left
    You head left.
    *finish
  #Go right.
    *label node_right
    You head right.
    *finish
`.trim();
        const { nodes, edges } = parseScene(cs);
        expect(nodes.some(n => n.type === 'passage')).toBe(true);
        expect(nodes.some(n => n.type === 'ending')).toBe(true);
        expect(edges.length).toBeGreaterThanOrEqual(2);
    });

    it('parses *if/*else into a condition node with true/false edges', () => {
        const cs = `
*label node_cond
*if courage > 50
  *goto node_brave
*else
  *goto node_coward
*label node_brave
You stride forward.
*finish
*label node_coward
You hesitate.
*finish
`.trim();
        const { nodes, edges } = parseScene(cs);
        const condNode = nodes.find(n => n.type === 'condition');
        expect(condNode).toBeDefined();
        // Should have both a true and false edge from the condition node
        const trueEdge = edges.find(e => e.source === condNode?.id && e.sourceHandle === 'true');
        const falseEdge = edges.find(e => e.source === condNode?.id && e.sourceHandle === 'false');
        expect(trueEdge).toBeDefined();
        expect(falseEdge).toBeDefined();
    });

    it('parses *set, *rand into an action node', () => {
        const cs = `
*label node_action
*set courage +10
*rand luck 1 6
`.trim();
        const { nodes } = parseScene(cs);
        const actionNode = nodes.find(n => n.type === 'action');
        expect(actionNode).toBeDefined();
        const actions = actionNode?.data.actions as Array<{ kind: string }>;
        expect(actions).toHaveLength(2);
        expect(actions[0]).toMatchObject({ kind: 'set', variable: 'courage' });
        expect(actions[1]).toMatchObject({ kind: 'rand', variable: 'luck', min: 1, max: 6 });
    });

    it('parses *gosub into a gosub call node', () => {
        const cs = `
*label node_call
*gosub my_subroutine
`.trim();
        const { nodes } = parseScene(cs);
        expect(nodes.find(n => n.type === 'gosub')).toBeDefined();
    });

    it('parses *goto_scene into a scene jump node', () => {
        const cs = `
*label node_jump
*goto_scene chapter_2
`.trim();
        const { nodes } = parseScene(cs);
        const jumpNode = nodes.find(n => n.type === 'scene_jump');
        expect(jumpNode).toBeDefined();
        expect(jumpNode?.data.targetScene).toBe('chapter_2');
        expect(jumpNode?.data.jumpType).toBe('transfer');
    });

    it('parses *gosub_scene into a subroutine scene jump', () => {
        const cs = `
*label node_gsub
*gosub_scene chapter_2 fight_scene
`.trim();
        const { nodes } = parseScene(cs);
        const jumpNode = nodes.find(n => n.type === 'scene_jump');
        expect(jumpNode).toBeDefined();
        expect(jumpNode?.data.jumpType).toBe('subroutine');
        expect(jumpNode?.data.targetScene).toBe('chapter_2');
        expect(jumpNode?.data.targetLabel).toBe('fight_scene');
    });

    it('parses *ending into an ending node', () => {
        const cs = `
*label node_end
You have reached the end.
*ending
`.trim();
        const { nodes } = parseScene(cs);
        expect(nodes.find(n => n.type === 'ending')).toBeDefined();
    });

    it('produces a RawCodeNode for unrecognised commands', () => {
        const cs = `
*label node_raw
*product premium_content "Bonus Chapter" 0.99
`.trim();
        const { nodes, unsupportedSyntax } = parseScene(cs);
        expect(nodes.find(n => n.type === 'raw_code')).toBeDefined();
        expect(unsupportedSyntax).toBe(true);
    });

    it('always creates a start node', () => {
        const cs = `
*label intro
Hello world.
*finish
`.trim();
        const { nodes } = parseScene(cs);
        expect(nodes.find(n => n.type === 'start')).toBeDefined();
    });

    it('parses *page_break into a page_break node', () => {
        const cs = `
*label node_pb
*page_break
`.trim();
        const { nodes } = parseScene(cs);
        expect(nodes.find(n => n.type === 'page_break')).toBeDefined();
    });

    it('handles text with no labels as a single passage', () => {
        const cs = `Hello world.\n*finish`;
        const { nodes } = parseScene(cs);
        expect(nodes.find(n => n.type === 'start')).toBeDefined();
        expect(nodes.find(n => n.type === 'ending' || n.type === 'passage')).toBeDefined();
    });

    it('connects choice options to their target nodes via edges', () => {
        const cs = `
*label start_node
Pick a door.
*choice
  #Left door
    *label room_a
    Darkness.
    *finish
  #Right door
    *label room_b
    Light.
    *finish
`.trim();
        const { nodes, edges } = parseScene(cs);
        const startSection = nodes.find(n => n.type === 'passage');
        expect(startSection).toBeDefined();
        const choiceEdges = edges.filter(e => e.source === startSection?.id);
        expect(choiceEdges.length).toBeGreaterThanOrEqual(2);
    });
});

// ─── choicescriptLanguage completions ─────────────────────────────────────

describe('ChoiceScript completions', () => {
    it('getCommandCompletions includes all expected *commands', () => {
        const completions = getCommandCompletions();
        const labels = completions.map(c => c.label);
        expect(labels).toContain('*choice');
        expect(labels).toContain('*if');
        expect(labels).toContain('*gosub');
        expect(labels).toContain('*set');
        expect(labels).toContain('*finish');
        expect(labels).toContain('*achieve');
        expect(labels).toContain('*stat_chart');
        expect(labels).toContain('*goto_scene');
    });

    it('getVariableCompletions returns declared variable names', () => {
        const story = { variables: [makeVariable({ name: 'courage' }), makeVariable({ name: 'luck' })] } as Pick<MyStory, 'variables'>;
        const completions = getVariableCompletions(story);
        const labels = completions.map(c => c.label);
        expect(labels).toContain('courage');
        expect(labels).toContain('luck');
    });

    it('getSceneCompletions returns scene ids', () => {
        const story = {
            scenes: [
                { id: 'startup', name: 'Startup', nodes: [], edges: [], subroutines: [] },
                { id: 'chapter_1', name: 'Chapter 1', nodes: [], edges: [], subroutines: [] },
            ],
        } as Pick<MyStory, 'scenes'>;
        const completions = getSceneCompletions(story);
        const labels = completions.map(c => c.label);
        expect(labels).toContain('chapter_1');
        expect(labels).toContain('startup');
    });

    it('getVariableCompletions handles missing variables gracefully', () => {
        const story = {} as Pick<MyStory, 'variables'>;
        expect(getVariableCompletions(story)).toEqual([]);
    });
});
