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
import EditIcon from '@mui/icons-material/Edit';
import type { MyStory } from './myStoryStore';
import type { VariableDef } from './types';

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
    open: boolean;
    story: MyStory;
    onChange: (updated: MyStory) => void;
    onClose: () => void;
}

export function VariableManagerPanel({ open, story, onChange, onClose }: Props) {
    const [tab, setTab] = useState(0);
    const [addOpen, setAddOpen] = useState(false);
    const [editingVar, setEditingVar] = useState<VariableDef | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                PaperProps={{ sx: { width: 360 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ flex: 1 }}>Variables</Typography>
                    <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
                </Box>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Global" />
                    <Tab label="Temp (scene-local)" />
                </Tabs>

                <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
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
                </Box>

                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => setAddOpen(true)}>
                        Add Variable
                    </Button>
                </Box>
            </Drawer>

            {/* Add dialog */}
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

            {/* Edit dialog */}
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

            {/* Delete confirmation */}
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
        </>
    );
}
