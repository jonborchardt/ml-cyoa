import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../layout';

export function GosubCallNode({ data, selected }: NodeProps) {
    const subroutineId = (data.subroutineId as string) ?? '';
    const params = (data.params as string[] | undefined) ?? [];

    return (
        <div
            style={{
                width: NODE_W,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.4,
                boxSizing: 'border-box',
                background: '#ede9fe',
                border: '1.5px solid #7c3aed',
                color: '#3b0764',
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#7c3aed' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#6d28d9' }}>
                ↩ call subroutine
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subroutineId || <em style={{ color: '#6b7280' }}>not set — click to edit</em>}
            </div>
            {params.length > 0 && (
                <div style={{ fontSize: 9, color: '#6d28d9', marginTop: 2 }}>
                    params: {params.join(', ')}
                </div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#7c3aed' }} />
        </div>
    );
}
