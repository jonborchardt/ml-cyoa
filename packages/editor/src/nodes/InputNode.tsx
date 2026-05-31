import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../layout';
import type { InputConfig } from '../types';

export function InputNode({ data, selected }: NodeProps) {
    const cfg = data.inputConfig as InputConfig | undefined;

    return (
        <div
            style={{
                width: NODE_W,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.4,
                boxSizing: 'border-box',
                background: '#faf5ff',
                border: '1.5px solid #a855f7',
                color: '#581c87',
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#a855f7' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#7e22ce' }}>
                ✎ input
            </div>
            {cfg ? (
                <>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {cfg.prompt || '(no prompt)'}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#7e22ce', marginTop: 2 }}>
                        → {cfg.variable} ({cfg.inputType})
                    </div>
                </>
            ) : (
                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>not configured</div>
            )}
            <Handle type="source" position={Position.Bottom} style={{ background: '#a855f7' }} />
        </div>
    );
}
