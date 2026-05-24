import { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    Stack, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Edge } from '@xyflow/react';

interface Props {
    edge: Edge | null;
    onClose: () => void;
    onSave: (edgeId: string, label: string) => void;
    onDelete: (edgeId: string) => void;
}

export function EdgeEditDialog({ edge, onClose, onSave, onDelete }: Props) {
    const [label, setLabel] = useState((edge?.label as string) ?? '');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSave = () => {
        if (!edge) return;
        onSave(edge.id, label);
        onClose();
    };

    const handleDelete = () => {
        if (!edge) return;
        onDelete(edge.id);
        setConfirmDelete(false);
        onClose();
    };

    if (!edge) return null;

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Choice</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Choice text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        fullWidth
                        autoFocus
                        sx={{ mt: 1 }}
                        helperText='Leave blank to default to "Continue"'
                    />
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setConfirmDelete(true)}>
                        Delete Choice
                    </Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete choice?</DialogTitle>
                <DialogContent>
                    <Typography>Remove this choice?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
