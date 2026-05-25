import { useRef, useState } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, IconButton, InputLabel, MenuItem, Popover, Select,
    Stack, TextField, Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Node } from '@xyflow/react';
import type { NodeData } from './parseGameFlow';
import type { VariableDef, Achievement } from './types';
import { ConditionEditDialog } from './ConditionEditDialog';
import { ActionEditDialog } from './ActionEditDialog';
import { InputNodeEditDialog } from './InputNodeEditDialog';
import { RandomBranchEditDialog } from './RandomBranchEditDialog';
import { compressImage } from './imageUtils';

interface Props {
    node: Node<NodeData> | null;
    images: Record<string, string>;
    variables?: VariableDef[];
    achievements?: Achievement[];
    onClose: () => void;
    onSave: (nodeId: string, updates: Partial<NodeData & { nodeType: string }>) => void;
    onDelete: (nodeId: string) => void;
    onAddImage: (filename: string, dataUrl: string) => void;
    onDeleteImage?: (filename: string) => void;
}

export function NodeEditDialog({ node, images, variables = [], achievements = [], onClose, onSave, onDelete, onAddImage, onDeleteImage }: Props) {
    if (!node) return null;

    // Route to type-specific dialogs
    if (node.type === 'condition') {
        return (
            <ConditionEditDialog
                node={node}
                variables={variables}
                onSave={(id, condition) => onSave(id, { condition } as Partial<NodeData & { nodeType: string }>)}
                onDelete={onDelete}
                onClose={onClose}
            />
        );
    }
    if (node.type === 'action') {
        return (
            <ActionEditDialog
                node={node}
                variables={variables}
                achievements={achievements}
                onSave={(id, actions) => onSave(id, { actions } as Partial<NodeData & { nodeType: string }>)}
                onDelete={onDelete}
                onClose={onClose}
            />
        );
    }
    if (node.type === 'input') {
        return (
            <InputNodeEditDialog
                node={node}
                variables={variables}
                onSave={(id, inputConfig) => onSave(id, { inputConfig } as Partial<NodeData & { nodeType: string }>)}
                onDelete={onDelete}
                onClose={onClose}
            />
        );
    }
    if (node.type === 'random_branch') {
        return (
            <RandomBranchEditDialog
                node={node}
                onSave={(id, randomBranches) => onSave(id, { randomBranches } as Partial<NodeData & { nodeType: string }>)}
                onDelete={onDelete}
                onClose={onClose}
            />
        );
    }

    // Passage / ending / fake_choice — prose editor
    return <ProseEditDialog node={node} images={images} variables={variables} onClose={onClose} onSave={onSave} onDelete={onDelete} onAddImage={onAddImage} onDeleteImage={onDeleteImage} />;
}

// ─── Prose editor for passage / ending / fake_choice ─────────────────────

interface ProseProps {
    node: Node<NodeData>;
    images: Record<string, string>;
    variables: VariableDef[];
    onClose: () => void;
    onSave: (nodeId: string, updates: Partial<NodeData & { nodeType: string }>) => void;
    onDelete: (nodeId: string) => void;
    onAddImage: (filename: string, dataUrl: string) => void;
    onDeleteImage?: (filename: string) => void;
}

function ProseEditDialog({ node, images, variables, onClose, onSave, onDelete, onAddImage, onDeleteImage }: ProseProps) {
    const allowTypeSwitch = node.type !== 'fake_choice';
    const [content, setContent] = useState(node.data.content ?? '');
    const [type, setType] = useState<'passage' | 'ending' | 'fake_choice'>(
        (node.type as 'passage' | 'ending' | 'fake_choice') ?? 'passage',
    );
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [varAnchor, setVarAnchor] = useState<HTMLElement | null>(null);
    const [varMode, setVarMode] = useState<'simple' | 'conditional'>('simple');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = () => {
        onSave(node.id, { content, nodeType: type });
        onClose();
    };

    const handleDelete = () => {
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

    const insertAtCursor = (insert: string) => {
        const el = textareaRef.current;
        if (el) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = (content as string).slice(0, start) + insert + (content as string).slice(end);
            setContent(next);
            setTimeout(() => {
                el.selectionStart = start + insert.length;
                el.selectionEnd = start + insert.length;
                el.focus();
            }, 0);
        } else {
            setContent(prev => (prev as string) + insert);
        }
    };

    const wrapSelection = (open: string, close: string) => {
        const el = textareaRef.current;
        if (el) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const selected = (content as string).slice(start, end);
            const wrapped = open + selected + close;
            const next = (content as string).slice(0, start) + wrapped + (content as string).slice(end);
            setContent(next);
            setTimeout(() => {
                el.selectionStart = selected ? start : start + open.length;
                el.selectionEnd = selected ? start + wrapped.length : start + open.length;
                el.focus();
            }, 0);
        }
    };

    const insertVariable = (name: string) => {
        if (varMode === 'simple') insertAtCursor(`\${${name}}`);
        else insertAtCursor(`@{${name} true-text|false-text}`);
        setVarAnchor(null);
    };

    const title = node.type === 'fake_choice' ? 'Edit Cosmetic Choice' : 'Edit Story Part';

    return (
        <>
            <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button size="small" variant="outlined" onClick={() => wrapSelection('[b]', '[/b]')} sx={{ fontWeight: 700, minWidth: 36 }}>B</Button>
                        <Button size="small" variant="outlined" onClick={() => wrapSelection('[i]', '[/i]')} sx={{ fontStyle: 'italic', minWidth: 36 }}>I</Button>
                        {variables.length > 0 && (
                            <>
                                <Button size="small" variant="outlined" onClick={e => { setVarMode('simple'); setVarAnchor(e.currentTarget); }} sx={{ fontFamily: 'monospace', fontSize: 12 }}>{'${…}'}</Button>
                                <Button size="small" variant="outlined" onClick={e => { setVarMode('conditional'); setVarAnchor(e.currentTarget); }} sx={{ fontFamily: 'monospace', fontSize: 12 }}>{'@{…}'}</Button>
                                <Popover open={!!varAnchor} anchorEl={varAnchor} onClose={() => setVarAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
                                    <Box sx={{ p: 1.5, minWidth: 180 }}>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                            {varMode === 'simple' ? 'Insert variable value' : 'Insert conditional text'}
                                        </Typography>
                                        <Stack spacing={0.5}>
                                            {variables.map(v => (
                                                <Button key={v.name} size="small" onClick={() => insertVariable(v.name)} sx={{ justifyContent: 'flex-start', fontFamily: 'monospace', textTransform: 'none' }}>
                                                    {v.name}
                                                    {v.description && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{v.description}</Typography>}
                                                </Button>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Popover>
                            </>
                        )}
                        </Box>

                        <TextField
                            label="Content"
                            multiline minRows={4} maxRows={12}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            inputRef={textareaRef}
                            fullWidth
                            helperText="Prose text only. Use *image filename.png to embed an image."
                        />

                        {allowTypeSwitch && (
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select value={type} label="Type" onChange={e => setType(e.target.value as typeof type)}>
                                    <MenuItem value="passage">Passage</MenuItem>
                                    <MenuItem value="ending">Ending</MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Images</Typography>
                            <input type="file" accept=".png,.jpg,.jpeg,.svg,.gif" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                            <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={() => fileInputRef.current?.click()}>Upload Image</Button>
                            {Object.keys(images).length > 0 && (
                                <>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                                        Click a thumbnail to insert <code>*image filename</code> at the cursor.
                                    </Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                                        {Object.entries(images).map(([filename, dataUrl]) => (
                                            <Box key={filename} onClick={() => insertAtCursor(`\n*image ${filename}`)}
                                                sx={{ position: 'relative', cursor: 'pointer', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5, '&:hover': { borderColor: 'primary.main' } }}>
                                                {onDeleteImage && (
                                                    <IconButton size="small" onClick={e => { e.stopPropagation(); onDeleteImage(filename); }}
                                                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.25, '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                                                        <CloseIcon sx={{ fontSize: 12 }} />
                                                    </IconButton>
                                                )}
                                                <img src={dataUrl} alt={filename} style={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }} />
                                                <Typography variant="caption" sx={{ display: 'block', maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmDelete(true)}>Delete Story Part</Button>
                    <Stack direction="row" spacing={1}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="contained" onClick={handleSave}>Save</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Story Part?</DialogTitle>
                <DialogContent><Typography>This will also remove all choices connected to this Story Part.</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
