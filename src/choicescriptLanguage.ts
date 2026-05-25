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

// ─── Rich snippets ─────────────────────────────────────────────────────────

const CS_SNIPPETS: Array<{ label: string; snippet: string; doc: string }> = [
    {
        label: 'choice block',
        snippet: '*choice\n  #${1:Option A}\n    ${2:Text for option A.}\n  #${3:Option B}\n    ${4:Text for option B.}',
        doc: 'Full *choice block with two placeholder options.',
    },
    {
        label: 'if / elseif / else chain',
        snippet: '*if ${1:variable} ${2:= true}\n  ${3:true branch}\n*elseif ${4:variable} ${5:= false}\n  ${6:elseif branch}\n*else\n  ${7:else branch}',
        doc: 'Complete *if / *elseif / *else chain.',
    },
    {
        label: 'stat_chart block',
        snippet: '*stat_chart\n  percent ${1:variable} "${2:Label}"\n  opposed_pair ${3:var_a}\n    ${4:Label A}\n    ${5:Label B}',
        doc: 'Stats screen with a percent bar and an opposed pair.',
    },
    {
        label: 'achievement block',
        snippet: '*achievement ${1:ach_id} visible ${2:10} ${3:Title}\n  ${4:Pre-earned description.}\n  ${5:Post-earned description.}',
        doc: 'Achievement definition with id, visibility, points, title, and descriptions.',
    },
    {
        label: 'scene boilerplate',
        snippet: '*title ${1:My Story}\n*author ${2:Author Name}\n*scene_list\n  ${3:startup}\n\n*create ${4:variable} ${5:0}\n\n${6:Story begins here.}',
        doc: 'Standard startup scene boilerplate: title, author, scene_list, and a variable.',
    },
    {
        label: 'gosub / subroutine',
        snippet: '*gosub ${1:subroutine_name}\n\n*label ${1:subroutine_name}\n${2:Subroutine body.}\n*return',
        doc: 'A *gosub call paired with its *label and *return.',
    },
    {
        label: 'input_text prompt',
        snippet: '${1:What is your name?}\n*input_text ${2:player_name}\nWelcome, ${"${2:player_name}"}!',
        doc: 'Prompt the player for a text value and echo it back.',
    },
    {
        label: 'set + modify',
        snippet: '*set ${1:variable} ${2:+} ${3:1}',
        doc: 'Modify a variable in-place (e.g. *set score + 10).',
    },
];

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

export function getLabelCompletions(story: MyStory, sceneId: string): Array<{ label: string }> {
    const scene = story.scenes.find(s => s.id === sceneId);
    if (!scene) return [];
    return scene.nodes
        .filter(n => n.type === 'scene_label' || n.type === 'subroutine_entry')
        .map(n => ({ label: (n.data as { label?: string }).label ?? '' }))
        .filter(l => l.label);
}

export function registerCompletionProvider(monaco: typeof Monaco, getStory: () => MyStory | null, getSceneId?: () => string) {
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

            // *command completions — also surface rich snippets
            if (/\*\w*$/.test(beforeCursor)) {
                const cmdRange = { ...range, startColumn: Math.max(1, beforeCursor.lastIndexOf('*') + 1) };
                const commandSuggestions = CS_COMMANDS.map(c => ({
                    label: `*${c.name}`,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    documentation: c.doc,
                    insertText: `*${c.snippet}`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: cmdRange,
                }));
                const snippetSuggestions = CS_SNIPPETS.map(s => ({
                    label: s.label,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    documentation: s.doc,
                    insertText: s.snippet,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: cmdRange,
                    sortText: 'z' + s.label,
                }));
                return { suggestions: [...commandSuggestions, ...snippetSuggestions] };
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

            // *goto_scene / *gosub_scene completions
            if (/\*(goto_scene|gosub_scene)\s+\w*$/.test(beforeCursor) && story) {
                return {
                    suggestions: getSceneCompletions(story).map(s => ({
                        label: s.label,
                        kind: monaco.languages.CompletionItemKind.Module,
                        insertText: s.label,
                        range,
                    })),
                };
            }

            // *goto <label> completions (within current scene)
            if (/\*goto\s+\w*$/.test(beforeCursor) && story && getSceneId) {
                return {
                    suggestions: getLabelCompletions(story, getSceneId()).map(l => ({
                        label: l.label,
                        kind: monaco.languages.CompletionItemKind.Reference,
                        insertText: l.label,
                        range,
                    })),
                };
            }

            // Variable name completions after *set / *if / *elseif / *rand / *temp / *create / *delete
            if (/\*(set|if|elseif|rand|temp|create|delete)\s+\w*$/.test(beforeCursor) && story) {
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

            return { suggestions: [] };
        },
    });
}

// ─── Document highlight provider (2G) ─────────────────────────────────────

export function registerDocumentHighlightProvider(monaco: typeof Monaco) {
    return monaco.languages.registerDocumentHighlightProvider(CS_LANG_ID, {
        provideDocumentHighlights(model, position) {
            const word = model.getWordAtPosition(position);
            if (!word || word.word.length < 2) return null;
            const text = word.word;
            const lineCount = model.getLineCount();
            const highlights: Monaco.languages.DocumentHighlight[] = [];
            for (let ln = 1; ln <= lineCount; ln++) {
                const lineText = model.getLineContent(ln);
                let col = 0;
                while (true) {
                    const idx = lineText.indexOf(text, col);
                    if (idx === -1) break;
                    const before = idx > 0 ? lineText[idx - 1] : '';
                    const after = idx + text.length < lineText.length ? lineText[idx + text.length] : '';
                    if (/\w/.test(before) || /\w/.test(after)) { col = idx + 1; continue; }
                    highlights.push({
                        range: new monaco.Range(ln, idx + 1, ln, idx + text.length + 1),
                        kind: monaco.languages.DocumentHighlightKind.Text,
                    });
                    col = idx + text.length;
                }
            }
            return highlights;
        },
    });
}

// ─── Definition provider (2F) ─────────────────────────────────────────────

export type SceneSwitchFn = (sceneId: string) => void;

export function registerDefinitionProvider(
    monaco: typeof Monaco,
    getStory: () => MyStory | null,
    getSceneId: () => string,
    switchScene: SceneSwitchFn,
) {
    return monaco.languages.registerDefinitionProvider(CS_LANG_ID, {
        provideDefinition(model, position) {
            const word = model.getWordAtPosition(position);
            if (!word) return null;
            const story = getStory();
            if (!story) return null;
            const identifier = word.word;

            // Scene name → switch to that scene (return null, use side-effect)
            const matchingScene = story.scenes.find(s => s.id === identifier);
            if (matchingScene) {
                switchScene(matchingScene.id);
                return null;
            }

            // Variable name → find *create or *temp declaration in startup/current scene
            const varDef = story.variables?.find(v => v.name === identifier);
            if (varDef) {
                // Search for the *create/*temp line across all models
                const allModels = monaco.editor.getModels();
                for (const m of allModels) {
                    const lineCount = m.getLineCount();
                    for (let ln = 1; ln <= lineCount; ln++) {
                        const lineText = m.getLineContent(ln);
                        if (new RegExp(`\\*(create|temp)\\s+${identifier}\\b`).test(lineText)) {
                            return {
                                uri: m.uri,
                                range: new monaco.Range(ln, 1, ln, lineText.length + 1),
                            };
                        }
                    }
                }
                // Fall back to searching current model
                const lineCount = model.getLineCount();
                for (let ln = 1; ln <= lineCount; ln++) {
                    const lineText = model.getLineContent(ln);
                    if (new RegExp(`\\*(create|temp)\\s+${identifier}\\b`).test(lineText)) {
                        return {
                            uri: model.uri,
                            range: new monaco.Range(ln, 1, ln, lineText.length + 1),
                        };
                    }
                }
                return null;
            }

            // Label → find *label declaration in current scene
            const currentSceneId = getSceneId();
            const scene = story.scenes.find(s => s.id === currentSceneId);
            if (scene) {
                const labelNode = scene.nodes.find(
                    n => (n.type === 'scene_label' || n.type === 'subroutine_entry')
                        && ((n.data as { label?: string }).label === identifier),
                );
                if (labelNode) {
                    // Find the *label line in the current editor
                    const lineCount = model.getLineCount();
                    for (let ln = 1; ln <= lineCount; ln++) {
                        const lineText = model.getLineContent(ln);
                        if (new RegExp(`\\*label\\s+${identifier}\\b`).test(lineText)) {
                            return {
                                uri: model.uri,
                                range: new monaco.Range(ln, 1, ln, lineText.length + 1),
                            };
                        }
                    }
                }
            }

            return null;
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
