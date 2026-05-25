import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../parseGameFlow';

export function SubroutineReturnNode({ selected }: NodeProps) {
    return (
        <div
            style={{
                width: NODE_W,
                padding: '8px 12px',
                borderRadius: '0 0 8px 8px',
                fontSize: 11,
                lineHeight: 1.4,
                boxSizing: 'border-box',
                background: '#fce7f3',
                border: '1.5px solid #db2777',
                color: '#831843',
                textAlign: 'center',
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#db2777' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                ↩ *return
            </div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#db2777', opacity: 0.3 }} />
        </div>
    );
}
