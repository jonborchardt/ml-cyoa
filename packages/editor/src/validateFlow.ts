import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './layout';
import type { MyStory } from './myStoryStore';
import type { ValidationIssue, ValidationResult, SceneJumpData, ActionItem } from './types';

const CHOICESCRIPT_RESERVED: ReadonlySet<string> = new Set([
    'choice_subscribe_allowed',
    'choice_is_web',
    'choice_is_trial',
    'choice_purchaseable_version',
    'choice_current_chapter',
    'choice_save_allowed',
    'choice_user_restored_save',
    'choice_restored_game',
    'choice_restored_game_modern',
]);

function issue(code: string, message: string, ref?: string): ValidationIssue {
    return { code, message, ref };
}

function validateGraph(nodes: Node<NodeData>[], edges: Edge[]): Pick<ValidationResult, 'errors' | 'warnings' | 'infos'> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const infos: ValidationIssue[] = [];

    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) {
        errors.push(issue('NO_START_NODE', 'No start node found'));
        return { errors, warnings, infos };
    }

    const startEdges = edges.filter(e => e.source === startNode.id);
    if (startEdges.length === 0) {
        errors.push(issue('START_NO_EDGES', 'Start node has no outgoing connections — the story cannot begin'));
    }
    if (startEdges.length > 1) {
        errors.push(issue('START_MULTIPLE_EDGES', 'Start node has more than one outgoing connection — only one is allowed'));
    }

    const adj = new Map<string, string[]>();
    for (const edge of edges) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push(edge.target);
    }

    const reachable = new Set<string>();
    const stack = [startNode.id];
    while (stack.length > 0) {
        const id = stack.pop()!;
        if (reachable.has(id)) continue;
        reachable.add(id);
        for (const child of adj.get(id) ?? []) stack.push(child);
    }

    for (const node of nodes) {
        if (node.type === 'comment') continue;
        if (!reachable.has(node.id)) {
            warnings.push(issue('UNREACHABLE_NODE', `Story Part "${node.data.label}" is unreachable from start`, node.id));
        }
    }

    const nodeTypeById = new Map(nodes.map(n => [n.id, n.type]));

    const nodeOutCount = new Map<string, number>();
    const edgesBySource = new Map<string, Edge[]>();
    for (const edge of edges) {
        nodeOutCount.set(edge.source, (nodeOutCount.get(edge.source) ?? 0) + 1);
        if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
        edgesBySource.get(edge.source)!.push(edge);
    }

    const warnedEmptyLabel = new Set<string>();
    for (const edge of edges) {
        const sourceType = nodeTypeById.get(edge.source);
        if (sourceType === 'condition' || sourceType === 'random_branch') continue;
        if ((nodeOutCount.get(edge.source) ?? 0) > 1 && !edge.label && !warnedEmptyLabel.has(edge.source)) {
            warnings.push(issue('EMPTY_CHOICE_LABEL', 'A choice has no label — it will default to "Continue"'));
            warnedEmptyLabel.add(edge.source);
        }
    }

    for (const [sourceId, sourceEdges] of edgesBySource) {
        const sourceType = nodeTypeById.get(sourceId);
        if (sourceType === 'condition' || sourceType === 'random_branch') continue;
        const seen = new Set<string>();
        const warned = new Set<string>();
        for (const edge of sourceEdges) {
            const label = (edge.label as string) ?? '';
            if (seen.has(label) && !warned.has(label)) {
                warnings.push(issue('DUPLICATE_CHOICE_LABEL', `Two choices in a block have the same label '${label || 'Continue'}' — the reader may not be able to distinguish them`));
                warned.add(label);
            }
            seen.add(label);
        }
    }

    // Condition node validation
    for (const node of nodes) {
        if (node.type === 'condition') {
            const outEdges = edges.filter(e => e.source === node.id);
            const hasTrue = outEdges.some(e => e.sourceHandle === 'true');
            const hasFalse = outEdges.some(e => e.sourceHandle === 'false');
            if (!hasTrue) errors.push(issue('CONDITION_MISSING_TRUE_BRANCH', `Condition node "${node.data.label}" has no "if true" connection`, node.id));
            if (!hasFalse) errors.push(issue('CONDITION_MISSING_FALSE_BRANCH', `Condition node "${node.data.label}" has no "if false" connection`, node.id));
        }
    }

    const visitedDFS = new Set<string>();
    const inStack = new Set<string>();
    let hasCycle = false;
    function dfs(id: string) {
        if (inStack.has(id)) { hasCycle = true; return; }
        if (visitedDFS.has(id)) return;
        visitedDFS.add(id); inStack.add(id);
        for (const child of adj.get(id) ?? []) dfs(child);
        inStack.delete(id);
    }
    dfs(startNode.id);
    if (hasCycle) infos.push(issue('CYCLE_DETECTED', 'Cycle detected — will use *goto for repeated nodes'));

    return { errors, warnings, infos };
}

function validateVariables(story: MyStory): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const seenNames = new Set<string>();
    for (const v of story.variables) {
        if (seenNames.has(v.name)) {
            errors.push(issue('DUPLICATE_VARIABLE', `Variable "${v.name}" is declared more than once`, v.name));
        }
        seenNames.add(v.name);

        if (CHOICESCRIPT_RESERVED.has(v.name)) {
            errors.push(issue('RESERVED_VARIABLE_NAME', `"${v.name}" is a reserved ChoiceScript variable name`, v.name));
        }

        if (v.type === 'boolean' && v.initialValue !== true && v.initialValue !== false) {
            errors.push(issue('INVALID_INITIAL_VALUE', `Boolean variable "${v.name}" must have initial value true or false`, v.name));
        }
    }

    const declaredNames = new Set(story.variables.map(v => v.name));
    const varRefPattern = /\$\{([^}]+)\}|@\{([^}\s]+)/g;

    const allNodes = story.scenes.flatMap(s => s.nodes);
    for (const node of allNodes) {
        const content = (node.data.content as string) ?? '';
        let match: RegExpExecArray | null;
        varRefPattern.lastIndex = 0;
        while ((match = varRefPattern.exec(content)) !== null) {
            const refName = (match[1] ?? match[2]).trim();
            if (refName && !declaredNames.has(refName)) {
                warnings.push(issue('UNDEFINED_VARIABLE', `Node references undeclared variable "\${${refName}}"`, refName));
            }
        }
    }

    return { errors, warnings };
}

function validateCrossScene(story: MyStory): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const sceneIds = new Set(story.scenes.map(s => s.id));

    // Check for duplicate scene IDs
    const seenIds = new Set<string>();
    for (const scene of story.scenes) {
        if (seenIds.has(scene.id)) {
            errors.push(issue('DUPLICATE_SCENE_ID', `Two scenes share the same id "${scene.id}"`, scene.id));
        }
        seenIds.add(scene.id);
    }

    // Build map of scene ID → set of label names (from scene_label nodes)
    const sceneLabels = new Map<string, Set<string>>();
    for (const scene of story.scenes) {
        const labels = new Set<string>();
        for (const node of scene.nodes) {
            if (node.type === 'scene_label') {
                const raw = (node.data.label as string) ?? 'entry';
                labels.add(raw.trim().replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'entry');
            }
        }
        sceneLabels.set(scene.id, labels);
    }

    // Validate scene_jump nodes across all scenes
    for (const scene of story.scenes) {
        for (const node of scene.nodes) {
            if (node.type === 'scene_jump') {
                const jumpData = node.data as unknown as SceneJumpData & Record<string, unknown>;
                const targetScene = jumpData.targetScene ?? '';
                const targetLabel = jumpData.targetLabel ?? '';

                if (!targetScene) {
                    errors.push(issue('SCENE_JUMP_NO_TARGET', 'A scene jump node has no target scene selected', node.id));
                    continue;
                }

                if (!sceneIds.has(targetScene)) {
                    errors.push(issue('SCENE_JUMP_MISSING_SCENE', `Scene jump targets "${targetScene}" which does not exist`, targetScene));
                    continue;
                }

                if (targetLabel) {
                    const targetLabels = sceneLabels.get(targetScene) ?? new Set();
                    if (!targetLabels.has(targetLabel)) {
                        errors.push(issue('SCENE_JUMP_MISSING_LABEL', `Scene jump targets label "${targetLabel}" in "${targetScene}" but no such entry label exists`, targetLabel));
                    }
                }
            }
        }
    }

    // Warn on scenes not reachable from sceneOrder or any scene_jump
    const referencedByJump = new Set<string>(story.sceneOrder);
    for (const scene of story.scenes) {
        for (const node of scene.nodes) {
            if (node.type === 'scene_jump') {
                const jumpData = node.data as unknown as SceneJumpData & Record<string, unknown>;
                if (jumpData.targetScene) referencedByJump.add(jumpData.targetScene);
            }
        }
    }
    for (const scene of story.scenes) {
        if (!referencedByJump.has(scene.id)) {
            warnings.push(issue('UNREACHABLE_SCENE', `Scene "${scene.name}" is not reachable from the scene list or any scene jump`, scene.id));
        }
    }

    return { errors, warnings };
}

function validateStatsAndAchievements(story: MyStory): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    const declaredVarNames = new Set(story.variables.map(v => v.name));

    for (const entry of (story.statChart ?? [])) {
        if (entry.variable && !declaredVarNames.has(entry.variable)) {
            warnings.push(issue('STAT_CHART_UNDEFINED_VARIABLE', `Stat chart references undeclared variable "${entry.variable}"`, entry.variable));
        }
        if (entry.kind === 'opposed_pair' && entry.variable2 && !declaredVarNames.has(entry.variable2)) {
            warnings.push(issue('STAT_CHART_UNDEFINED_VARIABLE', `Stat chart references undeclared variable "${entry.variable2}"`, entry.variable2));
        }
    }

    const achievementIds = new Set<string>();
    for (const ach of (story.achievements ?? [])) {
        if (achievementIds.has(ach.id)) {
            errors.push(issue('DUPLICATE_ACHIEVEMENT_ID', `Two achievements share the same id "${ach.id}"`, ach.id));
        }
        achievementIds.add(ach.id);
        if (ach.points === 0) {
            warnings.push(issue('ACHIEVEMENT_ZERO_POINTS', `Achievement "${ach.id}" has 0 points`, ach.id));
        }
    }

    const allNodes = story.scenes.flatMap(s => s.nodes);
    for (const node of allNodes) {
        if (node.type === 'action') {
            const actions = (node.data.actions as ActionItem[] | undefined) ?? [];
            for (const action of actions) {
                if (action.kind === 'award_achievement' && !achievementIds.has(action.achievementId)) {
                    warnings.push(issue('UNDEFINED_ACHIEVEMENT', `Action references undeclared achievement "${action.achievementId}"`, action.achievementId));
                }
            }
        }
    }

    return { errors, warnings };
}

function validateSubroutines(story: MyStory): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const scene of story.scenes) {
        const sceneSubs = scene.subroutines ?? [];
        const subIds = new Set(sceneSubs.map(s => s.id));

        // Error if a gosub node references a subroutine that doesn't exist
        for (const node of scene.nodes) {
            if (node.type === 'gosub') {
                const subroutineId = (node.data.subroutineId as string) ?? '';
                if (subroutineId && !subIds.has(subroutineId)) {
                    errors.push(issue('GOSUB_MISSING_SUBROUTINE',
                        `Subroutine call references "${subroutineId}" which is not defined in this scene`,
                        subroutineId));
                }
            }
        }

        // Validate each subroutine's own graph
        for (const sub of sceneSubs) {
            // Error if subroutine has no *return path (no subroutine_return node)
            const hasReturn = sub.nodes.some(n => n.type === 'subroutine_return');
            if (!hasReturn && sub.nodes.length > 0) {
                errors.push(issue('SUBROUTINE_NO_RETURN',
                    `Subroutine "${sub.name}" has no *return node`,
                    sub.id));
            }

            // Warning if subroutine calls itself (recursive gosub — not supported by ChoiceScript)
            const callsSelf = sub.nodes.some(n => n.type === 'gosub' &&
                (n.data.subroutineId as string) === sub.id);
            if (callsSelf) {
                warnings.push(issue('RECURSIVE_GOSUB',
                    `Subroutine "${sub.name}" calls itself recursively — ChoiceScript does not support recursion`,
                    sub.id));
            }
        }
    }

    // Warn if a reuse modifier is on a choice edge that cannot be reached more than once
    // (no incoming back-edges anywhere in the story)
    for (const scene of story.scenes) {
        const nodeIds = new Set(scene.nodes.map(n => n.id));
        const incomingCount = new Map<string, number>();
        for (const e of scene.edges) {
            if (nodeIds.has(e.target)) {
                incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
            }
        }
        // Build reachability to detect back-edges (cycles)
        const adj = new Map<string, string[]>();
        for (const e of scene.edges) {
            if (!adj.has(e.source)) adj.set(e.source, []);
            adj.get(e.source)!.push(e.target);
        }
        const onCyclePath = new Set<string>();
        const visited = new Set<string>();
        const inStack = new Set<string>();
        function dfs(id: string) {
            if (inStack.has(id)) { onCyclePath.add(id); return; }
            if (visited.has(id)) return;
            visited.add(id); inStack.add(id);
            for (const child of adj.get(id) ?? []) dfs(child);
            inStack.delete(id);
        }
        const start = scene.nodes.find(n => n.type === 'start');
        if (start) dfs(start.id);

        for (const e of scene.edges) {
            const data = (e.data as { reuseMode?: string } | undefined) ?? {};
            if (data.reuseMode && data.reuseMode !== 'default') {
                const sourceNode = scene.nodes.find(n => n.id === e.source);
                if (sourceNode && !onCyclePath.has(sourceNode.id)) {
                    warnings.push(issue('REUSE_MODIFIER_UNREACHABLE',
                        `Choice "${(e.label as string) || 'Continue'}" has a reuse modifier but its source node is only reachable once`,
                        e.id));
                }
            }
        }
    }

    return { errors, warnings };
}

export function validateStory(story: MyStory): ValidationResult {
    const allErrors: ValidationIssue[] = [];
    const allWarnings: ValidationIssue[] = [];
    const allInfos: ValidationIssue[] = [];

    for (const scene of story.scenes) {
        const result = validateGraph(scene.nodes, scene.edges);
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
        allInfos.push(...result.infos);
    }

    const varResult = validateVariables(story);
    allErrors.push(...varResult.errors);
    allWarnings.push(...varResult.warnings);

    const crossResult = validateCrossScene(story);
    allErrors.push(...crossResult.errors);
    allWarnings.push(...crossResult.warnings);

    const statsResult = validateStatsAndAchievements(story);
    allErrors.push(...statsResult.errors);
    allWarnings.push(...statsResult.warnings);

    const subResult = validateSubroutines(story);
    allErrors.push(...subResult.errors);
    allWarnings.push(...subResult.warnings);

    return { errors: allErrors, warnings: allWarnings, infos: allInfos };
}

// Legacy adapter — takes nodes+edges directly; used by components that don't have the full story.
export function validateFlow(nodes: Node<NodeData>[], edges: Edge[]): { errors: string[]; warnings: string[]; infos: string[] } {
    const result = validateGraph(nodes, edges);
    return {
        errors: result.errors.map(e => e.message),
        warnings: result.warnings.map(w => w.message),
        infos: result.infos.map(i => i.message),
    };
}
