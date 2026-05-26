import type { Node, Edge } from '@xyflow/react';

export const NODE_W = 190;
export const NODE_H = 90;
export const H_GAP = 120;
export const V_GAP = 180;

export type NodeData = {
    label: string;
    content: string;
    isCurrent?: boolean;
    rawContent?: string;
} & Record<string, unknown>;

// Sugiyama-style layered layout for story flow graphs (trees and DAGs).
// Steps: BFS layer assignment → barycenter ordering within each layer →
//        even spacing centered over parent bounding box → collision pass.
export function applyTreeLayout(nodes: Node<NodeData>[], edges: Edge[], direction: 'TB' | 'LR' = 'TB'): Node<NodeData>[] {
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
    const xOf = new Map<string, number>([[startNode.id, 0]]);

    for (let l = 1; l <= maxLayer; l++) {
        const row = [...layers[l]];

        row.sort((a, b) => {
            const bc = (id: string) => {
                const ps = (rev.get(id) ?? []).map(p => xOf.get(p) ?? 0);
                return ps.length ? ps.reduce((s, v) => s + v, 0) / ps.length : 0;
            };
            return bc(a) - bc(b);
        });

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
    for (const [id, l] of layerOf) {
        const ix = xOf.get(id)!;
        if (direction === 'TB') {
            posMap.set(id, { x: ix, y: l * (NODE_H + V_GAP) });
        } else {
            posMap.set(id, { x: l * (NODE_H + V_GAP), y: ix });
        }
    }

    // 6. Orphan nodes (not reachable from start) go in a row below/after the tree.
    const orphans = nodes.filter(n => !layerOf.has(n.id));
    if (orphans.length > 0) {
        if (direction === 'TB') {
            const maxY = posMap.size ? Math.max(...[...posMap.values()].map(p => p.y)) : 0;
            orphans.forEach((n, i) => posMap.set(n.id, { x: i * (NODE_W + H_GAP), y: maxY + NODE_H + V_GAP }));
        } else {
            const maxX = posMap.size ? Math.max(...[...posMap.values()].map(p => p.x)) : 0;
            orphans.forEach((n, i) => posMap.set(n.id, { x: maxX + NODE_H + V_GAP, y: i * (NODE_W + H_GAP) }));
        }
    }

    return nodes.map(n => { const p = posMap.get(n.id); return p ? { ...n, position: p } : n; });
}
