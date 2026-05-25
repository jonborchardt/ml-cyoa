import { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import type { SubroutineDef } from './myStoryStore';

interface Props {
    node: Node<NodeData>;
    subroutines: SubroutineDef[];
    onClose: () => void;
    onSave: (nodeId: string, updates: Partial<NodeData>) => void;
    onDelete: (nodeId: string) => void;
}

export function GosubCallEditDialog({ node, subroutines, onClose, onSave, onDelete }: Props) {
    const [subroutineId, setSubroutineId] = useState((node.data.subroutineId as string) ?? '');
    const [params, setParams] = useState<string[]>((node.data.params as string[] | undefined) ?? []);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const selectedSub = subroutines.find(s => s.id === subroutineId);
    const expectedParams = selectedSub?.params ?? [];

    // Keep params array in sync with expected length
    const effectiveParams = expectedParams.map((_, i) => params[i] ?? '');

    const handleSave = () => {
        const labelName = selectedSub ? selectedSub.name : (subroutineId || 'gosub');
        onSave(node.id, {
            subroutineId,
            params: effectiveParams.filter(Boolean),
            label: `Call: ${labelName}`,
            content: '',
        } as Partial<NodeData>);
        onClose();
    };

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Subroutine Call</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Subroutine to call</InputLabel>
                            <Select
                                value={subroutineId}
                                label="Subroutine to call"
                                onChange={e => { setSubroutineId(e.target.value); setParams([]); }}>
                                {subroutines.map(s => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.name}
                                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                            ({s.id})
                                        </Typography>
                                    </MenuItem>
                                ))}
                                {subroutines.length === 0 && (
                                    <MenuItem disabled>
                                        No subroutines defined — use &quot;Subroutines&quot; button
                                    </MenuItem>
                                )}
                            </Select>
                        </FormControl>

                        {expectedParams.length > 0 && (
                            <Stack spacing={1}>
                                <Typography variant="caption" color="text.secondary">
                                    Parameters ({expectedParams.length} expected)
                                </Typography>
                                {expectedParams.map((paramName, i) => (
                                    <TextField
                                        key={i}
                                        size="small"
                                        label={paramName}
                                        value={effectiveParams[i]}
                                        onChange={e => {
                                            const next = [...effectiveParams];
                                            next[i] = e.target.value;
                                            setParams(next);
                                        }}
                                        fullWidth
                                        placeholder={`value for ${paramName}`}
                                    />
                                ))}
                            </Stack>
                        )}

                        {selectedSub && expectedParams.length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                                This subroutine takes no parameters.
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>
                        Delete
                    </Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave} disabled={!subroutineId}>
                            Save
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete node?</DialogTitle>
                <DialogContent>
                    <Typography>Remove this subroutine call node?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { onDelete(node.id); onClose(); }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
