import type { Node, Edge } from '@xyflow/react';

export const NODE_W = 190;
export const NODE_H = 62;
const H_GAP = 48;
const V_GAP = 108;

interface TreeNode {
    id: string;
    kind: 'start' | 'passage' | 'ending';
    label: string;
    opts: Array<{ label: string; child: TreeNode }>;
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

function parseBlock(
    lines: string[],
    pos: { v: number },
    base: number,
    fallback: string,
    nextId: () => string,
): TreeNode {
    const id = nextId();
    const narrative: string[] = [];

    while (pos.v < lines.length) {
        const raw = lines[pos.v];
        const trimmed = raw.trim();
        const indentLevel = getIndent(raw);

        if (trimmed === '') { pos.v++; continue; }
        if (indentLevel < base) break;
        pos.v++;

        if (/^\*(title|author|page_break|image|comment)/.test(trimmed)) continue;

        if (/^\*(finish|ending|end_game)/.test(trimmed)) {
            return { id, kind: 'ending', label: narrative[0] ? trunc(narrative[0]) : fallback, opts: [] };
        }

        if (trimmed.startsWith('*choice')) {
            const optBase = indentLevel + 2;
            const opts: Array<{ label: string; child: TreeNode }> = [];
            while (pos.v < lines.length) {
                const optRaw = lines[pos.v];
                const optLine = optRaw.trim();
                const optIndent = getIndent(optRaw);
                if (optLine === '') { pos.v++; continue; }
                if (optIndent < optBase) break;
                if (optLine.startsWith('#')) {
                    const optText = optLine.slice(1).trim();
                    pos.v++;
                    opts.push({ label: optText, child: parseBlock(lines, pos, optBase + 2, trunc(optText, 50), nextId) });
                } else {
                    pos.v++;
                }
            }
            return { id, kind: 'passage', label: narrative[0] ? trunc(narrative[0]) : fallback, opts };
        }

        if (!trimmed.startsWith('*')) narrative.push(trimmed);
    }

    return { id, kind: narrative[0] ? 'passage' : 'ending', label: narrative[0] ? trunc(narrative[0]) : fallback, opts: [] };
}

function buildLayout(root: TreeNode, rfNodes: Node[], rfEdges: Edge[]) {
    let leafIdx = 0;

    function centerX(node: TreeNode, depth: number): number {
        if (node.opts.length === 0) {
            const lx = leafIdx * (NODE_W + H_GAP);
            leafIdx++;
            rfNodes.push({
                id: node.id,
                type: node.kind,
                position: { x: lx, y: depth * (NODE_H + V_GAP) },
                data: { label: node.label },
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
            data: { label: node.label },
        });
        return cx;
    }

    centerX(root, 0);
}

export function parseGameFlow(scenes: Record<string, string>): { nodes: Node[]; edges: Edge[] } {
    let uid = 0;
    const nextId = () => `n${uid++}`;

    const lines = Object.values(scenes).join('\n').split('\n');
    const pos = { v: 0 };
    const main = parseBlock(lines, pos, 0, 'Opening', nextId);

    const startId = nextId();
    const root: TreeNode = { id: startId, kind: 'start', label: 'Start', opts: [{ label: '', child: main }] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    buildLayout(root, nodes, edges);
    return { nodes, edges };
}
