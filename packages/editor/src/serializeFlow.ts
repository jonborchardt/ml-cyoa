import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './layout';
import type { MyStory, SubroutineDef } from './myStoryStore';
import type { VariableDef, ConditionConfig, ActionItem, InputConfig, EdgeData, SceneJumpData, StatEntry, ImageData } from './types';

// Re-export validateFlow for backward compatibility with existing imports.
export { validateFlow } from './validateFlow';

// ─── Variable preamble ────────────────────────────────────────────────────

export function serializeStartupPreamble(story: Pick<MyStory, 'variables' | 'statChart' | 'achievements' | 'ifid'>): string {
    const parts: string[] = [];

    if (story.ifid) parts.push(`*ifid ${story.ifid}`);

    // *achievement must appear before *create — ChoiceScript enforces this ordering.
    // Hidden achievements: pre-earned line must literally be "hidden"; post-earned line
    // is the description shown after earning. Visible achievements use shortDescription
    // as the pre-earned line and optionally a separate post-earned line.
    for (const ach of (story.achievements ?? [])) {
        const visibility = ach.isVisible ? 'visible' : 'hidden';
        const achLines = [`*achievement ${ach.id} ${visibility} ${ach.points} ${ach.title}`];
        if (ach.isVisible) {
            achLines.push(`  ${ach.shortDescription || 'Achievement unlocked'}`);
            const postDesc = ach.postDescription || ach.preDescription;
            if (postDesc && postDesc !== ach.shortDescription) achLines.push(`  ${postDesc}`);
        } else {
            achLines.push(`  hidden`);
            const postDesc = ach.postDescription || ach.shortDescription || 'Achievement unlocked';
            achLines.push(`  ${postDesc}`);
        }
        parts.push(achLines.join('\n'));
    }

    const globals = (story.variables ?? []).filter(v => v.scope === 'global');
    if (globals.length > 0) {
        parts.push(globals.map(v => formatCreate(v)).join('\n'));
    }

    const statChart = (story.statChart ?? []).filter(e => e.variable) as StatEntry[];
    if (statChart.length > 0) {
        const lines = ['*stat_chart'];
        for (const entry of statChart) {
            if (entry.kind === 'percent') {
                lines.push(`  percent ${entry.variable} "${entry.label ?? ''}"`);
            } else if (entry.kind === 'opposed_pair' && entry.variable2) {
                lines.push(`  opposed_pair ${entry.variable} ${entry.variable2} "${entry.label ?? ''}" "${entry.label2 ?? ''}"`);
            } else if (entry.kind === 'text') {
                lines.push(`  text ${entry.variable} "${entry.label ?? ''}"`);
            }
        }
        parts.push(lines.join('\n'));
    }

    return parts.join('\n');
}

function formatCreate(v: VariableDef): string {
    if (v.isArray) {
        const len = v.arrayLength ?? 1;
        if (v.type === 'text') {
            const escaped = String(v.initialValue).replace(/"/g, '\\"');
            return `*create_array ${v.name} ${len} "${escaped}"`;
        }
        return `*create_array ${v.name} ${len} ${v.initialValue}`;
    }
    if (v.type === 'text') {
        const escaped = String(v.initialValue).replace(/"/g, '\\"');
        return `*create ${v.name} "${escaped}"`;
    }
    return `*create ${v.name} ${v.initialValue}`;
}

function formatTemp(v: VariableDef): string {
    if (v.isArray) {
        const len = v.arrayLength ?? 1;
        if (v.type === 'text') {
            const escaped = String(v.initialValue).replace(/"/g, '\\"');
            return `*temp_array ${v.name} ${len} "${escaped}"`;
        }
        return `*temp_array ${v.name} ${len} ${v.initialValue}`;
    }
    if (v.type === 'text') {
        const escaped = String(v.initialValue).replace(/"/g, '\\"');
        return `*temp ${v.name} "${escaped}"`;
    }
    return `*temp ${v.name} ${v.initialValue}`;
}

// ─── Node-type serializers (exported for testing) ─────────────────────────

export function serializeActionNode(node: Node<NodeData>): string {
    const actions = (node.data.actions as ActionItem[] | undefined) ?? [];
    return actions.map(serializeAction).join('\n');
}

function serializeAction(a: ActionItem): string {
    switch (a.kind) {
        case 'set':
            if (a.op === '=') return `*set ${a.variable} ${a.value}`;
            if (a.op === 'modulo') return `*set ${a.variable} modulo ${a.value}`;
            return `*set ${a.variable} ${a.op}${a.value}`;
        case 'rand': return `*rand ${a.variable} ${a.min} ${a.max}`;
        case 'input_text': return `*input_text ${a.variable}`;
        case 'input_number': return `*input_number ${a.variable} ${a.min} ${a.max}`;
        case 'page_break': return `*page_break`;
        case 'award_achievement': return `*achieve ${a.achievementId}`;
        case 'delete': return `*delete ${a.variable}`;
    }
}

export function serializeConditionNode(
    node: Node<NodeData>,
    trueBranchLabel: string,
    falseBranchLabel: string,
    elseIfLabels: string[] = [],
): string {
    const cfg = (node.data.condition as ConditionConfig | undefined) ?? { left: '', op: '=', right: '' };
    const lines: string[] = [];

    const ifExpr = cfg.rawExpression ?? `${cfg.left} ${cfg.op} ${cfg.right}`;
    lines.push(`*if ${ifExpr}`);
    if (cfg.trueContent) lines.push(`  ${cfg.trueContent}`);
    lines.push(`  *goto ${trueBranchLabel}`);

    (cfg.elseIfs ?? []).forEach((ei, i) => {
        const eiExpr = ei.rawExpression ?? `${ei.left} ${ei.op} ${ei.right}`;
        lines.push(`*elseif ${eiExpr}`);
        if (ei.content) lines.push(`  ${ei.content}`);
        if (elseIfLabels[i]) lines.push(`  *goto ${elseIfLabels[i]}`);
    });

    lines.push(`*else`);
    if (cfg.falseContent) lines.push(`  ${cfg.falseContent}`);
    lines.push(`  *goto ${falseBranchLabel}`);

    return lines.join('\n');
}

// ─── Edge serializer (exported for testing) ───────────────────────────────

export function serializeChoiceEdge(edge: Edge): string {
    const data = (edge.data as EdgeData | undefined) ?? {};
    const label = (edge.label as string) || 'Continue';
    const parts: string[] = [];

    if (data.reuseMode === 'hide') parts.push('*hide_reuse');
    if (data.reuseMode === 'disable') parts.push('*disable_reuse');
    if (data.reuseMode === 'allow') parts.push('*allow_reuse');

    if (data.condition) {
        parts.push(`*selectable_if (${data.condition}) #${label}`);
    } else {
        parts.push(`#${label}`);
    }

    return parts.join('\n');
}

// ─── Main serializer ──────────────────────────────────────────────────────

function getNodeLabel(node: Node<NodeData>): string {
    if (node.type === 'scene_label') {
        const raw = (node.data.label as string) ?? 'entry';
        return raw.trim().replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'entry';
    }
    return `node_${node.id}`;
}

export function serializeFlow(nodes: Node<NodeData>[], edges: Edge[], story?: Pick<MyStory, 'variables' | 'statChart' | 'achievements' | 'ifid'>): string {
    const nodeById = new Map(nodes.map(n => [n.id, n]));

    // Build adjacency: source → [{ edge, target }]
    const adj = new Map<string, Array<{ edge: Edge; target: string }>>();
    for (const edge of edges) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push({ edge, target: edge.target });
    }

    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) return '';

    const startChildren = adj.get(startNode.id) ?? [];
    if (startChildren.length === 0) return '';

    const visited = new Set<string>();
    const lines: string[] = [];

    // Variable preamble
    if (story) {
        const preamble = serializeStartupPreamble(story);
        if (preamble) lines.push(preamble, '');
        const temps = (story.variables ?? []).filter(v => v.scope === 'temp');
        for (const v of temps) lines.push(formatTemp(v));
        if (temps.length > 0) lines.push('');
    }

    // Random branch counter for auto temp var names
    let randCounter = 0;

    function serialize(nodeId: string, indent: number): void {
        const node = nodeById.get(nodeId);
        if (!node) return;
        const pad = ' '.repeat(indent);

        if (visited.has(nodeId)) {
            const targetNode = nodeById.get(nodeId);
            const lbl = targetNode ? getNodeLabel(targetNode) : `node_${nodeId}`;
            lines.push(`${pad}*goto ${lbl}`);
            return;
        }
        visited.add(nodeId);

        const children = adj.get(nodeId) ?? [];
        const type = node.type as string;

        // ── page_break: emit *page_break and continue ──
        if (type === 'page_break') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            lines.push(`${pad}*page_break`);
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── delay_break: emit *delay_break and continue ──
        if (type === 'delay_break') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            lines.push(`${pad}*delay_break`);
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── image: emit *image and continue ──
        if (type === 'image') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const imgData = node.data as ImageData & NodeData;
            const file = imgData.imageFile ?? '';
            const align = imgData.imageAlign ?? 'center';
            const alt = imgData.imageAlt ?? '';
            if (file) {
                const alignStr = align !== 'center' ? ` ${align}` : '';
                const altStr = alt ? ` "${alt}"` : '';
                lines.push(`${pad}*image ${file}${alignStr}${altStr}`);
            }
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── goto_random_scene: emit *goto_random_scene block (no children) ──
        if (type === 'goto_random_scene') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const scenes = (node.data.scenes as string[] | undefined) ?? [];
            lines.push(`${pad}*goto_random_scene`);
            for (const s of scenes) lines.push(`${pad}  ${s}`);
            return;
        }

        // ── check_achievements: emit *check_achievements and continue ──
        if (type === 'check_achievements') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            lines.push(`${pad}*check_achievements`);
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── action: emit actions and continue ──
        if (type === 'action') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const actionLines = serializeActionNode(node);
            if (actionLines) {
                for (const l of actionLines.split('\n')) lines.push(`${pad}${l}`);
            }
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── input: emit prompt + *input_* and continue ──
        if (type === 'input') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const cfg = node.data.inputConfig as InputConfig | undefined;
            if (cfg) {
                if (cfg.prompt) lines.push(`${pad}${cfg.prompt}`);
                if (cfg.inputType === 'text') {
                    lines.push(`${pad}*input_text ${cfg.variable}`);
                } else {
                    lines.push(`${pad}*input_number ${cfg.variable} ${cfg.min ?? 0} ${cfg.max ?? 100}`);
                }
            }
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── condition: emit *if/*else with *goto ──
        if (type === 'condition') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const trueEdge = children.find(c => c.edge.sourceHandle === 'true');
            const falseEdge = children.find(c => c.edge.sourceHandle === 'false');
            const trueLabel = trueEdge ? `node_${trueEdge.target}` : 'MISSING_TRUE_BRANCH';
            const falseLabel = falseEdge ? `node_${falseEdge.target}` : 'MISSING_FALSE_BRANCH';
            const condLines = serializeConditionNode(node, trueLabel, falseLabel);
            for (const l of condLines.split('\n')) lines.push(`${pad}${l}`);
            // Serialize both branches at top level
            if (trueEdge) serialize(trueEdge.target, indent);
            if (falseEdge) serialize(falseEdge.target, indent);
            return;
        }

        // ── random_branch: emit *rand + if chain ──
        if (type === 'random_branch') {
            const varName = `_branch_${randCounter++}`;
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const n = Math.max(children.length, 1);
            lines.push(`${pad}*rand ${varName} 1 ${n}`);
            children.forEach((c, i) => {
                lines.push(`${pad}*if ${varName} = ${i + 1}`);
                lines.push(`${pad}  *goto node_${c.target}`);
            });
            children.forEach(c => serialize(c.target, indent));
            return;
        }

        // ── fake_choice: emit *fake_choice + branches, then merge ──
        if (type === 'fake_choice') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const content = ((node.data.content as string) ?? '').trim();
            if (content) for (const l of content.split('\n')) lines.push(`${pad}${l}`);
            lines.push(`${pad}*fake_choice`);
            const targets = new Set<string>();
            for (const { edge, target } of children) {
                targets.add(target);
                const label = (edge.label as string) || 'Continue';
                lines.push(`${pad}  #${label}`);
                const branchContent = ((edge.data as EdgeData | undefined)?.content ?? '').trim();
                if (branchContent) {
                    for (const l of branchContent.split('\n')) lines.push(`${pad}    ${l}`);
                }
            }
            // Continue with common merge target (first unique target)
            if (targets.size > 0) serialize([...targets][0], indent);
            return;
        }

        // ── scene_label: named entry point for cross-scene jumping ──
        if (type === 'scene_label') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── gosub: call a same-scene subroutine, then continue ──
        if (type === 'gosub') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const subroutineId = (node.data.subroutineId as string) ?? '';
            const params = (node.data.params as string[] | undefined) ?? [];
            const paramStr = params.length > 0 ? ` ${params.join(' ')}` : '';
            if (subroutineId) lines.push(`${pad}*gosub ${subroutineId}${paramStr}`);
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── subroutine_entry: *label + optional *params, then body ──
        if (type === 'subroutine_entry') {
            const name = (node.data.label as string) ?? 'sub';
            const safeName = name.trim().replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'sub';
            lines.push(`${pad}*label ${safeName}`);
            const params = (node.data.params as string[] | undefined) ?? [];
            if (params.length > 0) lines.push(`${pad}*params ${params.join(' ')}`);
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── subroutine_return: emit *return, no children ──
        if (type === 'subroutine_return') {
            lines.push(`${pad}*return`);
            return;
        }

        // ── scene_jump: *goto_scene or *gosub_scene ──
        if (type === 'scene_jump') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const jumpData = node.data as SceneJumpData & NodeData;
            const targetScene = jumpData.targetScene ?? '';
            const targetLabel = jumpData.targetLabel ?? '';
            if (jumpData.jumpType === 'subroutine') {
                const cmd = targetLabel ? `*gosub_scene ${targetScene} ${targetLabel}` : `*gosub_scene ${targetScene}`;
                lines.push(`${pad}${cmd}`);
                if (children.length > 0) serialize(children[0].target, indent);
            } else {
                const cmd = targetLabel ? `*goto_scene ${targetScene} ${targetLabel}` : `*goto_scene ${targetScene}`;
                lines.push(`${pad}${cmd}`);
            }
            return;
        }

        // ── raw_code: emit verbatim and continue ──
        if (type === 'raw_code') {
            lines.push(`${pad}*label ${getNodeLabel(node)}`);
            const rawContent = ((node.data.rawContent as string) ?? '').trim();
            if (rawContent) {
                for (const l of rawContent.split('\n')) lines.push(`${pad}${l}`);
            }
            if (children.length > 0) serialize(children[0].target, indent);
            return;
        }

        // ── passage / ending (default) ──
        lines.push(`${pad}*label ${getNodeLabel(node)}`);
        const content = ((node.data.content as string) ?? '').trim();
        if (content) {
            for (const l of content.split('\n')) lines.push(`${pad}${l}`);
        }

        if (children.length === 1 && node.type !== 'ending') {
            // Single outbound edge — no choice block needed
            const { edge, target } = children[0];
            const data = edge.data as EdgeData | undefined;
            // If there's a condition or reuse mode, still wrap in *choice
            if (data?.condition || data?.reuseMode) {
                lines.push(`${pad}*choice`);
                const edgeLines = serializeChoiceEdge(edge);
                for (const l of edgeLines.split('\n')) lines.push(`${pad}  ${l}`);
                serialize(target, indent + 4);
            } else {
                serialize(target, indent);
            }
        } else if (children.length > 1) {
            lines.push(`${pad}*choice`);
            for (const { edge, target } of children) {
                const edgeLines = serializeChoiceEdge(edge);
                for (const l of edgeLines.split('\n')) lines.push(`${pad}  ${l}`);
                serialize(target, indent + 4);
            }
        } else if (node.type === 'ending') {
            lines.push(`${pad}*finish`);
        }
    }

    serialize(startChildren[0].target, 0);
    return lines.join('\n');
}

// ─── Subroutine serializer ────────────────────────────────────────────────

function serializeSubroutineBody(nodes: Node<NodeData>[], edges: Edge[]): string {
    // Exclude entry/return wrapper nodes; serialize remaining nodes in topological order
    const bodyNodes = nodes.filter(n => n.type !== 'subroutine_entry' && n.type !== 'subroutine_return');
    if (bodyNodes.length === 0) return '';

    const nodeById = new Map(bodyNodes.map(n => [n.id, n]));
    const hasIncoming = new Set<string>();
    for (const e of edges) {
        if (nodeById.has(e.source) && nodeById.has(e.target)) hasIncoming.add(e.target);
    }
    const adj = new Map<string, string[]>();
    for (const e of edges) {
        if (nodeById.has(e.source) && nodeById.has(e.target)) {
            if (!adj.has(e.source)) adj.set(e.source, []);
            adj.get(e.source)!.push(e.target);
        }
    }

    const startId = (bodyNodes.find(n => !hasIncoming.has(n.id)) ?? bodyNodes[0]).id;
    const visited = new Set<string>();
    const parts: string[] = [];

    function walk(nodeId: string): void {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = nodeById.get(nodeId);
        if (!node) return;
        const type = node.type as string;
        if (type === 'action') {
            const out = serializeActionNode(node);
            if (out) parts.push(out);
        } else if (type === 'passage') {
            const content = ((node.data.content as string) ?? '').trim();
            if (content) parts.push(content);
        } else if (type === 'condition') {
            const trueEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'true');
            const falseEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'false');
            const trueLabel = trueEdge ? `node_${trueEdge.target}` : 'MISSING_TRUE_BRANCH';
            const falseLabel = falseEdge ? `node_${falseEdge.target}` : 'MISSING_FALSE_BRANCH';
            parts.push(serializeConditionNode(node, trueLabel, falseLabel));
            if (trueEdge) walk(trueEdge.target);
            if (falseEdge) walk(falseEdge.target);
            return;
        }
        for (const child of adj.get(nodeId) ?? []) walk(child);
    }

    walk(startId);
    return parts.join('\n');
}

export function serializeSubroutine(sub: SubroutineDef): string {
    const lines: string[] = [`*label ${sub.id}`];
    if (sub.params && sub.params.length > 0) {
        lines.push(`*params ${sub.params.join(' ')}`);
    }
    const body = serializeSubroutineBody(sub.nodes, sub.edges);
    if (body) lines.push(body);
    lines.push('*return');
    return lines.join('\n');
}
