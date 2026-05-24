import {
    ReactFlow, Background, Controls, Handle, Position, MiniMap,
    BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
    applyNodeChanges, applyEdgeChanges,
} from '@xyflow/react';
import type {
    NodeProps, EdgeProps, Node, Edge, Connection,
    NodeChange, EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, FormControlLabel, IconButton, InputLabel, MenuItem,
    Select, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GitHubIcon from '@mui/icons-material/GitHub';
import { updateMyStory, type MyStory } from './myStoryStore';
import { applyTreeLayout, NODE_W } from './parseGameFlow';
import type { NodeData } from './parseGameFlow';
import { serializeFlow, validateFlow } from './serializeFlow';
import { fileGitHubIssue } from './github';
import { NodeEditDialog } from './NodeEditDialog';
import { EdgeEditDialog } from './EdgeEditDialog';
import { compressImage } from './imageUtils';

// ─── Context for edge click ───────────────────────────────────────────────

const EdgeCtx = createContext<{ onEdgeClick: (id: string) => void }>({ onEdgeClick: () => {} });

// ─── Node styles ──────────────────────────────────────────────────────────

const nodeStyle: React.CSSProperties = {
    width: NODE_W,
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 1.45,
    boxSizing: 'border-box',
};

function StartNode({ data }: NodeProps) {
    return (
        <div style={{ ...nodeStyle, background: '#e8f5e9', border: '2px solid #4caf50', fontWeight: 700, color: '#1b5e20' }}>
            <Handle type="target" position={Position.Top} style={{ background: '#4caf50', opacity: 0.4 }} />
            {data.label as string}
            <Handle type="source" position={Position.Bottom} style={{ background: '#4caf50' }} />
        </div>
    );
}

function PassageNode({ data }: NodeProps) {
    return (
        <div style={{ ...nodeStyle, background: '#fff', border: '1.5px solid #90caf9' }}>
            <Handle type="target" position={Position.Top} style={{ background: '#90caf9' }} />
            {data.label as string}
            <Handle type="source" position={Position.Bottom} style={{ background: '#90caf9' }} />
        </div>
    );
}

function EndingNode({ data }: NodeProps) {
    return (
        <div style={{ ...nodeStyle, background: '#fff8e1', border: '1.5px solid #ffb74d', color: '#5d3a00' }}>
            <Handle type="target" position={Position.Top} style={{ background: '#ffb74d' }} />
            {data.label as string}
            <Handle type="source" position={Position.Bottom} style={{ background: '#ffb74d', opacity: 0.4 }} />
        </div>
    );
}

// ─── Edge ─────────────────────────────────────────────────────────────────

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, markerEnd, style }: EdgeProps) {
    const { onEdgeClick } = useContext(EdgeCtx);
    const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const lx = sourceX + (targetX - sourceX) * 0.78;
    const ly = sourceY + (targetY - sourceY) * 0.5;
    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    onClick={() => onEdgeClick(id)}
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${lx}px,${ly}px)`,
                        fontSize: 11,
                        color: '#444',
                        background: 'rgba(200,230,255,0.95)',
                        padding: '2px 6px',
                        borderRadius: 3,
                        pointerEvents: 'all',
                        cursor: 'pointer',
                        maxWidth: 150,
                        textAlign: 'center',
                        lineHeight: 1.3,
                        border: '1px dashed #90caf9',
                        minWidth: 20,
                        minHeight: 18,
                    }}>
                    {(label as string | undefined) || <em style={{ opacity: 0.5 }}>edit</em>}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

const nodeTypes = { start: StartNode, passage: PassageNode, ending: EndingNode };
const edgeTypes = { flow: FlowEdge };
const defaultEdgeOptions = { type: 'flow' };

// ─── Submit dialog ────────────────────────────────────────────────────────

interface SubmitDialogProps {
    open: boolean;
    title: string;
    authorName: string;
    nodes: Node<NodeData>[];
    edges: Edge[];
    images: Record<string, string>;
    onClose: () => void;
}

function SubmitDialog({ open, title, authorName, nodes, edges, images, onClose }: SubmitDialogProps) {
    const [notes, setNotes] = useState('');
    const [licenseChecked, setLicenseChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { errors, warnings } = validateFlow(nodes, edges);
    const titleMissing = !title.trim();
    const authorMissing = !authorName.trim();
    const canSubmit = !titleMissing && !authorMissing && errors.length === 0 && licenseChecked && !submitting;

    const serializedText = useMemo(() => serializeFlow(nodes, edges), [nodes, edges]);
    const imageEntries = Object.entries(images);

    const GITHUB_BODY_LIMIT = 65536;

    const handleSubmit = async () => {
        setSubmitting(true);
        const baseBody = [
            `**Author:** ${authorName}`,
            notes ? `**Notes:** ${notes}` : null,
            '```choicescript',
            serializedText,
            '```',
        ].filter(Boolean).join('\n\n');

        // Re-compress images aggressively (300px, 0.5 quality) just for the issue body.
        // Stored copies stay at full quality for in-app display.
        const smallEntries = await Promise.all(
            imageEntries.map(async ([name, data]) => [name, await compressImage(data, 300, 0.5)] as const)
        );
        const imageBlocks = smallEntries
            .map(([name, data]) => `### Image: ${name}\n<details><summary>base64 data</summary>\n\n${data}\n</details>`)
            .join('\n\n');

        const fullBody = imageBlocks ? `${baseBody}\n\n${imageBlocks}` : baseBody;
        const body = fullBody.length <= GITHUB_BODY_LIMIT ? fullBody : baseBody;

        try {
            await fileGitHubIssue(`[new-story] ${title}`, body);
            setDone(true);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setDone(false);
        setSubmitError(null);
        setNotes('');
        setLicenseChecked(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Submit to GitHub</DialogTitle>
            <DialogContent>
                {done ? (
                    <>
                        <Typography variant="h6" sx={{ mt: 1, mb: 0.5 }}>Submitted!</Typography>
                        <Typography color="text.secondary">Check back soon — your story will be shared at the next Publishing Party.</Typography>
                    </>
                ) : (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {titleMissing && <Alert severity="error">Story title is required — fill it in Story Info.</Alert>}
                        {authorMissing && <Alert severity="error">Author name is required — fill it in Story Info.</Alert>}
                        {errors.length > 0 && <Alert severity="error">Story has flow errors that must be fixed first: {errors[0]}</Alert>}
                        {errors.length === 0 && warnings.length > 0 && <Alert severity="warning">{warnings[0]}</Alert>}
                        {submitError && <Alert severity="error">{submitError}</Alert>}

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Story Content</Typography>
                            <TextField
                                value={serializedText}
                                multiline
                                rows={10}
                                fullWidth
                                InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 12 } }}
                            />
                        </Box>

                        {imageEntries.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Images ({imageEntries.length})
                                </Typography>
                                <Stack direction="row" flexWrap="wrap" gap={1.5}>
                                    {imageEntries.map(([name, data]) => (
                                        <Box key={name} sx={{ textAlign: 'center', maxWidth: 80 }}>
                                            <img
                                                src={data}
                                                alt={name}
                                                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, display: 'block', border: '1px solid #e0e0e0' }}
                                            />
                                            <Typography
                                                variant="caption"
                                                display="block"
                                                sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {name}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        <TextField
                            label="Notes (optional)"
                            multiline
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            fullWidth
                        />
                        <FormControlLabel
                            control={<Checkbox checked={licenseChecked} onChange={e => setLicenseChecked(e.target.checked)} />}
                            label="I wrote this story and all images included are my own. I release everything under Creative Commons Attribution 4.0 (CC BY 4.0) — anyone may share or adapt it as long as they credit me."
                        />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{done ? 'Close' : 'Cancel'}</Button>
                {!done && (
                    <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
                        {submitting ? 'Submitting…' : 'Submit'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

// ─── Main component ───────────────────────────────────────────────────────

interface Props {
    story: MyStory;
    onStoryChange: (updated: MyStory) => void;
}

export function MyStoryFlowPanel({ story, onStoryChange }: Props) {
    const [nodes, setNodes] = useState<Node<NodeData>[]>(story.nodes);
    const [edges, setEdges] = useState<Edge[]>(story.edges);
    const [images, setImages] = useState<Record<string, string>>(story.images);

    const [title, setTitle] = useState(story.title);
    const [authorName, setAuthorName] = useState(story.authorName);
    const [authorBio, setAuthorBio] = useState(story.authorBio ?? '');
    const [authorPhoto, setAuthorPhoto] = useState(story.authorPhoto ?? '');
    const [coverImage, setCoverImage] = useState(story.coverImage ?? '');

    const [metaOpen, setMetaOpen] = useState(false);
    const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [snackbar, setSnackbar] = useState<{ msg: string; severity: 'success' | 'warning' | 'error' | 'info' } | null>(null);
    const [editingNode, setEditingNode] = useState<Node<NodeData> | null>(null);
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
    const [connectionLabel, setConnectionLabel] = useState('');
    const [addNodeOpen, setAddNodeOpen] = useState(false);
    const [newNodeContent, setNewNodeContent] = useState('');
    const [newNodeType, setNewNodeType] = useState<'passage' | 'ending'>('passage');
    const [submitOpen, setSubmitOpen] = useState(false);

    const uidRef = useRef(1000);
    const savingResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const storyId = story.id;
    const onStoryChangeRef = useRef(onStoryChange);
    // eslint-disable-next-line react-hooks/refs
    onStoryChangeRef.current = onStoryChange;
    const storyRef = useRef(story);
    // eslint-disable-next-line react-hooks/refs
    storyRef.current = story;

    const completeSave = (patch: Parameters<typeof updateMyStory>[1]) => {
        try {
            updateMyStory(storyId, patch);
        } catch {
            setSnackbar({ msg: 'Storage full — images may not be saved. Try removing some images.', severity: 'error' });
            setSaving('idle');
            return;
        }
        if (storyRef.current) onStoryChangeRef.current({ ...storyRef.current, ...patch, updatedAt: Date.now() });
        setSaving('saved');
        if (savingResetRef.current) clearTimeout(savingResetRef.current);
        savingResetRef.current = setTimeout(() => setSaving('idle'), 3000);
    };

    // Auto-save flow (nodes, edges, images)
    const isFirstFlowRender = useRef(true);
    useEffect(() => {
        if (isFirstFlowRender.current) { isFirstFlowRender.current = false; return; }
        setSaving('saving');
        const timer = setTimeout(() => completeSave({ nodes, edges, images }), 1000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, images, storyId]);

    // Auto-save metadata
    const isFirstMetaRender = useRef(true);
    useEffect(() => {
        if (isFirstMetaRender.current) { isFirstMetaRender.current = false; return; }
        setSaving('saving');
        const timer = setTimeout(() => completeSave({
            title,
            authorName,
            authorBio: authorBio || undefined,
            authorPhoto: authorPhoto || undefined,
            coverImage: coverImage || undefined,
        }), 1000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, authorName, authorBio, authorPhoto, coverImage, storyId]);

    const { errors: liveErrors, warnings: liveWarnings } = useMemo(() => validateFlow(nodes, edges), [nodes, edges]);

    const onEdgeClick = useCallback((edgeId: string) => {
        setEditingEdge(prev => edges.find(e => e.id === edgeId) ?? prev);
    }, [edges]);
    const edgeCtx = useMemo(() => ({ onEdgeClick }), [onEdgeClick]);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes(prev => applyNodeChanges(changes, prev) as Node<NodeData>[]);
    }, []);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        setEdges(prev => applyEdgeChanges(changes, prev));
    }, []);

    const onConnect = useCallback((connection: Connection) => {
        if (connection.source) {
            const isStart = nodes.find(n => n.id === connection.source)?.type === 'start';
            const alreadyHasEdge = edges.some(e => e.source === connection.source);
            if (isStart && alreadyHasEdge) {
                setSnackbar({ msg: 'The Start node can only connect to one Story Part.', severity: 'warning' });
                return;
            }
        }
        setPendingConnection(connection);
        setConnectionLabel('');
    }, [nodes, edges]);

    const confirmConnection = () => {
        if (!pendingConnection?.source || !pendingConnection?.target) return;
        setEdges(prev => [...prev, {
            id: `e-${uidRef.current++}`,
            source: pendingConnection.source!,
            target: pendingConnection.target!,
            label: connectionLabel || undefined,
        }]);
        setPendingConnection(null);
    };

    const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
        if (node.type === 'start') {
            setSnackbar({ msg: 'The Start node cannot be edited — connect it to your first Story Part.', severity: 'info' });
            return;
        }
        setEditingNode(node as Node<NodeData>);
    }, []);

    const handleNodeSave = (nodeId: string, content: string, type: 'passage' | 'ending') => {
        setNodes(prev => prev.map(n => {
            if (n.id !== nodeId) return n;
            const label = content.replace(/\s+/g, ' ').trim().slice(0, 58) || (n.data.label as string);
            return { ...n, type, data: { ...n.data, content, label } };
        }));
    };

    const handleNodeDelete = (nodeId: string) => {
        setNodes(prev => prev.filter(n => n.id !== nodeId));
        setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    };

    const handleEdgeSave = (edgeId: string, label: string) => {
        setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, label: label || undefined } : e));
    };

    const handleEdgeDelete = (edgeId: string) => {
        setEdges(prev => prev.filter(e => e.id !== edgeId));
    };

    const handleAddImage = (filename: string, dataUrl: string) => {
        setImages(prev => ({ ...prev, [filename]: dataUrl }));
    };

    const handleDeleteImage = (filename: string) => {
        setImages(prev => { const next = { ...prev }; delete next[filename]; return next; });
        const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\n?\\*image\\s+${escaped}`, 'g');
        setNodes(prev => prev.map(n => ({
            ...n,
            data: { ...n.data, content: ((n.data.content as string) ?? '').replace(regex, '') },
        })));
    };

    const handleAddNode = () => {
        const id = `n-new-${uidRef.current++}`;
        setNodes(prev => [...prev, {
            id,
            type: newNodeType,
            position: { x: 200, y: 200 },
            data: {
                label: newNodeContent.replace(/\s+/g, ' ').trim().slice(0, 58) || 'New Story Part',
                content: newNodeContent,
            },
        }]);
        setAddNodeOpen(false);
        setNewNodeContent('');
        setNewNodeType('passage');
    };

    const handleAutoLayout = () => {
        setNodes(prev => applyTreeLayout(prev, edges));
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const compressed = await compressImage(ev.target?.result as string);
            setter(compressed);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <EdgeCtx.Provider value={edgeCtx}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Toolbar */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
                    borderBottom: 1, borderColor: 'divider', flexShrink: 0, flexWrap: 'wrap',
                }}>
                    <Button
                        size="small"
                        onClick={() => setMetaOpen(o => !o)}
                        endIcon={metaOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                        Story Info
                    </Button>
                    <Button size="small" startIcon={<AccountTreeIcon />} onClick={handleAutoLayout}>
                        Auto Layout
                    </Button>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setAddNodeOpen(true)}>
                        Add New Part
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" startIcon={<GitHubIcon />} onClick={() => setSubmitOpen(true)}>
                        Submit to GitHub
                    </Button>
                    {saving === 'saving' && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Saving…</Typography>
                    )}
                    {saving === 'saved' && (
                        <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>Saved ✓</Typography>
                    )}
                </Box>

                {/* Metadata panel */}
                {metaOpen && (
                    <Box sx={{
                        px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider',
                        bgcolor: 'grey.50', display: 'flex', flexWrap: 'wrap', gap: 2,
                        alignItems: 'flex-start', flexShrink: 0,
                    }}>
                        <TextField
                            label="Title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            size="small"
                            sx={{ minWidth: { xs: '100%', sm: 200 } }}
                        />
                        <TextField
                            label="Author Name"
                            value={authorName}
                            onChange={e => setAuthorName(e.target.value)}
                            required
                            size="small"
                            sx={{ minWidth: { xs: '100%', sm: 200 } }}
                        />
                        <TextField
                            label="Author Bio (optional)"
                            value={authorBio}
                            onChange={e => setAuthorBio(e.target.value)}
                            multiline
                            rows={2}
                            size="small"
                            sx={{ minWidth: { xs: '100%', sm: 300 }, flex: 1 }}
                        />

                        {/* Author photo */}
                        <Box>
                            <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>
                                Author Photo
                            </Typography>
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg"
                                ref={photoInputRef}
                                style={{ display: 'none' }}
                                onChange={e => handlePhotoUpload(e, setAuthorPhoto)}
                            />
                            {authorPhoto ? (
                                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                    <img
                                        src={authorPhoto}
                                        alt="author"
                                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => setAuthorPhoto('')}
                                        sx={{
                                            position: 'absolute', top: -8, right: -8,
                                            bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.25,
                                            '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                                        }}>
                                        <CloseIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                            ) : (
                                <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={() => photoInputRef.current?.click()}>
                                    Upload
                                </Button>
                            )}
                        </Box>

                        {/* Cover image */}
                        <Box>
                            <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>
                                Cover Image
                            </Typography>
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg"
                                ref={coverInputRef}
                                style={{ display: 'none' }}
                                onChange={e => handlePhotoUpload(e, setCoverImage)}
                            />
                            {coverImage ? (
                                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                    <img
                                        src={coverImage}
                                        alt="cover"
                                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => setCoverImage('')}
                                        sx={{
                                            position: 'absolute', top: -8, right: -8,
                                            bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.25,
                                            '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                                        }}>
                                        <CloseIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                            ) : (
                                <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={() => coverInputRef.current?.click()}>
                                    Upload
                                </Button>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Validation banner */}
                {liveErrors.length > 0 && (
                    <Alert severity="error" sx={{ borderRadius: 0, flexShrink: 0 }}>
                        Story has errors — fix before submitting: {liveErrors[0]}
                    </Alert>
                )}
                {liveErrors.length === 0 && liveWarnings.length > 0 && (
                    <Alert severity="warning" sx={{ borderRadius: 0, flexShrink: 0 }}>
                        {liveWarnings[0]}
                    </Alert>
                )}

                {/* Canvas */}
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        defaultEdgeOptions={defaultEdgeOptions}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        nodesDraggable
                        nodesConnectable
                        elementsSelectable
                        snapToGrid
                        snapGrid={[20, 20]}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        panOnScroll>
                        <Background />
                        <Controls showInteractive={false} />
                        <MiniMap />
                    </ReactFlow>
                </Box>
            </Box>

            {/* Node edit dialog */}
            {editingNode && (
                <NodeEditDialog
                    node={editingNode}
                    images={images}
                    onClose={() => setEditingNode(null)}
                    onSave={handleNodeSave}
                    onDelete={handleNodeDelete}
                    onAddImage={handleAddImage}
                    onDeleteImage={handleDeleteImage}
                />
            )}

            {/* Edge edit dialog */}
            {editingEdge && (
                <EdgeEditDialog
                    edge={editingEdge}
                    onClose={() => setEditingEdge(null)}
                    onSave={handleEdgeSave}
                    onDelete={handleEdgeDelete}
                />
            )}

            {/* Connection label dialog */}
            <Dialog open={!!pendingConnection} onClose={() => setPendingConnection(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Choice text</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Choice text for this connection"
                        value={connectionLabel}
                        onChange={e => setConnectionLabel(e.target.value)}
                        fullWidth
                        autoFocus
                        sx={{ mt: 1 }}
                        helperText='Leave blank to default to "Continue"'
                        onKeyDown={e => { if (e.key === 'Enter') confirmConnection(); }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingConnection(null)}>Cancel</Button>
                    <Button variant="contained" onClick={confirmConnection}>Add</Button>
                </DialogActions>
            </Dialog>

            {/* Add node dialog */}
            <Dialog open={addNodeOpen} onClose={() => setAddNodeOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Part</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Content"
                            multiline
                            rows={4}
                            value={newNodeContent}
                            onChange={e => setNewNodeContent(e.target.value)}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={newNodeType}
                                label="Type"
                                onChange={e => setNewNodeType(e.target.value as 'passage' | 'ending')}>
                                <MenuItem value="passage">Passage</MenuItem>
                                <MenuItem value="ending">Ending</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddNodeOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddNode}>Add</Button>
                </DialogActions>
            </Dialog>

            {/* Submit dialog */}
            <SubmitDialog
                open={submitOpen}
                title={title}
                authorName={authorName}
                nodes={nodes}
                edges={edges}
                images={images}
                onClose={() => setSubmitOpen(false)}
            />

            {/* Snackbar */}
            <Snackbar
                open={!!snackbar}
                autoHideDuration={5000}
                onClose={() => setSnackbar(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert
                    severity={snackbar?.severity ?? 'info'}
                    onClose={() => setSnackbar(null)}
                    action={<IconButton size="small" onClick={() => setSnackbar(null)}><CloseIcon fontSize="small" /></IconButton>}>
                    {snackbar?.msg}
                </Alert>
            </Snackbar>
        </EdgeCtx.Provider>
    );
}
