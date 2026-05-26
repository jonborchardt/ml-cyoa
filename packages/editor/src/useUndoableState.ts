import { useCallback, useReducer } from 'react';

const MAX_HISTORY = 100;

interface UndoState<T> {
    past: T[];
    present: T;
    future: T[];
}

type Action<T> =
    | { type: 'SET'; payload: T }
    | { type: 'RESET'; payload: T }
    | { type: 'UNDO' }
    | { type: 'REDO' };

function reducer<T>(state: UndoState<T>, action: Action<T>): UndoState<T> {
    switch (action.type) {
        case 'RESET':
            return { past: [], present: action.payload, future: [] };
        case 'SET': {
            const past = [...state.past, state.present];
            return {
                past: past.length > MAX_HISTORY ? past.slice(past.length - MAX_HISTORY) : past,
                present: action.payload,
                future: [],
            };
        }
        case 'UNDO': {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            return {
                past: state.past.slice(0, -1),
                present: previous,
                future: [state.present, ...state.future],
            };
        }
        case 'REDO': {
            if (state.future.length === 0) return state;
            const next = state.future[0];
            return {
                past: [...state.past, state.present],
                present: next,
                future: state.future.slice(1),
            };
        }
    }
}

export interface UndoableState<T> {
    state: T;
    set: (value: T) => void;
    reset: (value: T) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function useUndoableState<T>(initialState: T): UndoableState<T> {
    const [{ past, present, future }, dispatch] = useReducer(
        reducer as (s: UndoState<T>, a: Action<T>) => UndoState<T>,
        { past: [], present: initialState, future: [] },
    );

    const set = useCallback((value: T) => dispatch({ type: 'SET', payload: value }), []);
    const reset = useCallback((value: T) => dispatch({ type: 'RESET', payload: value }), []);
    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

    return { state: present, set, reset, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
