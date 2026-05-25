import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../parseGameFlow';

export function CheckAchievementsNode({ selected }: NodeProps) {
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
                border: '1px solid #10b981',
                background: '#f0fdf4',
                boxShadow: selected ? '0 0 0 3px #10b981' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#10b981' }} />
            <div style={{ flex: 1, height: 1, background: '#6ee7b7' }} />
            <span style={{ fontSize: 10, color: '#065f46', whiteSpace: 'nowrap' }}>★ check achievements</span>
            <div style={{ flex: 1, height: 1, background: '#6ee7b7' }} />
            <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
        </div>
    );
}
