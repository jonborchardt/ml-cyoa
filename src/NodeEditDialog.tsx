import { useRef, useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography, Box,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import { compressImage } from './imageUtils';

interface Props {
    node: Node<NodeData> | null;
    images: Record<string, string>;
    onClose: () => void;
    onSave: (nodeId: string, content: string, type: 'passage' | 'ending') => void;
    onDelete: (nodeId: string) => void;
    onAddImage: (filename: string, dataUrl: string) => void;
    onDeleteImage?: (filename: string) => void;
}

export function NodeEditDialog({ node, images, onClose, onSave, onDelete, onAddImage, onDeleteImage }: Props) {
    const [content, setContent] = useState(node?.data.content ?? '');
    const [type, setType] = useState<'passage' | 'ending'>(
        node?.type === 'ending' ? 'ending' : 'passage',
    );
    const [confirmDelete, setConfirmDelete] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = () => {
        if (!node) return;
        onSave(node.id, content, type);
        onClose();
    };

    const handleDelete = () => {
        if (!node) return;
        onDelete(node.id);
        setConfirmDelete(false);
        onClose();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const raw = ev.target?.result as string;
            const compressed = await compressImage(raw);
            onAddImage(file.name, compressed);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const insertImage = (filename: string) => {
        const insert = `\n*image ${filename}`;
        const el = textareaRef.current;
        if (el) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = content.slice(0, start) + insert + content.slice(end);
            setContent(next);
            setTimeout(() => {
                el.selectionStart = start + insert.length;
                el.selectionEnd = start + insert.length;
                el.focus();
            }, 0);
        } else {
            setContent(prev => prev + insert);
        }
    };

    if (!node) return null;

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Story Part</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Content"
                            multiline
                            minRows={4}
                            maxRows={12}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            inputRef={textareaRef}
                            fullWidth
                            helperText="Prose text only. Use *image filename.png to embed an image."
                        />

                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={type}
                                label="Type"
                                onChange={e => setType(e.target.value as 'passage' | 'ending')}>
                                <MenuItem value="passage">Passage</MenuItem>
                                <MenuItem value="ending">Ending</MenuItem>
                            </Select>
                        </FormControl>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Images</Typography>
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.svg,.gif"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                            <Button
                                size="small"
                                startIcon={<AddPhotoAlternateIcon />}
                                onClick={() => fileInputRef.current?.click()}>
                                Upload Image
                            </Button>
                            {Object.keys(images).length > 0 && (
                                <>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                                        Click a thumbnail to insert <code>*image filename</code> at the cursor position in the content.
                                    </Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                                        {Object.entries(images).map(([filename, dataUrl]) => (
                                            <Box
                                                key={filename}
                                                onClick={() => insertImage(filename)}
                                                sx={{
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    p: 0.5,
                                                    '&:hover': { borderColor: 'primary.main' },
                                                }}>
                                                {onDeleteImage && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={e => { e.stopPropagation(); onDeleteImage(filename); }}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: -8,
                                                            right: -8,
                                                            bgcolor: 'background.paper',
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            p: 0.25,
                                                            '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                                                        }}>
                                                        <CloseIcon sx={{ fontSize: 12 }} />
                                                    </IconButton>
                                                )}
                                                <img
                                                    src={dataUrl}
                                                    alt={filename}
                                                    style={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }}
                                                />
                                                <Typography variant="caption" sx={{ display: 'block', maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {filename}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setConfirmDelete(true)}>
                        Delete Story Part
                    </Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Story Part?</DialogTitle>
                <DialogContent>
                    <Typography>This will also remove all choices connected to this Story Part.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
