import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FindReplacePanel } from './FindReplacePanel';
import { makeStory, makeScene, makePassageNode } from './test/fixtures';

describe('FindReplacePanel', () => {
    it('shows no results before typing', () => {
        const story = makeStory();
        render(<FindReplacePanel story={story} />);
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });

    it('highlights nodes whose content matches the search term', async () => {
        const story = makeStory({
            scenes: [makeScene({
                id: 'startup',
                nodes: [
                    makePassageNode({ id: 'n1', data: { label: 'Intro', content: 'You enter the cave.' } }),
                    makePassageNode({ id: 'n2', data: { label: 'Exit', content: 'You exit the cave.' } }),
                ],
            })],
        });
        const onSelectNode = vi.fn();
        render(<FindReplacePanel story={story} onSelectNode={onSelectNode} />);
        await userEvent.type(screen.getByRole('textbox', { name: /search/i }), 'cave');
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('calls onSelectNode when a result is clicked', async () => {
        const story = makeStory({
            scenes: [makeScene({
                id: 'startup',
                nodes: [makePassageNode({ id: 'n1', data: { label: 'Intro', content: 'You enter the cave.' } })],
            })],
        });
        const onSelectNode = vi.fn();
        render(<FindReplacePanel story={story} onSelectNode={onSelectNode} />);
        await userEvent.type(screen.getByRole('textbox', { name: /search/i }), 'cave');
        await userEvent.click(screen.getByRole('button', { name: /intro/i }));
        expect(onSelectNode).toHaveBeenCalledWith('startup', 'n1');
    });

    it('is case-insensitive', async () => {
        const story = makeStory({
            scenes: [makeScene({
                id: 'startup',
                nodes: [makePassageNode({ id: 'n1', data: { label: 'Hero', content: 'The Hero walks.' } })],
            })],
        });
        render(<FindReplacePanel story={story} />);
        await userEvent.type(screen.getByRole('textbox', { name: /search/i }), 'hero');
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('calls onReplaceAll with updated node content', async () => {
        const story = makeStory({
            scenes: [makeScene({
                id: 'startup',
                nodes: [makePassageNode({ id: 'p1', data: { label: 'A passage', content: 'The hero enters.' } })],
            })],
        });
        const onReplace = vi.fn();
        render(<FindReplacePanel story={story} onReplaceAll={onReplace} />);
        await userEvent.type(screen.getByRole('textbox', { name: /search/i }), 'hero');
        await userEvent.type(screen.getByRole('textbox', { name: /replace/i }), 'knight');
        await userEvent.click(screen.getByRole('button', { name: /replace all/i }));
        expect(onReplace).toHaveBeenCalledWith(
            expect.objectContaining({
                scenes: expect.arrayContaining([
                    expect.objectContaining({
                        nodes: expect.arrayContaining([
                            expect.objectContaining({
                                data: expect.objectContaining({ content: 'The knight enters.' }),
                            }),
                        ]),
                    }),
                ]),
            }),
        );
    });

    it('shows no results when search does not match', async () => {
        const story = makeStory({
            scenes: [makeScene({
                id: 'startup',
                nodes: [makePassageNode({ id: 'n1', data: { label: 'Test', content: 'A boring sentence.' } })],
            })],
        });
        render(<FindReplacePanel story={story} />);
        await userEvent.type(screen.getByRole('textbox', { name: /search/i }), 'xyz_no_match');
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
        expect(screen.getByText('No results')).toBeInTheDocument();
    });
});
