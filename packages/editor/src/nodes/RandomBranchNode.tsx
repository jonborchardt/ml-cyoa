import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../layout';
import type { RandomBranchEntry } from '../types';

export function RandomBranchNode({ data, selected }: NodeProps) {
    const branches = (data.randomBranches as RandomBranchEntry[] | undefined) ?? [];

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
                background: '#fdf4ff',
                border: '2px solid #c026d3',
                color: '#4a044e',
                position: 'relative',
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#c026d3' }} />
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>⚄</div>
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#86198f' }}>
                random ({branches.length || '?'} branches)
            </div>
            {branches.slice(0, 4).map((_b, i) => (
                <Handle
                    key={i}
                    type="source"
                    position={Position.Bottom}
                    id={`branch-${i}`}
                    style={{
                        background: '#c026d3',
                        left: `${((i + 1) / (branches.length + 1)) * 100}%`,
                    }}
                />
            ))}
            {branches.length === 0 && (
                <Handle type="source" position={Position.Bottom} id="branch-0" style={{ background: '#c026d3' }} />
            )}
        </div>
    );
}
