import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../layout';

export function SceneLabelNode({ data }: NodeProps) {
    const labelName = ((data.label as string) ?? 'entry').trim().replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'entry';

    return (
        <div
            style={{
                width: NODE_W,
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 11,
                textAlign: 'center',
                lineHeight: 1.4,
                boxSizing: 'border-box',
                background: '#f3e8ff',
                border: '1.5px dashed #9333ea',
                color: '#581c87',
            }}>
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, color: '#7e22ce' }}>
                entry label
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11 }}>{labelName}</div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#9333ea' }} />
        </div>
    );
}
