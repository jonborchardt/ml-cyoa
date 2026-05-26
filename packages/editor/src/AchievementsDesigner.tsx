import { useState } from 'react';
import {
    Box, Button, Checkbox, FormControlLabel, IconButton,
    Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Achievement } from './types';

function slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'achievement';
}

interface AchievementRowProps {
    ach: Achievement;
    existingIds: string[];
    onChange: (a: Achievement) => void;
    onDelete: () => void;
}

function AchievementRow({ ach, existingIds, onChange, onDelete }: AchievementRowProps) {
    const [expanded, setExpanded] = useState(false);

    const idError = (() => {
        if (!ach.id) return 'ID is required';
        if (!/^[a-z_][a-z0-9_]*$/.test(ach.id)) return 'ID must be lowercase letters, numbers, or underscores';
        if (existingIds.filter(id => id === ach.id).length > 1) return 'Duplicate ID';
        return '';
    })();

    const updateTitle = (title: string) => {
        const newId = ach.id === '' || ach.id === slugify(ach.title) ? slugify(title) : ach.id;
        onChange({ ...ach, title, id: newId });
    };

    return (
        <Box sx={{ border: 1, borderColor: idError ? 'error.main' : 'divider', borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{ach.title || '(untitled)'}</Typography>
                    <Typography variant="caption" color={idError ? 'error' : 'text.secondary'}>
                        {idError || `id: ${ach.id} · ${ach.points} pts · ${ach.isVisible ? 'visible' : 'hidden'}`}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={() => setExpanded(e => !e)}>
                    {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
                <IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton>
            </Stack>

            {expanded && (
                <Stack spacing={1.5} sx={{ px: 1.5, pb: 1.5 }}>
                    <Stack direction="row" spacing={1}>
                        <TextField label="Title" value={ach.title} onChange={e => updateTitle(e.target.value)} size="small" sx={{ flex: 2 }}
                            inputProps={{ maxLength: 50 }} />
                        <TextField label="Points" type="number" value={ach.points} onChange={e => onChange({ ...ach, points: Math.max(0, Number(e.target.value)) })}
                            size="small" sx={{ flex: 1 }} inputProps={{ min: 0 }} />
                    </Stack>
                    <TextField label="ID (auto-generated)" value={ach.id} onChange={e => onChange({ ...ach, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                        size="small" fullWidth error={!!idError} helperText={idError || 'Used in *achieve commands'} />
                    <TextField label="Short description (shown locked)" value={ach.shortDescription}
                        onChange={e => onChange({ ...ach, shortDescription: e.target.value })}
                        size="small" fullWidth multiline rows={2} />
                    <TextField label="Pre-earned description (optional)" value={ach.preDescription ?? ''}
                        onChange={e => onChange({ ...ach, preDescription: e.target.value || undefined })}
                        size="small" fullWidth />
                    <TextField label="Post-earned description (optional)" value={ach.postDescription ?? ''}
                        onChange={e => onChange({ ...ach, postDescription: e.target.value || undefined })}
                        size="small" fullWidth />
                    <FormControlLabel
                        control={<Checkbox checked={ach.isVisible} onChange={e => onChange({ ...ach, isVisible: e.target.checked })} size="small" />}
                        label={<Typography variant="body2">Visible before earning (show title/description to player)</Typography>}
                    />
                </Stack>
            )}
        </Box>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    achievements: Achievement[];
    onChange: (achievements: Achievement[]) => void;
}

export function AchievementsDesigner({ achievements, onChange }: Props) {
    const addAchievement = () => {
        const idx = achievements.length + 1;
        const newAch: Achievement = {
            id: `achievement_${idx}`,
            title: '',
            points: 10,
            shortDescription: '',
            isVisible: true,
        };
        onChange([...achievements, newAch]);
    };

    const existingIds = achievements.map(a => a.id);

    return (
        <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">Achievements</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addAchievement}>Add Achievement</Button>
            </Stack>

            {achievements.length === 0 && (
                <Typography variant="body2" color="text.secondary">No achievements yet. Add one to reward players for special accomplishments.</Typography>
            )}

            <Stack spacing={1}>
                {achievements.map((ach, i) => (
                    <AchievementRow
                        key={i}
                        ach={ach}
                        existingIds={existingIds}
                        onChange={a => onChange(achievements.map((x, idx) => idx === i ? a : x))}
                        onDelete={() => onChange(achievements.filter((_, idx) => idx !== i))}
                    />
                ))}
            </Stack>
        </Stack>
    );
}
