import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { Node } from '@xyflow/react';
import type { NodeData } from './layout';
import { MonacoEditor } from './MonacoEditor';
import type { MyStory } from './myStoryStore';

interface Props {
    node: Node<NodeData>;
    story: MyStory;
    onClose: () => void;
    onSave: (nodeId: string, rawContent: string) => void;
    onDelete: (nodeId: string) => void;
}

export function RawCodeEditDialog({ node, story, onClose, onSave, onDelete }: Props) {
    const [value, setValue] = useState((node.data.rawContent as string) ?? '');

    const handleSave = () => {
        onSave(node.id, value);
        onClose();
    };

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Raw Code</DialogTitle>
            <DialogContent sx={{ p: 0, height: 400 }}>
                <MonacoEditor
                    value={value}
                    onChange={setValue}
                    story={story}
                    height={400}
                    onSave={handleSave}
                />
            </DialogContent>
            <DialogActions>
                <Button color="error" onClick={() => { onDelete(node.id); onClose(); }} sx={{ mr: 'auto' }}>
                    Delete
                </Button>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}
