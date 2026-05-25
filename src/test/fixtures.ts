import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../parseGameFlow';
import type { MyStory, SceneDef, SubroutineDef } from '../myStoryStore';
import type { VariableDef, ConditionConfig, ActionItem, EdgeData, SceneJumpData, StatEntry, Achievement } from '../types';

export function makeStatEntry(overrides: Partial<StatEntry> = {}): StatEntry {
    return { kind: 'percent', variable: 'score', label: 'Score', ...overrides };
}

export function makeAchievement(overrides: Partial<Achievement> = {}): Achievement {
    return { id: 'test_ach', title: 'Test Achievement', points: 10, shortDescription: 'A test achievement.', isVisible: true, ...overrides };
}

export function makeVariable(overrides: Partial<VariableDef> = {}): VariableDef {
    return { name: 'score', type: 'number', initialValue: 0, scope: 'global', ...overrides };
}

export function makePassageNode(overrides: Partial<Node<NodeData>> = {}): Node<NodeData> {
    return { id: 'p1', type: 'passage', position: { x: 0, y: 0 }, data: { label: 'A passage', content: 'A passage' }, ...overrides };
}

export function makeEndingNode(overrides: Partial<Node<NodeData>> = {}): Node<NodeData> {
    return { id: 'e1', type: 'ending', position: { x: 0, y: 0 }, data: { label: 'The End', content: '' }, ...overrides };
}

export function makeStartNode(): Node<NodeData> {
    return { id: 'start', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start', content: '' } };
}

export function makeConditionNode(condition: Partial<ConditionConfig>, overrides: Partial<Node<NodeData>> = {}): Node<NodeData> {
    return {
        id: 'cond1',
        type: 'condition',
        position: { x: 0, y: 0 },
        data: { label: 'Condition', content: '', condition: { left: 'x', op: '>', right: '0', ...condition } },
        ...overrides,
    };
}

export function makeActionNode(actions: ActionItem[], overrides: Partial<Node<NodeData>> = {}): Node<NodeData> {
    return {
        id: 'act1',
        type: 'action',
        position: { x: 0, y: 0 },
        data: { label: 'Action', content: '', actions },
        ...overrides,
    };
}

export function makeFakeChoiceNode(overrides: Partial<Node<NodeData>> = {}): Node<NodeData> {
    return {
        id: 'fc1',
        type: 'fake_choice',
        position: { x: 0, y: 0 },
        data: { label: 'How do you respond?', content: '' },
        ...overrides,
    };
}

export function makeSceneJumpNode(jumpData: Partial<SceneJumpData>, overrides: Partial<Node<NodeData>> = {}): Node<NodeData> {
    const data = {
        label: 'Scene Jump',
        content: '',
        targetScene: jumpData.targetScene ?? '',
        targetLabel: jumpData.targetLabel,
        jumpType: jumpData.jumpType ?? 'transfer',
    };
    return {
        id: 'sj1',
        type: 'scene_jump',
        position: { x: 0, y: 0 },
        data,
        ...overrides,
    };
}

export function makeSceneLabelNode(label: string, overrides: Partial<Node<NodeData>> = {}): Node<NodeData> {
    return {
        id: 'sl1',
        type: 'scene_label',
        position: { x: 0, y: 0 },
        data: { label, content: '' },
        ...overrides,
    };
}

export function makeEdge(source: string, target: string, label?: string, data?: EdgeData, extra?: Partial<Edge>): Edge {
    return { id: `${source}-${target}`, source, target, label, data, ...extra };
}

export function makeSubroutine(overrides: Partial<SubroutineDef> & { id: string }): SubroutineDef {
    return {
        name: overrides.name ?? overrides.id,
        nodes: [],
        edges: [],
        ...overrides,
    };
}

export function makeGosubCallNode(opts: { subroutineId: string; params?: string[] }, overrides: Partial<Node<NodeData>> = {}): Node<NodeData> {
    return {
        id: 'gosub1',
        type: 'gosub',
        position: { x: 0, y: 0 },
        data: {
            label: `Call: ${opts.subroutineId}`,
            content: '',
            subroutineId: opts.subroutineId,
            params: opts.params ?? [],
        },
        ...overrides,
    };
}

export function makeScene(overrides: Partial<SceneDef> & { id: string }): SceneDef {
    const start = makeStartNode();
    const p1 = makePassageNode();
    const e1 = makeEndingNode();
    return {
        id: overrides.id,
        name: overrides.name ?? overrides.id,
        nodes: overrides.nodes ?? [start, p1, e1],
        edges: overrides.edges ?? [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Continue')],
        subroutines: overrides.subroutines ?? [],
    };
}

export function makeStory(overrides: Partial<MyStory> = {}): MyStory {
    const startupScene = makeScene({ id: 'startup', name: 'Startup' });
    return {
        id: 'test-story',
        title: 'Test Story',
        authorName: 'Tester',
        scenes: [startupScene],
        sceneOrder: ['startup'],
        images: {},
        variables: [],
        statChart: [],
        achievements: [],
        createdAt: 0,
        updatedAt: 0,
        ...overrides,
    };
}

// A legacy v1 story with top-level nodes/edges (no scenes) for migration tests.
export function minimalLegacyStory() {
    return {
        id: 'legacy-1',
        title: 'Legacy',
        authorName: 'Author',
        nodes: [makeStartNode(), makePassageNode(), makeEndingNode()],
        edges: [makeEdge('start', 'p1'), makeEdge('p1', 'e1', 'Continue')],
        images: {},
        createdAt: 0,
        updatedAt: 0,
    };
}

export function makeStoryWithGosubToMissing(missingId: string): MyStory {
    const gosubNode = makeGosubCallNode({ subroutineId: missingId }, { id: 'g1' });
    const scene = makeScene({
        id: 'startup',
        name: 'Startup',
        nodes: [makeStartNode(), makePassageNode(), gosubNode, makeEndingNode({ id: 'e1' })],
        edges: [makeEdge('start', 'p1'), makeEdge('p1', 'g1'), makeEdge('g1', 'e1', 'Continue')],
        subroutines: [],
    });
    return makeStory({ scenes: [scene], sceneOrder: ['startup'] });
}

export function makeStoryWithSubroutineWithoutReturn(): MyStory {
    const sub: SubroutineDef = {
        id: 'no_return_sub',
        name: 'No Return Sub',
        nodes: [makeActionNode([{ kind: 'set', variable: 'x', op: '=', value: '1' }])],
        edges: [],
    };
    const scene = makeScene({ id: 'startup', subroutines: [sub] });
    return makeStory({ scenes: [scene], sceneOrder: ['startup'] });
}

export function makeStoryWithRecursiveGosub(subId: string): MyStory {
    const selfCall = makeGosubCallNode({ subroutineId: subId }, { id: 'self_call' });
    const sub: SubroutineDef = {
        id: subId,
        name: subId,
        nodes: [selfCall],
        edges: [],
    };
    const scene = makeScene({ id: 'startup', subroutines: [sub] });
    return makeStory({ scenes: [scene], sceneOrder: ['startup'] });
}

export function makeStoryWithSingleVisitHideReuse(): MyStory {
    const start = makeStartNode();
    const p1 = makePassageNode({ id: 'p1' });
    const e1 = makeEndingNode({ id: 'e1' });
    const scene = makeScene({
        id: 'startup',
        nodes: [start, p1, e1],
        edges: [
            makeEdge('start', 'p1'),
            makeEdge('p1', 'e1', 'Go', { reuseMode: 'hide' }),
        ],
    });
    return makeStory({ scenes: [scene], sceneOrder: ['startup'] });
}

export function makeStoryWithSceneJump(jumpData: Partial<SceneJumpData>): MyStory {
    const jumpNode = makeSceneJumpNode(jumpData, { id: 'sj1' });
    const scene = makeScene({
        id: 'startup',
        name: 'Startup',
        nodes: [makeStartNode(), makePassageNode(), jumpNode],
        edges: [makeEdge('start', 'p1'), makeEdge('p1', 'sj1')],
    });
    return {
        id: 'jump-story',
        title: 'Jump Story',
        authorName: 'Author',
        scenes: [scene],
        sceneOrder: ['startup'],
        images: {},
        variables: [],
        statChart: [],
        achievements: [],
        createdAt: 0,
        updatedAt: 0,
    };
}
