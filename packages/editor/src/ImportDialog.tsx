import { useCallback, useRef, useState } from 'react';
import {
    Alert, Box, Button, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle,
    Tab, Tabs, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { importFromChoiceScript, importFromZip, importFromBackupJson } from './importChoiceScript';
import { saveMyStory, type MyStory } from './myStoryStore';

// ─── Helpers ───────────────────────────────────────────────────────────────

async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ─── Drop Zone ─────────────────────────────────────────────────────────────

function DropZone({ accept, label, onFiles }: { accept: string; label: string; onFiles: (files: File[]) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        onFiles([...e.dataTransfer.files]);
    }, [onFiles]);

    return (
        <Box
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            sx={{
                border: 2,
                borderStyle: 'dashed',
                borderColor: dragging ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragging ? 'action.hover' : 'background.paper',
                transition: 'all 0.15s',
            }}>
            <UploadFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                Click to browse or drag and drop
            </Typography>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple
                hidden
                onChange={e => { if (e.target.files) onFiles([...e.target.files]); e.target.value = ''; }}
            />
        </Box>
    );
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    onImported: (story: MyStory) => void;
}

// ─── Main dialog ───────────────────────────────────────────────────────────

export function ImportDialog({ open, onClose, onImported }: Props) {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => { setError(null); setLoading(false); };

    const handleClose = () => { reset(); onClose(); };

    // ── CS text / ZIP import ───────────────────────────────────────────────

    const handleChoiceScriptFiles = useCallback(async (files: File[]) => {
        setError(null);
        setLoading(true);
        try {
            const txtFiles = files.filter(f => f.name.endsWith('.txt'));
            const zipFiles = files.filter(f => f.name.endsWith('.zip'));

            let story: MyStory;

            if (zipFiles.length > 0) {
                const buf = await readFileAsArrayBuffer(zipFiles[0]);
                story = await importFromZip(new Uint8Array(buf));
            } else if (txtFiles.length > 0) {
                const map = new Map<string, string>();
                for (const f of txtFiles) {
                    const id = f.name.replace(/\.txt$/, '');
                    map.set(id, await readFileAsText(f));
                }
                story = importFromChoiceScript(map);
            } else {
                throw new Error('Please provide .txt or .zip files.');
            }

            saveMyStory(story);
            onImported(story);
            handleClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [onImported]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Backup JSON import ─────────────────────────────────────────────────

    const handleBackupFiles = useCallback(async (files: File[]) => {
        setError(null);
        setLoading(true);
        try {
            const json = await readFileAsText(files[0]);
            const story = importFromBackupJson(json);
            // Give it a new id so it doesn't collide with existing stories
            story.id = crypto.randomUUID();
            story.updatedAt = Date.now();
            saveMyStory(story);
            onImported(story);
            handleClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [onImported]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Import Story</DialogTitle>
            <DialogContent>
                <Tabs value={tab} onChange={(_, v) => { setTab(v); reset(); }} sx={{ mb: 2 }}>
                    <Tab label="ChoiceScript / ZIP" />
                    <Tab label="Restore Backup" />
                </Tabs>

                {tab === 0 && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Import one or more ChoiceScript <strong>.txt</strong> scene files, or a <strong>.zip</strong> archive exported from this editor or CSIDE.
                        </Typography>
                        <DropZone
                            accept=".txt,.zip"
                            label=".txt scene files or .zip archive"
                            onFiles={handleChoiceScriptFiles}
                        />
                    </Box>
                )}

                {tab === 1 && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Restore a <strong>.json</strong> backup file previously downloaded from this editor. All node positions and metadata are preserved.
                        </Typography>
                        <DropZone
                            accept=".json"
                            label=".json backup file"
                            onFiles={handleBackupFiles}
                        />
                    </Box>
                )}

                {loading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2" color="text.secondary">Importing…</Typography>
                    </Box>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}
