import {
    Box, Button, Popover, Stack, Typography,
} from '@mui/material';
import type { NodeType } from './types';

interface PaletteEntry {
    type: NodeType;
    label: string;
    description: string;
    color: string;
    icon: string;
}

const PALETTE: PaletteEntry[] = [
    { type: 'passage', label: 'Passage', description: 'Prose text with choices', color: '#90caf9', icon: '¶' },
    { type: 'ending', label: 'Ending', description: 'A story conclusion', color: '#ffb74d', icon: '⏹' },
    { type: 'condition', label: 'Condition', description: '*if / *else branch', color: '#f59e0b', icon: '⋈' },
    { type: 'action', label: 'Action', description: '*set, *rand, *input…', color: '#14b8a6', icon: '⚙' },
    { type: 'fake_choice', label: 'Cosmetic Choice', description: '*fake_choice — no stat effect', color: '#90caf9', icon: '◈' },
    { type: 'input', label: 'Player Input', description: '*input_text / *input_number', color: '#a855f7', icon: '✎' },
    { type: 'random_branch', label: 'Random Branch', description: 'Pick a branch at random', color: '#c026d3', icon: '⚄' },
    { type: 'page_break', label: 'Page Break', description: 'Insert a "Next" button', color: '#9ca3af', icon: '⏎' },
    { type: 'check_achievements', label: 'Check Achievements', description: 'Show the achievements screen (*check_achievements)', color: '#10b981', icon: '★' },
    { type: 'gosub', label: 'Call Subroutine', description: '*gosub — call a reusable subroutine', color: '#7c3aed', icon: '↩' },
    { type: 'image', label: 'Image', description: '*image — display an image', color: '#3949ab', icon: '🖼' },
    { type: 'delay_break', label: 'Delay Break', description: '*delay_break — page break with loading pause', color: '#9ca3af', icon: '⏳' },
    { type: 'goto_random_scene', label: 'Random Scene Jump', description: '*goto_random_scene — jump to a random scene', color: '#9c27b0', icon: '🎲' },
    { type: 'comment', label: 'Note / Comment', description: 'Sticky note for author annotations', color: '#f9a825', icon: '✎' },
];

interface Props {
    anchorEl: HTMLElement | null;
    onClose: () => void;
    onSelect: (type: NodeType) => void;
}

export function NodePalette({ anchorEl, onClose, onSelect }: Props) {
    return (
        <Popover
            open={!!anchorEl}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
            <Box sx={{ p: 1.5, width: 300 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Add a node
                </Typography>
                <Stack spacing={0.5}>
                    {PALETTE.map(entry => (
                        <Button
                            key={entry.type}
                            fullWidth
                            onClick={() => { onSelect(entry.type); onClose(); }}
                            sx={{
                                justifyContent: 'flex-start',
                                textTransform: 'none',
                                px: 1.5,
                                py: 0.75,
                                borderLeft: `3px solid ${entry.color}`,
                                borderRadius: '0 4px 4px 0',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                <span style={{ fontSize: 18, width: 24, textAlign: 'center', color: entry.color }}>{entry.icon}</span>
                                <Box sx={{ textAlign: 'left' }}>
                                    <Typography variant="body2" fontWeight={600}>{entry.label}</Typography>
                                    <Typography variant="caption" color="text.secondary">{entry.description}</Typography>
                                </Box>
                            </Box>
                        </Button>
                    ))}
                </Stack>
            </Box>
        </Popover>
    );
}
