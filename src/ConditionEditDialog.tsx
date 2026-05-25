import { useState } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, IconButton, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import type { ConditionConfig, VariableDef } from './types';

const OPS = ['=', '!=', '>', '<', '>=', '<=', 'and', 'or'];

interface ExprRowProps {
    left: string;
    op: string;
    right: string;
    variables: VariableDef[];
    onLeft: (v: string) => void;
    onOp: (v: string) => void;
    onRight: (v: string) => void;
}

function ExprRow({ left, op, right, variables, onLeft, onOp, onRight }: ExprRowProps) {
    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <TextField
                label="Left"
                value={left}
                onChange={e => onLeft(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                placeholder={variables[0]?.name ?? 'variable'}
            />
            <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select value={op} onChange={e => onOp(e.target.value)}>
                    {OPS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
            </FormControl>
            <TextField
                label="Right"
                value={right}
                onChange={e => onRight(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                placeholder="value"
            />
        </Stack>
    );
}

interface Props {
    node: Node<NodeData>;
    variables: VariableDef[];
    onSave: (nodeId: string, condition: ConditionConfig) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

export function ConditionEditDialog({ node, variables, onSave, onDelete, onClose }: Props) {
    const existing = node.data.condition as ConditionConfig | undefined;

    const [left, setLeft] = useState(existing?.left ?? '');
    const [op, setOp] = useState(existing?.op ?? '=');
    const [right, setRight] = useState(existing?.right ?? '');
    const [trueContent, setTrueContent] = useState(existing?.trueContent ?? '');
    const [falseContent, setFalseContent] = useState(existing?.falseContent ?? '');
    const [elseIfs, setElseIfs] = useState(existing?.elseIfs ?? []);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSave = () => {
        onSave(node.id, { left, op, right, trueContent: trueContent || undefined, falseContent: falseContent || undefined, elseIfs: elseIfs.length ? elseIfs : undefined });
        onClose();
    };

    const addElseIf = () => {
        if (elseIfs.length >= 5) return;
        setElseIfs(prev => [...prev, { left: '', op: '=', right: '', content: '' }]);
    };

    const removeElseIf = (i: number) => setElseIfs(prev => prev.filter((_, idx) => idx !== i));
    const updateElseIf = (i: number, patch: Partial<typeof elseIfs[0]>) =>
        setElseIfs(prev => prev.map((e, idx) => idx === i ? { ...e, ...patch } : e));

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Condition</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Condition</Typography>
                        <ExprRow
                            left={left} op={op} right={right}
                            variables={variables}
                            onLeft={setLeft} onOp={setOp} onRight={setRight}
                        />

                        {elseIfs.map((ei, i) => (
                            <Box key={i}>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">else if</Typography>
                                    <IconButton size="small" color="error" onClick={() => removeElseIf(i)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                                <ExprRow
                                    left={ei.left} op={ei.op} right={ei.right}
                                    variables={variables}
                                    onLeft={v => updateElseIf(i, { left: v })}
                                    onOp={v => updateElseIf(i, { op: v })}
                                    onRight={v => updateElseIf(i, { right: v })}
                                />
                                <TextField
                                    label="Prose for this branch (optional)"
                                    value={ei.content ?? ''}
                                    onChange={e => updateElseIf(i, { content: e.target.value })}
                                    size="small" fullWidth multiline rows={2} sx={{ mt: 1 }}
                                />
                            </Box>
                        ))}

                        {elseIfs.length < 5 && (
                            <Button size="small" startIcon={<AddIcon />} onClick={addElseIf} sx={{ alignSelf: 'flex-start' }}>
                                Add ElseIf
                            </Button>
                        )}

                        <TextField
                            label="Prose if true (optional, shown before *goto)"
                            value={trueContent}
                            onChange={e => setTrueContent(e.target.value)}
                            size="small" fullWidth multiline rows={2}
                        />
                        <TextField
                            label="Prose if false (optional)"
                            value={falseContent}
                            onChange={e => setFalseContent(e.target.value)}
                            size="small" fullWidth multiline rows={2}
                        />

                        <Typography variant="caption" color="text.secondary">
                            Connect the right handle (✓ true) and left handle (✗ false) to the branches on the canvas.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>
                        Delete Node
                    </Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave} disabled={!left}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Condition Node?</DialogTitle>
                <DialogContent>
                    <Typography>This will remove all edges connected to this node.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { onDelete(node.id); onClose(); }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
