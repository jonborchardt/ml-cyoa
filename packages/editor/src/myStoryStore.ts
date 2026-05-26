import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './layout';
import type { VariableDef, ActionItem, InputConfig, ConditionConfig, RandomBranchEntry, EdgeData, StatEntry, Achievement, SceneJumpData } from './types';

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
    globalReuseMode?: 'hide' | 'disable';
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
    layoutDirection?: 'TB' | 'LR';
    ifid?: string;
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
        layoutDirection: story.layoutDirection,
        ifid: story.ifid,
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
// Demonstrates every node type, edge feature, subroutine, achievement, and
// stat available in the editor. Two scenes work together end-to-end.
// Update this whenever a new milestone ships a new node type or feature.

function makeSeedStartup(): SceneDef {
    const nodes: Node<NodeData>[] = [
        // ── Start ─────────────────────────────────────────────────────────
        { id: 'start', type: 'start', position: { x: 400, y: 0 },
            data: { label: 'Start', content: '' } },

        // ── Action: randomise cleverness, zero score ───────────────────
        { id: 'action-init', type: 'action', position: { x: 400, y: 200 },
            data: { label: 'Initialise Stats', content: '',
                actions: [
                    { kind: 'rand', variable: 'cleverness', min: 20, max: 80 },
                    { kind: 'set',  variable: 'score',      op: '=', value: '0' },
                    { kind: 'set',  variable: 'has_badge',  op: '=', value: 'false' },
                ] as ActionItem[] } },

        // ── Input: player's name ──────────────────────────────────────
        { id: 'input-name', type: 'input', position: { x: 400, y: 430 },
            data: { label: 'Ask Name', content: '',
                inputConfig: {
                    prompt: 'What is your name, applicant?',
                    variable: 'name',
                    inputType: 'text',
                } as InputConfig } },

        // ── Passage: welcome hall — two-branch *choice ────────────────
        { id: 'passage-welcome', type: 'passage', position: { x: 400, y: 660 },
            data: { label: 'Clockwork Hall',
                content: 'Welcome to the Clockwork Academy, ${name}.\n\nGears whirr overhead as applicants mill about. A bronze placard reads: "Cleverness ${cleverness} — score well and earn your badge."' } },

        // ── Action: boost cleverness (left branch) ────────────────────
        { id: 'action-clever', type: 'action', position: { x: 100, y: 900 },
            data: { label: '+Cleverness', content: '',
                actions: [
                    { kind: 'set', variable: 'cleverness', op: '+', value: '10' },
                ] as ActionItem[] } },

        // ── Action: boost bravery (right branch) ──────────────────────
        { id: 'action-brave', type: 'action', position: { x: 700, y: 900 },
            data: { label: '+Bravery', content: '',
                actions: [
                    { kind: 'set', variable: 'bravery', op: '+', value: '10' },
                ] as ActionItem[] } },

        // ── Gosub: call the proctor greeting subroutine ───────────────
        { id: 'gosub-greet', type: 'gosub', position: { x: 400, y: 1130 },
            data: { label: 'Greet Proctor', content: '',
                subroutineId: 'greet_proctor', params: [] } },

        // ── Action: award first achievement ───────────────────────────
        { id: 'action-achieve', type: 'action', position: { x: 400, y: 1360 },
            data: { label: 'Award: First Step', content: '',
                actions: [
                    { kind: 'award_achievement', achievementId: 'first_step' },
                ] as ActionItem[] } },

        // ── Check achievements: show the achievements screen ──────────
        { id: 'check-ach', type: 'check_achievements', position: { x: 400, y: 1590 },
            data: { label: 'Check Achievements', content: '' } },

        // ── Page break ────────────────────────────────────────────────
        { id: 'page-break-1', type: 'page_break', position: { x: 400, y: 1820 },
            data: { label: 'Page Break', content: '' } },

        // ── Fake choice: cosmetic; all branches merge at random-1 ─────
        { id: 'fake-choice-1', type: 'fake_choice', position: { x: 400, y: 2050 },
            data: { label: 'Compose Yourself',
                content: 'The examination hall doors loom before you.' } },

        // ── Random branch: two warm-up puzzles assigned at random ─────
        { id: 'random-1', type: 'random_branch', position: { x: 400, y: 2300 },
            data: { label: 'Warm-up Puzzle', content: '',
                randomBranches: [
                    { label: 'Gear puzzle' },
                    { label: 'Cipher puzzle' },
                ] as RandomBranchEntry[] } },

        // ── Two puzzle passages ───────────────────────────────────────
        { id: 'passage-gear', type: 'passage', position: { x: 100, y: 2540 },
            data: { label: 'Gear Puzzle',
                content: 'Three interlocking gears sit before you. You must determine which way the rightmost gear turns.' } },
        { id: 'passage-cipher', type: 'passage', position: { x: 700, y: 2540 },
            data: { label: 'Cipher Puzzle',
                content: 'A brass tablet displays a sequence of symbols. You must identify the next in the pattern.' } },

        // ── Condition: cleverness check ───────────────────────────────
        { id: 'condition-clever', type: 'condition', position: { x: 400, y: 2800 },
            data: { label: 'Cleverness > 60?', content: '',
                condition: { left: 'cleverness', op: '>', right: '60' } as ConditionConfig } },

        // ── Action: high-cleverness score bonus ───────────────────────
        { id: 'action-hi', type: 'action', position: { x: 700, y: 3050 },
            data: { label: '+30 Score', content: '',
                actions: [
                    { kind: 'set', variable: 'score', op: '+', value: '30' },
                ] as ActionItem[] } },

        // ── Action: low-cleverness score bonus ────────────────────────
        { id: 'action-lo', type: 'action', position: { x: 100, y: 3050 },
            data: { label: '+10 Score', content: '',
                actions: [
                    { kind: 'set', variable: 'score', op: '+', value: '10' },
                ] as ActionItem[] } },

        // ── Raw code: verbatim ChoiceScript comment ───────────────────
        { id: 'raw-code-1', type: 'raw_code', position: { x: 400, y: 3300 },
            data: { label: 'Raw ChoiceScript', content: '',
                rawContent: '*comment Warm-up complete. Proceeding to the final trial.' } },

        // ── Scene label: named entry point for cross-scene jumps ──────
        { id: 'scene-label-1', type: 'scene_label', position: { x: 400, y: 3530 },
            data: { label: 'before_trial', content: '' } },

        // ── Scene jump: transfer execution to the trial scene ─────────
        { id: 'scene-jump-1', type: 'scene_jump', position: { x: 400, y: 3760 },
            data: {
                label: 'Go to Trial',
                content: '',
                targetScene: 'trial',
                targetLabel: '',
                jumpType: 'transfer',
            } as SceneJumpData & NodeData },

        // ── Comment: canvas annotation — never serialized ─────────────
        { id: 'comment-1', type: 'comment', position: { x: 750, y: 3760 },
            data: { label: 'Dev Note',
                content: 'The trial scene handles all endings. Stats are shown by *check_achievements above.' } },
    ];

    const edges: Edge[] = [
        { id: 'e-s-init',       source: 'start',           target: 'action-init' },
        { id: 'e-init-inp',     source: 'action-init',      target: 'input-name' },
        { id: 'e-inp-wel',      source: 'input-name',       target: 'passage-welcome' },

        // Two-option *choice on the welcome passage
        { id: 'e-wel-clever', source: 'passage-welcome', target: 'action-clever',
            label: 'Study the notice board',
            data: {} as EdgeData },
        { id: 'e-wel-brave',  source: 'passage-welcome', target: 'action-brave',
            label: 'Mingle with applicants',
            data: { reuseMode: 'disable' } as EdgeData },

        // Both stat boosts rejoin the gosub
        { id: 'e-clever-gsb', source: 'action-clever', target: 'gosub-greet' },
        { id: 'e-brave-gsb',  source: 'action-brave',  target: 'gosub-greet' },

        { id: 'e-gsb-ach',    source: 'gosub-greet',    target: 'action-achieve' },
        { id: 'e-ach-chk',    source: 'action-achieve', target: 'check-ach' },
        { id: 'e-chk-pb',     source: 'check-ach',      target: 'page-break-1' },
        { id: 'e-pb-fc',      source: 'page-break-1',   target: 'fake-choice-1' },

        // Fake-choice branches with per-branch prose — all targets are random-1
        { id: 'e-fc-a', source: 'fake-choice-1', target: 'random-1',
            label: 'Stride in confidently',
            data: { content: 'You square your shoulders and step through the doors.' } as EdgeData },
        { id: 'e-fc-b', source: 'fake-choice-1', target: 'random-1',
            label: 'Slip in quietly',
            data: { content: 'You edge along the wall, watching the others.' } as EdgeData },

        // Random-branch edges (sourceHandle = 'branch-N')
        { id: 'e-rand-a', source: 'random-1', target: 'passage-gear',   sourceHandle: 'branch-0' },
        { id: 'e-rand-b', source: 'random-1', target: 'passage-cipher', sourceHandle: 'branch-1' },

        // Both puzzles converge on the cleverness condition
        { id: 'e-gear-cond',   source: 'passage-gear',   target: 'condition-clever', label: 'Solve it' },
        { id: 'e-cipher-cond', source: 'passage-cipher', target: 'condition-clever', label: 'Solve it' },

        // Condition branches (sourceHandle = 'true' | 'false')
        { id: 'e-cond-hi', source: 'condition-clever', target: 'action-hi', sourceHandle: 'true' },
        { id: 'e-cond-lo', source: 'condition-clever', target: 'action-lo', sourceHandle: 'false' },

        // Both score actions reconverge on raw-code (visited path emits *goto)
        { id: 'e-hi-raw', source: 'action-hi', target: 'raw-code-1' },
        { id: 'e-lo-raw', source: 'action-lo', target: 'raw-code-1' },

        { id: 'e-raw-lbl',  source: 'raw-code-1',    target: 'scene-label-1' },
        { id: 'e-lbl-jump', source: 'scene-label-1', target: 'scene-jump-1' },
    ];

    const greetSub: SubroutineDef = {
        id: 'greet_proctor',
        name: 'Greet Proctor',
        params: [],
        nodes: [
            { id: 'sub-entry',   type: 'subroutine_entry',  position: { x: 0, y: 0 },
                data: { label: 'greet_proctor', content: '' } },
            { id: 'sub-passage', type: 'passage',           position: { x: 0, y: 160 },
                data: { label: 'Proctor Speaks',
                    content: 'The silver-haired Proctor Aldric studies you briefly. "You have potential," she says, making a note on her clipboard.' } },
            { id: 'sub-return',  type: 'subroutine_return', position: { x: 0, y: 320 },
                data: { label: 'Return', content: '' } },
        ],
        edges: [
            { id: 'sub-e1', source: 'sub-entry',   target: 'sub-passage' },
            { id: 'sub-e2', source: 'sub-passage', target: 'sub-return' },
        ],
    };

    return { id: 'startup', name: 'Startup', nodes, edges, subroutines: [greetSub] };
}

function makeSeedTrial(): SceneDef {
    const nodes: Node<NodeData>[] = [
        // ── Start ─────────────────────────────────────────────────────────
        { id: 'trial-start', type: 'start', position: { x: 400, y: 0 },
            data: { label: 'Start', content: '' } },

        // ── Scene label: named entry point (reachable via *goto_scene) ──
        { id: 'trial-label', type: 'scene_label', position: { x: 400, y: 200 },
            data: { label: 'trial_entrance', content: '' } },

        // ── Passage: trial chamber with a *choice ─────────────────────
        { id: 'trial-intro', type: 'passage', position: { x: 400, y: 430 },
            data: { label: 'The Trial Chamber',
                content: 'The examiner announces: "Your score so far: ${score}. One final challenge remains, ${name}. Choose your approach."' } },

        // ── Action: rush — boost bravery + score ──────────────────────
        { id: 'trial-rush', type: 'action', position: { x: 100, y: 680 },
            data: { label: '+Bravery Rush', content: '',
                actions: [
                    { kind: 'set', variable: 'bravery', op: '+', value: '15' },
                    { kind: 'set', variable: 'score',   op: '+', value: '20' },
                ] as ActionItem[] } },

        // ── Action: study — boost cleverness + score ──────────────────
        { id: 'trial-study', type: 'action', position: { x: 700, y: 680 },
            data: { label: '+Cleverness Study', content: '',
                actions: [
                    { kind: 'set', variable: 'cleverness', op: '+', value: '15' },
                    { kind: 'set', variable: 'score',      op: '+', value: '15' },
                ] as ActionItem[] } },

        // ── Condition: did they score high enough for the badge? ───────
        { id: 'trial-cond', type: 'condition', position: { x: 400, y: 930 },
            data: { label: 'Score >= 40?', content: '',
                condition: { left: 'score', op: '>=', right: '40' } as ConditionConfig } },

        // ── Action: award top-marks achievement + set badge flag ───────
        { id: 'trial-badge', type: 'action', position: { x: 700, y: 1180 },
            data: { label: 'Award Top Marks', content: '',
                actions: [
                    { kind: 'set',              variable: 'has_badge',  op: '=', value: 'true' },
                    { kind: 'award_achievement', achievementId: 'top_marks' },
                ] as ActionItem[] } },

        // ── Passage: results announced ────────────────────────────────
        { id: 'trial-results', type: 'passage', position: { x: 400, y: 1430 },
            data: { label: 'Results Posted',
                content: 'Proctor Aldric reads aloud: "${name} — final score ${score}. Cleverness: ${cleverness}. Bravery: ${bravery}."\n\nShe pauses before the board.' } },

        // ── Condition: did they earn the badge? ───────────────────────
        { id: 'trial-badge-cond', type: 'condition', position: { x: 400, y: 1680 },
            data: { label: 'Badge Earned?', content: '',
                condition: { left: 'has_badge', op: '=', right: 'true' } as ConditionConfig } },

        // ── Ending: valedictorian ─────────────────────────────────────
        { id: 'ending-top', type: 'ending', position: { x: 700, y: 1930 },
            data: { label: 'Valedictorian',
                content: 'The hall erupts in applause. Proctor Aldric pins the gold Valedictorian badge to your lapel.\n\n"Outstanding," she says. You have earned your place at the Clockwork Academy.' } },

        // ── Ending: graduate ──────────────────────────────────────────
        { id: 'ending-grad', type: 'ending', position: { x: 100, y: 1930 },
            data: { label: 'Graduate',
                content: '"A solid performance, ${name}. You are admitted."\n\nProctor Aldric nods approvingly. Your training at the Clockwork Academy begins today.' } },
    ];

    const edges: Edge[] = [
        { id: 'te-start-lbl',   source: 'trial-start', target: 'trial-label' },
        { id: 'te-lbl-intro',   source: 'trial-label', target: 'trial-intro' },

        // Two-option *choice: one plain, one with selectable_if + disable_reuse
        { id: 'te-intro-rush',  source: 'trial-intro', target: 'trial-rush',
            label: 'Rush the challenge',
            data: {} as EdgeData },
        { id: 'te-intro-study', source: 'trial-intro', target: 'trial-study',
            label: 'Study it carefully',
            data: { condition: 'cleverness > 30', reuseMode: 'disable' } as EdgeData },

        // Both approaches → score condition
        { id: 'te-rush-cond',  source: 'trial-rush',  target: 'trial-cond' },
        { id: 'te-study-cond', source: 'trial-study', target: 'trial-cond' },

        // Condition: high score → badge action; low score → skip to results
        { id: 'te-cond-badge', source: 'trial-cond', target: 'trial-badge',   sourceHandle: 'true' },
        { id: 'te-cond-res',   source: 'trial-cond', target: 'trial-results', sourceHandle: 'false' },

        // Badge action → results (second visit emits *goto)
        { id: 'te-badge-res',  source: 'trial-badge',   target: 'trial-results' },

        // Results → badge condition → endings
        { id: 'te-res-bcond',  source: 'trial-results',    target: 'trial-badge-cond' },
        { id: 'te-bcond-top',  source: 'trial-badge-cond', target: 'ending-top',  sourceHandle: 'true' },
        { id: 'te-bcond-grad', source: 'trial-badge-cond', target: 'ending-grad', sourceHandle: 'false' },
    ];

    return { id: 'trial', name: 'Trial', nodes, edges, subroutines: [] };
}

export function createMyStory(): MyStory {
    const id = crypto.randomUUID();
    const now = Date.now();

    const variables: VariableDef[] = [
        { name: 'name',       type: 'text',    initialValue: 'Student', scope: 'global', description: 'The player\'s chosen name' },
        { name: 'cleverness', type: 'number',  initialValue: 50,        scope: 'global', description: 'Cleverness stat (20–80, randomised on start)' },
        { name: 'bravery',    type: 'number',  initialValue: 50,        scope: 'global', description: 'Bravery stat (increases through choices)' },
        { name: 'score',      type: 'number',  initialValue: 0,         scope: 'global', description: 'Examination score — determines ending' },
        { name: 'has_badge',  type: 'boolean', initialValue: false,     scope: 'global', description: 'True if the player earns the Valedictorian badge' },
    ];

    const statChart: StatEntry[] = [
        { kind: 'text',    variable: 'name',       label: 'Name' },
        { kind: 'percent', variable: 'cleverness', label: 'Cleverness' },
        { kind: 'percent', variable: 'bravery',    label: 'Bravery' },
        { kind: 'percent', variable: 'score',      label: 'Score' },
    ];

    const achievements: Achievement[] = [
        {
            id: 'first_step',
            title: 'First Step',
            points: 10,
            shortDescription: 'Entered the Clockwork Academy.',
            postDescription: 'You took your first step through the Academy\'s brass doors.',
            isVisible: true,
        },
        {
            id: 'top_marks',
            title: 'Top of the Class',
            points: 50,
            shortDescription: 'Earn the Valedictorian badge.',
            preDescription: 'Rumour has it someone always earns top marks on exam day.',
            postDescription: 'You outscored every other applicant. The Academy is lucky to have you.',
            isVisible: false,
        },
    ];

    const story: MyStory = {
        id,
        title: 'The Clockwork Academy',
        authorName: 'Your Name',
        authorBio: 'Write a short bio here — it will appear on the Authors tab.',
        scenes: [makeSeedStartup(), makeSeedTrial()],
        sceneOrder: ['startup', 'trial'],
        images: {},
        variables,
        statChart,
        achievements,
        layoutDirection: 'TB',
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

export function saveMyStory(story: MyStory): void {
    const stories = load();
    const idx = stories.findIndex(s => s.id === story.id);
    if (idx === -1) stories.push(story);
    else stories[idx] = story;
    persist(stories);
}

export function deleteMyStory(id: string): void {
    persist(load().filter(s => s.id !== id));
}
