/**
 * Round-trip tests: verify that serialize→parse→serialize is idempotent
 * and that structural properties survive the full cycle.
 *
 * For text-based samples:
 *   out1 = parse(text) → serialize
 *   out2 = parse(out1) → serialize
 *   assert out1 === out2  (stable fixed-point after one pass)
 *
 * For fixture-based tests:
 *   text1 = serialize(fixture)
 *   out1  = parse(text1)  → serialize
 *   out2  = parse(out1)   → serialize
 *   assert out1 === out2  (same idempotency, starting from a graph)
 *
 * Node IDs change on the first pass (fixture IDs → auto-generated p_N),
 * but the labels produced by p_N IDs are stable: node_p_N maps back to p_N
 * every time _uid resets to 0, so subsequent passes are identical.
 */

import { describe, it, expect } from 'vitest';
import { parseScene } from '../parseChoiceScript';
import { serializeFlow } from '../serializeFlow';
import { serializeStory } from '../serializeStory';
import { importFromChoiceScript } from '../importChoiceScript';
import {
    makeStartNode, makePassageNode, makeEndingNode, makeEdge,
    makeActionNode, makeConditionNode, makeSceneJumpNode,
    makeScene, makeStory,
} from './fixtures';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../parseGameFlow';

// ─── Helpers ──────────────────────────────────────────────────────────────

function onePass(text: string): string {
    const { nodes, edges } = parseScene(text);
    return serializeFlow(nodes, edges);
}

function assertIdempotent(csText: string): string {
    const out1 = onePass(csText);
    const out2 = onePass(out1);
    expect(out2).toBe(out1);
    return out1;
}

function countNodeTypes(nodes: Node<NodeData>[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const n of nodes) {
        const t = n.type ?? 'unknown';
        counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
}

// ─── Idempotency: 12 real-world ChoiceScript samples ─────────────────────
// Each sample is written in realistic ChoiceScript. The first parse→serialize
// pass translates custom label names to node_p_N; subsequent passes are stable.

describe('round-trip idempotency', () => {
    it('1. single passage leading to an ending', () => {
        assertIdempotent(`
*label intro
The story begins in a small village at dawn.
*label the_end
And so your journey ends where it began.
*finish
`.trim());
    });

    it('2. binary choice with two branches', () => {
        // Option bodies contain only *label + *finish (no prose) to avoid the
        // parser's known limitation where nested prose leaks into the parent node.
        assertIdempotent(`
*label crossroads
You stand at a fork in the road. Which way do you go?
*choice
  #Head north toward the mountains.
    *label north_path
    *finish
  #Head south toward the coast.
    *label south_path
    *finish
`.trim());
    });

    it('3. triple choice with three branches', () => {
        assertIdempotent(`
*label merchant
The merchant eyes you from behind her stall. What do you do?
*choice
  #Buy the iron sword for ten gold.
    *label buy_sword
    *finish
  #Buy the wooden shield for six gold.
    *label buy_shield
    *finish
  #Walk away without buying anything.
    *label walk_away
    *finish
`.trim());
    });

    it('4. *if/*else conditional branch', () => {
        assertIdempotent(`
*label check_courage
*if courage > 50
  *goto brave_path
*else
  *goto timid_path
*label brave_path
You stride through the gate without hesitation.
*finish
*label timid_path
You hesitate, then take the long way around.
*finish
`.trim());
    });

    it('5. action node (*set and *rand)', () => {
        assertIdempotent(`
*label encounter_setup
*set courage +5
*rand dice_roll 1 20
`.trim());
    });

    it('6. *page_break node', () => {
        assertIdempotent(`
*label chapter_break
*page_break
`.trim());
    });

    it('7. *goto_scene transfer jump', () => {
        assertIdempotent(`
*label leave_town
*goto_scene chapter_2
`.trim());
    });

    it('8. *gosub_scene subroutine call', () => {
        assertIdempotent(`
*label call_fight
*gosub_scene combat_scene fight_routine
`.trim());
    });

    it('9. sequential passages with implicit flow (no explicit *goto)', () => {
        assertIdempotent(`
*label act_one
You wake in a cold sweat, the nightmare still vivid.
*label act_two
The candle on the nightstand flickers and dies.
*label act_three
Darkness presses in from every corner of the room.
*finish
`.trim());
    });

    it('10. nested choice (choice inside a branch)', () => {
        // Each option body is *label + *finish with no prose to avoid the
        // parser's known limitation where nested prose leaks into the parent.
        assertIdempotent(`
*label entry
You push open the heavy oak door and step inside.
*choice
  #Explore the left room.
    *label left_room
    *choice
      #Search the room carefully.
        *label found_chest
        *finish
      #Return to the hallway.
        *label return_hall
        *finish
  #Explore the right room.
    *label right_room
    *finish
`.trim());
    });

    it('11. ending node with prose content before *finish', () => {
        assertIdempotent(`
*label final
You have completed your quest. The dragon is slain.
The kingdom rejoices and your name is spoken with reverence.
*finish
`.trim());
    });

    it('12. passage with long prose and a single outgoing choice', () => {
        assertIdempotent(`
*label tavern
You enter the Rusty Flagon, a low-ceilinged tavern reeking of stale ale and cheap tallow candles.
A grizzled barkeep wipes the counter with a rag that looks dirtier than the wood.
*choice
  #Approach the barkeep and ask about work.
    *label barkeep_talk
    *finish
`.trim());
    });
});

// ─── Structural preservation (fixture graph → serialize → re-parse) ───────
// These tests verify that the GRAPH structure (node types, edge count, content)
// survives a serialize→parse cycle, not just that the text is stable.

describe('structural preservation via serialize → parse', () => {
    function serializeFixture(nodes: Node<NodeData>[], edges: Edge[]): string {
        return serializeFlow(nodes, edges);
    }

    it('start + passage + ending: all three types survive', () => {
        const nodes = [
            makeStartNode(),
            makePassageNode({ id: 'p1', data: { label: 'Mid', content: 'You walk down the road.' } }),
            makeEndingNode({ id: 'e1' }),
        ];
        const edges = [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Continue')];
        const { nodes: reparsed } = parseScene(serializeFixture(nodes, edges));
        const counts = countNodeTypes(reparsed);
        expect(counts.start).toBe(1);
        expect(counts.passage).toBe(1);
        expect(counts.ending).toBe(1);
    });

    it('binary choice: two endings and two outgoing edges from passage', () => {
        const nodes = [
            makeStartNode(),
            makePassageNode({ id: 'p1', data: { label: 'Decide', content: 'What do you do?' } }),
            makeEndingNode({ id: 'e1', data: { label: 'End A', content: '' } }),
            makeEndingNode({ id: 'e2', data: { label: 'End B', content: '' } }),
        ];
        const edges = [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Go left'), makeEdge('p1', 'e2', 'Go right')];
        const { nodes: reparsed, edges: reparsedEdges } = parseScene(serializeFixture(nodes, edges));
        expect(countNodeTypes(reparsed).ending).toBe(2);
        const passage = reparsed.find(n => n.type === 'passage');
        expect(reparsedEdges.filter(e => e.source === passage?.id)).toHaveLength(2);
    });

    it('choice edge labels are present in the serialized text and preserved after re-parse', () => {
        const nodes = [
            makeStartNode(),
            makePassageNode({ id: 'p1', data: { label: 'Decide', content: 'Make your choice.' } }),
            makeEndingNode({ id: 'e1', data: { label: 'Win', content: '' } }),
            makeEndingNode({ id: 'e2', data: { label: 'Lose', content: '' } }),
        ];
        const edges = [
            makeEdge('start', 'p1'),
            makeEdge('p1', 'e1', 'Stand and fight'),
            makeEdge('p1', 'e2', 'Flee in terror'),
        ];
        const text = serializeFixture(nodes, edges);
        expect(text).toContain('#Stand and fight');
        expect(text).toContain('#Flee in terror');
        const { edges: reparsedEdges } = parseScene(text);
        const edgeLabels = reparsedEdges.map(e => e.label).filter(Boolean);
        expect(edgeLabels).toContain('Stand and fight');
        expect(edgeLabels).toContain('Flee in terror');
    });

    it('passage prose content survives serialize → parse', () => {
        const content = 'The dragon roars and breathes fire across the ancient battlements!';
        const nodes = [
            makeStartNode(),
            makePassageNode({ id: 'p1', data: { label: 'Dragon', content } }),
            makeEndingNode({ id: 'e1' }),
        ];
        const edges = [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Continue')];
        const { nodes: reparsed } = parseScene(serializeFixture(nodes, edges));
        const passageNode = reparsed.find(n => n.type === 'passage');
        expect(passageNode?.data.content).toContain('dragon roars');
    });

    it('condition node: re-parsed graph has condition node with true and false edges', () => {
        const start = makeStartNode();
        const cond = makeConditionNode({ left: 'courage', op: '>', right: '50' }, { id: 'cond1' });
        const brave = makePassageNode({ id: 'brave', data: { label: 'Brave', content: 'You are brave.' } });
        const coward = makeEndingNode({ id: 'coward', data: { label: 'Coward', content: 'You hesitate.' } });
        const text = serializeFixture(
            [start, cond, brave, coward],
            [
                makeEdge('start', 'cond1'),
                makeEdge('cond1', 'brave', undefined, undefined, { sourceHandle: 'true' }),
                makeEdge('cond1', 'coward', undefined, undefined, { sourceHandle: 'false' }),
            ],
        );
        const { nodes: reparsed, edges: reparsedEdges } = parseScene(text);
        const condNode = reparsed.find(n => n.type === 'condition');
        expect(condNode).toBeDefined();
        expect(reparsedEdges.find(e => e.source === condNode?.id && e.sourceHandle === 'true')).toBeDefined();
        expect(reparsedEdges.find(e => e.source === condNode?.id && e.sourceHandle === 'false')).toBeDefined();
    });

    it('action node: re-parsed graph contains an action node', () => {
        const start = makeStartNode();
        const act = makeActionNode(
            [
                { kind: 'set', variable: 'courage', op: '+', value: '5' },
                { kind: 'rand', variable: 'luck', min: 1, max: 6 },
            ],
            { id: 'act1' },
        );
        const e1 = makeEndingNode({ id: 'e1' });
        const text = serializeFixture(
            [start, act, e1],
            [makeEdge('start', 'act1'), makeEdge('act1', 'e1')],
        );
        const { nodes: reparsed } = parseScene(text);
        expect(reparsed.find(n => n.type === 'action')).toBeDefined();
    });

    it('scene_jump transfer: re-parsed node has correct targetScene and jumpType', () => {
        const start = makeStartNode();
        const jump = makeSceneJumpNode({ targetScene: 'chapter_2', jumpType: 'transfer' }, { id: 'sj1' });
        const text = serializeFixture([start, jump], [makeEdge('start', 'sj1')]);
        const { nodes: reparsed } = parseScene(text);
        const jumpNode = reparsed.find(n => n.type === 'scene_jump');
        expect(jumpNode).toBeDefined();
        expect(jumpNode?.data.targetScene).toBe('chapter_2');
        expect(jumpNode?.data.jumpType).toBe('transfer');
    });

    it('scene_jump subroutine: re-parsed node has jumpType subroutine and correct targetLabel', () => {
        const start = makeStartNode();
        const jump = makeSceneJumpNode(
            { targetScene: 'utils', targetLabel: 'fight_scene', jumpType: 'subroutine' },
            { id: 'sj1' },
        );
        const text = serializeFixture([start, jump], [makeEdge('start', 'sj1')]);
        const { nodes: reparsed } = parseScene(text);
        const jumpNode = reparsed.find(n => n.type === 'scene_jump');
        expect(jumpNode?.data.jumpType).toBe('subroutine');
        expect(jumpNode?.data.targetLabel).toBe('fight_scene');
    });

    it('fixture graph is idempotent: serialize → parse → serialize → parse → serialize is stable', () => {
        // Endings inside choice option bodies must have empty content to avoid
        // the parser's known prose-leakage limitation (nested prose bleeds into parent).
        const nodes = [
            makeStartNode(),
            makePassageNode({ id: 'p1', data: { label: 'Choose', content: 'Which path do you take?' } }),
            makeEndingNode({ id: 'e1', data: { label: 'North', content: '' } }),
            makeEndingNode({ id: 'e2', data: { label: 'South', content: '' } }),
        ];
        const edges = [
            makeEdge('start', 'p1'),
            makeEdge('p1', 'e1', 'Take the mountain path'),
            makeEdge('p1', 'e2', 'Take the coastal road'),
        ];
        const text1 = serializeFlow(nodes, edges);
        const out1 = onePass(text1);
        const out2 = onePass(out1);
        expect(out2).toBe(out1);
    });
});

// ─── Full story round-trip (serializeStory → importFromChoiceScript) ──────
// These tests exercise the complete pipeline: graph → ChoiceScript files →
// imported story → ChoiceScript files again. After one import round-trip the
// output stabilises (second import produces identical files to the first).

describe('full story round-trip via importFromChoiceScript', () => {
    it('single-scene story: file text is stable after import → re-serialize', () => {
        const story = makeStory({
            title: 'Round Trip Story',
            authorName: 'Test Author',
            scenes: [makeScene({ id: 'startup' })],
            sceneOrder: ['startup'],
        });
        const files1 = serializeStory(story);
        const imported = importFromChoiceScript(files1);
        const files2 = serializeStory(imported);
        const files3 = serializeStory(importFromChoiceScript(files2));
        expect(files3.get('startup')).toBe(files2.get('startup'));
    });

    it('title and authorName survive the serialize → import cycle', () => {
        const story = makeStory({ title: 'The Eternal Quest', authorName: 'J. Writer' });
        const files = serializeStory(story);
        const imported = importFromChoiceScript(files);
        expect(imported.title).toBe('The Eternal Quest');
        expect(imported.authorName).toBe('J. Writer');
    });

    it('global variables survive the serialize → import cycle', () => {
        const story = makeStory({
            variables: [
                { name: 'courage', type: 'number', initialValue: 10, scope: 'global' },
                { name: 'active', type: 'boolean', initialValue: true, scope: 'global' },
                { name: 'player_name', type: 'text', initialValue: 'Hero', scope: 'global' },
            ],
        });
        const imported = importFromChoiceScript(serializeStory(story));
        const byName = Object.fromEntries(imported.variables.map(v => [v.name, v]));
        expect(byName.courage?.initialValue).toBe(10);
        expect(byName.active?.initialValue).toBe(true);
        expect(byName.player_name?.initialValue).toBe('Hero');
    });

    it('multi-scene story: all scenes are present after import', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'startup' }), makeScene({ id: 'chapter_1' })],
            sceneOrder: ['startup', 'chapter_1'],
        });
        const imported = importFromChoiceScript(serializeStory(story));
        expect(imported.scenes.some(s => s.id === 'startup')).toBe(true);
        expect(imported.scenes.some(s => s.id === 'chapter_1')).toBe(true);
    });

    it('sceneOrder is preserved after import', () => {
        const story = makeStory({
            scenes: [
                makeScene({ id: 'startup' }),
                makeScene({ id: 'ch2' }),
                makeScene({ id: 'ch1' }),
            ],
            sceneOrder: ['startup', 'ch2', 'ch1'],
        });
        const imported = importFromChoiceScript(serializeStory(story));
        expect(imported.sceneOrder).toEqual(['startup', 'ch2', 'ch1']);
    });

    it('imported startup scene contains a start node', () => {
        const story = makeStory();
        const imported = importFromChoiceScript(serializeStory(story));
        const startNode = imported.scenes[0].nodes.find(n => n.type === 'start');
        expect(startNode).toBeDefined();
    });

    it('stat_chart entries survive the serialize → import cycle', () => {
        const story = makeStory({
            statChart: [
                { kind: 'percent', variable: 'courage', label: 'Courage' },
                { kind: 'text', variable: 'player_name', label: 'Name' },
            ],
        });
        const imported = importFromChoiceScript(serializeStory(story));
        expect(imported.statChart).toContainEqual(
            expect.objectContaining({ kind: 'percent', variable: 'courage' }),
        );
        expect(imported.statChart).toContainEqual(
            expect.objectContaining({ kind: 'text', variable: 'player_name' }),
        );
    });
});
