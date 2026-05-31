import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../layout';
import type { ConditionConfig } from '../types';

export function ConditionNode({ data, selected }: NodeProps) {
    const condition = data.condition as ConditionConfig | undefined;
    const expr = condition ? `${condition.left} ${condition.op} ${condition.right}` : 'condition';

    return (
        <div
            style={{
                width: NODE_W,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 11,
                textAlign: 'center',
                lineHeight: 1.4,
                boxSizing: 'border-box',
                background: '#fff8e1',
                border: '2px solid #f59e0b',
                color: '#78350f',
                position: 'relative',
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#f59e0b' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#b45309' }}>
                if
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11 }}>{expr}</div>
            {/* True handle — right */}
            <Handle
                type="source"
                position={Position.Right}
                id="true"
                style={{ background: '#22c55e', top: '50%' }}
            />
            {/* False handle — left */}
            <Handle
                type="source"
                position={Position.Left}
                id="false"
                style={{ background: '#ef4444', top: '50%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 6, color: '#6b7280' }}>
                <span>✗ false</span>
                <span>true ✓</span>
            </div>
        </div>
    );
}
