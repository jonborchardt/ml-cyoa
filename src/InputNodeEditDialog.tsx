import { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, InputLabel, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import type { InputConfig, VariableDef } from './types';

interface Props {
    node: Node<NodeData>;
    variables: VariableDef[];
    onSave: (nodeId: string, config: InputConfig) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

export function InputNodeEditDialog({ node, variables, onSave, onDelete, onClose }: Props) {
    const existing = node.data.inputConfig as InputConfig | undefined;
    const varNames = variables.map(v => v.name);

    const [prompt, setPrompt] = useState(existing?.prompt ?? '');
    const [variable, setVariable] = useState(existing?.variable ?? varNames[0] ?? '');
    const [inputType, setInputType] = useState<'text' | 'number'>(existing?.inputType ?? 'text');
    const [min, setMin] = useState(existing?.min ?? 0);
    const [max, setMax] = useState(existing?.max ?? 100);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSave = () => {
        onSave(node.id, { prompt, variable, inputType, ...(inputType === 'number' ? { min, max } : {}) });
        onClose();
    };

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Input Node</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Prompt (question shown to player)"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            fullWidth multiline rows={2} size="small"
                        />
                        <FormControl size="small" fullWidth>
                            <InputLabel>Store result in</InputLabel>
                            <Select
                                value={variable}
                                label="Store result in"
                                onChange={e => setVariable(e.target.value)}>
                                {varNames.length === 0 && <MenuItem value="">No variables declared</MenuItem>}
                                {varNames.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <ToggleButtonGroup
                            exclusive
                            value={inputType}
                            onChange={(_, v) => { if (v) setInputType(v); }}
                            size="small">
                            <ToggleButton value="text">Text</ToggleButton>
                            <ToggleButton value="number">Number</ToggleButton>
                        </ToggleButtonGroup>
                        {inputType === 'number' && (
                            <Stack direction="row" spacing={1}>
                                <TextField label="Min" type="number" value={min} onChange={e => setMin(Number(e.target.value))} size="small" fullWidth />
                                <TextField label="Max" type="number" value={max} onChange={e => setMax(Number(e.target.value))} size="small" fullWidth />
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>Delete Node</Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave} disabled={!variable}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Input Node?</DialogTitle>
                <DialogContent><Typography>This removes all edges connected to this node.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { onDelete(node.id); onClose(); }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
