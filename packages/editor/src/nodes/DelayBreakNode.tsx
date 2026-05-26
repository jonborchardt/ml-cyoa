import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../layout';

export function DelayBreakNode({ selected }: NodeProps) {
    return (
        <div
            style={{
                width: NODE_W,
                padding: '4px 8px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 4,
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#9ca3af' }} />
            <div style={{ flex: 1, height: 1, background: '#d1d5db' }} />
            <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>⏳ delay break</span>
            <div style={{ flex: 1, height: 1, background: '#d1d5db' }} />
            <Handle type="source" position={Position.Bottom} style={{ background: '#9ca3af' }} />
        </div>
    );
}
