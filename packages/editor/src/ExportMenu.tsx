import { useState } from 'react';
import {
    CircularProgress, IconButton, ListItemIcon, ListItemText,
    Menu, MenuItem, Snackbar, Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { MyStory } from './myStoryStore';
import { downloadAsZip, downloadAsBackupJson, getSceneText } from './exportStory';

interface Props {
    story: MyStory;
    currentSceneId: string;
}

export function ExportMenu({ story, currentSceneId }: Props) {
    const [anchor, setAnchor] = useState<null | HTMLElement>(null);
    const [zipping, setZipping] = useState(false);
    const [snack, setSnack] = useState<string | null>(null);

    const close = () => setAnchor(null);

    const handleZip = async () => {
        close();
        setZipping(true);
        try {
            await downloadAsZip(story);
        } finally {
            setZipping(false);
        }
    };

    const handleBackup = () => {
        close();
        downloadAsBackupJson(story);
    };

    const handleCopyScene = async () => {
        close();
        const text = getSceneText(story, currentSceneId);
        await navigator.clipboard.writeText(text);
        setSnack('Scene text copied to clipboard');
    };

    return (
        <>
            <Tooltip title="Export">
                <IconButton size="small" onClick={e => setAnchor(e.currentTarget)} disabled={zipping}>
                    {zipping ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                </IconButton>
            </Tooltip>

            <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
                <MenuItem onClick={handleZip}>
                    <ListItemIcon><FolderZipIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Export as ZIP" secondary="ChoiceScript .txt files + images" />
                </MenuItem>
                <MenuItem onClick={handleBackup}>
                    <ListItemIcon><SaveAltIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Download Backup (.json)" secondary="Full editor backup, all metadata" />
                </MenuItem>
                <MenuItem onClick={handleCopyScene}>
                    <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Copy Scene Text" secondary={`Current: ${currentSceneId}`} />
                </MenuItem>
            </Menu>

            <Snackbar
                open={!!snack}
                autoHideDuration={2500}
                onClose={() => setSnack(null)}
                message={snack}
            />
        </>
    );
}
