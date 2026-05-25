import type * as Monaco from 'monaco-editor';
import type { MyStory } from './myStoryStore';

export const CS_LANG_ID = 'choicescript';

// Full command reference with one-line docs
const CS_COMMANDS: Array<{ name: string; snippet: string; doc: string }> = [
    { name: 'choice', snippet: 'choice\n  #${1:Option A}\n    $0', doc: 'Present a list of choices to the player.' },
    { name: 'fake_choice', snippet: 'fake_choice\n  #${1:Option A}\n    $0', doc: 'Present choices that merge back to a common point.' },
    { name: 'if', snippet: 'if ${1:condition}\n  $0', doc: 'Conditional branch.' },
    { name: 'elseif', snippet: 'elseif ${1:condition}\n  $0', doc: 'Alternative condition in an if chain.' },
    { name: 'else', snippet: 'else\n  $0', doc: 'Fallback branch of an if/elseif chain.' },
    { name: 'set', snippet: 'set ${1:variable} ${2:value}', doc: 'Assign or modify a variable.' },
    { name: 'rand', snippet: 'rand ${1:variable} ${2:1} ${3:6}', doc: 'Set a variable to a random integer in [min, max].' },
    { name: 'input_text', snippet: 'input_text ${1:variable}', doc: 'Prompt the player to type a text value.' },
    { name: 'input_number', snippet: 'input_number ${1:variable} ${2:0} ${3:100}', doc: 'Prompt the player to type a number in [min, max].' },
    { name: 'goto', snippet: 'goto ${1:label}', doc: 'Jump to a label in the current scene.' },
    { name: 'goto_scene', snippet: 'goto_scene ${1:scene}', doc: 'Transfer control to another scene.' },
    { name: 'gosub', snippet: 'gosub ${1:label}', doc: 'Call a subroutine by label.' },
    { name: 'gosub_scene', snippet: 'gosub_scene ${1:scene} ${2:label}', doc: 'Call a subroutine in another scene.' },
    { name: 'return', snippet: 'return', doc: 'Return from a subroutine.' },
    { name: 'label', snippet: 'label ${1:name}', doc: 'Define a named jump target.' },
    { name: 'params', snippet: 'params ${1:param1}', doc: 'Declare subroutine parameters.' },
    { name: 'finish', snippet: 'finish', doc: 'End the current scene and proceed to the next.' },
    { name: 'ending', snippet: 'ending', doc: 'End the game.' },
    { name: 'end_game', snippet: 'end_game', doc: 'End the game immediately.' },
    { name: 'page_break', snippet: 'page_break', doc: 'Insert a page break (continue button).' },
    { name: 'line_break', snippet: 'line_break', doc: 'Insert a line break.' },
    { name: 'stat_chart', snippet: 'stat_chart\n  percent ${1:variable} "${2:Label}"', doc: 'Show the stats screen.' },
    { name: 'check_achievements', snippet: 'check_achievements', doc: 'Show the achievements screen.' },
    { name: 'achieve', snippet: 'achieve ${1:achievement_id}', doc: 'Award an achievement.' },
    { name: 'achievement', snippet: 'achievement ${1:id} visible ${2:10} ${3:Title}\n  ${4:Pre-earned description}', doc: 'Define an achievement (id visibility points title).' },
    { name: 'create', snippet: 'create ${1:variable} ${2:value}', doc: 'Declare a global variable (startup only).' },
    { name: 'temp', snippet: 'temp ${1:variable} ${2:value}', doc: 'Declare a temporary variable.' },
    { name: 'title', snippet: 'title ${1:My Story}', doc: 'Set the story title (startup only).' },
    { name: 'author', snippet: 'author ${1:Author Name}', doc: 'Set the author (startup only).' },
    { name: 'scene_list', snippet: 'scene_list\n  ${1:startup}', doc: 'Declare scene order (startup only).' },
    { name: 'comment', snippet: 'comment ${1:text}', doc: 'A comment line (ignored at runtime).' },
    { name: 'image', snippet: 'image ${1:filename.jpg}', doc: 'Display an image.' },
    { name: 'selectable_if', snippet: 'selectable_if (${1:condition}) #${2:Option}', doc: 'Choice option that is disabled when condition is false.' },
    { name: 'hide_reuse', snippet: 'hide_reuse', doc: 'Hide a choice after it has been selected.' },
    { name: 'disable_reuse', snippet: 'disable_reuse', doc: 'Disable a choice after it has been selected.' },
    { name: 'allow_reuse', snippet: 'allow_reuse', doc: 'Allow repeated selection of a choice.' },
    { name: 'delay_break', snippet: 'delay_break', doc: 'Page break with a loading delay before continuing.' },
    { name: 'goto_random_scene', snippet: 'goto_random_scene\n  ${1:scene_a}\n  ${2:scene_b}', doc: 'Jump to one of several scenes at random.' },
    { name: 'delete', snippet: 'delete ${1:variable}', doc: 'Remove a variable entirely.' },
    { name: 'ifid', snippet: 'ifid ${1:UUID-HERE}', doc: 'Set the Interactive Fiction ID (startup only).' },
    { name: 'redirect_scene', snippet: 'redirect_scene ${1:scene}', doc: 'Navigate from the stats screen to a scene.' },
    { name: 'save_checkpoint', snippet: 'save_checkpoint', doc: 'Save the current game state to a checkpoint slot.' },
    { name: 'restore_checkpoint', snippet: 'restore_checkpoint', doc: 'Restore a previously saved checkpoint.' },
    { name: 'show_password', snippet: 'show_password', doc: 'Display an encoded save-state password box.' },
    { name: 'share_this_game', snippet: 'share_this_game', doc: 'Show social sharing links.' },
    { name: 'more_games', snippet: 'more_games', doc: 'Show a list of other games from the publisher.' },
    { name: 'bug', snippet: 'bug ${1:Custom error message}', doc: 'Halt execution with a debug error message.' },
    { name: 'looplimit', snippet: 'looplimit ${1:2000}', doc: 'Override the default loop detection limit.' },
];

const CMD_DOC_MAP = new Map(CS_COMMANDS.map(c => [c.name, c.doc]));

// ─── Language registration ─────────────────────────────────────────────────

let registered = false;

export function registerChoiceScriptLanguage(monaco: typeof Monaco): void {
    if (registered) return;
    registered = true;

    monaco.languages.register({ id: CS_LANG_ID });

    monaco.languages.setMonarchTokensProvider(CS_LANG_ID, {
        tokenizer: {
            root: [
                // Comment lines
                [/^\s*\*comment\b.*$/, 'comment'],
                // Label definitions
                [/^\s*\*label\s+\w+/, 'entity.name.function'],
                // Commands (*word)
                [/\*[a-z_]+/, 'keyword'],
                // Option lines (#...)
                [/^\s*#.*$/, 'string'],
                // Variable substitution: $!{}, $!!{} (capitalized), ${var#N} (char index), ${var}
                [/\$!!?\{[^}]+\}/, 'variable'],
                [/\$\{[^}#]*#\d+[^}]*\}/, 'variable'],
                [/\$\{[^}]+\}/, 'variable'],
                // Conditional substitution @{...}
                [/@@?\{[^}]+\}/, 'keyword.control'],
                // Inline format tags [b], [i], [u], [/b], [/i], [/u]
                [/\[\/?(b|i|u)\]/, 'markup.bold'],
                // Numbers
                [/\b\d+\b/, 'number'],
                // Strings in double quotes
                [/"[^"]*"/, 'string'],
                // Everything else is plain text
                [/.+/, 'text'],
            ],
        },
    });

    monaco.languages.setLanguageConfiguration(CS_LANG_ID, {
        comments: { lineComment: '*comment' },
        brackets: [['[', ']'], ['(', ')']],
        autoClosingPairs: [
            { open: '"', close: '"' },
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '${', close: '}' },
        ],
        indentationRules: {
            increaseIndentPattern: /^\s*\*(choice|fake_choice|if|elseif|else)\b/,
            decreaseIndentPattern: /^\s*(\*else\b|\*elseif\b)/,
        },
    });
}

// ─── Completion provider factory ───────────────────────────────────────────

export function getCommandCompletions(): Array<{ label: string; snippet: string; doc: string }> {
    return CS_COMMANDS.map(c => ({ label: `*${c.name}`, snippet: `*${c.snippet}`, doc: c.doc }));
}

export function getVariableCompletions(story: Pick<MyStory, 'variables'>): Array<{ label: string; doc: string }> {
    return (story.variables ?? []).map(v => ({
        label: v.name,
        doc: `${v.type} — initial: ${v.initialValue}${v.description ? ` — ${v.description}` : ''}`,
    }));
}

export function getSceneCompletions(story: Pick<MyStory, 'scenes'>): Array<{ label: string }> {
    return story.scenes.map(s => ({ label: s.id }));
}

export function registerCompletionProvider(monaco: typeof Monaco, getStory: () => MyStory | null) {
    return monaco.languages.registerCompletionItemProvider(CS_LANG_ID, {
        triggerCharacters: ['*', '$', '@', ' '],
        provideCompletionItems(model, position) {
            const line = model.getLineContent(position.lineNumber);
            const beforeCursor = line.slice(0, position.column - 1);
            const wordRange = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: wordRange.startColumn,
                endColumn: position.column,
            };

            const story = getStory();

            // *command completions
            if (/\*\w*$/.test(beforeCursor)) {
                return {
                    suggestions: CS_COMMANDS.map(c => ({
                        label: `*${c.name}`,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        documentation: c.doc,
                        insertText: `*${c.snippet}`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: { ...range, startColumn: Math.max(1, beforeCursor.lastIndexOf('*') + 1) },
                    })),
                };
            }

            // ${variable} completions
            if (/\$\{?\w*$/.test(beforeCursor) && story) {
                return {
                    suggestions: getVariableCompletions(story).map(v => ({
                        label: v.label,
                        kind: monaco.languages.CompletionItemKind.Variable,
                        documentation: v.doc,
                        insertText: v.label,
                        range,
                    })),
                };
            }

            // *goto_scene / *goto completions
            if (/\*goto_scene\s+\w*$/.test(beforeCursor) && story) {
                return {
                    suggestions: getSceneCompletions(story).map(s => ({
                        label: s.label,
                        kind: monaco.languages.CompletionItemKind.Module,
                        insertText: s.label,
                        range,
                    })),
                };
            }

            return { suggestions: [] };
        },
    });
}

// ─── Hover provider factory ────────────────────────────────────────────────

export function registerHoverProvider(monaco: typeof Monaco, getStory: () => MyStory | null) {
    return monaco.languages.registerHoverProvider(CS_LANG_ID, {
        provideHover(model, position) {
            const word = model.getWordAtPosition(position);
            if (!word) return null;

            // Check if hovering a *command
            const line = model.getLineContent(position.lineNumber);
            const cmdMatch = line.match(/\*([a-z_]+)/);
            if (cmdMatch) {
                const doc = CMD_DOC_MAP.get(cmdMatch[1]);
                if (doc) {
                    return {
                        range: new monaco.Range(position.lineNumber, 1, position.lineNumber, line.length + 1),
                        contents: [{ value: `**\`*${cmdMatch[1]}\`** — ${doc}` }],
                    };
                }
            }

            // Check if hovering a variable name
            const story = getStory();
            if (story) {
                const varDef = story.variables?.find(v => v.name === word.word);
                if (varDef) {
                    return {
                        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                        contents: [{ value: `**${varDef.name}** (${varDef.type}) — initial: \`${varDef.initialValue}\`` }],
                    };
                }
            }

            return null;
        },
    });
}
