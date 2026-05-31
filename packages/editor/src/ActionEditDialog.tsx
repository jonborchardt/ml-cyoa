import { useState } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, FormControl, IconButton, InputLabel, MenuItem,
    Select, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { Node } from '@xyflow/react';
import type { NodeData } from './layout';
import type { ActionItem, VariableDef, Achievement } from './types';

const SET_OPS = ['=', '+', '-', '*', '/', '^', '%+', '%-', 'modulo', '&'];

type ActionKind = 'set' | 'rand' | 'input_text' | 'input_number' | 'page_break' | 'award_achievement' | 'delete';

function defaultAction(kind: ActionKind, varName: string): ActionItem {
    switch (kind) {
        case 'set': return { kind: 'set', variable: varName, op: '=', value: '0' };
        case 'rand': return { kind: 'rand', variable: varName, min: 1, max: 6 };
        case 'input_text': return { kind: 'input_text', variable: varName };
        case 'input_number': return { kind: 'input_number', variable: varName, min: 0, max: 100 };
        case 'page_break': return { kind: 'page_break' };
        case 'award_achievement': return { kind: 'award_achievement', achievementId: '' };
        case 'delete': return { kind: 'delete', variable: varName };
    }
}

interface ActionRowProps {
    action: ActionItem;
    variables: VariableDef[];
    achievements: Achievement[];
    onChange: (a: ActionItem) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
}

function ActionRow({ action, variables, achievements, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: ActionRowProps) {
    const varNames = variables.map(v => v.name);
    const achIds = achievements.map(a => a.id);

    return (
        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, position: 'relative' }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={action.kind}
                        label="Type"
                        onChange={e => onChange(defaultAction(e.target.value as ActionKind, varNames[0] ?? 'variable'))}>
                        <MenuItem value="set">Set variable</MenuItem>
                        <MenuItem value="rand">Random</MenuItem>
                        <MenuItem value="input_text">Player text input</MenuItem>
                        <MenuItem value="input_number">Player number input</MenuItem>
                        <MenuItem value="page_break">Page break</MenuItem>
                        <MenuItem value="award_achievement">Award achievement</MenuItem>
                        <MenuItem value="delete">Delete variable</MenuItem>
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <IconButton size="small" onClick={onMoveUp} disabled={isFirst}><ArrowUpwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={onMoveDown} disabled={isLast}><ArrowDownwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton>
            </Stack>

            {action.kind === 'set' && (
                <Stack direction="row" spacing={1}>
                    <TextField
                        label="Variable"
                        value={action.variable}
                        onChange={e => onChange({ ...action, variable: e.target.value })}
                        size="small"
                        select={varNames.length > 0}
                        sx={{ flex: 2 }}>
                        {varNames.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </TextField>
                    <FormControl size="small" sx={{ minWidth: 60 }}>
                        <InputLabel>Op</InputLabel>
                        <Select value={action.op} label="Op" onChange={e => onChange({ ...action, op: e.target.value })}>
                            {SET_OPS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Value"
                        value={action.value}
                        onChange={e => onChange({ ...action, value: e.target.value })}
                        size="small"
                        sx={{ flex: 2 }}
                    />
                </Stack>
            )}

            {action.kind === 'rand' && (
                <Stack direction="row" spacing={1}>
                    <TextField
                        label="Variable"
                        value={action.variable}
                        onChange={e => onChange({ ...action, variable: e.target.value })}
                        size="small"
                        select={varNames.length > 0}
                        sx={{ flex: 2 }}>
                        {varNames.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </TextField>
                    <TextField label="Min" type="number" value={action.min} onChange={e => onChange({ ...action, min: Number(e.target.value) })} size="small" sx={{ flex: 1 }} />
                    <TextField label="Max" type="number" value={action.max} onChange={e => onChange({ ...action, max: Number(e.target.value) })} size="small" sx={{ flex: 1 }} />
                </Stack>
            )}

            {(action.kind === 'input_text' || action.kind === 'input_number') && (
                <Stack direction="row" spacing={1}>
                    <TextField
                        label="Store in variable"
                        value={action.variable}
                        onChange={e => onChange({ ...action, variable: e.target.value })}
                        size="small"
                        select={varNames.length > 0}
                        sx={{ flex: 2 }}>
                        {varNames.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </TextField>
                    {action.kind === 'input_number' && (
                        <>
                            <TextField label="Min" type="number" value={action.min} onChange={e => onChange({ ...action, min: Number(e.target.value) })} size="small" sx={{ flex: 1 }} />
                            <TextField label="Max" type="number" value={action.max} onChange={e => onChange({ ...action, max: Number(e.target.value) })} size="small" sx={{ flex: 1 }} />
                        </>
                    )}
                </Stack>
            )}

            {action.kind === 'page_break' && (
                <Typography variant="caption" color="text.secondary">Inserts a &quot;Next&quot; button — player must click to continue.</Typography>
            )}

            {action.kind === 'award_achievement' && (
                <TextField
                    label="Achievement ID"
                    value={action.achievementId}
                    onChange={e => onChange({ ...action, achievementId: e.target.value })}
                    size="small"
                    select={achIds.length > 0}
                    fullWidth
                    helperText={achIds.length === 0 ? 'Add achievements in the Stats & Achievements panel first.' : undefined}>
                    {achIds.map(id => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                </TextField>
            )}

            {action.kind === 'delete' && (
                <TextField
                    label="Variable to delete"
                    value={action.variable}
                    onChange={e => onChange({ ...action, variable: e.target.value })}
                    size="small"
                    select={varNames.length > 0}
                    fullWidth
                    helperText="*delete removes the variable — referencing it afterward causes an error">
                    {varNames.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </TextField>
            )}
        </Box>
    );
}

interface Props {
    node: Node<NodeData>;
    variables: VariableDef[];
    achievements?: Achievement[];
    onSave: (nodeId: string, actions: ActionItem[]) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

export function ActionEditDialog({ node, variables, achievements = [], onSave, onDelete, onClose }: Props) {
    const [actions, setActions] = useState<ActionItem[]>((node.data.actions as ActionItem[] | undefined) ?? []);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const addAction = () => {
        if (actions.length >= 20) return;
        const varName = variables[0]?.name ?? 'variable';
        setActions(prev => [...prev, { kind: 'set', variable: varName, op: '=', value: '0' }]);
    };

    const move = (i: number, dir: -1 | 1) => {
        setActions(prev => {
            const next = [...prev];
            const j = i + dir;
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });
    };

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Actions</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        {actions.length === 0 && (
                            <Typography variant="body2" color="text.secondary">No actions yet. Add one below.</Typography>
                        )}
                        {actions.map((a, i) => (
                            <ActionRow
                                key={i}
                                action={a}
                                variables={variables}
                                achievements={achievements}
                                onChange={v => setActions(prev => prev.map((x, idx) => idx === i ? v : x))}
                                onDelete={() => setActions(prev => prev.filter((_, idx) => idx !== i))}
                                onMoveUp={() => move(i, -1)}
                                onMoveDown={() => move(i, 1)}
                                isFirst={i === 0}
                                isLast={i === actions.length - 1}
                            />
                        ))}
                        {actions.length < 20 && (
                            <Button size="small" startIcon={<AddIcon />} onClick={addAction} sx={{ alignSelf: 'flex-start' }}>
                                Add Action
                            </Button>
                        )}
                        <Divider />
                        <Typography variant="caption" color="text.secondary">
                            Actions execute in order. The node has one outbound connection (no branching).
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>Delete Node</Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={() => { onSave(node.id, actions); onClose(); }}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Action Node?</DialogTitle>
                <DialogContent><Typography>This removes all edges connected to this node.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { onDelete(node.id); onClose(); }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
