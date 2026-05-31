import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: { react },
        settings: { react: { version: 'detect' } },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
        },
    },
    {
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // Project uses React 18 without the React Compiler; ref mutations inside
            // callbacks are an intentional and correct pattern here.
            'react-hooks/immutability': 'off',
            // React Compiler's memoization preservation analysis is overly conservative
            // about useState setters inside useCallback; these are stable refs.
            'react-hooks/preserve-manual-memoization': 'off',
        },
    },
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/public/choicescript/**'],
    }
);
