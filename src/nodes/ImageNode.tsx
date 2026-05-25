import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../parseGameFlow';
import type { ImageData } from '../types';

const ALIGN_ICON: Record<string, string> = { left: '←', center: '↔', right: '→' };

export function ImageNode({ data, selected }: NodeProps) {
    const d = data as ImageData & Record<string, unknown>;
    const file = (d.imageFile as string) || '(no file)';
    const align = (d.imageAlign as string) || 'center';
    const alt = (d.imageAlt as string) || '';

    return (
        <div
            style={{
                width: NODE_W,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 11,
                boxSizing: 'border-box',
                background: '#e8eaf6',
                border: `2px solid ${selected ? '#1976d2' : '#3949ab'}`,
                color: '#1a237e',
                textAlign: 'center',
                lineHeight: 1.4,
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#3949ab' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#3949ab' }}>
                image {ALIGN_ICON[align] ?? '↔'}
            </div>
            <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{file}</div>
            {alt && <div style={{ color: '#5c6bc0', fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>{alt}</div>}
            <Handle type="source" position={Position.Bottom} style={{ background: '#3949ab' }} />
        </div>
    );
}
