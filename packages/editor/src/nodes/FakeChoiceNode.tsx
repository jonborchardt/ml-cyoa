import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../layout';

export function FakeChoiceNode({ data, selected }: NodeProps) {
    return (
        <div
            style={{
                width: NODE_W,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12,
                textAlign: 'center',
                lineHeight: 1.45,
                boxSizing: 'border-box',
                background: '#fafafa',
                border: '1.5px dashed #90caf9',
                color: '#374151',
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#90caf9' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#6b7280' }}>
                cosmetic choice
            </div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.label as string}
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#90caf9' }} />
        </div>
    );
}
