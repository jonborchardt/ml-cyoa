import { useEffect, useRef } from 'react';
import MonacoReact, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { Box } from '@mui/material';
import {
    CS_LANG_ID,
    registerChoiceScriptLanguage,
    registerCompletionProvider,
    registerHoverProvider,
} from './choicescriptLanguage';
import type { MyStory } from './myStoryStore';

interface Props {
    value: string;
    onChange?: (value: string) => void;
    story?: MyStory | null;
    readOnly?: boolean;
    height?: string | number;
    onSave?: (value: string) => void;
}

export function MonacoEditor({ value, onChange, story, readOnly = false, height = '100%', onSave }: Props) {
    const storyRef = useRef(story ?? null);
    useEffect(() => { storyRef.current = story ?? null; }, [story]);

    const disposeRefs = useRef<Array<{ dispose: () => void }>>([]);

    const handleMount: OnMount = (editor, monaco) => {
        registerChoiceScriptLanguage(monaco);

        // Register providers once per monaco instance
        const getStory = () => storyRef.current;
        disposeRefs.current.push(registerCompletionProvider(monaco, getStory));
        disposeRefs.current.push(registerHoverProvider(monaco, getStory));

        // Ctrl+S → onSave
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            onSave?.(editor.getValue());
        });
    };

    // Cleanup providers when component unmounts
    useEffect(() => {
        return () => {
            for (const d of disposeRefs.current) d.dispose();
            disposeRefs.current = [];
        };
    }, []);

    return (
        <Box sx={{ height, overflow: 'hidden' }}>
            <MonacoReact
                height={typeof height === 'string' ? height : `${height}px`}
                language={CS_LANG_ID}
                value={value}
                onChange={v => onChange?.(v ?? '')}
                onMount={handleMount}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    tabSize: 2,
                    insertSpaces: true,
                    folding: true,
                    renderLineHighlight: 'line',
                    theme: 'vs',
                } as Monaco.editor.IStandaloneEditorConstructionOptions}
            />
        </Box>
    );
}
