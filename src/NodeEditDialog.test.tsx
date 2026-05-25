import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NodeEditDialog } from './NodeEditDialog';
import { makeConditionNode, makeActionNode } from './test/fixtures';

const baseProps = {
    images: {},
    variables: [],
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onAddImage: vi.fn(),
};

describe('NodeEditDialog routing', () => {
    it('renders ConditionEditDialog when node type is condition', () => {
        render(<NodeEditDialog node={makeConditionNode({ left: 'x', op: '>', right: '0' })} {...baseProps} />);
        expect(screen.getByText('Edit Condition')).toBeInTheDocument();
        expect(screen.getByLabelText('Left')).toBeInTheDocument();
    });

    it('renders ActionEditDialog when node type is action', () => {
        render(<NodeEditDialog node={makeActionNode([])} {...baseProps} />);
        expect(screen.getByText('Edit Actions')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add action/i })).toBeInTheDocument();
    });
});
