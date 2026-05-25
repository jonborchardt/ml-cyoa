import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_W } from '../parseGameFlow';
import type { ActionItem } from '../types';

function actionSummary(action: ActionItem): string {
    switch (action.kind) {
        case 'set': return `${action.variable} ${action.op} ${action.value}`;
        case 'rand': return `rand ${action.variable} [${action.min}–${action.max}]`;
        case 'input_text': return `input → ${action.variable}`;
        case 'input_number': return `input # → ${action.variable}`;
        case 'page_break': return '— page break —';
        case 'award_achievement': return `achieve: ${action.achievementId || '…'}`;
    }
}

export function ActionNode({ data, selected }: NodeProps) {
    const actions = (data.actions as ActionItem[] | undefined) ?? [];

    return (
        <div
            style={{
                width: NODE_W,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.4,
                boxSizing: 'border-box',
                background: '#f0fdfa',
                border: '1.5px solid #14b8a6',
                color: '#134e4a',
                boxShadow: selected ? '0 0 0 3px #1976d2' : 'none',
            }}>
            <Handle type="target" position={Position.Top} style={{ background: '#14b8a6' }} />
            <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#0f766e' }}>
                ⚙ actions
            </div>
            {actions.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>no actions</div>}
            {actions.slice(0, 3).map((a, i) => (
                <div key={i} style={{ fontFamily: 'monospace', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {actionSummary(a)}
                </div>
            ))}
            {actions.length > 3 && <div style={{ color: '#6b7280', fontSize: 10 }}>+{actions.length - 3} more…</div>}
            <Handle type="source" position={Position.Bottom} style={{ background: '#14b8a6' }} />
        </div>
    );
}
