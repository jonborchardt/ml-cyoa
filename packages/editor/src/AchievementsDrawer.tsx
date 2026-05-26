import { Box, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AchievementsDesigner } from './AchievementsDesigner';
import type { Achievement } from './types';

interface Props {
    open?: boolean;
    onClose?: () => void;
    inline?: boolean;
    achievements: Achievement[];
    onChange: (achievements: Achievement[]) => void;
}

export function AchievementsDrawer({ open, onClose, inline, achievements, onChange }: Props) {
    if (inline) return <AchievementsDesigner achievements={achievements} onChange={onChange} />;

    return (
        <Drawer anchor="right" open={open} onClose={onClose}
            PaperProps={{ sx: { width: 420, p: 2, display: 'flex', flexDirection: 'column', gap: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>Achievements</Typography>
                <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <AchievementsDesigner achievements={achievements} onChange={onChange} />
            </Box>
        </Drawer>
    );
}
