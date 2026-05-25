import { useMemo, useState } from 'react';
import {
    Box, Button, IconButton, InputAdornment, List, ListItem, ListItemButton,
    ListItemText, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { MyStory } from './myStoryStore';
import type { NodeData } from './parseGameFlow';
import type { Node } from '@xyflow/react';

interface Result {
    sceneId: string;
    sceneName: string;
    nodeId: string;
    nodeLabel: string;
    snippet: string;
}

export interface FindReplacePanelProps {
    story: MyStory;
    onSelectNode?: (sceneId: string, nodeId: string) => void;
    onReplaceAll?: (updated: MyStory) => void;
    onClose?: () => void;
}

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function FindReplacePanel({ story, onSelectNode, onReplaceAll, onClose }: FindReplacePanelProps) {
    const [search, setSearch] = useState('');
    const [replace, setReplace] = useState('');

    const results = useMemo<Result[]>(() => {
        const term = search.trim();
        if (!term) return [];
        const lc = term.toLowerCase();
        const found: Result[] = [];
        for (const scene of story.scenes) {
            for (const node of scene.nodes) {
                const content = ((node as Node<NodeData>).data.content as string) ?? '';
                const label = ((node as Node<NodeData>).data.label as string) ?? '';
                const haystack = (content + ' ' + label).toLowerCase();
                if (haystack.includes(lc)) {
                    const src = content || label;
                    const idx = src.toLowerCase().indexOf(lc);
                    const start = Math.max(0, idx - 25);
                    const snippet = src.slice(start, start + 100);
                    found.push({ sceneId: scene.id, sceneName: scene.name, nodeId: node.id, nodeLabel: label, snippet });
                }
            }
            for (const edge of scene.edges) {
                const label = typeof edge.label === 'string' ? edge.label : '';
                if (label.toLowerCase().includes(lc)) {
                    found.push({ sceneId: scene.id, sceneName: scene.name, nodeId: edge.source, nodeLabel: `Edge: ${label}`, snippet: label });
                }
            }
        }
        return found;
    }, [search, story]);

    const handleReplaceAll = () => {
        const term = search.trim();
        if (!term || !onReplaceAll) return;
        const re = new RegExp(escapeRegex(term), 'gi');
        const updated: MyStory = {
            ...story,
            scenes: story.scenes.map(scene => ({
                ...scene,
                nodes: scene.nodes.map(node => {
                    const n = node as Node<NodeData>;
                    const content = (n.data.content as string) ?? '';
                    if (!content.toLowerCase().includes(term.toLowerCase())) return node;
                    return { ...node, data: { ...node.data, content: content.replace(re, replace) } };
                }),
            })),
        };
        onReplaceAll(updated);
    };

    return (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', p: 1, flexShrink: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <TextField
                    label="Search"
                    inputProps={{ 'aria-label': 'Search' }}
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                    sx={{ flex: 1 }}
                    InputProps={{
                        endAdornment: search && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearch('')}>
                                    <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />
                <TextField
                    label="Replace"
                    inputProps={{ 'aria-label': 'Replace' }}
                    size="small"
                    value={replace}
                    onChange={e => setReplace(e.target.value)}
                    sx={{ flex: 1 }}
                />
                <Tooltip title="Replace all occurrences in node content">
                    <span>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={handleReplaceAll}
                            disabled={!search.trim() || !onReplaceAll}>
                            Replace All
                        </Button>
                    </span>
                </Tooltip>
                {onClose && (
                    <IconButton size="small" onClick={onClose} aria-label="Close search">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Stack>

            {search.trim() && (
                <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                    {results.length === 0 ? 'No results' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
                </Typography>
            )}

            {results.length > 0 && (
                <List dense disablePadding sx={{ maxHeight: 200, overflowY: 'auto', mt: 0.5 }}>
                    {results.map((r, i) => (
                        <ListItem key={i} disablePadding>
                            <ListItemButton onClick={() => onSelectNode?.(r.sceneId, r.nodeId)} sx={{ py: 0.25, px: 1 }}>
                                <ListItemText
                                    primary={`${r.nodeLabel}${story.scenes.length > 1 ? ` — ${r.sceneName}` : ''}`}
                                    secondary={r.snippet}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
                                    secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    );
}
