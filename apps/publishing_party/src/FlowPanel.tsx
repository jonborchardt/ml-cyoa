import {
    ReactFlow, Background, Controls, Handle, Position,
    BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow,
} from '@xyflow/react';
import type { NodeProps, EdgeProps, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import type { Game } from './games';
import { parseGameFlow, NODE_W, NODE_H } from './parseGameFlow';

// ─── Node styles ──────────────────────────────────────────────────────────

const nodeStyle: React.CSSProperties = {
    width: NODE_W,
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 1.45,
    boxSizing: 'border-box',
};

const currentRing: React.CSSProperties = { outline: '3px solid #ff9800', outlineOffset: 2 };

function StartNode({ data }: NodeProps) {
    const isCurrent = !!(data.isCurrent as boolean);
    const style = { ...nodeStyle, background: '#e8f5e9', border: '2px solid #4caf50', fontWeight: 700, color: '#1b5e20', ...(isCurrent ? currentRing : {}) };
    return (
        <div style={style}>
            {data.label as string}
            <Handle type="source" position={Position.Bottom} style={{ background: '#4caf50' }} />
        </div>
    );
}

function PassageNode({ data }: NodeProps) {
    const isCurrent = !!(data.isCurrent as boolean);
    const style = { ...nodeStyle, background: '#fff', border: isCurrent ? '2px solid #ff9800' : '1.5px solid #90caf9', ...(isCurrent ? currentRing : {}) };
    return (
        <div style={style}>
            <Handle type="target" position={Position.Top} style={{ background: '#90caf9' }} />
            {data.label as string}
            <Handle type="source" position={Position.Bottom} style={{ background: '#90caf9' }} />
        </div>
    );
}

function EndingNode({ data }: NodeProps) {
    const isCurrent = !!(data.isCurrent as boolean);
    const style = { ...nodeStyle, background: '#fff8e1', border: isCurrent ? '2px solid #ff9800' : '1.5px solid #ffb74d', color: '#5d3a00', ...(isCurrent ? currentRing : {}) };
    return (
        <div style={style}>
            <Handle type="target" position={Position.Top} style={{ background: '#ffb74d' }} />
            {data.label as string}
        </div>
    );
}

// ─── Edge ─────────────────────────────────────────────────────────────────

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, markerEnd, style }: EdgeProps) {
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const lx = sourceX + (targetX - sourceX) * 0.78;
    const ly = sourceY + (targetY - sourceY) * 0.5;
    if (!label) return <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />;
    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${lx}px,${ly}px)`,
                        fontSize: 11,
                        color: '#444',
                        background: 'rgba(255,255,255,0.92)',
                        padding: '2px 6px',
                        borderRadius: 3,
                        pointerEvents: 'none',
                        maxWidth: 150,
                        textAlign: 'center',
                        lineHeight: 1.3,
                    }}>
                    {label as string}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

const nodeTypes = { start: StartNode, passage: PassageNode, ending: EndingNode };
const edgeTypes = { flow: FlowEdge };
const defaultEdgeOptions = { type: 'flow' };

// ─── View helpers ─────────────────────────────────────────────────────────

function findCurrentNodeId(nodes: Node[], edges: Edge[], choiceHistory: string[]): string | null {
    if (nodes.length === 0) return null;
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) return null;

    const adj = new Map<string, Array<{ label: string; targetId: string }>>();
    for (const edge of edges) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push({ label: (edge.label as string) ?? '', targetId: edge.target });
    }

    let currentId = startNode.id;
    const startEdges = adj.get(currentId) ?? [];
    if (startEdges.length > 0) currentId = startEdges[0].targetId;

    for (const choice of choiceHistory) {
        const outEdges = adj.get(currentId) ?? [];
        const match = outEdges.find(e => e.label === choice);
        if (match) currentId = match.targetId;
        else break;
    }

    return currentId;
}

function FlowViewSyncer({ currentNodeId, nodes }: { currentNodeId: string | null; nodes: Node[] }) {
    const { setCenter } = useReactFlow();
    useEffect(() => {
        if (!currentNodeId) return;
        const node = nodes.find(n => n.id === currentNodeId);
        if (!node) return;
        setCenter(node.position.x + NODE_W / 2, node.position.y + NODE_H / 2, { duration: 400, zoom: 1 });
    }, [currentNodeId, nodes, setCenter]);
    return null;
}

// ─── Main component ───────────────────────────────────────────────────────

interface FlowPanelProps {
    game: Game;
    choiceHistory: string[];
}

export function FlowPanel({ game, choiceHistory }: FlowPanelProps) {
    const { nodes: parsedNodes, edges: parsedEdges } = useMemo(
        () => parseGameFlow(game.scenes),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [game.id],
    );

    const currentNodeId = useMemo(
        () => findCurrentNodeId(parsedNodes, parsedEdges, choiceHistory),
        [parsedNodes, parsedEdges, choiceHistory],
    );

    const viewNodes = useMemo(
        () => parsedNodes.map(n => ({ ...n, data: { ...n.data, isCurrent: n.id === currentNodeId } })),
        [parsedNodes, currentNodeId],
    );

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Box sx={{ flex: 1, minHeight: 0 }}>
                <ReactFlow
                    nodes={viewNodes}
                    edges={parsedEdges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnScroll>
                    <Background />
                    <Controls showInteractive={false} />
                    <FlowViewSyncer currentNodeId={currentNodeId} nodes={parsedNodes} />
                </ReactFlow>
            </Box>
        </Box>
    );
}
