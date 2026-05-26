import { useState } from 'react';
import {
    Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
    Drawer, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select,
    Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup,
    Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import EditIcon from '@mui/icons-material/Edit';
import type { MyStory } from './myStoryStore';
import type { VariableDef, ActionItem, ConditionConfig } from './types';

// ─── Variable rename ──────────────────────────────────────────────────────

function renameVarInText(text: string, oldName: string, newName: string): string {
    // Replace ${oldName} → ${newName}, @{oldName → @{newName, *set/*if etc. oldName
    return text
        .replace(new RegExp(`\\$\\{${oldName}\\}`, 'g'), `\${${newName}}`)
        .replace(new RegExp(`@\\{${oldName}\\b`, 'g'), `@{${newName}`)
        .replace(new RegExp(`\\b(\\*(?:set|if|elseif|rand|temp|create|delete|input_text|input_number)\\s+)${oldName}\\b`, 'g'), `$1${newName}`)
        .replace(new RegExp(`(?<=\\s|^)${oldName}(?=\\s|$|[=<>!&|%+*/-])`, 'gm'), newName);
}

function renameVariableInStory(story: MyStory, oldName: string, newName: string): MyStory {
    const updatedVariables = (story.variables ?? []).map(v => v.name === oldName ? { ...v, name: newName } : v);

    const updatedStatChart = (story.statChart ?? []).map(entry => ({
        ...entry,
        variable: entry.variable === oldName ? newName : entry.variable,
        variable2: entry.variable2 === oldName ? newName : entry.variable2,
    }));

    const updatedScenes = story.scenes.map(scene => {
        const updatedNodes = scene.nodes.map(node => {
            const t = node.type ?? '';
            // Action nodes
            if (t === 'action') {
                const actions = ((node.data as { actions?: ActionItem[] }).actions ?? []).map(a => {
                    if ('variable' in a && a.variable === oldName) return { ...a, variable: newName };
                    if (a.kind === 'set' && a.value === oldName) return { ...a, value: newName };
                    return a;
                });
                return { ...node, data: { ...node.data, actions } };
            }
            // Condition nodes
            if (t === 'condition') {
                const cond = (node.data as { condition?: ConditionConfig }).condition;
                if (cond) {
                    const fixCond = (c: ConditionConfig): ConditionConfig => ({
                        ...c,
                        left: c.left === oldName ? newName : c.left,
                        right: c.right === oldName ? newName : c.right,
                        rawExpression: c.rawExpression ? renameVarInText(c.rawExpression, oldName, newName) : undefined,
                        elseIfs: c.elseIfs?.map(ei => ({
                            ...ei,
                            left: ei.left === oldName ? newName : ei.left,
                            right: ei.right === oldName ? newName : ei.right,
                            rawExpression: ei.rawExpression ? renameVarInText(ei.rawExpression, oldName, newName) : undefined,
                        })),
                    });
                    return { ...node, data: { ...node.data, condition: fixCond(cond) } };
                }
            }
            // Input nodes
            if (t === 'input') {
                const ic = (node.data as { inputConfig?: { variable: string } }).inputConfig;
                if (ic?.variable === oldName) {
                    return { ...node, data: { ...node.data, inputConfig: { ...ic, variable: newName } } };
                }
            }
            // Prose content (passage, start, ending, fake_choice)
            if (t === 'passage' || t === 'start' || t === 'ending' || t === 'fake_choice') {
                const content = (node.data as { content?: string }).content ?? '';
                const updated = renameVarInText(content, oldName, newName);
                if (updated !== content) return { ...node, data: { ...node.data, content: updated } };
            }
            // Raw code
            if (t === 'raw_code') {
                const rc = (node.data as { rawContent?: string }).rawContent ?? '';
                const updated = renameVarInText(rc, oldName, newName);
                if (updated !== rc) return { ...node, data: { ...node.data, rawContent: updated } };
            }
            return node;
        });

        const updatedEdges = scene.edges.map(edge => {
            const cond = (edge.data as { condition?: string } | undefined)?.condition;
            if (cond) {
                const updated = renameVarInText(cond, oldName, newName);
                if (updated !== cond) return { ...edge, data: { ...edge.data, condition: updated } };
            }
            return edge;
        });

        return { ...scene, nodes: updatedNodes, edges: updatedEdges };
    });

    return { ...story, variables: updatedVariables, statChart: updatedStatChart, scenes: updatedScenes };
}

const RESERVED_NAMES = new Set([
    'choice_subscribe_allowed', 'choice_is_web', 'choice_is_trial',
    'choice_purchaseable_version', 'choice_current_chapter', 'choice_save_allowed',
    'choice_user_restored_save', 'choice_restored_game', 'choice_restored_game_modern',
]);

function isValidName(name: string): boolean {
    return /^[a-z_][a-z0-9_]*$/.test(name);
}

function defaultInitialValue(type: VariableDef['type']): string | number | boolean {
    if (type === 'number') return 0;
    if (type === 'boolean') return false;
    return '';
}

interface VariableFormProps {
    initial?: VariableDef;
    existingNames: string[];
    onSave: (v: VariableDef) => void;
    onCancel: () => void;
}

function VariableForm({ initial, existingNames, onSave, onCancel }: VariableFormProps) {
    const [name, setName] = useState(initial?.name ?? '');
    const [type, setType] = useState<VariableDef['type']>(initial?.type ?? 'number');
    const [scope, setScope] = useState<VariableDef['scope']>(initial?.scope ?? 'global');
    const [rawValue, setRawValue] = useState(String(initial?.initialValue ?? '0'));
    const [description, setDescription] = useState(initial?.description ?? '');
    const [isArray, setIsArray] = useState(initial?.isArray ?? false);
    const [arrayLength, setArrayLength] = useState(initial?.arrayLength ?? 3);

    const nameError = (() => {
        if (!name) return '';
        if (!isValidName(name)) return 'Name must be lowercase letters, numbers, or underscores, starting with a letter or underscore';
        if (RESERVED_NAMES.has(name)) return 'This is a reserved ChoiceScript variable name';
        if (existingNames.includes(name) && name !== initial?.name) return 'A variable with this name already exists';
        return '';
    })();

    const valueError = (() => {
        if (type === 'boolean' && rawValue !== 'true' && rawValue !== 'false') return 'Must be true or false';
        if (type === 'number' && isNaN(Number(rawValue))) return 'Must be a number';
        return '';
    })();

    const arrayLengthError = isArray && (arrayLength < 1 || arrayLength > 999 || !Number.isInteger(arrayLength)) ? 'Must be 1–999' : '';
    const canSave = name && !nameError && !valueError && !arrayLengthError;

    const handleSave = () => {
        let initialValue: string | number | boolean = rawValue;
        if (type === 'boolean') initialValue = rawValue === 'true';
        if (type === 'number') initialValue = Number(rawValue);
        const extra = isArray ? { isArray: true as const, arrayLength } : {};
        onSave({ name, type, scope, initialValue, description: description || undefined, ...extra });
    };

    const handleTypeChange = (newType: VariableDef['type']) => {
        setType(newType);
        setRawValue(String(defaultInitialValue(newType)));
    };

    return (
        <Stack spacing={2}>
            <TextField
                label="Name"
                value={name}
                onChange={e => setName(e.target.value.toLowerCase())}
                error={!!nameError}
                helperText={nameError || 'Lowercase letters, numbers, underscores'}
                size="small"
                autoFocus
                fullWidth
            />
            <FormControl size="small" fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={type} label="Type" onChange={e => handleTypeChange(e.target.value as VariableDef['type'])}>
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="text">Text</MenuItem>
                    <MenuItem value="boolean">Boolean (true/false)</MenuItem>
                </Select>
            </FormControl>
            {type === 'boolean' ? (
                <ToggleButtonGroup
                    exclusive
                    value={rawValue}
                    onChange={(_, v) => { if (v !== null) setRawValue(v); }}
                    size="small">
                    <ToggleButton value="true">true</ToggleButton>
                    <ToggleButton value="false">false</ToggleButton>
                </ToggleButtonGroup>
            ) : (
                <TextField
                    label="Initial Value"
                    value={rawValue}
                    onChange={e => setRawValue(e.target.value)}
                    error={!!valueError}
                    helperText={valueError}
                    size="small"
                    type={type === 'number' ? 'number' : 'text'}
                    fullWidth
                />
            )}
            <FormControlLabel
                control={<Checkbox size="small" checked={isArray} onChange={e => setIsArray(e.target.checked)} />}
                label={<Typography variant="body2">Array variable (<code>*create_array</code>)</Typography>}
            />
            {isArray && (
                <TextField
                    label="Array Length"
                    type="number"
                    value={arrayLength}
                    onChange={e => setArrayLength(Number(e.target.value))}
                    inputProps={{ min: 1, max: 999, step: 1 }}
                    error={!!arrayLengthError}
                    helperText={arrayLengthError || `Creates ${name || 'var'}_1 … ${name || 'var'}_${arrayLength}`}
                    size="small"
                    fullWidth
                />
            )}
            <FormControl size="small" fullWidth>
                <InputLabel>Scope</InputLabel>
                <Select value={scope} label="Scope" onChange={e => setScope(e.target.value as VariableDef['scope'])}>
                    <MenuItem value="global">Global (persists everywhere)</MenuItem>
                    <MenuItem value="temp">Temp (scene-local)</MenuItem>
                </Select>
            </FormControl>
            <TextField
                label="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                size="small"
                fullWidth
                helperText="Shown in autocomplete tooltips"
            />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button onClick={onCancel}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={!canSave}>Save</Button>
            </Stack>
        </Stack>
    );
}

interface Props {
    open?: boolean;
    story: MyStory;
    onChange: (updated: MyStory) => void;
    onClose?: () => void;
    inline?: boolean;
}

export function VariableManagerPanel({ open, story, onChange, onClose, inline }: Props) {
    const [tab, setTab] = useState(0);
    const [addOpen, setAddOpen] = useState(false);
    const [editingVar, setEditingVar] = useState<VariableDef | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [renameTarget, setRenameTarget] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const scopeFilter = tab === 0 ? 'global' : 'temp';
    const vars = (story.variables ?? []).filter(v => v.scope === scopeFilter);
    const existingNames = (story.variables ?? []).map(v => v.name);

    const handleAdd = (v: VariableDef) => {
        onChange({ ...story, variables: [...(story.variables ?? []), v] });
        setAddOpen(false);
    };

    const handleEdit = (updated: VariableDef) => {
        onChange({
            ...story,
            variables: (story.variables ?? []).map(v => v.name === editingVar?.name ? updated : v),
        });
        setEditingVar(null);
    };

    const handleDelete = (name: string) => {
        onChange({ ...story, variables: (story.variables ?? []).filter(v => v.name !== name) });
        setDeleteTarget(null);
    };

    const renameError = (() => {
        if (!renameValue) return '';
        if (!isValidName(renameValue)) return 'Invalid name';
        if (RESERVED_NAMES.has(renameValue)) return 'Reserved name';
        if (renameValue !== renameTarget && (story.variables ?? []).some(v => v.name === renameValue)) return 'Name already in use';
        return '';
    })();

    const handleRename = () => {
        if (!renameTarget || !renameValue || renameError) return;
        onChange(renameVariableInStory(story, renameTarget, renameValue));
        setRenameTarget(null);
    };

    const listContent = (
        <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Global" />
                <Tab label="Temp (scene-local)" />
            </Tabs>

            <Box sx={{ overflowY: 'auto', p: inline ? 1 : 2, flex: inline ? undefined : 1 }}>
                {vars.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No {scopeFilter} variables yet.
                    </Typography>
                )}
                <Stack spacing={1}>
                    {vars.map(v => (
                            <Box
                                key={v.name}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    p: 1, border: 1, borderColor: 'divider', borderRadius: 1,
                                }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                                        {v.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {v.isArray ? `array[${v.arrayLength}] · ${v.type}` : v.type} · initial: <code>{String(v.initialValue)}</code>
                                    </Typography>
                                    {v.description && (
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                            {v.description}
                                        </Typography>
                                    )}
                                </Box>
                                <Tooltip title="Rename across story">
                                    <IconButton size="small" onClick={() => { setRenameTarget(v.name); setRenameValue(v.name); }}>
                                        <DriveFileRenameOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => setEditingVar(v)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(v.name)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        ))}
                    </Stack>
                <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setAddOpen(true)}
                    sx={{ mt: 1.5 }}>
                    Add Variable
                </Button>
            </Box>
        </>
    );

    const dialogs = (
        <>
            <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add Variable</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <VariableForm
                            existingNames={existingNames}
                            onSave={v => { handleAdd({ ...v, scope: scopeFilter }); }}
                            onCancel={() => setAddOpen(false)}
                        />
                    </Box>
                </DialogContent>
            </Dialog>
            <Dialog open={!!editingVar} onClose={() => setEditingVar(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Variable</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        {editingVar && (
                            <VariableForm
                                initial={editingVar}
                                existingNames={existingNames}
                                onSave={handleEdit}
                                onCancel={() => setEditingVar(null)}
                            />
                        )}
                    </Box>
                </DialogContent>
            </Dialog>
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Delete Variable?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Delete <code>{deleteTarget}</code>? Any references to it in your story will become undefined.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Rename Variable</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Renames <code>{renameTarget}</code> everywhere in your story — action nodes, conditions, prose, and raw code.
                        </Typography>
                        <TextField
                            label="New name"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value.toLowerCase())}
                            error={!!renameError}
                            helperText={renameError || 'Lowercase letters, numbers, underscores'}
                            size="small"
                            autoFocus
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleRename}
                        disabled={!renameValue || !!renameError || renameValue === renameTarget}>
                        Rename
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );

    if (inline) return <>{listContent}{dialogs}</>;

    return (
        <>
            <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 360 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ flex: 1 }}>Variables</Typography>
                    <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
                </Box>
                {listContent}
            </Drawer>
            {dialogs}
        </>
    );
}
