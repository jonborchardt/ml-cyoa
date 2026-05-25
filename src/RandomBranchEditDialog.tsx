import { useState } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import type { RandomBranchEntry } from './types';

interface Props {
    node: Node<NodeData>;
    onSave: (nodeId: string, branches: RandomBranchEntry[]) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

export function RandomBranchEditDialog({ node, onSave, onDelete, onClose }: Props) {
    const existing = (node.data.randomBranches as RandomBranchEntry[] | undefined) ?? [{ label: '' }, { label: '' }];
    const [branches, setBranches] = useState<RandomBranchEntry[]>(existing.length >= 2 ? existing : [{ label: '' }, { label: '' }]);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const update = (i: number, patch: Partial<RandomBranchEntry>) =>
        setBranches(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b));

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Random Branch</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            The engine picks one branch at random. Weights are equal by default.
                            Connect each branch handle to a Story Part on the canvas.
                        </Typography>
                        {branches.map((b, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <TextField
                                    label={`Branch ${i + 1} label`}
                                    value={b.label ?? ''}
                                    onChange={e => update(i, { label: e.target.value })}
                                    size="small" sx={{ flex: 2 }}
                                />
                                <TextField
                                    label="Weight"
                                    type="number"
                                    value={b.weight ?? ''}
                                    onChange={e => update(i, { weight: e.target.value ? Number(e.target.value) : undefined })}
                                    size="small" sx={{ flex: 1 }}
                                    placeholder="equal"
                                />
                                <IconButton
                                    size="small"
                                    color="error"
                                    disabled={branches.length <= 2}
                                    onClick={() => setBranches(prev => prev.filter((_, idx) => idx !== i))}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                        {branches.length < 6 && (
                            <Button size="small" startIcon={<AddIcon />} onClick={() => setBranches(prev => [...prev, { label: '' }])} sx={{ alignSelf: 'flex-start' }}>
                                Add Branch
                            </Button>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>Delete Node</Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={() => { onSave(node.id, branches); onClose(); }}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Random Branch Node?</DialogTitle>
                <DialogContent><Typography>This removes all edges connected to this node.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { onDelete(node.id); onClose(); }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
