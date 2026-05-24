import type { Node, Edge } from '@xyflow/react';

export const NODE_W = 190;
export const NODE_H = 90;
const H_GAP = 120;
const V_GAP = 180;

export type NodeData = {
    label: string;
    content: string;
    isCurrent?: boolean;
} & Record<string, unknown>;

interface TreeNode {
    id: string;
    kind: 'start' | 'passage' | 'ending';
    label: string;
    content: string;
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
            return { id, kind: 'ending', label: narrative[0] ? trunc(narrative[0]) : fallback, content: narrative.join('\n'), opts: [] };
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
            return { id, kind: 'passage', label: narrative[0] ? trunc(narrative[0]) : fallback, content: narrative.join('\n'), opts };
        }

        if (!trimmed.startsWith('*')) narrative.push(trimmed);
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

// Sugiyama-style layered layout for story flow graphs (trees and DAGs).
// Steps: BFS layer assignment → barycenter ordering within each layer →
//        even spacing centered over parent bounding box → collision pass.
export function applyTreeLayout(nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] {
    if (nodes.length === 0) return nodes;
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) return nodes;

    const nodeSet = new Set(nodes.map(n => n.id));
    const fwd = new Map<string, string[]>();
    const rev = new Map<string, string[]>();
    for (const { source, target } of edges) {
        if (!nodeSet.has(source) || !nodeSet.has(target)) continue;
        if (!fwd.has(source)) fwd.set(source, []);
        fwd.get(source)!.push(target);
        if (!rev.has(target)) rev.set(target, []);
        rev.get(target)!.push(source);
    }

    // 1. BFS from start — each node gets its minimum depth (layer number).
    const layerOf = new Map<string, number>([[startNode.id, 0]]);
    const bfsQ = [startNode.id];
    while (bfsQ.length > 0) {
        const id = bfsQ.shift()!;
        for (const child of fwd.get(id) ?? []) {
            if (!layerOf.has(child)) {
                layerOf.set(child, layerOf.get(id)! + 1);
                bfsQ.push(child);
            }
        }
    }

    // 2. Group by layer.
    const maxLayer = Math.max(0, ...[...layerOf.values()]);
    const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
    for (const [id, l] of layerOf) layers[l].push(id);

    // 3. Assign x positions top-down using barycenter heuristic.
    //    Each row is sorted by avg parent x, then centered over the parent bounding box.
    const xOf = new Map<string, number>([[startNode.id, 0]]);

    for (let l = 1; l <= maxLayer; l++) {
        const row = [...layers[l]];

        // Sort by average x of parents (barycenter).
        row.sort((a, b) => {
            const bc = (id: string) => {
                const ps = (rev.get(id) ?? []).map(p => xOf.get(p) ?? 0);
                return ps.length ? ps.reduce((s, v) => s + v, 0) / ps.length : 0;
            };
            return bc(a) - bc(b);
        });

        // Center over the bounding box of this row's parents.
        const parentXs = [...new Set(
            row.flatMap(id => (rev.get(id) ?? []).map(p => xOf.get(p) ?? 0))
        )];
        const cx = parentXs.length
            ? (Math.min(...parentXs) + Math.max(...parentXs)) / 2
            : 0;

        const span = (row.length - 1) * (NODE_W + H_GAP);
        row.forEach((id, i) => xOf.set(id, cx - span / 2 + i * (NODE_W + H_GAP)));
        layers[l] = row;
    }

    // 4. Collision pass — within each row, push nodes right until no two overlap.
    for (const row of layers) {
        const sorted = [...row].sort((a, b) => (xOf.get(a) ?? 0) - (xOf.get(b) ?? 0));
        for (let i = 1; i < sorted.length; i++) {
            const minX = (xOf.get(sorted[i - 1]) ?? 0) + NODE_W + H_GAP;
            if ((xOf.get(sorted[i]) ?? 0) < minX) xOf.set(sorted[i], minX);
        }
    }

    // 5. Build position map.
    const posMap = new Map<string, { x: number; y: number }>();
    for (const [id, l] of layerOf) posMap.set(id, { x: xOf.get(id)!, y: l * (NODE_H + V_GAP) });

    // 6. Orphan nodes (not reachable from start) go in a row below the tree.
    const orphans = nodes.filter(n => !layerOf.has(n.id));
    if (orphans.length > 0) {
        const maxY = posMap.size ? Math.max(...[...posMap.values()].map(p => p.y)) : 0;
        orphans.forEach((n, i) => posMap.set(n.id, { x: i * (NODE_W + H_GAP), y: maxY + NODE_H + V_GAP }));
    }

    return nodes.map(n => { const p = posMap.get(n.id); return p ? { ...n, position: p } : n; });
}

export function parseGameFlow(scenes: Record<string, string>): { nodes: Node<NodeData>[]; edges: Edge[] } {
    let uid = 0;
    const nextId = () => `n${uid++}`;

    const lines = Object.values(scenes).join('\n').split('\n');
    const pos = { v: 0 };
    const main = parseBlock(lines, pos, 0, 'Opening', nextId);

    const startId = nextId();
    const root: TreeNode = { id: startId, kind: 'start', label: 'Start', content: '', opts: [{ label: '', child: main }] };

    const nodes: Node<NodeData>[] = [];
    const edges: Edge[] = [];
    buildTreeLayout(root, nodes, edges);
    return { nodes, edges };
}
