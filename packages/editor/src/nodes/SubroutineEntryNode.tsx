import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../layout';

export function SubroutineEntryNode({ data, selected }: NodeProps) {
    const name = (data.label as string) ?? 'subroutine';
    const params = (data.params as string[] | undefined) ?? [];

    return (
        <div
            style={{
                width: NODE_W,
                padding: '8px 12px',
                borderRadius: '8px 8px 0 0',
                fontSize: 11,
                lineHeight: 1.4,
                boxSizing: 'border-box',
                background: '#7c3aed',
                border: '1.5px solid #5b21b6',
                color: '#fff',
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#5b21b6', opacity: 0.5 }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, opacity: 0.85 }}>
                ↩ subroutine entry
            </div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            {params.length > 0 && (
                <div style={{ fontSize: 9, opacity: 0.8, marginTop: 1 }}>
                    params: {params.join(', ')}
                </div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#5b21b6' }} />
        </div>
    );
}
