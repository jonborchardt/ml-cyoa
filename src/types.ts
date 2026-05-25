export interface StatEntry {
    kind: 'percent' | 'opposed_pair' | 'text' | 'divider';
    variable?: string;
    label?: string;
    variable2?: string;
    label2?: string;
    heading?: string;
}

export interface Achievement {
    id: string;
    title: string;
    points: number;
    shortDescription: string;
    preDescription?: string;
    postDescription?: string;
    isVisible: boolean;
}

export interface VariableDef {
    name: string;
    type: 'number' | 'text' | 'boolean';
    initialValue: string | number | boolean;
    description?: string;
    scope: 'global' | 'temp';
    sceneId?: string;
}

export interface ValidationIssue {
    code: string;
    message: string;
    ref?: string;
}

export interface ValidationResult {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    infos: ValidationIssue[];
}

// ─── Node types ────────────────────────────────────────────────────────────

export type NodeType =
    | 'start'
    | 'passage'
    | 'ending'
    | 'condition'
    | 'action'
    | 'fake_choice'
    | 'input'
    | 'random_branch'
    | 'gosub'
    | 'subroutine_entry'
    | 'subroutine_return'
    | 'scene_jump'
    | 'scene_label'
    | 'page_break'
    | 'check_achievements'
    | 'raw_code'
    | 'comment';

export interface SceneJumpData {
    targetScene: string;
    targetLabel?: string;
    jumpType: 'transfer' | 'subroutine';
}

// Condition node (*if / *elseif / *else)
export interface ConditionConfig {
    left: string;
    op: string;
    right: string;
    elseIfs?: Array<{ left: string; op: string; right: string; content?: string }>;
    trueContent?: string;
    falseContent?: string;
}

// Action node (*set, *rand, *input_text, *input_number, *page_break)
export type ActionItem =
    | { kind: 'set'; variable: string; op: string; value: string }
    | { kind: 'rand'; variable: string; min: number; max: number }
    | { kind: 'input_text'; variable: string }
    | { kind: 'input_number'; variable: string; min: number; max: number }
    | { kind: 'page_break' }
    | { kind: 'award_achievement'; achievementId: string };

// Input node (*input_text / *input_number with a prompt)
export interface InputConfig {
    prompt: string;
    variable: string;
    inputType: 'text' | 'number';
    min?: number;
    max?: number;
}

// Random branch node (*rand + if chain)
export interface RandomBranchEntry {
    label?: string;
    weight?: number;
}

// ─── Edge data ─────────────────────────────────────────────────────────────

export interface EdgeData {
    condition?: string;       // raw expression for *selectable_if
    reuseMode?: 'hide' | 'disable' | 'allow';
    branchIndex?: number;     // for random_branch edges
    content?: string;         // prose per fake_choice branch
    [key: string]: unknown;   // required by React Flow's data constraint
}
