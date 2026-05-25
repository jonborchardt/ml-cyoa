import { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, InputLabel, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import type { ImageData } from './types';

interface Props {
    node: Node<NodeData>;
    images: Record<string, string>;
    onSave: (nodeId: string, updates: Partial<ImageData>) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

export function ImageEditDialog({ node, images, onSave, onDelete, onClose }: Props) {
    const d = node.data as ImageData & Record<string, unknown>;
    const [imageFile, setImageFile] = useState(d.imageFile ?? '');
    const [imageAlign, setImageAlign] = useState<'left' | 'right' | 'center'>(d.imageAlign ?? 'center');
    const [imageAlt, setImageAlt] = useState(d.imageAlt ?? '');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const imageKeys = Object.keys(images);

    const handleSave = () => {
        onSave(node.id, { imageFile: imageFile.trim(), imageAlign, imageAlt: imageAlt.trim() });
        onClose();
    };

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Image</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {imageKeys.length > 0 ? (
                            <FormControl size="small" fullWidth>
                                <InputLabel>Image file</InputLabel>
                                <Select value={imageFile} label="Image file" onChange={e => setImageFile(e.target.value)}>
                                    <MenuItem value="">— type manually below —</MenuItem>
                                    {imageKeys.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                                </Select>
                            </FormControl>
                        ) : null}
                        <TextField
                            label="Filename"
                            value={imageFile}
                            onChange={e => setImageFile(e.target.value)}
                            size="small"
                            fullWidth
                            helperText='e.g. "cover.jpg". Upload images via the Images panel.'
                        />
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">Alignment</Typography>
                            <ToggleButtonGroup value={imageAlign} exclusive size="small"
                                onChange={(_e, v) => { if (v) setImageAlign(v); }}>
                                <ToggleButton value="left">Left</ToggleButton>
                                <ToggleButton value="center">Center</ToggleButton>
                                <ToggleButton value="right">Right</ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                        <TextField
                            label="Alt text (optional)"
                            value={imageAlt}
                            onChange={e => setImageAlt(e.target.value)}
                            size="small"
                            fullWidth
                            helperText="Required when image contains text"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>Delete</Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave} disabled={!imageFile.trim()}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Image Node?</DialogTitle>
                <DialogContent><Typography>This removes the image node and its connections.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={() => { onDelete(node.id); onClose(); }}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
