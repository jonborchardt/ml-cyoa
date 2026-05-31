/**
 * patchCode.ts
 *
 * Surgical text-level patches to ChoiceScript code.
 * All functions are pure: they take the current code string and return a new one.
 * They never call the parser — they are plain text operations.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────

function findLabelLine(lines: string[], labelName: string): number {
    return lines.findIndex(l => l.trim() === `*label ${labelName}`);
}

/** Indent of a line in spaces (first non-space character position). */
function lineIndent(line: string): number {
    const idx = line.search(/\S/);
    return idx < 0 ? Infinity : idx;
}

/**
 * End index (exclusive) of the section starting at labelIdx.
 * A section ends at the next *label line whose indent is ≤ the opening label's indent.
 */
function sectionEnd(lines: string[], labelIdx: number): number {
    const ind = lineIndent(lines[labelIdx]);
    for (let i = labelIdx + 1; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t.startsWith('*label') && lineIndent(lines[i]) <= ind) return i;
    }
    return lines.length;
}

// ─── patchNodeContent ─────────────────────────────────────────────────────

/**
 * Replace the prose text in a `*label` block.
 * Prose lines are the contiguous non-command, non-option lines immediately
 * following the `*label` line.
 */
export function patchNodeContent(code: string, labelName: string, newContent: string): string {
    const lines = code.split('\n');
    const labelIdx = findLabelLine(lines, labelName);
    if (labelIdx < 0) return code;

    const ind = lineIndent(lines[labelIdx]);
    const pad = ' '.repeat(ind);

    // Prose block: non-blank lines that don't start with * or # (after trim)
    let proseEnd = labelIdx + 1;
    while (proseEnd < lines.length) {
        const t = lines[proseEnd].trim();
        if (!t || t.startsWith('*') || t.startsWith('#')) break;
        proseEnd++;
    }

    const before = lines.slice(0, labelIdx + 1);
    const after = lines.slice(proseEnd);
    const newProseLines = newContent.trim()
        ? newContent.trim().split('\n').map(l => `${pad}${l}`)
        : [];

    return [...before, ...newProseLines, ...after].join('\n');
}

// ─── patchEdgeLabel ───────────────────────────────────────────────────────

/**
 * Replace the choice-text of one #option line inside a source node's *choice block.
 * Handles optional *hide_reuse / *disable_reuse / *allow_reuse / *selectable_if prefixes.
 */
export function patchEdgeLabel(
    code: string,
    sourceLabelName: string,
    oldOptionText: string,
    newOptionText: string,
): string {
    const lines = code.split('\n');
    const labelIdx = findLabelLine(lines, sourceLabelName);
    if (labelIdx < 0) return code;

    const ind = lineIndent(lines[labelIdx]);
    const end = sectionEnd(lines, labelIdx);

    for (let i = labelIdx + 1; i < end; i++) {
        const t = lines[i].trim();
        const optMatch = t.match(/^((?:\*(?:hide_reuse|disable_reuse|allow_reuse|selectable_if\s*\([^)]*\))\s*)?)#(.*)$/);
        if (optMatch && optMatch[2].trim() === oldOptionText.trim()) {
            const lineInd = ' '.repeat(lineIndent(lines[i]));
            lines[i] = `${lineInd}${optMatch[1]}#${newOptionText}`;
            break;
        }
    }
    void ind;
    return lines.join('\n');
}

// ─── appendNodeBlock ──────────────────────────────────────────────────────

/**
 * Append a new `*label` block at the end of the scene code.
 * For `ending` nodes, appends `*finish`.
 */
export function appendNodeBlock(
    code: string,
    labelName: string,
    nodeType: string,
    content?: string,
): string {
    const newLines: string[] = [`*label ${labelName}`];
    if (content?.trim()) {
        for (const l of content.trim().split('\n')) newLines.push(l);
    }
    if (nodeType === 'ending') newLines.push('*finish');
    return code.trimEnd() + '\n' + newLines.join('\n');
}

// ─── appendChoiceOption ───────────────────────────────────────────────────

/**
 * Append a new #option to a source node's *choice block.
 *
 * If the source node already has a `*choice` block → insert the new option at the end.
 * If the source node has an explicit `*goto` but no `*choice` → replace the `*goto` with a
 *   two-option `*choice` block (old edge + new edge).
 * If the source node has implicit fall-through (no `*goto`, no `*choice`) → insert a
 *   `*choice` block before the next section using `existingTargetLabelName` as the old target.
 *
 * @param existingOptionText    Label text of the already-existing single edge (if any).
 * @param existingTargetLabelName  Code label of the already-existing target (if any).
 */
export function appendChoiceOption(
    code: string,
    sourceLabelName: string,
    optionText: string,
    targetLabelName: string,
    existingOptionText?: string,
    existingTargetLabelName?: string,
): string {
    const lines = code.split('\n');
    const labelIdx = findLabelLine(lines, sourceLabelName);
    if (labelIdx < 0) return code;

    const ind = lineIndent(lines[labelIdx]);
    const pad = ' '.repeat(ind);
    const end = sectionEnd(lines, labelIdx);

    // Look for an existing *choice block in this section
    let choiceIdx = -1;
    for (let i = labelIdx + 1; i < end; i++) {
        const t = lines[i].trim();
        if (t.startsWith('*choice') && lineIndent(lines[i]) === ind) {
            choiceIdx = i;
            break;
        }
    }

    if (choiceIdx >= 0) {
        // ── Case A: already has *choice — insert new option before end of block ──
        // The choice block ends when a line at ≤ ind appears (that isn't an option / body).
        let insertIdx = end;
        for (let i = choiceIdx + 1; i < end; i++) {
            const t = lines[i].trim();
            if (!t) continue;
            const li = lineIndent(lines[i]);
            if (li <= ind) { insertIdx = i; break; }
        }
        lines.splice(insertIdx, 0,
            `${pad}  #${optionText}`,
            `${pad}    *goto ${targetLabelName}`,
        );
        return lines.join('\n');
    }

    // Look for explicit *goto in this section
    let gotoIdx = -1;
    for (let i = labelIdx + 1; i < end; i++) {
        const t = lines[i].trim();
        if (t.startsWith('*goto ') && lineIndent(lines[i]) === ind) {
            gotoIdx = i;
            break;
        }
    }

    const oldLabel = existingOptionText || 'Continue';

    if (gotoIdx >= 0) {
        // ── Case B: has explicit *goto — replace it with a *choice block ──
        const m = lines[gotoIdx].trim().match(/^\*goto\s+(\S+)/);
        const oldTarget = m?.[1] ?? existingTargetLabelName ?? 'MISSING';
        lines.splice(gotoIdx, 1,
            `${pad}*choice`,
            `${pad}  #${oldLabel}`,
            `${pad}    *goto ${oldTarget}`,
            `${pad}  #${optionText}`,
            `${pad}    *goto ${targetLabelName}`,
        );
        return lines.join('\n');
    }

    // ── Case C: implicit fall-through — insert *choice block before next section ──
    if (existingTargetLabelName) {
        lines.splice(end, 0,
            `${pad}*choice`,
            `${pad}  #${oldLabel}`,
            `${pad}    *goto ${existingTargetLabelName}`,
            `${pad}  #${optionText}`,
            `${pad}    *goto ${targetLabelName}`,
        );
    } else {
        // No existing target known — just append a single-option choice
        lines.splice(end, 0,
            `${pad}*choice`,
            `${pad}  #${optionText}`,
            `${pad}    *goto ${targetLabelName}`,
        );
    }
    return lines.join('\n');
}

// ─── removeNodeBlock ──────────────────────────────────────────────────────

/**
 * Remove the `*label` block for `labelName` (from the `*label` line to the
 * start of the next sibling section, exclusive).
 */
export function removeNodeBlock(code: string, labelName: string): string {
    const lines = code.split('\n');
    const labelIdx = findLabelLine(lines, labelName);
    if (labelIdx < 0) return code;

    const end = sectionEnd(lines, labelIdx);
    lines.splice(labelIdx, end - labelIdx);
    return lines.join('\n');
}

// ─── removeChoiceOption ───────────────────────────────────────────────────

/**
 * Remove one `#option` line and its indented body from a `*choice` block.
 * The option is matched by text (trimmed) inside the source node's section.
 */
export function removeChoiceOption(
    code: string,
    sourceLabelName: string,
    optionText: string,
): string {
    const lines = code.split('\n');
    const labelIdx = findLabelLine(lines, sourceLabelName);
    if (labelIdx < 0) return code;

    const ind = lineIndent(lines[labelIdx]);
    const end = sectionEnd(lines, labelIdx);
    const optionInd = ind + 2; // options are at labelIndent + 2

    for (let i = labelIdx + 1; i < end; i++) {
        const t = lines[i].trim();
        const li = lineIndent(lines[i]);
        const optMatch = t.match(/^((?:\*(?:hide_reuse|disable_reuse|allow_reuse|selectable_if\s*\([^)]*\))\s*)?)#(.*)$/);
        if (optMatch && li === optionInd && optMatch[2].trim() === optionText.trim()) {
            // Remove option line + its indented body
            const removeStart = i;
            let removeEnd = i + 1;
            while (removeEnd < end) {
                const bodyLine = lines[removeEnd];
                if (bodyLine.trim() && lineIndent(bodyLine) <= optionInd) break;
                removeEnd++;
            }
            lines.splice(removeStart, removeEnd - removeStart);
            return lines.join('\n');
        }
    }
    return code;
}
