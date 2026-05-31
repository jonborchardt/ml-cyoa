import { describe, it, expect } from 'vitest';
import {
    patchNodeContent,
    patchEdgeLabel,
    appendNodeBlock,
    appendChoiceOption,
    removeNodeBlock,
    removeChoiceOption,
} from '../patchCode';

// ─── patchNodeContent ─────────────────────────────────────────────────────

describe('patchNodeContent', () => {
    it('replaces prose in a simple passage', () => {
        const code = `*label node_p0\nYou enter the tavern.\n*choice\n  #Talk\n    *goto node_p1`;
        const result = patchNodeContent(code, 'node_p0', 'You walk into the inn.');
        expect(result).toContain('You walk into the inn.');
        expect(result).not.toContain('You enter the tavern.');
        expect(result).toContain('*choice');
    });

    it('removes prose when newContent is empty', () => {
        const code = `*label node_p0\nSome text.\n*finish`;
        const result = patchNodeContent(code, 'node_p0', '');
        expect(result).not.toContain('Some text.');
        expect(result).toContain('*label node_p0');
        expect(result).toContain('*finish');
    });

    it('adds prose to a node that had none', () => {
        const code = `*label node_p0\n*finish`;
        const result = patchNodeContent(code, 'node_p0', 'New content here.');
        expect(result).toContain('New content here.');
        expect(result).toContain('*finish');
    });

    it('replaces multiline prose', () => {
        const code = `*label node_p0\nLine one.\nLine two.\n*goto node_p1`;
        const result = patchNodeContent(code, 'node_p0', 'Replaced.\nWith two lines.');
        expect(result).toContain('Replaced.');
        expect(result).toContain('With two lines.');
        expect(result).not.toContain('Line one.');
        expect(result).not.toContain('Line two.');
        expect(result).toContain('*goto node_p1');
    });

    it('returns code unchanged when label not found', () => {
        const code = `*label node_p0\nSome text.\n*finish`;
        const result = patchNodeContent(code, 'missing_label', 'New content.');
        expect(result).toBe(code);
    });

    it('patches a node among multiple sections', () => {
        const code = `*label node_p0\nFirst node.\n*label node_p1\nSecond node.\n*finish`;
        const result = patchNodeContent(code, 'node_p1', 'Updated second node.');
        expect(result).toContain('First node.');
        expect(result).toContain('Updated second node.');
        expect(result).not.toContain('Second node.');
    });
});

// ─── patchEdgeLabel ───────────────────────────────────────────────────────

describe('patchEdgeLabel', () => {
    it('renames a choice option', () => {
        const code = `*label node_p0\nWhat do you do?\n*choice\n  #Go north\n    *goto node_p1\n  #Go south\n    *goto node_p2`;
        const result = patchEdgeLabel(code, 'node_p0', 'Go north', 'Head north');
        expect(result).toContain('#Head north');
        expect(result).not.toContain('#Go north');
        expect(result).toContain('#Go south');
    });

    it('handles option with *hide_reuse prefix', () => {
        const code = `*label node_p0\n*choice\n  *hide_reuse #Old label\n    *goto node_p1`;
        const result = patchEdgeLabel(code, 'node_p0', 'Old label', 'New label');
        expect(result).toContain('*hide_reuse #New label');
        expect(result).not.toContain('Old label');
    });

    it('returns code unchanged when source label not found', () => {
        const code = `*label node_p0\n*choice\n  #Option\n    *goto node_p1`;
        const result = patchEdgeLabel(code, 'missing', 'Option', 'New option');
        expect(result).toBe(code);
    });

    it('returns code unchanged when option text not found', () => {
        const code = `*label node_p0\n*choice\n  #Option\n    *goto node_p1`;
        const result = patchEdgeLabel(code, 'node_p0', 'Nonexistent option', 'New option');
        expect(result).toBe(code);
    });
});

// ─── appendNodeBlock ──────────────────────────────────────────────────────

describe('appendNodeBlock', () => {
    it('appends a passage node block', () => {
        const code = `*label node_p0\nFirst.\n*finish`;
        const result = appendNodeBlock(code, 'node_p1', 'passage', 'New passage content.');
        expect(result).toContain('*label node_p1');
        expect(result).toContain('New passage content.');
        expect(result.indexOf('*label node_p0')).toBeLessThan(result.indexOf('*label node_p1'));
    });

    it('appends an ending node with *finish', () => {
        const code = `*label node_p0\n*goto node_p1`;
        const result = appendNodeBlock(code, 'node_p1', 'ending', 'The end.');
        expect(result).toContain('*label node_p1');
        expect(result).toContain('The end.');
        expect(result).toContain('*finish');
    });

    it('appends without content for a page_break node', () => {
        const code = `*label node_p0\nSome text.`;
        const result = appendNodeBlock(code, 'node_p1', 'page_break');
        expect(result).toContain('*label node_p1');
        expect(result).not.toContain('*finish');
    });

    it('works on empty code', () => {
        const result = appendNodeBlock('', 'node_p0', 'passage', 'Hello.');
        expect(result).toContain('*label node_p0');
        expect(result).toContain('Hello.');
    });
});

// ─── appendChoiceOption ───────────────────────────────────────────────────

describe('appendChoiceOption', () => {
    it('adds an option to an existing *choice block', () => {
        const code = `*label node_p0\nChoose your path.\n*choice\n  #Go north\n    *goto node_p1`;
        const result = appendChoiceOption(code, 'node_p0', 'Go south', 'node_p2');
        expect(result).toContain('#Go south');
        expect(result).toContain('*goto node_p2');
        expect(result).toContain('#Go north');
        expect(result).toContain('*goto node_p1');
    });

    it('converts explicit *goto to *choice when adding second edge', () => {
        const code = `*label node_p0\nSome prose.\n*goto node_p1\n*label node_p1\n*finish`;
        const result = appendChoiceOption(code, 'node_p0', 'New option', 'node_p2', 'Continue', 'node_p1');
        expect(result).toContain('*choice');
        expect(result).toContain('#Continue');
        expect(result).toContain('*goto node_p1');
        expect(result).toContain('#New option');
        expect(result).toContain('*goto node_p2');
        expect(result).not.toMatch(/^\*goto node_p1$/m);
    });

    it('inserts *choice for implicit fall-through when target known', () => {
        const code = `*label node_p0\nSome prose.\n*label node_p1\n*finish`;
        const result = appendChoiceOption(code, 'node_p0', 'A new option', 'node_p2', 'Continue', 'node_p1');
        expect(result).toContain('*choice');
        expect(result).toContain('#A new option');
        expect(result).toContain('*goto node_p2');
    });

    it('returns code unchanged when source label not found', () => {
        const code = `*label node_p0\n*choice\n  #Option\n    *goto node_p1`;
        const result = appendChoiceOption(code, 'missing', 'New', 'node_p2');
        expect(result).toBe(code);
    });
});

// ─── removeNodeBlock ──────────────────────────────────────────────────────

describe('removeNodeBlock', () => {
    it('removes a middle section', () => {
        const code = `*label node_p0\nFirst.\n*label node_p1\nMiddle.\n*label node_p2\nLast.\n*finish`;
        const result = removeNodeBlock(code, 'node_p1');
        expect(result).toContain('*label node_p0');
        expect(result).not.toContain('*label node_p1');
        expect(result).not.toContain('Middle.');
        expect(result).toContain('*label node_p2');
    });

    it('removes the last section', () => {
        const code = `*label node_p0\nFirst.\n*label node_p1\nLast.\n*finish`;
        const result = removeNodeBlock(code, 'node_p1');
        expect(result).toContain('*label node_p0');
        expect(result).not.toContain('*label node_p1');
        expect(result).not.toContain('Last.');
    });

    it('removes the first section', () => {
        const code = `*label node_p0\nFirst.\n*label node_p1\nSecond.\n*finish`;
        const result = removeNodeBlock(code, 'node_p0');
        expect(result).not.toContain('*label node_p0');
        expect(result).not.toContain('First.');
        expect(result).toContain('*label node_p1');
    });

    it('returns code unchanged when label not found', () => {
        const code = `*label node_p0\nFirst.\n*finish`;
        const result = removeNodeBlock(code, 'missing');
        expect(result).toBe(code);
    });
});

// ─── removeChoiceOption ───────────────────────────────────────────────────

describe('removeChoiceOption', () => {
    it('removes one option from a two-option choice', () => {
        const code = `*label node_p0\n*choice\n  #Go north\n    *goto node_p1\n  #Go south\n    *goto node_p2`;
        const result = removeChoiceOption(code, 'node_p0', 'Go north');
        expect(result).not.toContain('#Go north');
        expect(result).not.toContain('*goto node_p1');
        expect(result).toContain('#Go south');
        expect(result).toContain('*goto node_p2');
    });

    it('removes option along with multi-line body', () => {
        const code = `*label node_p0\n*choice\n  #Option A\n    Line 1\n    *goto node_p1\n  #Option B\n    *goto node_p2`;
        const result = removeChoiceOption(code, 'node_p0', 'Option A');
        expect(result).not.toContain('#Option A');
        expect(result).not.toContain('Line 1');
        expect(result).toContain('#Option B');
    });

    it('returns code unchanged when source label not found', () => {
        const code = `*label node_p0\n*choice\n  #Option\n    *goto node_p1`;
        const result = removeChoiceOption(code, 'missing', 'Option');
        expect(result).toBe(code);
    });

    it('returns code unchanged when option text not found', () => {
        const code = `*label node_p0\n*choice\n  #Option\n    *goto node_p1`;
        const result = removeChoiceOption(code, 'node_p0', 'Nonexistent');
        expect(result).toBe(code);
    });
});
