import {
    Box, Button, Divider, FormControl, IconButton, InputLabel,
    MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import type { StatEntry, VariableDef } from './types';

interface StatRowProps {
    entry: StatEntry;
    variables: VariableDef[];
    onChange: (e: StatEntry) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
}

function StatRow({ entry, variables, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: StatRowProps) {
    const numVars = variables.filter(v => v.type === 'number').map(v => v.name);
    const allVars = variables.map(v => v.name);

    return (
        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: entry.kind !== 'divider' ? 1 : 0 }}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={entry.kind} label="Type" onChange={e => onChange({ kind: e.target.value as StatEntry['kind'] })}>
                        <MenuItem value="percent">Percent Bar</MenuItem>
                        <MenuItem value="opposed_pair">Opposed Pair</MenuItem>
                        <MenuItem value="text">Text</MenuItem>
                        <MenuItem value="divider">Divider</MenuItem>
                    </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <IconButton size="small" onClick={onMoveUp} disabled={isFirst}><ArrowUpwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={onMoveDown} disabled={isLast}><ArrowDownwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton>
            </Stack>

            {entry.kind === 'percent' && (
                <Stack direction="row" spacing={1}>
                    <TextField label="Variable" value={entry.variable ?? ''} onChange={e => onChange({ ...entry, variable: e.target.value })}
                        size="small" select={numVars.length > 0} sx={{ flex: 1 }}>
                        {numVars.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </TextField>
                    <TextField label="Label" value={entry.label ?? ''} onChange={e => onChange({ ...entry, label: e.target.value })} size="small" sx={{ flex: 1 }} />
                </Stack>
            )}

            {entry.kind === 'opposed_pair' && (
                <Stack spacing={1}>
                    <Stack direction="row" spacing={1}>
                        <TextField label="Variable A" value={entry.variable ?? ''} onChange={e => onChange({ ...entry, variable: e.target.value })}
                            size="small" select={numVars.length > 0} sx={{ flex: 1 }}>
                            {numVars.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                        </TextField>
                        <TextField label="Label A" value={entry.label ?? ''} onChange={e => onChange({ ...entry, label: e.target.value })} size="small" sx={{ flex: 1 }} />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <TextField label="Variable B" value={entry.variable2 ?? ''} onChange={e => onChange({ ...entry, variable2: e.target.value })}
                            size="small" select={numVars.length > 0} sx={{ flex: 1 }}>
                            {numVars.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                        </TextField>
                        <TextField label="Label B" value={entry.label2 ?? ''} onChange={e => onChange({ ...entry, label2: e.target.value })} size="small" sx={{ flex: 1 }} />
                    </Stack>
                </Stack>
            )}

            {entry.kind === 'text' && (
                <Stack direction="row" spacing={1}>
                    <TextField label="Variable" value={entry.variable ?? ''} onChange={e => onChange({ ...entry, variable: e.target.value })}
                        size="small" select={allVars.length > 0} sx={{ flex: 1 }}>
                        {allVars.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </TextField>
                    <TextField label="Label" value={entry.label ?? ''} onChange={e => onChange({ ...entry, label: e.target.value })} size="small" sx={{ flex: 1 }} />
                </Stack>
            )}

            {entry.kind === 'divider' && (
                <TextField label="Section heading (optional)" value={entry.heading ?? ''} onChange={e => onChange({ ...entry, heading: e.target.value })} size="small" fullWidth />
            )}
        </Box>
    );
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function StatChartPreview({ entries }: { entries: StatEntry[] }) {
    if (entries.length === 0) {
        return <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No stat entries — add one to see a preview.</Typography>;
    }
    return (
        <Stack spacing={1}>
            {entries.map((entry, i) => {
                if (entry.kind === 'divider') {
                    return (
                        <Box key={i}>
                            {entry.heading && <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{entry.heading}</Typography>}
                            <Divider />
                        </Box>
                    );
                }
                if (entry.kind === 'percent') {
                    return (
                        <Box key={i}>
                            <Typography variant="caption" color="text.secondary">{entry.label || entry.variable || '…'}</Typography>
                            <Box sx={{ height: 10, bgcolor: 'grey.200', borderRadius: 5, overflow: 'hidden', mt: 0.25 }}>
                                <Box sx={{ width: '50%', height: '100%', bgcolor: 'primary.main', borderRadius: 5 }} />
                            </Box>
                        </Box>
                    );
                }
                if (entry.kind === 'opposed_pair') {
                    return (
                        <Box key={i}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">{entry.label || entry.variable || 'A'}</Typography>
                                <Typography variant="caption" color="text.secondary">{entry.label2 || entry.variable2 || 'B'}</Typography>
                            </Stack>
                            <Box sx={{ height: 10, bgcolor: 'grey.200', borderRadius: 5, overflow: 'hidden', mt: 0.25, position: 'relative' }}>
                                <Box sx={{ width: 4, height: '100%', bgcolor: 'primary.main', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
                            </Box>
                        </Box>
                    );
                }
                if (entry.kind === 'text') {
                    return (
                        <Stack key={i} direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">{entry.label || '…'}</Typography>
                            <Typography variant="caption">{entry.variable || '…'}</Typography>
                        </Stack>
                    );
                }
                return null;
            })}
        </Stack>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    statChart: StatEntry[];
    variables: VariableDef[];
    onChange: (statChart: StatEntry[]) => void;
}

export function StatsDesigner({ statChart, variables, onChange }: Props) {
    const add = (kind: StatEntry['kind']) => {
        const firstNum = variables.find(v => v.type === 'number')?.name ?? '';
        const entry: StatEntry = kind === 'percent' ? { kind, variable: firstNum, label: '' }
            : kind === 'opposed_pair' ? { kind, variable: firstNum, variable2: '', label: '', label2: '' }
            : kind === 'text' ? { kind, variable: firstNum, label: '' }
            : { kind: 'divider', heading: '' };
        onChange([...statChart, entry]);
    };

    const update = (i: number, entry: StatEntry) => onChange(statChart.map((e, idx) => idx === i ? entry : e));
    const remove = (i: number) => onChange(statChart.filter((_, idx) => idx !== i));
    const move = (i: number, dir: -1 | 1) => {
        const next = [...statChart];
        const j = i + dir;
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };

    return (
        <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">Stats Screen</Typography>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Add entry</InputLabel>
                    <Select value="" label="Add entry" onChange={e => { if (e.target.value) add(e.target.value as StatEntry['kind']); }}>
                        <MenuItem value="percent">Percent Bar</MenuItem>
                        <MenuItem value="opposed_pair">Opposed Pair</MenuItem>
                        <MenuItem value="text">Text</MenuItem>
                        <MenuItem value="divider">Divider</MenuItem>
                    </Select>
                </FormControl>
            </Stack>

            {statChart.length === 0 && (
                <Typography variant="body2" color="text.secondary">No stat entries yet. Use &quot;Add entry&quot; to build the stats screen players will see.</Typography>
            )}

            <Stack spacing={1}>
                {statChart.map((entry, i) => (
                    <StatRow
                        key={i}
                        entry={entry}
                        variables={variables}
                        onChange={e => update(i, e)}
                        onDelete={() => remove(i)}
                        onMoveUp={() => move(i, -1)}
                        onMoveDown={() => move(i, 1)}
                        isFirst={i === 0}
                        isLast={i === statChart.length - 1}
                    />
                ))}
            </Stack>

            {statChart.length > 0 && (
                <>
                    <Typography variant="subtitle2" color="text.secondary">Preview</Typography>
                    <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50' }}>
                        <StatChartPreview entries={statChart} />
                    </Box>
                </>
            )}

            <Button size="small" startIcon={<AddIcon />} onClick={() => add('percent')} sx={{ alignSelf: 'flex-start' }}>
                Add Percent Bar
            </Button>
        </Stack>
    );
}
