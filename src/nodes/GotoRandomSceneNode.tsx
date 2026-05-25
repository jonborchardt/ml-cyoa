import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../parseGameFlow';

export function GotoRandomSceneNode({ data, selected }: NodeProps) {
    const scenes = (data.scenes as string[] | undefined) ?? [];

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
                background: '#f3e5f5',
                border: `2px solid ${selected ? '#1976d2' : '#7b1fa2'}`,
                color: '#4a148c',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#7b1fa2' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#7b1fa2' }}>
                🎲 goto_random_scene
            </div>
            {scenes.length > 0 ? (
                <div style={{ fontFamily: 'monospace', fontSize: 10 }}>
                    {scenes.map((s, i) => <div key={i}>{s}</div>)}
                </div>
            ) : (
                <div style={{ color: '#9c27b0', fontStyle: 'italic', fontSize: 10 }}>no scenes</div>
            )}
        </div>
    );
}
