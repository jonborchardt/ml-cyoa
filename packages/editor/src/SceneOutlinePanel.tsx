import { Box, Divider, IconButton, List, ListItem, ListItemButton, ListItemText, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LabelIcon from '@mui/icons-material/Label';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './layout';

interface OutlineItem {
    nodeId: string;
    label: string;
    kind: 'start' | 'passage' | 'ending' | 'label' | 'subroutine' | 'other';
}

function buildOutline(nodes: Node<NodeData>[], edges: Edge[]): OutlineItem[] {
    const items: OutlineItem[] = [];
    const startNode = nodes.find(n => n.type === 'start');
    const visited = new Set<string>();
    const queue: string[] = startNode ? [startNode.id] : [];

    const fwd = new Map<string, string[]>();
    for (const e of edges) {
        if (!fwd.has(e.source)) fwd.set(e.source, []);
        fwd.get(e.source)!.push(e.target);
    }

    while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);

        const node = nodes.find(n => n.id === id);
        if (!node) continue;

        const t = node.type ?? '';
        const label = (node.data.label as string) || id;

        if (t === 'start') {
            items.push({ nodeId: id, label: 'Start', kind: 'start' });
        } else if (t === 'passage' || t === 'fake_choice') {
            items.push({ nodeId: id, label, kind: 'passage' });
        } else if (t === 'ending') {
            items.push({ nodeId: id, label, kind: 'ending' });
        } else if (t === 'scene_label') {
            items.push({ nodeId: id, label: `*label ${label}`, kind: 'label' });
        } else if (t === 'subroutine_entry') {
            items.push({ nodeId: id, label: `sub: ${label}`, kind: 'subroutine' });
        } else if (t === 'condition' || t === 'action' || t === 'input' || t === 'random_branch') {
            items.push({ nodeId: id, label, kind: 'other' });
        }

        for (const child of fwd.get(id) ?? []) {
            if (!visited.has(child)) queue.push(child);
        }
    }

    // Append subroutine/label nodes not reachable from start
    for (const node of nodes) {
        if (visited.has(node.id)) continue;
        const t = node.type ?? '';
        const label = (node.data.label as string) || node.id;
        if (t === 'subroutine_entry') {
            items.push({ nodeId: node.id, label: `sub: ${label}`, kind: 'subroutine' });
        } else if (t === 'scene_label') {
            items.push({ nodeId: node.id, label: `*label ${label}`, kind: 'label' });
        }
    }

    return items;
}

function kindIcon(kind: OutlineItem['kind']) {
    if (kind === 'label') return <LabelIcon sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5 }} />;
    if (kind === 'subroutine') return <CallMergeIcon sx={{ fontSize: 14, color: 'secondary.main', mr: 0.5 }} />;
    if (kind === 'start') return <AccountTreeIcon sx={{ fontSize: 14, color: 'success.main', mr: 0.5 }} />;
    return null;
}

function kindSx(kind: OutlineItem['kind']) {
    if (kind === 'ending') return { color: 'warning.dark', fontStyle: 'italic' };
    if (kind === 'subroutine') return { color: 'secondary.main' };
    if (kind === 'start') return { color: 'success.dark', fontWeight: 700 };
    if (kind === 'label') return { color: 'text.secondary', fontSize: 11 };
    return {};
}

interface Props {
    nodes: Node<NodeData>[];
    edges: Edge[];
    onFocusNode: (nodeId: string) => void;
    onClose: () => void;
}

export function SceneOutlinePanel({ nodes, edges, onFocusNode, onClose }: Props) {
    const items = buildOutline(nodes, edges);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Typography variant="subtitle2" sx={{ flex: 1, fontSize: 12 }}>Scene Outline</Typography>
                <Tooltip title="Close">
                    <IconButton size="small" onClick={onClose}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
                </Tooltip>
            </Box>
            {items.length === 0 ? (
                <Box sx={{ p: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">No nodes.</Typography>
                </Box>
            ) : (
                <List dense disablePadding sx={{ overflowY: 'auto' }}>
                    {items.map((item, i) => (
                        <div key={item.nodeId}>
                            {i > 0 && (item.kind === 'subroutine' || (item.kind === 'label' && items[i - 1]?.kind !== 'label')) && (
                                <Divider />
                            )}
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => onFocusNode(item.nodeId)} sx={{ py: 0.25, px: 1.5 }}>
                                    {kindIcon(item.kind)}
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            variant: 'body2',
                                            noWrap: true,
                                            sx: { fontSize: 12, ...kindSx(item.kind) },
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        </div>
                    ))}
                </List>
            )}
        </Box>
    );
}
