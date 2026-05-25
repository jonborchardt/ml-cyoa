import { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import type { SceneDef } from './myStoryStore';

interface Props {
    node: Node<NodeData>;
    scenes: SceneDef[];
    onSave: (nodeId: string, sceneIds: string[]) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

export function GotoRandomSceneEditDialog({ node, scenes, onSave, onDelete, onClose }: Props) {
    const [sceneIds, setSceneIds] = useState<string[]>((node.data.scenes as string[] | undefined) ?? []);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const add = () => setSceneIds(prev => [...prev, '']);
    const remove = (i: number) => setSceneIds(prev => prev.filter((_, idx) => idx !== i));
    const update = (i: number, v: string) => setSceneIds(prev => prev.map((x, idx) => idx === i ? v : x));

    const handleSave = () => {
        onSave(node.id, sceneIds.filter(Boolean));
        onClose();
    };

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Random Scene Jump</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            ChoiceScript picks one scene at random, using each at most once per playthrough.
                        </Typography>
                        {sceneIds.map((id, i) => (
                            <Stack key={i} direction="row" spacing={1} alignItems="center">
                                {scenes.length > 0 ? (
                                    <FormControl size="small" sx={{ flex: 1 }}>
                                        <InputLabel>Scene</InputLabel>
                                        <Select value={id} label="Scene" onChange={e => update(i, e.target.value)}>
                                            {scenes.map(s => <MenuItem key={s.id} value={s.id}>{s.name} ({s.id})</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                ) : (
                                    <TextField
                                        label="Scene ID"
                                        value={id}
                                        onChange={e => update(i, e.target.value)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                )}
                                <IconButton size="small" color="error" onClick={() => remove(i)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        ))}
                        {sceneIds.length < 10 && (
                            <Button size="small" startIcon={<AddIcon />} onClick={add} sx={{ alignSelf: 'flex-start' }}>
                                Add Scene
                            </Button>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>Delete Node</Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave} disabled={sceneIds.length === 0}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Random Scene Node?</DialogTitle>
                <DialogContent><Typography>This removes the node and its connections.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { onDelete(node.id); onClose(); }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
