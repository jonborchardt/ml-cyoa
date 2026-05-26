import { useRef, useState } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    IconButton, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import type { SceneDef } from './myStoryStore';

interface Props {
    scenes: SceneDef[];
    sceneOrder: string[];
    activeSceneId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onDelete: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onReorder: (newOrder: string[]) => void;
}

export function SceneTabBar({ scenes, sceneOrder, activeSceneId, onSelect, onAdd, onDelete, onRename, onReorder }: Props) {
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const dragSrcRef = useRef<string | null>(null);

    const orderedScenes = sceneOrder
        .map(id => scenes.find(s => s.id === id))
        .filter((s): s is SceneDef => s !== undefined);

    const openRename = (scene: SceneDef) => {
        setRenameId(scene.id);
        setRenameValue(scene.name);
    };

    const commitRename = () => {
        if (renameId && renameValue.trim()) {
            onRename(renameId, renameValue.trim());
        }
        setRenameId(null);
    };

    const handleDragStart = (id: string) => { dragSrcRef.current = id; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
    const handleDrop = (targetId: string) => {
        const srcId = dragSrcRef.current;
        if (!srcId || srcId === targetId) return;
        const newOrder = [...sceneOrder];
        const srcIdx = newOrder.indexOf(srcId);
        const tgtIdx = newOrder.indexOf(targetId);
        if (srcIdx === -1 || tgtIdx === -1) return;
        newOrder.splice(srcIdx, 1);
        newOrder.splice(tgtIdx, 0, srcId);
        onReorder(newOrder);
        dragSrcRef.current = null;
    };

    const sceneToDelete = deleteId ? scenes.find(s => s.id === deleteId) : null;

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                    overflowX: 'auto',
                    flexShrink: 0,
                }}>
                {orderedScenes.map(scene => {
                    const isActive = scene.id === activeSceneId;
                    const isFirst = sceneOrder[0] === scene.id;
                    return (
                        <Box
                            key={scene.id}
                            draggable
                            onDragStart={() => handleDragStart(scene.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(scene.id)}
                            onClick={() => onSelect(scene.id)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1.5,
                                py: 0.75,
                                cursor: 'pointer',
                                borderBottom: 2,
                                borderColor: isActive ? 'primary.main' : 'transparent',
                                bgcolor: isActive ? 'background.paper' : 'transparent',
                                '&:hover': { bgcolor: isActive ? 'background.paper' : 'action.hover' },
                                userSelect: 'none',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                            }}>
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: isActive ? 700 : 400, color: isActive ? 'primary.main' : 'text.secondary', fontSize: 12 }}>
                                {scene.name}
                            </Typography>
                            <Tooltip title="Rename">
                                <IconButton
                                    size="small"
                                    onClick={e => { e.stopPropagation(); openRename(scene); }}
                                    sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                    <EditIcon sx={{ fontSize: 12 }} />
                                </IconButton>
                            </Tooltip>
                            {!isFirst && (
                                <Tooltip title="Delete scene">
                                    <IconButton
                                        size="small"
                                        onClick={e => { e.stopPropagation(); setDeleteId(scene.id); }}
                                        sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}>
                                        <CloseIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    );
                })}
                <Tooltip title="Add scene">
                    <IconButton size="small" onClick={onAdd} sx={{ mx: 0.5, my: 'auto' }}>
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Rename dialog */}
            <Dialog open={!!renameId} onClose={() => setRenameId(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Rename Scene</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Scene name"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        fullWidth autoFocus sx={{ mt: 1 }}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(); }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameId(null)}>Cancel</Button>
                    <Button variant="contained" onClick={commitRename} disabled={!renameValue.trim()}>Rename</Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Scene</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Delete &quot;{sceneToDelete?.name}&quot;? Any nodes in this scene and scene-jump references to it will be lost.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteId(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={() => { onDelete(deleteId!); setDeleteId(null); }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
