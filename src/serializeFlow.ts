import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';

export interface ValidationResult {
    errors: string[];
    warnings: string[];
    infos: string[];
}

export function validateFlow(nodes: Node<NodeData>[], edges: Edge[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) {
        errors.push('No start node found');
        return { errors, warnings, infos };
    }

    const startEdges = edges.filter(e => e.source === startNode.id);
    if (startEdges.length === 0) {
        errors.push('Start node has no outgoing connections — the story cannot begin');
    }
    if (startEdges.length > 1) {
        errors.push('Start node has more than one outgoing connection — only one is allowed');
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
        if (!reachable.has(node.id)) {
            warnings.push(`Story Part "${node.data.label}" is unreachable from start`);
        }
    }

    const nodeOutCount = new Map<string, number>();
    const edgesBySource = new Map<string, Edge[]>();
    for (const edge of edges) {
        nodeOutCount.set(edge.source, (nodeOutCount.get(edge.source) ?? 0) + 1);
        if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
        edgesBySource.get(edge.source)!.push(edge);
    }
    const warnedEmptyLabel = new Set<string>();
    for (const edge of edges) {
        if ((nodeOutCount.get(edge.source) ?? 0) > 1 && !edge.label && !warnedEmptyLabel.has(edge.source)) {
            warnings.push(`A choice has no label — it will default to "Continue"`);
            warnedEmptyLabel.add(edge.source);
        }
    }

    for (const [, sourceEdges] of edgesBySource) {
        const seen = new Set<string>();
        const warned = new Set<string>();
        for (const edge of sourceEdges) {
            const label = (edge.label as string) ?? '';
            if (seen.has(label) && !warned.has(label)) {
                warnings.push(`Two choices in a block have the same label '${label || 'Continue'}' — the reader may not be able to distinguish them`);
                warned.add(label);
            }
            seen.add(label);
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
    if (hasCycle) infos.push('Cycle detected — will use *goto for repeated nodes');

    return { errors, warnings, infos };
}

export function serializeFlow(nodes: Node<NodeData>[], edges: Edge[]): string {
    const adj = new Map<string, Array<{ label: string; target: string }>>();
    for (const edge of edges) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push({ label: (edge.label as string) ?? '', target: edge.target });
    }

    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) return '';

    const startChildren = adj.get(startNode.id) ?? [];
    if (startChildren.length === 0) return '';

    const visited = new Set<string>();
    const lines: string[] = [];

    function serialize(nodeId: string, indent: number): void {
        const node = nodeById.get(nodeId);
        if (!node) return;
        const pad = ' '.repeat(indent);

        if (visited.has(nodeId)) {
            lines.push(`${pad}*goto node_${nodeId}`);
            return;
        }
        visited.add(nodeId);

        lines.push(`${pad}*label node_${nodeId}`);

        const content = ((node.data.content as string) ?? '').trim();
        if (content) {
            for (const line of content.split('\n')) lines.push(`${pad}${line}`);
        }

        const children = adj.get(nodeId) ?? [];
        if (children.length > 0) {
            lines.push(`${pad}*choice`);
            for (const { label, target } of children) {
                lines.push(`${pad}  #${label || 'Continue'}`);
                serialize(target, indent + 4);
            }
        } else if (node.type === 'ending') {
            lines.push(`${pad}*finish`);
        }
    }

    serialize(startChildren[0].target, 0);
    return lines.join('\n');
}
