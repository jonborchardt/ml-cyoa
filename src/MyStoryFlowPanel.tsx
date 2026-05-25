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
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControlLabel, IconButton, MenuItem, Select, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GitHubIcon from '@mui/icons-material/GitHub';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HubIcon from '@mui/icons-material/Hub';
import MapIcon from '@mui/icons-material/Map';
import RedoIcon from '@mui/icons-material/Redo';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UndoIcon from '@mui/icons-material/Undo';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import { useNavigate } from 'react-router-dom';
import { updateMyStory, type MyStory, type SceneDef, type SubroutineDef } from './myStoryStore';
import { applyTreeLayout, NODE_W } from './parseGameFlow';
import type { NodeData } from './parseGameFlow';
import { validateStory } from './validateFlow';
import { serializeStory } from './serializeStory';
import { fileGitHubIssue } from './github';
import { NodeEditDialog } from './NodeEditDialog';
import { EdgeEditDialog } from './EdgeEditDialog';
import { VariableManagerPanel } from './VariableManagerPanel';
import { NodePalette } from './NodePalette';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { FakeChoiceNode } from './nodes/FakeChoiceNode';
import { InputNode } from './nodes/InputNode';
import { RandomBranchNode } from './nodes/RandomBranchNode';
import { PageBreakNode } from './nodes/PageBreakNode';
import { SceneJumpNode } from './nodes/SceneJumpNode';
import { SceneLabelNode } from './nodes/SceneLabelNode';
import { CheckAchievementsNode } from './nodes/CheckAchievementsNode';
import { GosubCallNode } from './nodes/GosubCallNode';
import { SubroutineEntryNode } from './nodes/SubroutineEntryNode';
import { SubroutineReturnNode } from './nodes/SubroutineReturnNode';
import { CommentNode } from './nodes/CommentNode';
import { ImageNode } from './nodes/ImageNode';
import { DelayBreakNode } from './nodes/DelayBreakNode';
import { GotoRandomSceneNode } from './nodes/GotoRandomSceneNode';
import { SceneTabBar } from './SceneTabBar';
import { SceneJumpEditDialog } from './SceneJumpEditDialog';
import { GosubCallEditDialog } from './GosubCallEditDialog';
import { ImageEditDialog } from './ImageEditDialog';
import { GotoRandomSceneEditDialog } from './GotoRandomSceneEditDialog';
import { SubroutineGroupManager } from './SubroutineGroupManager';
import { StatsDesigner } from './StatsDesigner';
import { AchievementsDesigner } from './AchievementsDesigner';
import { useUndoableState } from './useUndoableState';
import { compressImage } from './imageUtils';
import { MonacoEditor } from './MonacoEditor';
import { RawCodeEditDialog } from './RawCodeEditDialog';
import { RawCodeNode } from './nodes/RawCodeNode';
import { parseScene } from './parseChoiceScript';
import { serializeFlow } from './serializeFlow';
import { ExportMenu } from './ExportMenu';
import { FindReplacePanel } from './FindReplacePanel';
import { StoryStatsDrawer } from './StoryStatsDrawer';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import type { VariableDef, NodeType, EdgeData, SceneJumpData, StatEntry, Achievement } from './types';

type EditorMode = 'graph' | 'code' | 'split';

// ─── Context for edge click ───────────────────────────────────────────────

const EdgeCtx = createContext<{ onEdgeClick: (id: string) => void }>({ onEdgeClick: () => {} });

// ─── Built-in node styles ─────────────────────────────────────────────────

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
    const preview = ((data.content as string) ?? '').trim().slice(0, 200) || undefined;
    return (
        <div title={preview} style={{ ...nodeStyle, background: '#fff', border: '1.5px solid #90caf9' }}>
            <Handle type="target" position={Position.Top} style={{ background: '#90caf9' }} />
            {data.label as string}
            <Handle type="source" position={Position.Bottom} style={{ background: '#90caf9' }} />
        </div>
    );
}

function EndingNode({ data }: NodeProps) {
    const preview = ((data.content as string) ?? '').trim().slice(0, 200) || undefined;
    return (
        <div title={preview} style={{ ...nodeStyle, background: '#fff8e1', border: '1.5px solid #ffb74d', color: '#5d3a00' }}>
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

const nodeTypes = {
    start: StartNode,
    passage: PassageNode,
    ending: EndingNode,
    condition: ConditionNode,
    action: ActionNode,
    fake_choice: FakeChoiceNode,
    input: InputNode,
    random_branch: RandomBranchNode,
    page_break: PageBreakNode,
    delay_break: DelayBreakNode,
    scene_jump: SceneJumpNode,
    scene_label: SceneLabelNode,
    check_achievements: CheckAchievementsNode,
    gosub: GosubCallNode,
    subroutine_entry: SubroutineEntryNode,
    subroutine_return: SubroutineReturnNode,
    raw_code: RawCodeNode,
    comment: CommentNode,
    image: ImageNode,
    goto_random_scene: GotoRandomSceneNode,
};
const edgeTypes = { flow: FlowEdge };
const defaultEdgeOptions = { type: 'flow' };

// ─── Graph snapshot type for undo ─────────────────────────────────────────

interface GraphSnapshot {
    nodes: Node<NodeData>[];
    edges: Edge[];
}

// ─── Submit dialog ────────────────────────────────────────────────────────

interface SubmitDialogProps { open: boolean; story: MyStory; onClose: () => void; }

function SubmitDialog({ open, story, onClose }: SubmitDialogProps) {
    const [notes, setNotes] = useState('');
    const [licenseChecked, setLicenseChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { errors, warnings } = validateStory(story);
    const titleMissing = !story.title.trim();
    const authorMissing = !story.authorName.trim();
    const canSubmit = !titleMissing && !authorMissing && errors.length === 0 && licenseChecked && !submitting;

    const serializedFiles = useMemo(() => serializeStory(story), [story]);
    const startupText = serializedFiles.get(story.sceneOrder[0] ?? story.scenes[0]?.id ?? 'startup') ?? '';
    const imageEntries = Object.entries(story.images);

    const handleSubmit = async () => {
        setSubmitting(true);
        const allSceneText = [...serializedFiles.entries()]
            .map(([id, text]) => `\`\`\`choicescript\n// ${id}.txt\n${text}\n\`\`\``)
            .join('\n\n');
        const baseBody = [
            `**Author:** ${story.authorName}`,
            notes ? `**Notes:** ${notes}` : null,
            allSceneText,
        ].filter(Boolean).join('\n\n');
        const smallEntries = await Promise.all(imageEntries.map(async ([name, data]) => [name, await compressImage(data, 300, 0.5)] as const));
        const imageBlocks = smallEntries.map(([name, data]) => `### Image: ${name}\n<details><summary>base64 data</summary>\n\n${data}\n</details>`).join('\n\n');
        const fullBody = imageBlocks ? `${baseBody}\n\n${imageBlocks}` : baseBody;
        const body = fullBody.length <= 65536 ? fullBody : baseBody;
        try {
            await fileGitHubIssue(`[new-story] ${story.title}`, body);
            setDone(true);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => { setDone(false); setSubmitError(null); setNotes(''); setLicenseChecked(false); onClose(); };

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
                        {titleMissing && <Alert severity="error">Story title is required.</Alert>}
                        {authorMissing && <Alert severity="error">Author name is required.</Alert>}
                        {errors.length > 0 && <Alert severity="error">{errors[0].message}</Alert>}
                        {errors.length === 0 && warnings.length > 0 && <Alert severity="warning">{warnings[0].message}</Alert>}
                        {submitError && <Alert severity="error">{submitError}</Alert>}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                Story Content ({serializedFiles.size} scene{serializedFiles.size !== 1 ? 's' : ''})
                            </Typography>
                            <TextField value={startupText} multiline rows={10} fullWidth InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 12 } }} />
                        </Box>
                        {imageEntries.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Images ({imageEntries.length})</Typography>
                                <Stack direction="row" flexWrap="wrap" gap={1.5}>
                                    {imageEntries.map(([name, data]) => (
                                        <Box key={name} sx={{ textAlign: 'center', maxWidth: 80 }}>
                                            <img src={data} alt={name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, display: 'block', border: '1px solid #e0e0e0' }} />
                                            <Typography variant="caption" display="block" sx={{ mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        <TextField label="Notes (optional)" multiline rows={3} value={notes} onChange={e => setNotes(e.target.value)} fullWidth />
                        <FormControlLabel
                            control={<Checkbox checked={licenseChecked} onChange={e => setLicenseChecked(e.target.checked)} />}
                            label="I wrote this story and all images included are my own. I release everything under CC BY 4.0."
                        />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{done ? 'Close' : 'Cancel'}</Button>
                {!done && <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>{submitting ? 'Submitting…' : 'Submit'}</Button>}
            </DialogActions>
        </Dialog>
    );
}

// ─── Main component ───────────────────────────────────────────────────────

interface Props { story: MyStory; onStoryChange: (updated: MyStory) => void; }

export function MyStoryFlowPanel({ story, onStoryChange }: Props) {
    const navigate = useNavigate();

    const initialSceneId = story.sceneOrder[0] ?? story.scenes[0]?.id ?? 'startup';
    const initialScene = story.scenes.find(s => s.id === initialSceneId) ?? story.scenes[0];

    const graph = useUndoableState<GraphSnapshot>({
        nodes: initialScene?.nodes ?? [],
        edges: initialScene?.edges ?? [],
    });
    const { nodes, edges } = graph.state;
    const setGraph = useCallback((n: Node<NodeData>[], e: Edge[]) => graph.set({ nodes: n, edges: e }), [graph]);

    const [activeSceneId, setActiveSceneId] = useState(initialSceneId);

    const [images, setImages] = useState<Record<string, string>>(story.images);
    const [variables, setVariables] = useState<VariableDef[]>(story.variables ?? []);
    const [statChart, setStatChart] = useState<StatEntry[]>(story.statChart ?? []);
    const [achievements, setAchievements] = useState<Achievement[]>(story.achievements ?? []);
    const [subroutines, setSubroutines] = useState<SubroutineDef[]>(initialScene?.subroutines ?? []);
    const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>(story.layoutDirection ?? 'TB');
    const [sceneGlobalReuseMode, setSceneGlobalReuseMode] = useState<'hide' | 'disable' | undefined>(initialScene?.globalReuseMode);

    const [title, setTitle] = useState(story.title);
    const [authorName, setAuthorName] = useState(story.authorName);
    const [authorBio, setAuthorBio] = useState(story.authorBio ?? '');
    const [authorPhoto, setAuthorPhoto] = useState(story.authorPhoto ?? '');
    const [coverImage, setCoverImage] = useState(story.coverImage ?? '');
    const [ifid, setIfid] = useState(story.ifid ?? '');

    const [metaOpen, setMetaOpen] = useState(false);
    const [varPanelOpen, setVarPanelOpen] = useState(false);
    const [statsPanelOpen, setStatsPanelOpen] = useState(false);
    const [subroutineManagerOpen, setSubroutineManagerOpen] = useState(false);
    const [paletteAnchor, setPaletteAnchor] = useState<HTMLElement | null>(null);
    const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [snackbar, setSnackbar] = useState<{ msg: string; severity: 'success' | 'warning' | 'error' | 'info' } | null>(null);
    const [editingNode, setEditingNode] = useState<Node<NodeData> | null>(null);
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [editingSceneJump, setEditingSceneJump] = useState<Node<NodeData> | null>(null);
    const [editingGosub, setEditingGosub] = useState<Node<NodeData> | null>(null);
    const [editingRawCode, setEditingRawCode] = useState<Node<NodeData> | null>(null);
    const [editingImage, setEditingImage] = useState<Node<NodeData> | null>(null);
    const [editingGotoRandom, setEditingGotoRandom] = useState<Node<NodeData> | null>(null);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
    const [connectionLabel, setConnectionLabel] = useState('');
    const [submitOpen, setSubmitOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<EditorMode>('graph');
    const [codeText, setCodeText] = useState('');
    const [unsupportedBanner, setUnsupportedBanner] = useState(false);
    // Power UX state
    const [showMinimap, setShowMinimap] = useState(true);
    const [findOpen, setFindOpen] = useState(false);
    const [statsDrawerOpen, setStatsDrawerOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [pendingBulkDelete, setPendingBulkDelete] = useState<string[] | null>(null);

    const uidRef = useRef(1000);
    const savingResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const storyId = story.id;
    const onStoryChangeRef = useRef(onStoryChange);
    const storyRef = useRef(story);
    const activeSceneIdRef = useRef(activeSceneId);
    // Refs for stable keyboard handler closures
    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    const editorModeRef = useRef(editorMode);
    const layoutDirRef = useRef(layoutDirection);
    const setGraphRef = useRef(setGraph);
    const sceneGlobalReuseModeRef = useRef(sceneGlobalReuseMode);

    useLayoutEffect(() => {
        onStoryChangeRef.current = onStoryChange;
        storyRef.current = story;
        activeSceneIdRef.current = activeSceneId;
        nodesRef.current = nodes;
        edgesRef.current = edges;
        editorModeRef.current = editorMode;
        layoutDirRef.current = layoutDirection;
        setGraphRef.current = setGraph;
        sceneGlobalReuseModeRef.current = sceneGlobalReuseMode;
    });

    const buildUpdatedScenes = useCallback((n: Node<NodeData>[], e: Edge[], sceneId: string, subs?: SubroutineDef[]) => {
        const grm = sceneGlobalReuseModeRef.current;
        return storyRef.current.scenes.map(s => {
            if (s.id !== sceneId) return s;
            const updated = { ...s, nodes: n, edges: e, subroutines: subs ?? s.subroutines ?? [] };
            if (grm) updated.globalReuseMode = grm;
            else delete updated.globalReuseMode;
            return updated;
        });
    }, []);

    const completeSave = useCallback((patch: Parameters<typeof updateMyStory>[1]) => {
        try {
            updateMyStory(storyId, patch);
        } catch {
            setSnackbar({ msg: 'Storage full — images may not be saved.', severity: 'error' });
            setSaving('idle');
            return;
        }
        if (storyRef.current) onStoryChangeRef.current({ ...storyRef.current, ...patch, updatedAt: Date.now() });
        setSaving('saved');
        if (savingResetRef.current) clearTimeout(savingResetRef.current);
        savingResetRef.current = setTimeout(() => setSaving('idle'), 3000);
    }, [storyId]);

    // Auto-save graph (debounced 1s)
    const isFirstGraphRender = useRef(true);
    useEffect(() => {
        if (isFirstGraphRender.current) { isFirstGraphRender.current = false; return; }
        setSaving('saving');
        const sceneId = activeSceneIdRef.current;
        const timer = setTimeout(() => {
            const updatedScenes = buildUpdatedScenes(nodes, edges, sceneId, subroutines);
            completeSave({ scenes: updatedScenes, images, variables, statChart, achievements });
        }, 1000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, images, variables, statChart, achievements, subroutines, sceneGlobalReuseMode, storyId]);

    // Auto-save metadata (debounced 1s)
    const isFirstMetaRender = useRef(true);
    useEffect(() => {
        if (isFirstMetaRender.current) { isFirstMetaRender.current = false; return; }
        setSaving('saving');
        const timer = setTimeout(() => completeSave({
            title, authorName,
            authorBio: authorBio || undefined,
            authorPhoto: authorPhoto || undefined,
            coverImage: coverImage || undefined,
            ifid: ifid || undefined,
        }), 1000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, authorName, authorBio, authorPhoto, coverImage, ifid, storyId]);

    // ─── Keyboard shortcuts ─────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const active = document.activeElement;
            const isTyping = active instanceof HTMLInputElement
                || active instanceof HTMLTextAreaElement
                || !!(active as HTMLElement)?.isContentEditable;

            const ctrl = e.metaKey || e.ctrlKey;
            const curNodes = nodesRef.current;
            const curEdges = edgesRef.current;
            const setG = setGraphRef.current;

            // Undo / Redo
            if (ctrl && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (graph.canUndo) graph.undo();
                return;
            }
            if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (graph.canRedo) graph.redo();
                return;
            }

            // Auto-layout
            if (ctrl && e.key === 'l') {
                e.preventDefault();
                setG(applyTreeLayout(curNodes, curEdges, layoutDirRef.current), curEdges);
                return;
            }

            // Find / replace
            if (ctrl && e.key === 'f') {
                e.preventDefault();
                setFindOpen(o => !o);
                return;
            }

            // Toggle code / graph mode
            if (ctrl && e.key === 'e') {
                e.preventDefault();
                // Delegate to switchToMode via ref — capture the latest version
                const nextMode = editorModeRef.current === 'graph' ? 'code' : 'graph';
                // We call the setter-based version to avoid stale closure
                setEditorMode(prev => {
                    if (prev !== 'graph' && nextMode === 'graph') {
                        // Leaving code: parse text back to graph
                        // We can't call applyCodeToGraph here cleanly; rely on blur handler
                    }
                    return nextMode;
                });
                return;
            }

            // Duplicate selected nodes
            if (ctrl && e.key === 'd') {
                e.preventDefault();
                const selected = curNodes.filter(n => n.selected);
                if (selected.length > 0) {
                    const newIdMap = new Map<string, string>();
                    const newNodes = selected.map(n => {
                        const newId = `n-${uidRef.current++}`;
                        newIdMap.set(n.id, newId);
                        return { ...n, id: newId, selected: false, position: { x: n.position.x + 40, y: n.position.y + 40 } };
                    });
                    const selSet = new Set(selected.map(n => n.id));
                    const newEdges = curEdges
                        .filter(ed => selSet.has(ed.source) && selSet.has(ed.target))
                        .map(ed => ({ ...ed, id: `e-${uidRef.current++}`, source: newIdMap.get(ed.source)!, target: newIdMap.get(ed.target)! }));
                    setG([...curNodes, ...newNodes], [...curEdges, ...newEdges]);
                }
                return;
            }

            // Select all
            if (ctrl && e.key === 'a') {
                e.preventDefault();
                setG(curNodes.map(n => ({ ...n, selected: true })), curEdges);
                return;
            }

            // F5 — play story (switch to Story tab)
            if (e.key === 'F5') {
                e.preventDefault();
                navigate(`/my/${storyRef.current.id}`);
                return;
            }

            // ? — keyboard shortcuts help (not while typing)
            if (e.key === '?' && !ctrl && !isTyping) {
                setShortcutsOpen(true);
                return;
            }

            // N / C / A — add nodes (canvas, not while typing)
            if (!ctrl && !e.shiftKey && !isTyping) {
                if (e.key === 'n') {
                    e.preventDefault();
                    const id = `n-${uidRef.current++}`;
                    setG([...curNodes, { id, type: 'passage', position: { x: 300, y: 300 }, data: { label: 'New Story Part', content: '' } }], curEdges);
                    return;
                }
                if (e.key === 'c') {
                    e.preventDefault();
                    const id = `n-${uidRef.current++}`;
                    setG([...curNodes, { id, type: 'condition', position: { x: 300, y: 300 }, data: { label: 'Condition', content: '' } }], curEdges);
                    return;
                }
                if (e.key === 'a') {
                    e.preventDefault();
                    const id = `n-${uidRef.current++}`;
                    setG([...curNodes, { id, type: 'action', position: { x: 300, y: 300 }, data: { label: 'Action', content: '', actions: [] } }], curEdges);
                    return;
                }
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [graph, navigate]);

    const liveStory = useMemo<MyStory>(() => ({
        ...story,
        scenes: story.scenes.map(s => {
            if (s.id !== activeSceneId) return s;
            const updated = { ...s, nodes, edges, subroutines };
            if (sceneGlobalReuseMode) updated.globalReuseMode = sceneGlobalReuseMode;
            else delete updated.globalReuseMode;
            return updated;
        }),
        images, variables, statChart, achievements, title, authorName,
        authorBio: authorBio || undefined,
        authorPhoto: authorPhoto || undefined,
        coverImage: coverImage || undefined,
        ifid: ifid || undefined,
    }), [story, activeSceneId, nodes, edges, subroutines, sceneGlobalReuseMode, images, variables, statChart, achievements, title, authorName, authorBio, authorPhoto, coverImage, ifid]);

    const { errors: liveErrors, warnings: liveWarnings } = useMemo(() => validateStory(liveStory), [liveStory]);

    // ─── Scene management ───────────────────────────────────────────────────

    const switchScene = useCallback((sceneId: string) => {
        const updatedScenes = buildUpdatedScenes(nodes, edges, activeSceneId, subroutines);
        completeSave({ scenes: updatedScenes });
        const newScene = storyRef.current.scenes.find(s => s.id === sceneId);
        if (!newScene) return;
        setActiveSceneId(sceneId);
        setSubroutines(newScene.subroutines ?? []);
        setSceneGlobalReuseMode(newScene.globalReuseMode);
        graph.reset({ nodes: newScene.nodes, edges: newScene.edges });
        isFirstGraphRender.current = true;
    }, [nodes, edges, activeSceneId, subroutines, buildUpdatedScenes, completeSave, graph]);

    const handleAddScene = () => {
        const id = `scene_${uidRef.current++}`;
        const newScene: SceneDef = {
            id,
            name: `Scene ${story.scenes.length + 1}`,
            nodes: [
                { id: `${id}_start`, type: 'start', position: { x: 200, y: 0 }, data: { label: 'Start', content: '' } },
            ],
            edges: [],
            subroutines: [],
        };
        const updatedScenes = [...buildUpdatedScenes(nodes, edges, activeSceneId, subroutines), newScene];
        const updatedOrder = [...story.sceneOrder, id];
        completeSave({ scenes: updatedScenes, sceneOrder: updatedOrder });
        setActiveSceneId(id);
        setSubroutines([]);
        graph.reset({ nodes: newScene.nodes, edges: newScene.edges });
        isFirstGraphRender.current = true;
    };

    const handleDeleteScene = (sceneId: string) => {
        if (sceneId === story.sceneOrder[0]) return;
        const updatedScenes = story.scenes.filter(s => s.id !== sceneId);
        const updatedOrder = story.sceneOrder.filter(id => id !== sceneId);
        completeSave({ scenes: updatedScenes, sceneOrder: updatedOrder });
        if (sceneId === activeSceneId) {
            const fallback = updatedScenes[0];
            if (fallback) {
                setActiveSceneId(fallback.id);
                setSubroutines(fallback.subroutines ?? []);
                graph.reset({ nodes: fallback.nodes, edges: fallback.edges });
                isFirstGraphRender.current = true;
            }
        }
    };

    const handleRenameScene = (sceneId: string, name: string) => {
        const updatedScenes = story.scenes.map(s => s.id === sceneId ? { ...s, name } : s);
        completeSave({ scenes: updatedScenes });
    };

    const handleReorderScenes = (newOrder: string[]) => {
        completeSave({ sceneOrder: newOrder });
    };

    // ─── Layout direction ───────────────────────────────────────────────────

    const handleToggleLayoutDir = () => {
        const newDir: 'TB' | 'LR' = layoutDirection === 'TB' ? 'LR' : 'TB';
        setLayoutDirection(newDir);
        setGraph(applyTreeLayout(nodes, edges, newDir), edges);
        completeSave({ layoutDirection: newDir });
    };

    // ─── Editor mode switch helpers ─────────────────────────────────────────

    const getCodeForCurrentScene = useCallback(() => {
        return serializeFlow(nodes, edges, undefined);
    }, [nodes, edges]);

    const applyCodeToGraph = useCallback((text: string) => {
        const result = parseScene(text);
        setUnsupportedBanner(result.unsupportedSyntax);
        setGraph(result.nodes as Node<NodeData>[], result.edges);
    }, [setGraph]);

    const switchToMode = useCallback((mode: EditorMode) => {
        if (mode !== 'graph' && editorMode === 'graph') {
            setCodeText(getCodeForCurrentScene());
        }
        if (mode === 'graph' && editorMode !== 'graph') {
            applyCodeToGraph(codeText);
        }
        setEditorMode(mode);
    }, [editorMode, codeText, getCodeForCurrentScene, applyCodeToGraph]);

    const handleCodeSave = useCallback((text: string) => {
        setCodeText(text);
        applyCodeToGraph(text);
    }, [applyCodeToGraph]);

    // ─── Find & replace ─────────────────────────────────────────────────────

    const handleFindSelectNode = useCallback((sceneId: string, nodeId: string) => {
        if (sceneId !== activeSceneId) switchScene(sceneId);
        setGraph(nodes.map(n => ({ ...n, selected: n.id === nodeId })), edges);
    }, [activeSceneId, switchScene, nodes, edges, setGraph]);

    const handleFindReplaceAll = useCallback((updated: MyStory) => {
        const currentScene = updated.scenes.find(s => s.id === activeSceneId);
        if (currentScene) {
            setGraph(currentScene.nodes as Node<NodeData>[], currentScene.edges);
        }
        completeSave({ scenes: updated.scenes });
    }, [activeSceneId, setGraph, completeSave]);

    // ─── Graph handlers ─────────────────────────────────────────────────────

    const onEdgeClick = useCallback((edgeId: string) => {
        setEditingEdge(prev => edges.find(e => e.id === edgeId) ?? prev);
    }, [edges]);
    const edgeCtx = useMemo(() => ({ onEdgeClick }), [onEdgeClick]);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        const removes = changes.filter(c => c.type === 'remove');
        const rest = changes.filter(c => c.type !== 'remove');

        // Confirm bulk delete for > 3 nodes
        if (removes.length > 3) {
            setPendingBulkDelete(removes.map(c => (c as { id: string }).id));
            if (rest.length > 0) {
                const next = applyNodeChanges(rest, nodes) as Node<NodeData>[];
                const hasStructural = rest.some(c => c.type !== 'position' && c.type !== 'select' && c.type !== 'dimensions');
                if (hasStructural) setGraph(next, edges);
                else graph.set({ nodes: next, edges });
            }
            return;
        }

        const next = applyNodeChanges(changes, nodes) as Node<NodeData>[];
        const hasStructural = changes.some(c => c.type !== 'position' && c.type !== 'select' && c.type !== 'dimensions');
        if (hasStructural) setGraph(next, edges);
        else graph.set({ nodes: next, edges });
    }, [nodes, edges, graph, setGraph]);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        const next = applyEdgeChanges(changes, edges);
        graph.set({ nodes, edges: next });
    }, [nodes, edges, graph]);

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
        const newEdge: Edge = {
            id: `e-${uidRef.current++}`,
            source: pendingConnection.source!,
            target: pendingConnection.target!,
            sourceHandle: pendingConnection.sourceHandle ?? undefined,
            targetHandle: pendingConnection.targetHandle ?? undefined,
            label: connectionLabel || undefined,
        };
        setGraph(nodes, [...edges, newEdge]);
        setPendingConnection(null);
    };

    const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
        if (node.type === 'start') {
            setSnackbar({ msg: 'The Start node cannot be edited — connect it to your first Story Part.', severity: 'info' });
            return;
        }
        if (node.type === 'page_break' || node.type === 'delay_break' || node.type === 'check_achievements') return;
        if (node.type === 'subroutine_entry' || node.type === 'subroutine_return') return;
        if (node.type === 'scene_jump') {
            setEditingSceneJump(node as Node<NodeData>);
            return;
        }
        if (node.type === 'gosub') {
            setEditingGosub(node as Node<NodeData>);
            return;
        }
        if (node.type === 'raw_code') {
            setEditingRawCode(node as Node<NodeData>);
            return;
        }
        if (node.type === 'image') {
            setEditingImage(node as Node<NodeData>);
            return;
        }
        if (node.type === 'goto_random_scene') {
            setEditingGotoRandom(node as Node<NodeData>);
            return;
        }
        setEditingNode(node as Node<NodeData>);
    }, []);

    const handleNodeSave = (nodeId: string, updates: Partial<NodeData & { nodeType: string } & SceneJumpData>) => {
        const next = nodes.map(n => {
            if (n.id !== nodeId) return n;
            const { nodeType, content, targetScene, targetLabel, jumpType, ...rest } = updates;
            const newType = nodeType ?? n.type;
            const newContent = content !== undefined ? content : (n.data.content as string);
            const label = newContent
                ? (newContent as string).replace(/\s+/g, ' ').trim().slice(0, 58)
                : (n.data.label as string);
            const sceneJumpFields = (targetScene !== undefined || targetLabel !== undefined || jumpType !== undefined)
                ? { targetScene, targetLabel, jumpType } : {};
            return { ...n, type: newType, data: { ...n.data, ...rest, content: newContent, label, ...sceneJumpFields } };
        });
        setGraph(next, edges);
    };

    const handleNodeDelete = (nodeId: string) => {
        setGraph(
            nodes.filter(n => n.id !== nodeId),
            edges.filter(e => e.source !== nodeId && e.target !== nodeId),
        );
    };

    const handleGosubSave = (nodeId: string, updates: Partial<NodeData>) => {
        const next = nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n);
        setGraph(next, edges);
    };

    const handleEdgeSave = (edgeId: string, label: string, data: EdgeData) => {
        const next = edges.map(e => e.id === edgeId ? { ...e, label: label || undefined, data } : e);
        setGraph(nodes, next);
    };

    const handleEdgeDelete = (edgeId: string) => {
        setGraph(nodes, edges.filter(e => e.id !== edgeId));
    };

    const handleRawCodeSave = (nodeId: string, rawContent: string) => {
        const next = nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, rawContent, label: rawContent.split('\n')[0] || n.data.label } } : n);
        setGraph(next, edges);
    };

    const handleImageSave = (nodeId: string, updates: Partial<{ imageFile: string; imageAlign: string; imageAlt: string }>) => {
        const next = nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...updates, label: updates.imageFile || n.data.label } } : n);
        setGraph(next, edges);
    };

    const handleGotoRandomSave = (nodeId: string, sceneIds: string[]) => {
        const next = nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, scenes: sceneIds, label: `→ ${sceneIds.join(', ')}` || 'Random Scene Jump' } } : n);
        setGraph(next, edges);
    };

    const handleAddImage = (filename: string, dataUrl: string) => setImages(prev => ({ ...prev, [filename]: dataUrl }));

    const handleDeleteImage = (filename: string) => {
        setImages(prev => { const next = { ...prev }; delete next[filename]; return next; });
        const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\n?\\*image\\s+${escaped}`, 'g');
        setGraph(nodes.map(n => ({ ...n, data: { ...n.data, content: ((n.data.content as string) ?? '').replace(regex, '') } })), edges);
    };

    const handleAddNode = (type: NodeType) => {
        const id = `n-${uidRef.current++}`;
        const newNode: Node<NodeData> = {
            id,
            type,
            position: { x: 300, y: 300 },
            data: {
                label: type === 'page_break' ? 'Page Break'
                    : type === 'delay_break' ? 'Delay Break'
                    : type === 'check_achievements' ? 'Check Achievements'
                    : type === 'scene_jump' ? 'Scene Jump'
                    : type === 'scene_label' ? 'entry'
                    : type === 'gosub' ? 'Call Subroutine'
                    : type === 'comment' ? 'Comment'
                    : type === 'image' ? 'Image'
                    : type === 'goto_random_scene' ? 'Random Scene Jump'
                    : 'New Story Part',
                content: '',
                ...(type === 'gosub' ? { subroutineId: '', params: [] } : {}),
                ...(type === 'image' ? { imageFile: '', imageAlign: 'center', imageAlt: '' } : {}),
                ...(type === 'goto_random_scene' ? { scenes: [] } : {}),
            },
        };
        setGraph([...nodes, newNode], edges);
    };

    const handleAutoLayout = () => {
        setGraph(applyTreeLayout(nodes, edges, layoutDirection), edges);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => { const compressed = await compressImage(ev.target?.result as string); setter(compressed); };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleVariablesChange = (updated: MyStory) => setVariables(updated.variables ?? []);
    const handleStatChartChange = (updated: StatEntry[]) => setStatChart(updated);
    const handleAchievementsChange = (updated: Achievement[]) => setAchievements(updated);

    const handleConfirmBulkDelete = () => {
        if (!pendingBulkDelete) return;
        const ids = new Set(pendingBulkDelete);
        setGraph(nodes.filter(n => !ids.has(n.id)), edges.filter(e => !ids.has(e.source) && !ids.has(e.target)));
        setPendingBulkDelete(null);
    };

    const editingEdgeIsFakeChoice = useMemo(() => {
        if (!editingEdge) return false;
        return nodes.find(n => n.id === editingEdge.source)?.type === 'fake_choice';
    }, [editingEdge, nodes]);

    return (
        <EdgeCtx.Provider value={edgeCtx}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Toolbar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0, flexWrap: 'wrap' }}>
                    <Button size="small" onClick={() => setMetaOpen(o => !o)} endIcon={metaOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                        Story Info
                    </Button>
                    <Button size="small" startIcon={<DataObjectIcon />} onClick={() => setVarPanelOpen(true)}>
                        Variables{variables.length > 0 ? ` (${variables.length})` : ''}
                    </Button>
                    <Button size="small" startIcon={<BarChartIcon />} onClick={() => setStatsPanelOpen(o => !o)} endIcon={statsPanelOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                        Stats & Achievements{achievements.length > 0 ? ` (${achievements.length})` : ''}
                    </Button>
                    <Tooltip title={`Auto-layout (Ctrl+L) — ${layoutDirection === 'TB' ? 'top-to-bottom' : 'left-to-right'}`}>
                        <Button size="small" startIcon={<AccountTreeIcon />} onClick={handleAutoLayout}>
                            Auto Layout
                        </Button>
                    </Tooltip>
                    <Tooltip title={`Switch to ${layoutDirection === 'TB' ? 'left-to-right' : 'top-to-bottom'} layout`}>
                        <IconButton size="small" onClick={handleToggleLayoutDir}>
                            {layoutDirection === 'TB' ? <SwapHorizIcon fontSize="small" /> : <SwapVertIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <Button size="small" startIcon={<AddIcon />} onClick={e => setPaletteAnchor(e.currentTarget)}>
                        Add Node
                    </Button>
                    <Button size="small" onClick={() => setSubroutineManagerOpen(true)}>
                        Subroutines{subroutines.length > 0 ? ` (${subroutines.length})` : ''}
                    </Button>
                    <Tooltip title="Undo (Ctrl+Z)">
                        <span>
                            <IconButton size="small" onClick={() => graph.undo()} disabled={!graph.canUndo}>
                                <UndoIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Redo (Ctrl+Y)">
                        <span>
                            <IconButton size="small" onClick={() => graph.redo()} disabled={!graph.canRedo}>
                                <RedoIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Find & Replace (Ctrl+F)">
                        <IconButton size="small" onClick={() => setFindOpen(o => !o)} color={findOpen ? 'primary' : 'default'}>
                            <SearchIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Story statistics">
                        <IconButton size="small" onClick={() => setStatsDrawerOpen(true)}>
                            <BarChartIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={showMinimap ? 'Hide minimap' : 'Show minimap'}>
                        <IconButton size="small" onClick={() => setShowMinimap(o => !o)} color={showMinimap ? 'primary' : 'default'}>
                            <MapIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Graph mode">
                        <IconButton size="small" onClick={() => switchToMode('graph')} color={editorMode === 'graph' ? 'primary' : 'default'}>
                            <HubIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Code mode (Ctrl+E)">
                        <IconButton size="small" onClick={() => switchToMode('code')} color={editorMode === 'code' ? 'primary' : 'default'}>
                            <CodeIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Split mode">
                        <IconButton size="small" onClick={() => switchToMode('split')} color={editorMode === 'split' ? 'primary' : 'default'}>
                            <ViewSidebarIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Keyboard shortcuts (?)">
                        <IconButton size="small" onClick={() => setShortcutsOpen(true)}>
                            <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <ExportMenu story={liveStory} currentSceneId={activeSceneId} />
                    <Button size="small" startIcon={<GitHubIcon />} onClick={() => setSubmitOpen(true)}>
                        Submit to GitHub
                    </Button>
                    {saving === 'saving' && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Saving…</Typography>}
                    {saving === 'saved' && <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>Saved ✓</Typography>}
                </Box>

                {/* Metadata panel */}
                {metaOpen && (
                    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', flexShrink: 0 }}>
                        <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} required size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }} />
                        <TextField label="Author Name" value={authorName} onChange={e => setAuthorName(e.target.value)} required size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }} />
                        <TextField label="Author Bio (optional)" value={authorBio} onChange={e => setAuthorBio(e.target.value)} multiline rows={2} size="small" sx={{ minWidth: { xs: '100%', sm: 300 }, flex: 1 }} />
                        <TextField label="IFID (optional)" value={ifid} onChange={e => setIfid(e.target.value)} size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }} helperText="Interactive Fiction ID (*ifid)" />
                        <Box>
                            <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>Author Photo</Typography>
                            <input type="file" accept=".png,.jpg,.jpeg" ref={photoInputRef} style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, setAuthorPhoto)} />
                            {authorPhoto ? (
                                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                    <img src={authorPhoto} alt="author" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                                    <IconButton size="small" onClick={() => setAuthorPhoto('')} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.25, '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                                        <CloseIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                            ) : (
                                <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={() => photoInputRef.current?.click()}>Upload</Button>
                            )}
                        </Box>
                        <Box>
                            <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>Cover Image</Typography>
                            <input type="file" accept=".png,.jpg,.jpeg" ref={coverInputRef} style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, setCoverImage)} />
                            {coverImage ? (
                                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                    <img src={coverImage} alt="cover" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                                    <IconButton size="small" onClick={() => setCoverImage('')} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.25, '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                                        <CloseIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                            ) : (
                                <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={() => coverInputRef.current?.click()}>Upload</Button>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Stats & Achievements panel */}
                {statsPanelOpen && (
                    <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50', flexShrink: 0, maxHeight: 400, overflowY: 'auto' }}>
                        <Stack spacing={3}>
                            <StatsDesigner statChart={statChart} variables={variables} onChange={handleStatChartChange} />
                            <AchievementsDesigner achievements={achievements} onChange={handleAchievementsChange} />
                        </Stack>
                    </Box>
                )}

                {/* Validation banner */}
                {liveErrors.length > 0 && (
                    <Alert severity="error" sx={{ borderRadius: 0, flexShrink: 0 }}>
                        Story has errors — fix before submitting: {liveErrors[0].message}
                    </Alert>
                )}
                {liveErrors.length === 0 && liveWarnings.length > 0 && (
                    <Alert severity="warning" sx={{ borderRadius: 0, flexShrink: 0 }}>
                        {liveWarnings[0].message}
                    </Alert>
                )}
                {unsupportedBanner && (
                    <Alert severity="info" sx={{ borderRadius: 0, flexShrink: 0 }} onClose={() => setUnsupportedBanner(false)}>
                        This code contains syntax that cannot be shown visually — those nodes appear as Raw Code blocks.
                    </Alert>
                )}

                {/* Scene tab bar */}
                <SceneTabBar
                    scenes={story.scenes}
                    sceneOrder={story.sceneOrder}
                    activeSceneId={activeSceneId}
                    onSelect={switchScene}
                    onAdd={handleAddScene}
                    onDelete={handleDeleteScene}
                    onRename={handleRenameScene}
                    onReorder={handleReorderScenes}
                />

                {/* Scene-level settings */}
                <Box sx={{ px: 2, py: 0.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'grey.50', flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Global reuse:</Typography>
                    <Select
                        size="small"
                        value={sceneGlobalReuseMode ?? ''}
                        onChange={e => setSceneGlobalReuseMode((e.target.value as 'hide' | 'disable') || undefined)}
                        displayEmpty
                        sx={{ fontSize: 12, minWidth: 160 }}
                    >
                        <MenuItem value=""><em>None</em></MenuItem>
                        <MenuItem value="hide">*hide_reuse (hide used)</MenuItem>
                        <MenuItem value="disable">*disable_reuse (grey out used)</MenuItem>
                    </Select>
                    {sceneGlobalReuseMode && (
                        <Typography variant="caption" color="text.secondary">Applies to all choices in this scene</Typography>
                    )}
                </Box>

                {/* Find & Replace panel */}
                {findOpen && (
                    <FindReplacePanel
                        story={liveStory}
                        onSelectNode={handleFindSelectNode}
                        onReplaceAll={handleFindReplaceAll}
                        onClose={() => setFindOpen(false)}
                    />
                )}

                {/* Canvas / Code editor */}
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row' }}>
                    {/* Graph pane */}
                    {(editorMode === 'graph' || editorMode === 'split') && (
                        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                defaultEdgeOptions={defaultEdgeOptions}
                                fitView fitViewOptions={{ padding: 0.2 }}
                                nodesDraggable nodesConnectable elementsSelectable
                                snapToGrid snapGrid={[20, 20]}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeClick={onNodeClick}
                                panOnScroll>
                                <Background />
                                <Controls showInteractive={false} />
                                {showMinimap && (
                                    <MiniMap
                                        nodeColor={n => {
                                            const t = n.type;
                                            if (t === 'start') return '#4caf50';
                                            if (t === 'ending') return '#ffb74d';
                                            if (t === 'condition') return '#f59e0b';
                                            if (t === 'action') return '#14b8a6';
                                            if (t === 'input') return '#a855f7';
                                            if (t === 'random_branch') return '#c026d3';
                                            if (t === 'scene_jump') return '#2e7d32';
                                            if (t === 'scene_label') return '#9333ea';
                                            if (t === 'check_achievements') return '#10b981';
                                            if (t === 'raw_code') return '#f9a825';
                                            if (t === 'comment') return '#f9a825';
                                            if (t === 'gosub' || t === 'subroutine_entry' || t === 'subroutine_return') return '#7c3aed';
                                            return '#90caf9';
                                        }}
                                    />
                                )}
                            </ReactFlow>
                        </Box>
                    )}

                    {/* Divider between split panes */}
                    {editorMode === 'split' && (
                        <Box sx={{ width: 4, bgcolor: 'divider', flexShrink: 0, cursor: 'col-resize' }} />
                    )}

                    {/* Code pane */}
                    {(editorMode === 'code' || editorMode === 'split') && (
                        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                            <MonacoEditor
                                value={codeText}
                                onChange={setCodeText}
                                story={liveStory}
                                height="100%"
                                onSave={handleCodeSave}
                            />
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Node palette */}
            <NodePalette anchorEl={paletteAnchor} onClose={() => setPaletteAnchor(null)} onSelect={handleAddNode} />

            {/* Variable manager drawer */}
            <VariableManagerPanel open={varPanelOpen} story={liveStory} onChange={handleVariablesChange} onClose={() => setVarPanelOpen(false)} />

            {/* Story stats drawer */}
            <StoryStatsDrawer open={statsDrawerOpen} story={liveStory} onClose={() => setStatsDrawerOpen(false)} />

            {/* Keyboard shortcuts help */}
            <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

            {/* Node edit dialog */}
            {editingNode && (
                <NodeEditDialog
                    node={editingNode}
                    images={images}
                    variables={variables}
                    achievements={achievements}
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
                    isFakeChoice={editingEdgeIsFakeChoice}
                    onClose={() => setEditingEdge(null)}
                    onSave={handleEdgeSave}
                    onDelete={handleEdgeDelete}
                />
            )}

            {/* Scene jump edit dialog */}
            {editingSceneJump && (
                <SceneJumpEditDialog
                    node={editingSceneJump}
                    scenes={story.scenes}
                    onClose={() => setEditingSceneJump(null)}
                    onSave={handleNodeSave}
                    onDelete={handleNodeDelete}
                />
            )}

            {/* Raw code edit dialog */}
            {editingRawCode && (
                <RawCodeEditDialog
                    node={editingRawCode}
                    story={liveStory}
                    onClose={() => setEditingRawCode(null)}
                    onSave={handleRawCodeSave}
                    onDelete={handleNodeDelete}
                />
            )}

            {/* Gosub call edit dialog */}
            {editingGosub && (
                <GosubCallEditDialog
                    node={editingGosub}
                    subroutines={subroutines}
                    onClose={() => setEditingGosub(null)}
                    onSave={handleGosubSave}
                    onDelete={handleNodeDelete}
                />
            )}

            {/* Image edit dialog */}
            {editingImage && (
                <ImageEditDialog
                    node={editingImage}
                    images={images}
                    onClose={() => setEditingImage(null)}
                    onSave={handleImageSave}
                    onDelete={handleNodeDelete}
                />
            )}

            {/* Goto random scene edit dialog */}
            {editingGotoRandom && (
                <GotoRandomSceneEditDialog
                    node={editingGotoRandom}
                    scenes={story.scenes}
                    onClose={() => setEditingGotoRandom(null)}
                    onSave={handleGotoRandomSave}
                    onDelete={handleNodeDelete}
                />
            )}

            {/* Subroutine manager drawer */}
            <SubroutineGroupManager
                open={subroutineManagerOpen}
                subroutines={subroutines}
                variables={variables}
                achievements={achievements}
                onClose={() => setSubroutineManagerOpen(false)}
                onChange={setSubroutines}
            />

            {/* Connection label dialog */}
            <Dialog open={!!pendingConnection} onClose={() => setPendingConnection(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Choice text</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Choice text for this connection"
                        value={connectionLabel}
                        onChange={e => setConnectionLabel(e.target.value)}
                        fullWidth autoFocus sx={{ mt: 1 }}
                        helperText='Leave blank to default to "Continue"'
                        onKeyDown={e => { if (e.key === 'Enter') confirmConnection(); }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingConnection(null)}>Cancel</Button>
                    <Button variant="contained" onClick={confirmConnection}>Add</Button>
                </DialogActions>
            </Dialog>

            {/* Bulk delete confirmation */}
            <Dialog open={!!pendingBulkDelete} onClose={() => setPendingBulkDelete(null)} maxWidth="xs">
                <DialogTitle>Delete {pendingBulkDelete?.length} nodes?</DialogTitle>
                <DialogContent>
                    <Typography>This will remove the selected nodes and all their connections. This can be undone with Ctrl+Z.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingBulkDelete(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleConfirmBulkDelete}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Submit dialog */}
            <SubmitDialog open={submitOpen} story={liveStory} onClose={() => setSubmitOpen(false)} />

            {/* Snackbar */}
            <Snackbar open={!!snackbar} autoHideDuration={5000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar?.severity ?? 'info'} onClose={() => setSnackbar(null)}
                    action={<IconButton size="small" onClick={() => setSnackbar(null)}><CloseIcon fontSize="small" /></IconButton>}>
                    {snackbar?.msg}
                </Alert>
            </Snackbar>
        </EdgeCtx.Provider>
    );
}
