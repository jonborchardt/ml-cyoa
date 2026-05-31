import type { Node, Edge } from '@xyflow/react';
import { NODE_W, NODE_H } from '@ml-cyoa/editor';
import type { NodeData } from '@ml-cyoa/editor';

export { NODE_W, NODE_H };

const H_GAP = 120;
const V_GAP = 180;

interface TreeNode {
    id: string;
    kind: 'start' | 'passage' | 'ending';
    label: string;
    content: string;
    opts: Array<{ label: string; child: TreeNode }>;
}

interface ParseContext {
    lines: string[];
    labelMap: Map<string, number>;
    visiting: Set<string>;
    nextId: () => string;
}

function getIndent(line: string) {
    let i = 0;
    while (i < line.length && line[i] === ' ') i++;
    return i;
}

function trunc(s: string, n = 58): string {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function buildLabelMap(lines: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].trim().match(/^\*label\s+(\S+)/);
        if (m) map.set(m[1], i + 1);
    }
    return map;
}

function parseLabeledSection(ctx: ParseContext, labelName: string): TreeNode {
    if (ctx.visiting.has(labelName)) {
        return { id: ctx.nextId(), kind: 'ending', label: `↩ ${labelName}`, content: '', opts: [] };
    }
    const lineIdx = ctx.labelMap.get(labelName);
    if (lineIdx === undefined) {
        return { id: ctx.nextId(), kind: 'ending', label: `[${labelName}]`, content: '', opts: [] };
    }
    ctx.visiting.add(labelName);
    const node = parseBlock(ctx, { v: lineIdx }, 0, labelName);
    ctx.visiting.delete(labelName);
    return node;
}

// If the first meaningful line in a block is *goto, resolve the label directly
// (avoids creating an empty intermediate node for option bodies like "#Foo\n  *goto bar")
function parseChildBlock(ctx: ParseContext, pos: { v: number }, base: number, fallback: string): TreeNode {
    let peek = pos.v;
    while (peek < ctx.lines.length) {
        const raw = ctx.lines[peek];
        const trimmed = raw.trim();
        const indentLevel = getIndent(raw);
        if (trimmed === '') { peek++; continue; }
        if (indentLevel < base) break;
        const m = trimmed.match(/^\*goto\s+(\S+)/);
        if (m) {
            pos.v = peek + 1;
            return parseLabeledSection(ctx, m[1]);
        }
        break;
    }
    return parseBlock(ctx, pos, base, fallback);
}

function parseBlock(ctx: ParseContext, pos: { v: number }, base: number, fallback: string): TreeNode {
    const id = ctx.nextId();
    const narrative: string[] = [];

    while (pos.v < ctx.lines.length) {
        const raw = ctx.lines[pos.v];
        const trimmed = raw.trim();
        const indentLevel = getIndent(raw);

        if (trimmed === '') { pos.v++; continue; }
        if (indentLevel < base) break;
        pos.v++;

        if (/^\*(title|author|page_break|image|comment|label)/.test(trimmed)) continue;

        if (/^\*(finish|ending|end_game)/.test(trimmed)) {
            return { id, kind: 'ending', label: narrative[0] ? trunc(narrative[0]) : fallback, content: narrative.join('\n'), opts: [] };
        }

        const gotoMatch = trimmed.match(/^\*goto\s+(\S+)/);
        if (gotoMatch) {
            const target = parseLabeledSection(ctx, gotoMatch[1]);
            if (narrative.length > 0) {
                return { id, kind: 'passage', label: trunc(narrative[0]), content: narrative.join('\n'), opts: [{ label: '', child: target }] };
            }
            // No narrative yet — skip the empty wrapper and return the target directly
            return target;
        }

        if (trimmed.startsWith('*choice')) {
            const optBase = indentLevel + 2;
            const opts: Array<{ label: string; child: TreeNode }> = [];
            while (pos.v < ctx.lines.length) {
                const optRaw = ctx.lines[pos.v];
                const optLine = optRaw.trim();
                const optIndent = getIndent(optRaw);
                if (optLine === '') { pos.v++; continue; }
                if (optIndent < optBase) break;
                if (optLine.startsWith('#')) {
                    const optText = optLine.slice(1).trim();
                    pos.v++;
                    opts.push({ label: optText, child: parseChildBlock(ctx, pos, optBase + 2, trunc(optText, 50)) });
                } else {
                    pos.v++;
                }
            }
            return { id, kind: 'passage', label: narrative[0] ? trunc(narrative[0]) : fallback, content: narrative.join('\n'), opts };
        }

        // Unknown *command — skip it and any indented body (e.g. *scene_list body lines)
        if (trimmed.startsWith('*')) {
            while (pos.v < ctx.lines.length) {
                const nextTrimmed = ctx.lines[pos.v].trim();
                if (nextTrimmed === '') { pos.v++; continue; }
                if (getIndent(ctx.lines[pos.v]) <= indentLevel) break;
                pos.v++;
            }
            continue;
        }

        narrative.push(trimmed);
    }

    const content = narrative.join('\n');
    return { id, kind: narrative[0] ? 'passage' : 'ending', label: narrative[0] ? trunc(narrative[0]) : fallback, content, opts: [] };
}

function buildTreeLayout(root: TreeNode, rfNodes: Node<NodeData>[], rfEdges: Edge[]) {
    let leafIdx = 0;

    function centerX(node: TreeNode, depth: number): number {
        if (node.opts.length === 0) {
            const lx = leafIdx * (NODE_W + H_GAP);
            leafIdx++;
            rfNodes.push({
                id: node.id,
                type: node.kind,
                position: { x: lx, y: depth * (NODE_H + V_GAP) },
                data: { label: node.label, content: node.content },
            });
            return lx + NODE_W / 2;
        }

        const centers: number[] = [];
        for (const { label, child } of node.opts) {
            const cx = centerX(child, depth + 1);
            centers.push(cx);
            rfEdges.push({
                id: `e-${node.id}-${child.id}`,
                source: node.id,
                target: child.id,
                label: label || undefined,
            });
        }

        const cx = (centers[0] + centers[centers.length - 1]) / 2;
        rfNodes.push({
            id: node.id,
            type: node.kind,
            position: { x: cx - NODE_W / 2, y: depth * (NODE_H + V_GAP) },
            data: { label: node.label, content: node.content },
        });
        return cx;
    }

    centerX(root, 0);
}

export function parseGameFlow(scenes: Record<string, string>): { nodes: Node<NodeData>[]; edges: Edge[] } {
    let uid = 0;
    const nextId = () => `n${uid++}`;

    const lines = Object.values(scenes).join('\n').split('\n');
    const labelMap = buildLabelMap(lines);
    const ctx: ParseContext = { lines, labelMap, visiting: new Set(), nextId };

    const pos = { v: 0 };
    const main = parseBlock(ctx, pos, 0, 'Opening');

    const startId = nextId();
    const root: TreeNode = { id: startId, kind: 'start', label: 'Start', content: '', opts: [{ label: '', child: main }] };

    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];
    buildTreeLayout(root, nodes, edges);
    return { nodes, edges };
}
