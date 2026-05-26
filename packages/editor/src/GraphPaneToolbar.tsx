import { useState } from 'react';
import { Box, Button, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MapIcon from '@mui/icons-material/Map';

interface GraphPaneToolbarProps {
    onAddNode: () => void;
    onAutoLayout: () => void;
    onToggleLayoutDir: () => void;
    layoutDirection: 'TB' | 'LR';
    showMinimap: boolean;
    onToggleMinimap: () => void;
    onOpenKeyboardShortcuts: () => void;
}

export function GraphPaneToolbar({
    onAddNode, onAutoLayout, onToggleLayoutDir,
    layoutDirection, showMinimap, onToggleMinimap, onOpenKeyboardShortcuts,
}: GraphPaneToolbarProps) {
    const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<HTMLElement | null>(null);

    return (
        <Box sx={{
            position: 'absolute', top: 8, left: 8, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 0.5,
            bgcolor: 'background.paper',
            border: 1, borderColor: 'divider',
            borderRadius: 1,
            px: 0.5, py: 0.25,
            boxShadow: 1,
        }}>
            <Button size="small" startIcon={<AddIcon />} onClick={onAddNode}>
                Add Node
            </Button>
            <Button size="small" startIcon={<AccountTreeIcon />} endIcon={<ExpandMoreIcon />}
                    onClick={e => setLayoutMenuAnchor(e.currentTarget)}>
                Layout
            </Button>
            <Menu anchorEl={layoutMenuAnchor} open={Boolean(layoutMenuAnchor)}
                  onClose={() => setLayoutMenuAnchor(null)}>
                <MenuItem onClick={() => { onAutoLayout(); setLayoutMenuAnchor(null); }}>
                    Auto Layout<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Ctrl+L</Typography>
                </MenuItem>
                <MenuItem onClick={() => { onToggleLayoutDir(); setLayoutMenuAnchor(null); }}>
                    {layoutDirection === 'TB' ? 'Switch to Left→Right' : 'Switch to Top→Bottom'}
                </MenuItem>
            </Menu>
            <Tooltip title={showMinimap ? 'Hide minimap' : 'Show minimap'}>
                <IconButton size="small" onClick={onToggleMinimap} color={showMinimap ? 'primary' : 'default'}>
                    <MapIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Keyboard shortcuts (?)">
                <IconButton size="small" onClick={onOpenKeyboardShortcuts}>
                    <HelpOutlineIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
}
