import {
    Box, Dialog, DialogContent, DialogTitle, IconButton,
    Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const SHORTCUTS: Array<{ shortcut: string; action: string }> = [
    { shortcut: 'Ctrl+Z', action: 'Undo' },
    { shortcut: 'Ctrl+Y / Ctrl+Shift+Z', action: 'Redo' },
    { shortcut: 'Ctrl+D', action: 'Duplicate selected nodes' },
    { shortcut: 'Ctrl+A', action: 'Select all nodes' },
    { shortcut: 'Delete / Backspace', action: 'Delete selected nodes / edges' },
    { shortcut: 'Escape', action: 'Deselect all' },
    { shortcut: 'Ctrl+L', action: 'Auto-layout graph' },
    { shortcut: 'Ctrl+F', action: 'Open find / replace panel' },
    { shortcut: 'Ctrl+E', action: 'Toggle graph ↔ code mode' },
    { shortcut: 'Ctrl+Enter', action: 'Confirm inline dialog' },
    { shortcut: 'N (canvas focus)', action: 'Add Passage node' },
    { shortcut: 'C (canvas focus)', action: 'Add Condition node' },
    { shortcut: 'A (canvas focus)', action: 'Add Action node' },
    { shortcut: 'Space (hold)', action: 'Pan mode' },
    { shortcut: 'Scroll / + / −', action: 'Zoom in / out' },
    { shortcut: 'F5', action: 'Switch to Story (play) tab' },
    { shortcut: '?', action: 'Show this shortcut reference' },
];

interface Props {
    open: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsHelp({ open, onClose }: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pr: 6 }}>
                Keyboard Shortcuts
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Shortcut</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {SHORTCUTS.map(({ shortcut, action }) => (
                            <TableRow key={shortcut} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {shortcut.split(' / ').map(k => (
                                            <Typography
                                                key={k}
                                                component="kbd"
                                                variant="caption"
                                                sx={{
                                                    px: 0.75, py: 0.25,
                                                    bgcolor: 'grey.100',
                                                    border: '1px solid',
                                                    borderColor: 'grey.400',
                                                    borderRadius: 0.5,
                                                    fontFamily: 'monospace',
                                                }}>
                                                {k}
                                            </Typography>
                                        ))}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{action}</Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
        </Dialog>
    );
}
