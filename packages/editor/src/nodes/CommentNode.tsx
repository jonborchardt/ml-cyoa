import type { NodeProps } from '@xyflow/react';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import { NODE_W } from '../layout';

export function CommentNode({ data }: NodeProps) {
    const label = (data.label as string) || '…';
    return (
        <div
            title={label}
            style={{
                width: NODE_W,
                minHeight: 52,
                padding: '6px 10px',
                borderRadius: 4,
                fontSize: 12,
                background: '#fffde7',
                border: '1.5px dashed #f9a825',
                color: '#5d4037',
                textAlign: 'left',
                lineHeight: 1.45,
                boxSizing: 'border-box',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, opacity: 0.6 }}>
                <StickyNote2Icon style={{ fontSize: 13, color: '#f9a825' }} />
                <span style={{ fontSize: 10, fontStyle: 'italic' }}>Note</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{label}</div>
        </div>
    );
}
