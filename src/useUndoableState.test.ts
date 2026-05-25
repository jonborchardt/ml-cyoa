import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoableState } from './useUndoableState';

describe('useUndoableState', () => {
    it('returns to previous state on undo', () => {
        const { result } = renderHook(() => useUndoableState({ count: 0 }));
        act(() => result.current.set({ count: 1 }));
        act(() => result.current.set({ count: 2 }));
        act(() => result.current.undo());
        expect(result.current.state.count).toBe(1);
    });

    it('redoes after undo', () => {
        const { result } = renderHook(() => useUndoableState({ count: 0 }));
        act(() => result.current.set({ count: 5 }));
        act(() => result.current.undo());
        act(() => result.current.redo());
        expect(result.current.state.count).toBe(5);
    });

    it('canUndo is false on initial state', () => {
        const { result } = renderHook(() => useUndoableState({ count: 0 }));
        expect(result.current.canUndo).toBe(false);
    });

    it('canRedo is false after a new set following undo', () => {
        const { result } = renderHook(() => useUndoableState({ count: 0 }));
        act(() => result.current.set({ count: 1 }));
        act(() => result.current.undo());
        act(() => result.current.set({ count: 2 }));
        expect(result.current.canRedo).toBe(false);
    });

    it('caps history at 100 entries', () => {
        const { result } = renderHook(() => useUndoableState({ count: 0 }));
        for (let i = 1; i <= 105; i++) act(() => result.current.set({ count: i }));
        for (let i = 0; i < 100; i++) act(() => result.current.undo());
        expect(result.current.state.count).toBe(5);
    });

    it('canRedo is false on fresh state', () => {
        const { result } = renderHook(() => useUndoableState({ count: 0 }));
        expect(result.current.canRedo).toBe(false);
    });

    it('multiple undos work in sequence', () => {
        const { result } = renderHook(() => useUndoableState({ count: 0 }));
        act(() => result.current.set({ count: 1 }));
        act(() => result.current.set({ count: 2 }));
        act(() => result.current.set({ count: 3 }));
        act(() => result.current.undo());
        act(() => result.current.undo());
        expect(result.current.state.count).toBe(1);
    });
});
