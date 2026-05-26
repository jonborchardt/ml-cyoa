import { Box, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StatsDesigner } from './StatsDesigner';
import type { StatEntry, VariableDef } from './types';

interface Props {
    open: boolean;
    onClose: () => void;
    statChart: StatEntry[];
    variables: VariableDef[];
    onChange: (statChart: StatEntry[]) => void;
}

export function StatsDrawer({ open, onClose, statChart, variables, onChange }: Props) {
    return (
        <Drawer anchor="right" open={open} onClose={onClose}
            PaperProps={{ sx: { width: 420, p: 2, display: 'flex', flexDirection: 'column', gap: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>Stat Chart Designer</Typography>
                <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <StatsDesigner statChart={statChart} variables={variables} onChange={onChange} />
            </Box>
        </Drawer>
    );
}
