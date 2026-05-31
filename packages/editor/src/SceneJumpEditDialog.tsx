import { useState } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, InputLabel, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import type { Node } from '@xyflow/react';
import type { NodeData } from './layout';
import type { SceneDef } from './myStoryStore';
import type { SceneJumpData } from './types';

interface Props {
    node: Node<NodeData>;
    scenes: SceneDef[];
    onClose: () => void;
    onSave: (nodeId: string, updates: Partial<NodeData & SceneJumpData>) => void;
    onDelete: (nodeId: string) => void;
}

export function SceneJumpEditDialog({ node, scenes, onClose, onSave, onDelete }: Props) {
    const existing = node.data as SceneJumpData & NodeData;

    const [targetScene, setTargetScene] = useState(existing.targetScene ?? '');
    const [targetLabel, setTargetLabel] = useState(existing.targetLabel ?? '');
    const [jumpType, setJumpType] = useState<'transfer' | 'subroutine'>(existing.jumpType ?? 'transfer');

    const targetSceneDef = scenes.find(s => s.id === targetScene);
    const availableLabels = (targetSceneDef?.nodes ?? [])
        .filter(n => n.type === 'scene_label')
        .map(n => ((n.data.label as string) ?? 'entry').trim().replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'entry');

    const handleSave = () => {
        const label = targetLabel ? targetLabel.trim().replace(/[^a-z0-9_]/gi, '_').toLowerCase() : '';
        onSave(node.id, {
            targetScene,
            targetLabel: label || undefined,
            jumpType,
        } as Partial<NodeData & SceneJumpData>);
        onClose();
    };

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Edit Scene Jump</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <ToggleButtonGroup
                        value={jumpType}
                        exclusive
                        onChange={(_e, v) => { if (v) setJumpType(v); }}
                        size="small"
                        fullWidth>
                        <ToggleButton value="transfer">goto_scene (transfer)</ToggleButton>
                        <ToggleButton value="subroutine">gosub_scene (subroutine)</ToggleButton>
                    </ToggleButtonGroup>

                    <FormControl fullWidth size="small">
                        <InputLabel>Target Scene</InputLabel>
                        <Select
                            value={targetScene}
                            label="Target Scene"
                            onChange={e => { setTargetScene(e.target.value); setTargetLabel(''); }}>
                            {scenes.map(s => (
                                <MenuItem key={s.id} value={s.id}>{s.name} ({s.id})</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {availableLabels.length > 0 ? (
                        <FormControl fullWidth size="small">
                            <InputLabel>Entry Label (optional)</InputLabel>
                            <Select
                                value={targetLabel}
                                label="Entry Label (optional)"
                                onChange={e => setTargetLabel(e.target.value)}>
                                <MenuItem value="">— Start of scene —</MenuItem>
                                {availableLabels.map(lbl => (
                                    <MenuItem key={lbl} value={lbl}>{lbl}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <TextField
                            label="Entry Label (optional)"
                            value={targetLabel}
                            onChange={e => setTargetLabel(e.target.value)}
                            size="small"
                            fullWidth
                            helperText="Add a scene_label node in the target scene to enable label jumping"
                        />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="error" onClick={() => { onDelete(node.id); onClose(); }} sx={{ mr: 'auto' }}>
                    Delete
                </Button>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={!targetScene}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}
