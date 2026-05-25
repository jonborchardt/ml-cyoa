import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../parseGameFlow';
import type { SceneJumpData } from '../types';

export function SceneJumpNode({ data }: NodeProps) {
    const jumpData = data as SceneJumpData & Record<string, unknown>;
    const targetScene = jumpData.targetScene || '(no scene)';
    const targetLabel = jumpData.targetLabel ? ` › ${jumpData.targetLabel}` : '';
    const isSubroutine = jumpData.jumpType === 'subroutine';

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
                background: '#e6f4ea',
                border: '2px solid #2e7d32',
                color: '#1b5e20',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#2e7d32' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#1b5e20' }}>
                {isSubroutine ? 'gosub_scene' : 'goto_scene'}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
                {targetScene}{targetLabel}
            </div>
            {isSubroutine && (
                <Handle type="source" position={Position.Bottom} style={{ background: '#2e7d32' }} />
            )}
        </div>
    );
}
