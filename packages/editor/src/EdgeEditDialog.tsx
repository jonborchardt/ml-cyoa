import { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Edge } from '@xyflow/react';
import type { EdgeData } from './types';

interface Props {
    edge: Edge | null;
    isFakeChoice?: boolean;
    onClose: () => void;
    onSave: (edgeId: string, label: string, data: EdgeData) => void;
    onDelete: (edgeId: string) => void;
}

export function EdgeEditDialog({ edge, isFakeChoice = false, onClose, onSave, onDelete }: Props) {
    const existingData = (edge?.data as EdgeData | undefined) ?? {};
    const [label, setLabel] = useState((edge?.label as string) ?? '');
    const [content, setContent] = useState(existingData.content ?? '');
    const [condition, setCondition] = useState(existingData.condition ?? '');
    const [reuseMode, setReuseMode] = useState<'default' | 'hide' | 'disable' | 'allow'>(existingData.reuseMode ?? 'default');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSave = () => {
        if (!edge) return;
        const data: EdgeData = {};
        if (content) data.content = content;
        if (condition) data.condition = condition;
        if (reuseMode !== 'default') data.reuseMode = reuseMode;
        onSave(edge.id, label, data);
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
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Choice text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            fullWidth
                            autoFocus
                            helperText='Leave blank to default to "Continue"'
                        />

                        {isFakeChoice && (
                            <TextField
                                label="Branch prose (optional)"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                                helperText="Shown to the player before rejoining the story."
                            />
                        )}

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary">Advanced</Typography>

                        <TextField
                            label="Show only if… (expression)"
                            value={condition}
                            onChange={e => setCondition(e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="leadership > 50"
                            helperText="Emits *selectable_if (expr) — leave blank for always available"
                        />

                        <FormControl size="small" fullWidth>
                            <InputLabel>After first use</InputLabel>
                            <Select
                                value={reuseMode}
                                label="After first use"
                                onChange={e => setReuseMode(e.target.value as typeof reuseMode)}>
                                <MenuItem value="default">Always available</MenuItem>
                                <MenuItem value="hide">Hide (*hide_reuse)</MenuItem>
                                <MenuItem value="disable">Grey out (*disable_reuse)</MenuItem>
                                <MenuItem value="allow">Allow reuse (*allow_reuse)</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>
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
                <DialogContent><Typography>Remove this choice?</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
