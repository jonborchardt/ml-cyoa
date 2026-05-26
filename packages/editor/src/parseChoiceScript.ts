/**
 * parseChoiceScript.ts
 *
 * Converts raw ChoiceScript text into a React Flow graph (nodes + edges).
 * This is the inverse of serializeFlow().
 *
 * Strategy:
 *  1. Collect all *label declarations with their line positions.
 *  2. Split the text into sections (one per label).
 *  3. For each section, infer the node type from the commands it contains.
 *  4. Build edges from *goto / *choice / *if patterns.
 *  5. Apply applyTreeLayout to position nodes.
 *  6. Anything unrecognised → RawCodeNode.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './layout';
import { applyTreeLayout } from './layout';
import type { ConditionConfig, ActionItem, SceneJumpData } from './types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function indent(line: string): number {
    let i = 0;
    while (i < line.length && line[i] === ' ') i++;
    return i;
}

function trimLine(line: string): string {
    return line.trim();
}

function trunc(s: string, n = 58): string {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

let _uid = 0;
function nextId(): string {
    return `p_${_uid++}`;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface ParseResult {
    nodes: Node<NodeData>[];
    edges: Edge[];
    unsupportedSyntax: boolean;
}

/**
 * Parse a single ChoiceScript scene into nodes and edges.
 * Strips the startup header (*title, *author, *scene_list, *create, *temp).
 */
export function parseScene(text: string): ParseResult {
    _uid = 0;
    const lines = text.split('\n');

    // Build label → line-index map
    const labelLines = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
        const m = trimLine(lines[i]).match(/^\*label\s+(\S+)/);
        if (m) labelLines.set(m[1], i);
    }

    // Build sections: each starts at a *label (indent ≤ its own indent)
    // A section runs until the next *label at the same or lower indent.
    interface Section {
        name: string;
        lineStart: number;  // line of *label
        lineEnd: number;    // exclusive
        ind: number;
    }

    const sectionList: Section[] = [];
    labelLines.forEach((lineIdx, name) => {
        const ind = indent(lines[lineIdx]);
        sectionList.push({ name, lineStart: lineIdx, lineEnd: -1, ind });
    });
    // Sort by line order
    sectionList.sort((a, b) => a.lineStart - b.lineStart);

    // Fill in lineEnd: next section at same or lower indent, or EOF
    for (let i = 0; i < sectionList.length; i++) {
        const sec = sectionList[i];
        let end = lines.length;
        for (let j = i + 1; j < sectionList.length; j++) {
            if (sectionList[j].ind <= sec.ind) {
                end = sectionList[j].lineStart;
                break;
            }
        }
        sec.lineEnd = end;
    }

    // Collect top-level sections (indent = 0, or minimum indent present)
    const topSections = sectionList.filter(s => s.ind === 0);

    // If there are no labels at all, treat the whole text as a single passage
    if (topSections.length === 0 && sectionList.length === 0) {
        return parseLabelless(lines);
    }

    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];
    let hasUnsupported = false;

    // Label → node-id map (populated as we create nodes)
    const labelToNodeId = new Map<string, string>();

    // Deferred edges: {sourceId, targetLabel, edgeData}
    interface PendingEdge {
        sourceId: string;
        targetLabel: string;
        label?: string;
        sourceHandle?: string;
        data?: Record<string, unknown>;
    }
    const pendingEdges: PendingEdge[] = [];

    // Create a start node
    const startId = nextId();
    nodes.push({
        id: startId,
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Start', content: '' },
    });

    // Find the first top-level section to connect start → first node
    let startConnected = false;

    // Process each section
    for (const sec of sectionList) {
        const secLines = lines.slice(sec.lineStart + 1, sec.lineEnd);
        const nodeId = nextId();
        labelToNodeId.set(sec.name, nodeId);

        const result = parseSection(sec.name, secLines, nodeId, pendingEdges, sectionList);
        nodes.push(result.node);
        edges.push(...result.edges);
        if (result.unsupported) hasUnsupported = true;

        // Connect start → first top-level section
        if (!startConnected && sec.ind === 0) {
            startConnected = true;
            edges.push({ id: `e_start_${nodeId}`, source: startId, target: nodeId });
        }
    }

    // Resolve pending edges
    for (const pe of pendingEdges) {
        const targetId = labelToNodeId.get(pe.targetLabel);
        if (targetId) {
            edges.push({
                id: `e_${pe.sourceId}_${targetId}_${nextId()}`,
                source: pe.sourceId,
                target: targetId,
                label: pe.label,
                sourceHandle: pe.sourceHandle,
                data: pe.data,
            });
        }
    }

    // De-duplicate edges
    const seenEdges = new Set<string>();
    const dedupedEdges = edges.filter(e => {
        const key = `${e.source}→${e.target}${e.sourceHandle ?? ''}`;
        if (seenEdges.has(key)) return false;
        seenEdges.add(key);
        return true;
    });

    const laidOut = applyTreeLayout(nodes, dedupedEdges);
    return { nodes: laidOut, edges: dedupedEdges, unsupportedSyntax: hasUnsupported };
}

// ─── Parse a section into a node ──────────────────────────────────────────

interface SectionParseResult {
    node: Node<NodeData>;
    edges: Edge[];
    unsupported: boolean;
}

interface Section {
    name: string;
    lineStart: number;
    lineEnd: number;
    ind: number;
}

function parseSection(
    labelName: string,
    lines: string[],
    nodeId: string,
    pendingEdges: Array<{
        sourceId: string;
        targetLabel: string;
        label?: string;
        sourceHandle?: string;
        data?: Record<string, unknown>;
    }>,
    allSections: Section[],
): SectionParseResult {
    const trimmed = lines.map(trimLine).filter(l => l !== '');
    const edges: Edge[] = [];
    let unsupported = false;

    // Detect node type from content
    const hasChoice = trimmed.some(l => /^\*choice\b/.test(l));
    const hasFakeChoice = trimmed.some(l => /^\*fake_choice\b/.test(l));
    const hasIf = trimmed.some(l => /^\*(if|elseif)\b/.test(l));
    const hasGotoScene = trimmed.some(l => /^\*goto_scene\b/.test(l));
    const hasGotoSubScene = trimmed.some(l => /^\*gosub_scene\b/.test(l));
    const hasGotoRandomScene = trimmed.some(l => /^\*goto_random_scene\b/.test(l));
    const hasGosub = trimmed.some(l => /^\*gosub\b/.test(l));
    const hasFinish = trimmed.some(l => /^\*(finish|ending|end_game)\b/.test(l));
    const hasAction = trimmed.some(l => /^\*(set|rand|input_text|input_number|delete)\b/.test(l));
    const hasPageBreak = trimmed.some(l => /^\*page_break\b/.test(l));
    const hasDelayBreak = trimmed.some(l => /^\*delay_break\b/.test(l));
    const hasImage = trimmed.some(l => /^\*image\b/.test(l));
    const hasCheckAchievements = trimmed.some(l => /^\*check_achievements\b/.test(l));
    const hasUnknownCmd = trimmed.some(l => {
        if (!l.startsWith('*')) return false;
        const cmd = l.slice(1).split(/\s+/)[0];
        return !KNOWN_COMMANDS.has(cmd);
    });

    // Prose content (lines not starting with *)
    const proseParts = trimmed.filter(l => !l.startsWith('*') && !l.startsWith('#'));
    const proseText = proseParts.join('\n');
    const labelDisplay = proseText ? trunc(proseText) : labelName;

    // ── raw_code: unknown commands → opaque passthrough ──
    if (hasUnknownCmd) {
        unsupported = true;
        const rawContent = lines.filter(l => l.trim() !== '').join('\n');
        return {
            node: {
                id: nodeId,
                type: 'raw_code',
                position: { x: 0, y: 0 },
                data: { label: labelName, content: '', rawContent },
            },
            edges,
            unsupported: true,
        };
    }

    // ── page_break ──
    if (hasPageBreak && !hasChoice && !hasIf) {
        return { node: makeNode(nodeId, 'page_break', 'Page Break', ''), edges, unsupported: false };
    }

    // ── delay_break ──
    if (hasDelayBreak && !hasChoice && !hasIf) {
        return { node: makeNode(nodeId, 'delay_break', 'Delay Break', ''), edges, unsupported: false };
    }

    // ── image ──
    if (hasImage && !hasChoice && !hasIf) {
        const imgLine = trimmed.find(l => /^\*image\b/.test(l))!;
        const m = imgLine.match(/^\*image\s+(\S+)(?:\s+(left|right))?(?:\s+"([^"]*)")?/);
        const imageFile = m?.[1] ?? '';
        const imageAlign = (m?.[2] as 'left' | 'right') ?? 'center';
        const imageAlt = m?.[3] ?? '';
        const node = makeNode(nodeId, 'image', `\u{1F5BC} ${imageFile}`, '');
        node.data.imageFile = imageFile;
        node.data.imageAlign = imageAlign;
        node.data.imageAlt = imageAlt;
        return { node, edges, unsupported: false };
    }

    // ── goto_random_scene ──
    if (hasGotoRandomScene && !hasChoice && !hasIf) {
        const lineIdx = lines.findIndex(l => /^\*goto_random_scene\b/.test(l.trim()));
        const scenes: string[] = [];
        if (lineIdx >= 0) {
            const baseIndent = lines[lineIdx].search(/\S/);
            for (let k = lineIdx + 1; k < lines.length; k++) {
                const raw = lines[k];
                if (!raw.trim()) continue;
                const ind = raw.search(/\S/);
                if (ind <= baseIndent) break;
                scenes.push(raw.trim());
            }
        }
        const node = makeNode(nodeId, 'goto_random_scene', 'goto_random_scene', '');
        node.data.scenes = scenes;
        return { node, edges, unsupported: false };
    }

    // ── check_achievements ──
    if (hasCheckAchievements) {
        return { node: makeNode(nodeId, 'check_achievements', 'Check Achievements', ''), edges, unsupported: false };
    }

    // ── action node: *set, *rand, *input_* ──
    if (hasAction && !hasChoice && !hasIf) {
        const actions = parseActions(trimmed);
        const node = makeNode(nodeId, 'action', 'Actions', proseText);
        node.data.actions = actions;
        return { node, edges, unsupported: false };
    }

    // ── condition node: *if/*else ──
    if (hasIf && !hasChoice) {
        const cond = parseCondition(trimmed, nodeId, pendingEdges);
        const node = makeNode(nodeId, 'condition', proseText || labelName, proseText);
        node.data.condition = cond.config;
        return { node, edges, unsupported: false };
    }

    // ── gosub_scene / goto_scene → scene_jump ──
    if (hasGotoScene || hasGotoSubScene) {
        const jumpLine = trimmed.find(l => /^\*(goto_scene|gosub_scene)\b/.test(l))!;
        const parts = jumpLine.split(/\s+/);
        const cmd = parts[0].slice(1);
        const targetScene = parts[1] ?? '';
        const targetLabel = parts[2] ?? '';
        const jumpType: 'transfer' | 'subroutine' = cmd === 'gosub_scene' ? 'subroutine' : 'transfer';
        const node = makeNode(nodeId, 'scene_jump', `→ ${targetScene}`, '');
        (node.data as NodeData & SceneJumpData).targetScene = targetScene;
        (node.data as NodeData & SceneJumpData).targetLabel = targetLabel;
        (node.data as NodeData & SceneJumpData).jumpType = jumpType;
        return { node, edges, unsupported: false };
    }

    // ── gosub call ──
    if (hasGosub && !hasChoice && !hasIf) {
        const gosubLine = trimmed.find(l => /^\*gosub\b/.test(l))!;
        const parts = gosubLine.split(/\s+/);
        const subroutineId = parts[1] ?? '';
        const params = parts.slice(2);
        const node = makeNode(nodeId, 'gosub', `gosub ${subroutineId}`, '');
        node.data.subroutineId = subroutineId;
        node.data.params = params;
        // gosub falls through; find continuation via *goto
        const gotoLine = trimmed.find(l => /^\*goto\s+/.test(l) && !l.includes('gosub'));
        if (gotoLine) {
            const targetLabel = gotoLine.split(/\s+/)[1];
            if (targetLabel) pendingEdges.push({ sourceId: nodeId, targetLabel });
        }
        return { node, edges, unsupported: false };
    }

    // ── fake_choice ──
    if (hasFakeChoice) {
        const node = makeNode(nodeId, 'fake_choice', labelDisplay, proseText);
        const fakeEdges = parseChoiceEdges(lines, nodeId, pendingEdges);
        return { node, edges: fakeEdges, unsupported: false };
    }

    // ── passage with *choice ──
    if (hasChoice) {
        const node = makeNode(nodeId, 'passage', labelDisplay, proseText);
        const choiceEdges = parseChoiceEdges(lines, nodeId, pendingEdges);
        return { node, edges: choiceEdges, unsupported: false };
    }

    // ── ending ──
    if (hasFinish) {
        const node = makeNode(nodeId, 'ending', labelDisplay, proseText);
        return { node, edges, unsupported: false };
    }

    // ── plain passage with *goto ──
    const gotoLine = trimmed.find(l => /^\*goto\s+/.test(l));
    if (gotoLine) {
        const targetLabel = gotoLine.split(/\s+/)[1];
        const node = makeNode(nodeId, 'passage', labelDisplay, proseText);
        if (targetLabel) pendingEdges.push({ sourceId: nodeId, targetLabel });
        return { node, edges, unsupported: false };
    }

    // ── sequential passage: look for implicit continuation ──
    // Find next top-level section
    const nextSec = findNextSection(allSections, labelName);
    const node = makeNode(nodeId, 'passage', labelDisplay, proseText);
    if (nextSec) {
        // Defer edge creation - will be resolved after all nodes are created
        pendingEdges.push({ sourceId: nodeId, targetLabel: nextSec.name });
    }
    return { node, edges, unsupported };
}

// ─── Parse *choice block to extract edges ─────────────────────────────────

function parseChoiceEdges(
    lines: string[],
    sourceId: string,
    pendingEdges: Array<{ sourceId: string; targetLabel: string; label?: string; data?: Record<string, unknown> }>,
): Edge[] {
    const edges: Edge[] = [];
    let inChoice = false;
    let choiceIndent = -1;

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const tr = trimLine(raw);
        const ind = indent(raw);

        if (/^\*(?:fake_)?choice\b/.test(tr)) {
            inChoice = true;
            choiceIndent = ind;
            continue;
        }

        if (!inChoice) continue;

        // Option line at choiceIndent + 2
        const optionMatch = tr.match(/^(?:\*(?:hide_reuse|disable_reuse|allow_reuse|selectable_if\s*\([^)]*\))\s*)?#(.*)$/);
        if (optionMatch && ind === choiceIndent + 2) {
            const optionLabel = optionMatch[1].trim();
            // Find the next *label inside this option body
            let targetLabel: string | null = null;
            for (let j = i + 1; j < lines.length; j++) {
                const jtr = trimLine(lines[j]);
                const jind = indent(lines[j]);
                if (jind <= choiceIndent + 2 && jtr.startsWith('#')) break; // next option
                if (jind <= choiceIndent) break; // back to parent
                const labelMatch = jtr.match(/^\*label\s+(\S+)/);
                if (labelMatch) { targetLabel = labelMatch[1]; break; }
                const gotoMatch = jtr.match(/^\*goto\s+(\S+)/);
                if (gotoMatch) { targetLabel = gotoMatch[1]; break; }
            }
            if (targetLabel) {
                pendingEdges.push({ sourceId, targetLabel, label: optionLabel || 'Continue' });
            } else {
                // Option body has no label/goto — create a fallback edge label
                edges.push({
                    id: `e_opt_${sourceId}_${optionLabel}_${nextId()}`,
                    source: sourceId,
                    target: '__unresolved__',
                    label: optionLabel || 'Continue',
                });
            }
        }
    }
    return edges;
}

// ─── Parse *if/*else condition block ──────────────────────────────────────

function parseCondition(
    trimmed: string[],
    nodeId: string,
    pendingEdges: Array<{ sourceId: string; targetLabel: string; sourceHandle?: string }>,
): { config: ConditionConfig } {
    const ifLine = trimmed.find(l => /^\*if\b/.test(l)) ?? '';
    const elseifLines = trimmed.filter(l => /^\*elseif\b/.test(l));
    const elseLine = trimmed.find(l => /^\*else\b/.test(l));

    const parseExpr = (line: string, cmd: '*if' | '*elseif') => {
        const rest = line.slice(cmd.length).trim();
        // Simple binary expression: var op value (no parens, no and/or)
        const m = rest.match(/^(\S+)\s+(=|!=|<|>|<=|>=)\s+(.+)$/);
        if (m) return { left: m[1], op: m[2], right: m[3].trim(), rawExpression: undefined };
        // Complex expression (contains and/or/not/parens) — pass through verbatim
        return { left: '', op: '=', right: 'true', rawExpression: rest };
    };

    const cfg = parseExpr(ifLine, '*if');

    // Find *goto in the true branch (lines between *if and *else/*elseif)
    const trueLine = trimmed.find(l => /^\*goto\s+/.test(l));
    const trueLabel = trueLine ? trueLine.split(/\s+/)[1] : '';

    // Find *goto in the else branch
    let falseLabel = '';
    const elseIdx = trimmed.indexOf(elseLine ?? '');
    if (elseIdx >= 0) {
        const afterElse = trimmed.slice(elseIdx + 1);
        const falseLine = afterElse.find(l => /^\*goto\s+/.test(l));
        falseLabel = falseLine ? falseLine.split(/\s+/)[1] : '';
    }

    if (trueLabel) pendingEdges.push({ sourceId: nodeId, targetLabel: trueLabel, sourceHandle: 'true' });
    if (falseLabel) pendingEdges.push({ sourceId: nodeId, targetLabel: falseLabel, sourceHandle: 'false' });

    const elseIfs = elseifLines.map(l => {
        const { left, op, right, rawExpression } = parseExpr(l, '*elseif');
        return rawExpression ? { left, op, right, rawExpression } : { left, op, right };
    });

    return {
        config: {
            left: cfg.left,
            op: cfg.op,
            right: cfg.right,
            ...(cfg.rawExpression ? { rawExpression: cfg.rawExpression } : {}),
            elseIfs: elseIfs.length ? elseIfs : undefined,
        },
    };
}

// ─── Parse action lines ───────────────────────────────────────────────────

function parseActions(lines: string[]): ActionItem[] {
    const actions: ActionItem[] = [];
    for (const line of lines) {
        // *delete var
        const deleteMatch = line.match(/^\*delete\s+(\S+)/);
        if (deleteMatch) {
            actions.push({ kind: 'delete', variable: deleteMatch[1] });
            continue;
        }
        // *set with fairmath operators (%+ or %-)
        const fairmathMatch = line.match(/^\*set\s+(\S+)\s+(%[+-])(.+)$/);
        if (fairmathMatch) {
            actions.push({ kind: 'set', variable: fairmathMatch[1], op: fairmathMatch[2], value: fairmathMatch[3].trim() });
            continue;
        }
        // *set var modulo value
        const moduloMatch = line.match(/^\*set\s+(\S+)\s+modulo\s+(.+)$/);
        if (moduloMatch) {
            actions.push({ kind: 'set', variable: moduloMatch[1], op: 'modulo', value: moduloMatch[2].trim() });
            continue;
        }
        // *set with single-char operator (+, -, *, /, ^, &) or no operator (= implicit)
        const setMatch = line.match(/^\*set\s+(\S+)\s+([+\-*/^&]?)(.+)$/);
        if (setMatch) {
            const op = setMatch[2] || '=';
            actions.push({ kind: 'set', variable: setMatch[1], op, value: setMatch[3].trim() });
            continue;
        }
        const randMatch = line.match(/^\*rand\s+(\S+)\s+(\d+)\s+(\d+)/);
        if (randMatch) {
            actions.push({ kind: 'rand', variable: randMatch[1], min: Number(randMatch[2]), max: Number(randMatch[3]) });
            continue;
        }
        if (/^\*input_text\s+(\S+)/.test(line)) {
            const m = line.match(/^\*input_text\s+(\S+)/);
            if (m) actions.push({ kind: 'input_text', variable: m[1] });
            continue;
        }
        const inNumMatch = line.match(/^\*input_number\s+(\S+)\s+(\d+)\s+(\d+)/);
        if (inNumMatch) {
            actions.push({ kind: 'input_number', variable: inNumMatch[1], min: Number(inNumMatch[2]), max: Number(inNumMatch[3]) });
        }
    }
    return actions;
}

// ─── Utilities ────────────────────────────────────────────────────────────

function makeNode(id: string, type: string, label: string, content: string): Node<NodeData> {
    return {
        id,
        type,
        position: { x: 0, y: 0 },
        data: { label: label || type, content: content ?? '' },
    };
}

function findNextSection(allSections: Section[], currentName: string): Section | null {
    const idx = allSections.findIndex(s => s.name === currentName);
    if (idx < 0 || idx + 1 >= allSections.length) return null;
    for (let i = idx + 1; i < allSections.length; i++) {
        if (allSections[i].ind === 0) return allSections[i];
    }
    return null;
}

function parseLabelless(lines: string[]): ParseResult {
    const startId = nextId();
    const nodeId = nextId();
    const trimmed = lines.map(l => l.trim()).filter(Boolean);
    const headerCmds = new Set(['title', 'author', 'scene_list', 'create', 'create_array',
        'temp', 'temp_array', 'stat_chart', 'achievement', 'ifid']);
    const prose = trimmed
        .filter(l => !l.startsWith('*') || !headerCmds.has(l.slice(1).split(/\s+/)[0]))
        .filter(l => !l.startsWith('*'))
        .join('\n');
    const hasFinish = trimmed.some(l => /^\*(finish|ending|end_game)\b/.test(l));

    const nodes: Node<NodeData>[] = [
        { id: startId, type: 'start', position: { x: 200, y: 0 }, data: { label: 'Start', content: '' } },
        { id: nodeId, type: hasFinish ? 'ending' : 'passage', position: { x: 200, y: 200 }, data: { label: prose ? trunc(prose) : 'Passage', content: prose } },
    ];
    const edges: Edge[] = [{ id: `e_start`, source: startId, target: nodeId }];
    return { nodes, edges, unsupportedSyntax: false };
}

// Commands that the parser recognises (won't trigger raw_code fallback)
const KNOWN_COMMANDS = new Set([
    'label', 'goto', 'gosub', 'gosub_scene', 'goto_scene', 'goto_random_scene', 'return',
    'choice', 'fake_choice', 'if', 'elseif', 'else',
    'set', 'rand', 'input_text', 'input_number', 'delete',
    'finish', 'ending', 'end_game',
    'page_break', 'delay_break', 'line_break', 'check_achievements', 'achieve',
    'title', 'author', 'scene_list', 'create', 'create_array', 'temp', 'temp_array', 'comment',
    'image', 'params',
    'hide_reuse', 'disable_reuse', 'allow_reuse', 'selectable_if',
    'stat_chart', 'achievement',
    // Advanced / platform-specific commands (pass through without raw_code fallback)
    'redirect_scene',
    'save_checkpoint', 'restore_checkpoint',
    'show_password', 'share_this_game', 'more_games',
    'bug', 'looplimit',
    'ifid',
]);
