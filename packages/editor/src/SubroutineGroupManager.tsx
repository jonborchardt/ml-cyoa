import { useState } from 'react';
import {
    Box, Button, Chip, Divider, Drawer, IconButton,
    Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import type { SubroutineDef } from './myStoryStore';
import type { VariableDef, ActionItem, Achievement } from './types';
import { ActionEditDialog } from './ActionEditDialog';
import type { Node } from '@xyflow/react';
import type { NodeData } from './layout';

function toId(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'sub';
}

interface SubroutineRowProps {
    sub: SubroutineDef;
    variables: VariableDef[];
    achievements: Achievement[];
    onChange: (updated: SubroutineDef) => void;
    onDelete: () => void;
}

function SubroutineRow({ sub, variables, achievements, onChange, onDelete }: SubroutineRowProps) {
    const [expanded, setExpanded] = useState(false);
    const [editingActions, setEditingActions] = useState(false);
    const [paramInput, setParamInput] = useState((sub.params ?? []).join(', '));

    const actionNode = sub.nodes.find(n => n.type === 'action') as Node<NodeData> | undefined;
    const actions = (actionNode?.data.actions as ActionItem[] | undefined) ?? [];

    const handleNameChange = (name: string) => {
        onChange({ ...sub, name, id: toId(name) });
    };

    const handleParamsChange = (value: string) => {
        setParamInput(value);
        const params = value.split(',').map(p => p.trim()).filter(Boolean);
        onChange({ ...sub, params: params.length > 0 ? params : undefined });
    };

    const handleActionsSave = (_nodeId: string, newActions: ActionItem[]) => {
        const existingNode = actionNode;
        let newNodes: Node<NodeData>[];
        if (newActions.length === 0) {
            newNodes = sub.nodes.filter(n => n.type !== 'action');
        } else if (existingNode) {
            newNodes = sub.nodes.map(n =>
                n.type === 'action' ? { ...n, data: { ...n.data, actions: newActions } } : n
            );
        } else {
            const newActionNode: Node<NodeData> = {
                id: `${sub.id}_actions`,
                type: 'action',
                position: { x: 0, y: 100 },
                data: { label: `${sub.name} actions`, content: '', actions: newActions },
            };
            newNodes = [...sub.nodes, newActionNode];
        }
        onChange({ ...sub, nodes: newNodes });
    };

    const fakeNode: Node<NodeData> = actionNode ?? {
        id: `${sub.id}_actions`,
        type: 'action',
        position: { x: 0, y: 0 },
        data: { label: '', content: '', actions: [] },
    };

    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Stack
                direction="row" alignItems="center" spacing={1}
                sx={{ px: 1.5, py: 1, bgcolor: 'grey.50', cursor: 'pointer' }}
                onClick={() => setExpanded(o => !o)}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#7c3aed', flexShrink: 0 }} />
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                    {sub.name || <em style={{ opacity: 0.5 }}>unnamed</em>}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    *gosub {sub.id}
                </Typography>
                {(sub.params ?? []).length > 0 && (
                    <Chip label={`${sub.params!.length} param${sub.params!.length !== 1 ? 's' : ''}`} size="small" />
                )}
                <Tooltip title="Delete subroutine">
                    <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); onDelete(); }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <IconButton size="small">{expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}</IconButton>
            </Stack>

            {expanded && (
                <Box sx={{ px: 1.5, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Stack spacing={1.5}>
                        <TextField
                            label="Name"
                            value={sub.name}
                            onChange={e => handleNameChange(e.target.value)}
                            size="small"
                            fullWidth
                            helperText={`ChoiceScript label: *gosub ${sub.id}`}
                        />
                        <TextField
                            label="Parameters (comma-separated)"
                            value={paramInput}
                            onChange={e => handleParamsChange(e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="e.g. stat_var, amount"
                            helperText="Leave blank for no parameters. Caller must pass values in order."
                        />
                        <Divider />
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">
                                Body: {actions.length} action{actions.length !== 1 ? 's' : ''}
                            </Typography>
                            <Button size="small" onClick={() => setEditingActions(true)}>
                                Edit Actions
                            </Button>
                        </Stack>
                        {actions.length > 0 && (
                            <Box sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', lineHeight: 1.6 }}>
                                {actions.slice(0, 4).map((a, i) => (
                                    <div key={i}>
                                        {a.kind === 'set' ? `*set ${a.variable} ${a.op} ${a.value}` :
                                         a.kind === 'rand' ? `*rand ${a.variable} ${a.min} ${a.max}` :
                                         `*${a.kind}`}
                                    </div>
                                ))}
                                {actions.length > 4 && <div>…+{actions.length - 4} more</div>}
                            </Box>
                        )}
                    </Stack>
                </Box>
            )}

            {editingActions && (
                <ActionEditDialog
                    node={fakeNode}
                    variables={variables}
                    achievements={achievements}
                    onSave={handleActionsSave}
                    onDelete={() => {}}
                    onClose={() => setEditingActions(false)}
                />
            )}
        </Box>
    );
}

interface Props {
    open: boolean;
    subroutines: SubroutineDef[];
    variables: VariableDef[];
    achievements: Achievement[];
    onClose: () => void;
    onChange: (subroutines: SubroutineDef[]) => void;
}

export function SubroutineGroupManager({ open, subroutines, variables, achievements, onClose, onChange }: Props) {
    const [counter, setCounter] = useState(1);

    const handleAdd = () => {
        const id = `sub_${counter}`;
        setCounter(c => c + 1);
        const newSub: SubroutineDef = {
            id,
            name: `Subroutine ${counter}`,
            nodes: [],
            edges: [],
        };
        onChange([...subroutines, newSub]);
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ flex: 1 }}>Subroutines</Typography>
                    <IconButton onClick={onClose}><CloseIcon /></IconButton>
                </Stack>

                <Box sx={{ px: 2, py: 1.5, flex: 1, overflowY: 'auto' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Subroutines are reusable action sequences called via{' '}
                        <code>*gosub</code>. Add a <strong>Call Subroutine</strong> node to the
                        flow to invoke one.
                    </Typography>

                    <Stack spacing={1.5}>
                        {subroutines.length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No subroutines yet. Click &quot;Add Subroutine&quot; to create one.
                            </Typography>
                        )}
                        {subroutines.map((sub, i) => (
                            <SubroutineRow
                                key={sub.id}
                                sub={sub}
                                variables={variables}
                                achievements={achievements}
                                onChange={updated => {
                                    const next = subroutines.map((s, idx) => idx === i ? updated : s);
                                    onChange(next);
                                }}
                                onDelete={() => onChange(subroutines.filter((_, idx) => idx !== i))}
                            />
                        ))}
                    </Stack>
                </Box>

                <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Button fullWidth startIcon={<AddIcon />} variant="outlined" onClick={handleAdd}>
                        Add Subroutine
                    </Button>
                </Box>
            </Box>
        </Drawer>
    );
}
