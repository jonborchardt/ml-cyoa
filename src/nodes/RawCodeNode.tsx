import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../parseGameFlow';

export function RawCodeNode({ data }: NodeProps) {
    const raw = (data.rawContent as string) ?? '';
    const preview = raw.split('\n').slice(0, 3).join('\n');

    return (
        <div style={{
            width: NODE_W,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.4,
            boxSizing: 'border-box',
            background: '#fffde7',
            border: '1.5px solid #f9a825',
            color: '#5d3a00',
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#f9a825' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f9a825' }}>&lt;/&gt;</span>
                <span style={{ fontWeight: 700, fontSize: 11 }}>Raw Code</span>
            </div>
            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all', opacity: 0.85 }}>
                {preview || '(empty)'}
            </pre>
            <Handle type="source" position={Position.Bottom} style={{ background: '#f9a825' }} />
        </div>
    );
}
