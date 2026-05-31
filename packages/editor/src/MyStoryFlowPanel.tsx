import {
    ReactFlow, Background, Controls, Handle, Position, MiniMap,
    BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
    applyNodeChanges, applyEdgeChanges,
} from '@xyflow/react';
import type {
    NodeProps, EdgeProps, Node, Edge, Connection,
    NodeChange, EdgeChange, ReactFlowInstance, Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
    Drawer, FormControlLabel, IconButton, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import HubIcon from '@mui/icons-material/Hub';
import MenuIcon from '@mui/icons-material/Menu';
import RedoIcon from '@mui/icons-material/Redo';
import SearchIcon from '@mui/icons-material/Search';
import UndoIcon from '@mui/icons-material/Undo';
import { useNavigate } from 'react-router-dom';
import { updateMyStory, type MyStory, type SceneDef, type SubroutineDef } from './myStoryStore';
import { applyTreeLayout, NODE_W } from './layout';
import type { NodeData } from './layout';
import { validateStory } from './validateFlow';
import { serializeStory } from './serializeStory';
import { NodeEditDialog } from './NodeEditDialog';
import { EdgeEditDialog } from './EdgeEditDialog';
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
import { useUndoableState } from './useUndoableState';
import { compressImage } from './imageUtils';
import { MonacoEditor } from './MonacoEditor';
import { RawCodeEditDialog } from './RawCodeEditDialog';
import { RawCodeNode } from './nodes/RawCodeNode';
import { parseScene } from './parseChoiceScript';
import {
    patchNodeContent, patchEdgeLabel,
    appendNodeBlock, appendChoiceOption,
    removeNodeBlock, removeChoiceOption,
} from './patchCode';
import { ExportMenu } from './ExportMenu';
import { FindReplacePanel } from './FindReplacePanel';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { SceneOutlinePanel } from './SceneOutlinePanel';
import { StoryMenuDrawer } from './StoryMenuDrawer';
import { GraphPaneToolbar } from './GraphPaneToolbar';
import type { RenderGamePreview } from './MyStoryShell';
import type { VariableDef, NodeType, EdgeData, SceneJumpData, StatEntry, Achievement } from './types';

type PanelId = 'graph' | 'code' | 'story';
type ActivePanels = Record<PanelId, boolean>;

const ACTIVE_PANELS_KEY = 'ml-cyoa-active-panels';
const DEFAULT_PANELS: ActivePanels = { graph: true, code: false, story: false };
const MINIMAP_KEY = 'ml-cyoa-show-minimap';
const VIEWPORT_KEY = 'ml-cyoa-viewport';

function viewportStorageKey(storyId: string, sceneId: string) {
    return `${VIEWPORT_KEY}-${storyId}-${sceneId}`;
}

function loadViewport(storyId: string, sceneId: string): Viewport | null {
    try {
        const raw = localStorage.getItem(viewportStorageKey(storyId, sceneId));
        return raw ? (JSON.parse(raw) as Viewport) : null;
    } catch {
        return null;
    }
}

function loadActivePanels(): ActivePanels {
    try {
        const raw = localStorage.getItem(ACTIVE_PANELS_KEY);
        if (!raw) return DEFAULT_PANELS;
        const parsed = JSON.parse(raw) as Partial<ActivePanels>;
        const merged = { ...DEFAULT_PANELS, ...parsed };
        if (!merged.graph && !merged.code && !merged.story) return DEFAULT_PANELS;
        return merged;
    } catch {
        return DEFAULT_PANELS;
    }
}

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
    codeText: string;
}

// ─── Submit dialog ────────────────────────────────────────────────────────

interface SubmitDialogProps {
    open: boolean;
    story: MyStory;
    onClose: () => void;
    onSubmit?: (title: string, body: string) => Promise<void>;
}

function SubmitDialog({ open, story, onClose, onSubmit }: SubmitDialogProps) {
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
            await onSubmit?.(`[new-story] ${story.title}`, body);
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

interface Props {
    story: MyStory;
    onStoryChange: (updated: MyStory) => void;
    onSubmitStory?: (title: string, body: string) => Promise<void>;
    renderGamePreview?: RenderGamePreview;
}

export function MyStoryFlowPanel({ story, onStoryChange, onSubmitStory, renderGamePreview }: Props) {
    const navigate = useNavigate();

    const initialSceneId = story.sceneOrder[0] ?? story.scenes[0]?.id ?? 'startup';
    const initialScene = story.scenes.find(s => s.id === initialSceneId) ?? story.scenes[0];

    const graph = useUndoableState<GraphSnapshot>({
        nodes: initialScene?.nodes ?? [],
        edges: initialScene?.edges ?? [],
        codeText: '',
    });
    const { nodes, edges } = graph.state;
    const setGraph = useCallback((n: Node<NodeData>[], e: Edge[]) => {
        editingPaneRef.current = 'graph';
        setCodeIsAuthority(false);
        graph.set({ nodes: n, edges: e, codeText: codeTextRef.current });
    }, [graph]);

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

    const [paletteOpen, setPaletteOpen] = useState(false);
    const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
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
    const [activePanels, setActivePanels] = useState<ActivePanels>(loadActivePanels);
    const [codeText, setCodeText] = useState('');
    const [unsupportedBanner, setUnsupportedBanner] = useState(false);
    // codeIsAuthority: true while user is typing in the code pane (graph is read-only preview).
    // Cleared by Ctrl+S (successful parse), closing the code pane, or any graph interaction.
    const [codeIsAuthority, setCodeIsAuthority] = useState(false);
    // Separate flag so the overlay can show a different message when code has syntax errors.
    const [codeHasSyntaxErrors, setCodeHasSyntaxErrors] = useState(false);
    const [storyPreviewKey, setStoryPreviewKey] = useState(0);
    const [storyPreviewScenes, setStoryPreviewScenes] = useState<Record<string, string>>({});
    // Power UX state
    const [showMinimap, setShowMinimap] = useState(() => {
        const raw = localStorage.getItem(MINIMAP_KEY);
        return raw === null ? true : raw === 'true';
    });
    const [findOpen, setFindOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [pendingBulkDelete, setPendingBulkDelete] = useState<string[] | null>(null);

    const [outlineOpen, setOutlineOpen] = useState(false);

    const uidRef = useRef(1000);
    const rfInstanceRef = useRef<ReactFlowInstance<Node<NodeData>, Edge> | null>(null);
    const savingResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // nodeId → *label name in code; populated after every successful parse
    const codeLabelMapRef = useRef<Map<string, string>>(new Map());

    const storyId = story.id;
    const onStoryChangeRef = useRef(onStoryChange);
    const storyRef = useRef(story);
    const activeSceneIdRef = useRef(activeSceneId);
    // Refs for stable keyboard handler closures
    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    const activePanelsRef = useRef(activePanels);
    const layoutDirRef = useRef(layoutDirection);
    const setGraphRef = useRef(setGraph);
    const sceneGlobalReuseModeRef = useRef(sceneGlobalReuseMode);
    // Tracks the last code text pushed TO Monaco from the graph (to suppress echo back)
    const codeFromGraphRef = useRef('');
    // Debounce timer for code→graph parse
    const codeUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track current codeText without stale closure issues
    const codeTextRef = useRef(codeText);
    // Tracks which pane the user is actively editing; prevents round-trip corruption in effects.
    // Keep in sync with codeIsAuthority state (state drives UI, ref drives effects).
    const editingPaneRef = useRef<'graph' | 'code'>('graph');
    // Set by applyCodeToGraph so handleCodeSave can read the result without double-parsing.
    const lastParseSucceededRef = useRef(false);

    useLayoutEffect(() => {
        onStoryChangeRef.current = onStoryChange;
        storyRef.current = story;
        activeSceneIdRef.current = activeSceneId;
        nodesRef.current = nodes;
        edgesRef.current = edges;
        activePanelsRef.current = activePanels;
        layoutDirRef.current = layoutDirection;
        setGraphRef.current = setGraph;
        sceneGlobalReuseModeRef.current = sceneGlobalReuseMode;
        codeTextRef.current = codeText;
    });

    useEffect(() => {
        localStorage.setItem(ACTIVE_PANELS_KEY, JSON.stringify(activePanels));
    }, [activePanels]);

    useEffect(() => {
        localStorage.setItem(MINIMAP_KEY, String(showMinimap));
    }, [showMinimap]);

    // Restore saved viewport (or fitView) after every scene switch, including initial mount.
    useEffect(() => {
        const id = setTimeout(() => {
            const saved = loadViewport(storyId, activeSceneId);
            if (saved) {
                rfInstanceRef.current?.setViewport(saved);
            } else {
                rfInstanceRef.current?.fitView({ padding: 0.2 });
            }
        }, 0);
        return () => clearTimeout(id);
    }, [storyId, activeSceneId]);

    const handleViewportMoveEnd = useCallback((_: unknown, vp: Viewport) => {
        localStorage.setItem(viewportStorageKey(storyId, activeSceneIdRef.current), JSON.stringify(vp));
    }, [storyId]);

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

    const prevStoryPanelRef = useRef(false);
    const prevCodePanelRef = useRef(false);

    // ─── Code pane open / close ─────────────────────────────────────────────
    // Open: initialize codeText from the current graph state and parse to populate codeLabelMapRef.
    // Close: flush any pending debounce and apply final code→graph parse if user was editing.
    useEffect(() => {
        const wasOpen = prevCodePanelRef.current;
        const isOpen = activePanels.code;
        prevCodePanelRef.current = isOpen;

        if (!wasOpen && isOpen) {
            // Initialize code pane with the current serialized scene
            const text = serializeStory(liveStoryRef.current).get(activeSceneIdRef.current) ?? '';
            codeFromGraphRef.current = text;
            setCodeText(text);
            codeTextRef.current = text;
            editingPaneRef.current = 'graph';
            setCodeIsAuthority(false);
            setCodeHasSyntaxErrors(false);
            // Parse to populate codeLabelMapRef so surgical patches work immediately
            const result = parseScene(text);
            codeLabelMapRef.current = result.nodeLabelMap;
        }

        if (wasOpen && !isOpen) {
            if (codeUpdateTimerRef.current) {
                clearTimeout(codeUpdateTimerRef.current);
                codeUpdateTimerRef.current = null;
            }
            if (editingPaneRef.current === 'code') {
                const parsed = parseScene(codeTextRef.current);
                if (parsed.nodes.length > 0) {
                    // setGraphRef calls setGraph which clears codeIsAuthority and sets editingPaneRef
                    setGraphRef.current(parsed.nodes as Node<NodeData>[], parsed.edges);
                } else {
                    editingPaneRef.current = 'graph';
                }
            }
            setCodeIsAuthority(false);
            setCodeHasSyntaxErrors(false);
        }
    }, [activePanels.code]);

    // ─── Keyboard shortcuts ─────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const active = document.activeElement;
            const isTyping = active instanceof HTMLInputElement
                || active instanceof HTMLTextAreaElement
                || !!(active as HTMLElement)?.isContentEditable
                || !!(active as HTMLElement)?.closest?.('.monaco-editor');

            const ctrl = e.metaKey || e.ctrlKey;
            const curNodes = nodesRef.current;
            const curEdges = edgesRef.current;
            const setG = setGraphRef.current;

            // Undo / Redo (also restore codeText snapshot when code pane is open)
            if (ctrl && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (graph.canUndo) {
                    const prev = graph.peekUndo();
                    if (activePanelsRef.current.code && prev?.codeText !== undefined) {
                        setCodeText(prev.codeText);
                        codeTextRef.current = prev.codeText;
                        codeFromGraphRef.current = prev.codeText;
                        codeLabelMapRef.current = parseScene(prev.codeText).nodeLabelMap;
                    }
                    graph.undo();
                }
                return;
            }
            if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (graph.canRedo) {
                    const next = graph.peekRedo();
                    if (activePanelsRef.current.code && next?.codeText !== undefined) {
                        setCodeText(next.codeText);
                        codeTextRef.current = next.codeText;
                        codeFromGraphRef.current = next.codeText;
                        codeLabelMapRef.current = parseScene(next.codeText).nodeLabelMap;
                    }
                    graph.redo();
                }
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

            // Toggle code pane
            if (ctrl && e.key === 'e') {
                e.preventDefault();
                setActivePanels(prev => {
                    const next = { ...prev, code: !prev.code };
                    if (!next.graph && !next.code && !next.story) return prev;
                    return next;
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

    // Keep a ref so the graph→code sync effect can always read the latest serialization
    // without adding liveStory to its dependency array (which would cause unwanted re-runs).
    const liveStoryRef = useRef(liveStory);
    useLayoutEffect(() => { liveStoryRef.current = liveStory; });

    const { errors: liveErrors, warnings: liveWarnings } = useMemo(() => validateStory(liveStory), [liveStory]);

    // ─── Story pane: immediate refresh on first open ────────────────────────
    useEffect(() => {
        if (activePanels.story && !prevStoryPanelRef.current) {
            const files = serializeStory(liveStory);
            setStoryPreviewScenes(Object.fromEntries(files.entries()));
            setStoryPreviewKey(k => k + 1);
        }
        prevStoryPanelRef.current = activePanels.story;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePanels.story]);

    // ─── Story pane: 2s debounced auto-refresh on story changes ────────────
    useEffect(() => {
        if (!activePanels.story) return;
        const timer = setTimeout(() => {
            const files = serializeStory(liveStory);
            setStoryPreviewScenes(Object.fromEntries(files.entries()));
            setStoryPreviewKey(k => k + 1);
        }, 2000);
        return () => clearTimeout(timer);
    }, [liveStory, activePanels.story]);

    // ─── Scene management ───────────────────────────────────────────────────

    const switchScene = useCallback((sceneId: string) => {
        // Flush any pending code→graph debounce
        if (codeUpdateTimerRef.current) {
            clearTimeout(codeUpdateTimerRef.current);
            codeUpdateTimerRef.current = null;
        }

        let currentNodes = nodes;
        let currentEdges = edges;

        // If code pane is open, sync latest code text → graph before saving
        if (activePanelsRef.current.code) {
            const parsed = parseScene(codeTextRef.current);
            if (parsed.nodes.length > 0) {
                currentNodes = parsed.nodes as Node<NodeData>[];
                currentEdges = parsed.edges;
                graph.set({ nodes: currentNodes, edges: currentEdges, codeText: codeTextRef.current });
            }
        }

        const updatedScenes = buildUpdatedScenes(currentNodes, currentEdges, activeSceneId, subroutines);
        completeSave({ scenes: updatedScenes });
        const newScene = storyRef.current.scenes.find(s => s.id === sceneId);
        if (!newScene) return;
        setActiveSceneId(sceneId);
        setSubroutines(newScene.subroutines ?? []);
        setSceneGlobalReuseMode(newScene.globalReuseMode);
        graph.reset({ nodes: newScene.nodes, edges: newScene.edges, codeText: '' });
        isFirstGraphRender.current = true;
        editingPaneRef.current = 'graph';
        setCodeIsAuthority(false);
        setCodeHasSyntaxErrors(false);

        // Update code editor to show new scene's content (include preamble for startup scene)
        if (activePanelsRef.current.code) {
            const tempStory = { ...storyRef.current, scenes: updatedScenes };
            const newText = serializeStory(tempStory).get(sceneId) ?? '';
            codeFromGraphRef.current = newText;
            setCodeText(newText);
        }
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
        graph.reset({ nodes: newScene.nodes, edges: newScene.edges, codeText: '' });
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
                graph.reset({ nodes: fallback.nodes, edges: fallback.edges, codeText: '' });
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

    // ─── Editor panel helpers ───────────────────────────────────────────────

    const applyCodeToGraph = useCallback((text: string) => {
        const result = parseScene(text);
        const succeeded = result.nodes.length > 0;
        lastParseSucceededRef.current = succeeded;
        setCodeHasSyntaxErrors(!succeeded);
        if (!succeeded) return; // leave the last valid graph intact
        setUnsupportedBanner(result.unsupportedSyntax);
        codeLabelMapRef.current = result.nodeLabelMap;
        // Use graph.set directly — setGraph would incorrectly clear codeIsAuthority
        graph.set({ nodes: result.nodes as Node<NodeData>[], edges: result.edges, codeText: text });
    }, [graph]);

    const togglePanel = useCallback((panel: PanelId) => {
        setActivePanels(prev => {
            const next = { ...prev, [panel]: !prev[panel] };
            if (!next.graph && !next.code && !next.story) return prev;
            return next;
        });
    }, []);

    // Code → Graph: debounced live sync; skip if text came from the graph (loop guard).
    // Always runs debounce even when graph pane hidden, so codeHasSyntaxErrors stays current.
    const handleCodeChange = useCallback((text: string) => {
        setCodeText(text);
        codeTextRef.current = text;
        editingPaneRef.current = 'code';
        setCodeIsAuthority(true);     // graph becomes read-only preview until Ctrl+S or pane close
        if (text === codeFromGraphRef.current) return;
        if (codeUpdateTimerRef.current) clearTimeout(codeUpdateTimerRef.current);
        codeUpdateTimerRef.current = setTimeout(() => {
            codeFromGraphRef.current = text;
            applyCodeToGraph(text);
        }, 600);
    }, [applyCodeToGraph]);

    // Ctrl+S in Monaco: commit immediately. If parse succeeds, unlock the graph.
    const handleCodeSave = useCallback((text: string) => {
        if (codeUpdateTimerRef.current) { clearTimeout(codeUpdateTimerRef.current); codeUpdateTimerRef.current = null; }
        codeFromGraphRef.current = text;
        setCodeText(text);
        applyCodeToGraph(text);
        // applyCodeToGraph sets lastParseSucceededRef synchronously before returning
        if (lastParseSucceededRef.current) {
            editingPaneRef.current = 'graph';
            setCodeIsAuthority(false);
        }
        // If parse failed, codeIsAuthority stays true and graph stays blocked
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
                else graph.set({ nodes: next, edges, codeText: codeTextRef.current });
            }
            return;
        }

        const next = applyNodeChanges(changes, nodes) as Node<NodeData>[];
        const hasStructural = changes.some(c => c.type !== 'position' && c.type !== 'select' && c.type !== 'dimensions');
        if (hasStructural) setGraph(next, edges);
        else {
            // Position/dimension/selection changes are visual only — don't touch code
            graph.set({ nodes: next, edges, codeText: codeTextRef.current });
        }
    }, [nodes, edges, graph, setGraph]);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        const next = applyEdgeChanges(changes, edges);
        editingPaneRef.current = 'graph';
        graph.set({ nodes, edges: next, codeText: codeTextRef.current });
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

    // ─── Surgical patch helper ─────────────────────────────────────────────
    // Apply patched code text: update Monaco, parse to get new graph, push one undo entry.
    const applyPatch = useCallback((patched: string) => {
        setCodeText(patched);
        codeTextRef.current = patched;
        codeFromGraphRef.current = patched; // prevents handleCodeChange from treating this as user input
        applyCodeToGraph(patched);
    }, [applyCodeToGraph]);

    const confirmConnection = () => {
        if (!pendingConnection?.source || !pendingConnection?.target) return;

        if (activePanelsRef.current.code) {
            const sourceLabelName = codeLabelMapRef.current.get(pendingConnection.source);
            const targetLabelName = codeLabelMapRef.current.get(pendingConnection.target);
            if (sourceLabelName && targetLabelName) {
                const existingEdges = edgesRef.current.filter(e => e.source === pendingConnection.source);
                const existingEdge = existingEdges[0];
                const existingOptionText = existingEdge ? ((existingEdge.label as string) || 'Continue') : undefined;
                const existingTargetLabel = existingEdge ? codeLabelMapRef.current.get(existingEdge.target) : undefined;
                const patched = appendChoiceOption(
                    codeTextRef.current,
                    sourceLabelName,
                    connectionLabel || 'Continue',
                    targetLabelName,
                    existingOptionText,
                    existingTargetLabel,
                );
                applyPatch(patched);
                setPendingConnection(null);
                return;
            }
        }

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
        const { nodeType, content, targetScene, targetLabel, jumpType, ...rest } = updates;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const newContent = content !== undefined ? content : (node.data.content as string);
        const newLabel = newContent
            ? newContent.replace(/\s+/g, ' ').trim().slice(0, 58)
            : (node.data.label as string);

        // Surgical patch: only for plain content edits when code pane is open
        if (activePanelsRef.current.code && content !== undefined && !nodeType && targetScene === undefined) {
            const labelName = codeLabelMapRef.current.get(nodeId);
            if (labelName) {
                applyPatch(patchNodeContent(codeTextRef.current, labelName, newContent));
                return;
            }
        }

        const next = nodes.map(n => {
            if (n.id !== nodeId) return n;
            const sceneJumpFields = (targetScene !== undefined || targetLabel !== undefined || jumpType !== undefined)
                ? { targetScene, targetLabel, jumpType } : {};
            return { ...n, type: nodeType ?? n.type, data: { ...n.data, ...rest, content: newContent, label: newLabel, ...sceneJumpFields } };
        });
        setGraph(next, edges);
    };

    const handleNodeDelete = (nodeId: string) => {
        if (activePanelsRef.current.code) {
            const labelName = codeLabelMapRef.current.get(nodeId);
            if (labelName) {
                applyPatch(removeNodeBlock(codeTextRef.current, labelName));
                return;
            }
        }
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
        if (activePanelsRef.current.code) {
            const edge = edges.find(e => e.id === edgeId);
            if (edge) {
                const sourceLabelName = codeLabelMapRef.current.get(edge.source);
                const oldOptionText = (edge.label as string) || 'Continue';
                if (sourceLabelName) {
                    applyPatch(patchEdgeLabel(codeTextRef.current, sourceLabelName, oldOptionText, label || 'Continue'));
                    return;
                }
            }
        }
        const next = edges.map(e => e.id === edgeId ? { ...e, label: label || undefined, data } : e);
        setGraph(nodes, next);
    };

    const handleEdgeDelete = (edgeId: string) => {
        if (activePanelsRef.current.code) {
            const edge = edges.find(e => e.id === edgeId);
            if (edge) {
                const sourceLabelName = codeLabelMapRef.current.get(edge.source);
                const optionText = (edge.label as string) || 'Continue';
                if (sourceLabelName) {
                    applyPatch(removeChoiceOption(codeTextRef.current, sourceLabelName, optionText));
                    return;
                }
            }
        }
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
        const next = nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, scenes: sceneIds, label: sceneIds.length > 0 ? `→ ${sceneIds.join(', ')}` : 'Random Scene Jump' } } : n);
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

        if (activePanelsRef.current.code) {
            const labelName = `node_${id}`;
            const content = '';
            applyPatch(appendNodeBlock(codeTextRef.current, labelName, type as string, content));
            return;
        }

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

    const handleFocusNode = useCallback((nodeId: string) => {
        setGraph(nodes.map(n => ({ ...n, selected: n.id === nodeId })), edges);
        rfInstanceRef.current?.fitView({ nodes: [{ id: nodeId }], maxZoom: 1.5, duration: 300 });
    }, [nodes, edges, setGraph]);

    const handleVariablesChange = (updated: MyStory) => setVariables(updated.variables ?? []);
    const handleStatChartChange = (updated: StatEntry[]) => setStatChart(updated);
    const handleAchievementsChange = (updated: Achievement[]) => setAchievements(updated);

    const handleConfirmBulkDelete = () => {
        if (!pendingBulkDelete) return;
        const ids = new Set(pendingBulkDelete);

        if (activePanelsRef.current.code) {
            let patched = codeTextRef.current;
            for (const nodeId of pendingBulkDelete) {
                const labelName = codeLabelMapRef.current.get(nodeId);
                if (labelName) patched = removeNodeBlock(patched, labelName);
            }
            applyPatch(patched);
            setPendingBulkDelete(null);
            return;
        }

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                    <Tooltip title="Story menu">
                        <IconButton size="small" onClick={() => setMenuDrawerOpen(true)}>
                            <MenuIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 0.5, flexShrink: 0 }} />

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

                    <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 0.5, flexShrink: 0 }} />

                    <Tooltip title="Find & Replace (Ctrl+F)">
                        <IconButton size="small" onClick={() => setFindOpen(o => !o)} color={findOpen ? 'primary' : 'default'}>
                            <SearchIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 0.5, flexShrink: 0 }} />

                    <Tooltip title="Graph pane">
                        <IconButton size="small" onClick={() => togglePanel('graph')} color={activePanels.graph ? 'primary' : 'default'}>
                            <HubIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Code pane (Ctrl+E)">
                        <IconButton size="small" onClick={() => togglePanel('code')} color={activePanels.code ? 'primary' : 'default'}>
                            <CodeIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Story preview pane">
                        <IconButton size="small" onClick={() => togglePanel('story')} color={activePanels.story ? 'primary' : 'default'}>
                            <PlayArrowIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Box sx={{ flex: 1 }} />

                    <ExportMenu story={liveStory} currentSceneId={activeSceneId} />
                    {onSubmitStory && (
                        <Button size="small" startIcon={<SendIcon />} onClick={() => setSubmitOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
                            Submit
                        </Button>
                    )}
                    {saving === 'saving' && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Saving…</Typography>}
                    {saving === 'saved' && <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>Saved ✓</Typography>}
                </Box>

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

                {/* Canvas / Code / Story panes */}
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row' }}>
                    {/* Graph pane */}
                    {activePanels.graph && (
                        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, position: 'relative' }}>
                            <GraphPaneToolbar
                                onAddNode={() => setPaletteOpen(true)}
                                onAutoLayout={handleAutoLayout}
                                onToggleLayoutDir={handleToggleLayoutDir}
                                layoutDirection={layoutDirection}
                                showMinimap={showMinimap}
                                onToggleMinimap={() => setShowMinimap(o => !o)}
                                onOpenKeyboardShortcuts={() => setShortcutsOpen(true)}
                                outlineOpen={outlineOpen}
                                onToggleOutline={() => setOutlineOpen(o => !o)}
                            />
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                defaultEdgeOptions={defaultEdgeOptions}
                                nodesDraggable nodesConnectable elementsSelectable
                                snapToGrid snapGrid={[20, 20]}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeClick={onNodeClick}
                                onInit={inst => { rfInstanceRef.current = inst; }}
                                onMoveEnd={handleViewportMoveEnd}
                                panOnScroll
                                panActivationKeyCode={null}>
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
                            {codeIsAuthority && activePanels.code && (
                                <Box sx={{
                                    position: 'absolute', inset: 0, zIndex: 10,
                                    bgcolor: codeHasSyntaxErrors ? 'rgba(180,0,0,0.35)' : 'rgba(0,0,0,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'not-allowed',
                                }}>
                                    <Typography variant="body2" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.65)', px: 2, py: 1, borderRadius: 1, userSelect: 'none' }}>
                                        {codeHasSyntaxErrors
                                            ? 'Fix the code errors to edit the graph'
                                            : 'Press Ctrl+S or close the code pane to edit the graph'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Divider between graph and code */}
                    {activePanels.graph && activePanels.code && (
                        <Box sx={{ width: 4, bgcolor: 'divider', flexShrink: 0, cursor: 'col-resize' }} />
                    )}

                    {/* Code pane */}
                    {activePanels.code && (
                        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                            <MonacoEditor
                                value={codeText}
                                onChange={handleCodeChange}
                                story={liveStory}
                                height="100%"
                                onSave={handleCodeSave}
                                sceneId={activeSceneId}
                                onSwitchScene={switchScene}
                            />
                        </Box>
                    )}

                    {/* Divider before story pane */}
                    {(activePanels.graph || activePanels.code) && activePanels.story && (
                        <Box sx={{ width: 4, bgcolor: 'divider', flexShrink: 0, cursor: 'col-resize' }} />
                    )}

                    {/* Story preview pane */}
                    {activePanels.story && renderGamePreview && (
                        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                            {renderGamePreview({
                                story: liveStory,
                                scenes: storyPreviewScenes,
                                previewKey: 'preview-' + storyPreviewKey,
                                disableNavigation: true,
                            })}
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Node palette */}
            <NodePalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={handleAddNode} />

            {/* Story menu drawer */}
            <StoryMenuDrawer
                open={menuDrawerOpen}
                onClose={() => setMenuDrawerOpen(false)}
                title={title} authorName={authorName} authorBio={authorBio}
                authorPhoto={authorPhoto} coverImage={coverImage} ifid={ifid}
                onTitleChange={setTitle} onAuthorNameChange={setAuthorName}
                onAuthorBioChange={setAuthorBio} onAuthorPhotoChange={setAuthorPhoto}
                onCoverImageChange={setCoverImage} onIfidChange={setIfid}
                story={liveStory} onStoryChange={handleVariablesChange}
                statChart={statChart} variables={variables} onStatChartChange={handleStatChartChange}
                achievements={achievements} onAchievementsChange={handleAchievementsChange}
                subroutines={subroutines} onSubroutinesChange={setSubroutines}
                globalReuse={sceneGlobalReuseMode ?? ''}
                onGlobalReuseChange={v => setSceneGlobalReuseMode(v === '' ? undefined : v)}
            />

            {/* Keyboard shortcuts help */}
            <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

            {/* Find & Replace drawer */}
            <Drawer anchor="right" open={findOpen} onClose={() => setFindOpen(false)} PaperProps={{ sx: { width: 440 } }}>
                <FindReplacePanel
                    story={liveStory}
                    onSelectNode={handleFindSelectNode}
                    onReplaceAll={handleFindReplaceAll}
                    onClose={() => setFindOpen(false)}
                />
            </Drawer>

            {/* Scene outline drawer */}
            <Drawer anchor="left" open={outlineOpen} onClose={() => setOutlineOpen(false)} PaperProps={{ sx: { width: 280 } }}>
                <SceneOutlinePanel
                    nodes={nodes}
                    edges={edges}
                    onFocusNode={handleFocusNode}
                    onClose={() => setOutlineOpen(false)}
                />
            </Drawer>

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
            <SubmitDialog open={submitOpen} story={liveStory} onClose={() => setSubmitOpen(false)} onSubmit={onSubmitStory} />

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
