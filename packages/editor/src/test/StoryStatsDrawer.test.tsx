import { describe, it, expect } from 'vitest';
import { computeStoryStats } from '../StoryStatsDrawer';
import {
    makeStory, makeScene, makeStartNode, makePassageNode, makeEndingNode, makeLinearStory,
} from '../test/fixtures';

describe('computeStoryStats', () => {
    it('counts nodes by type', () => {
        const story = makeStory({
            scenes: [makeScene({
                id: 'startup',
                nodes: [makeStartNode(), makePassageNode({ id: 'p1' }), makePassageNode({ id: 'p2' }), makeEndingNode()],
            })],
        });
        const stats = computeStoryStats(story);
        expect(stats.nodesByType.passage).toBe(2);
        expect(stats.nodesByType.ending).toBe(1);
        expect(stats.nodesByType.start).toBe(1);
    });

    it('counts total nodes and edges', () => {
        const story = makeStory();
        const stats = computeStoryStats(story);
        expect(stats.totalNodes).toBeGreaterThan(0);
        expect(stats.totalEdges).toBeGreaterThan(0);
    });

    it('calculates total word count across all scenes', () => {
        const story = makeStory({
            scenes: [
                makeScene({ id: 'scene1', nodes: [makePassageNode({ id: 'p1', data: { label: 'A', content: 'One two three.' } })], edges: [] }),
                makeScene({ id: 'scene2', nodes: [makePassageNode({ id: 'p2', data: { label: 'B', content: 'Four five.' } })], edges: [] }),
            ],
            sceneOrder: ['scene1', 'scene2'],
        });
        expect(computeStoryStats(story).totalWords).toBe(5);
    });

    it('returns 0 words for a story with no content', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'startup', nodes: [makeStartNode(), makeEndingNode()], edges: [] })],
        });
        expect(computeStoryStats(story).totalWords).toBe(0);
    });

    it('calculates longest path depth from start to any ending', () => {
        // Linear chain: start → p1 → p2 → ending (depth 3)
        const story = makeLinearStory(3);
        expect(computeStoryStats(story).longestPathDepth).toBe(3);
    });

    it('returns longestPathDepth 0 for single start node', () => {
        const story = makeStory({
            scenes: [makeScene({ id: 'startup', nodes: [makeStartNode()], edges: [] })],
        });
        expect(computeStoryStats(story).longestPathDepth).toBe(0);
    });

    it('counts variables and achievements', () => {
        const story = makeStory({
            variables: [
                { name: 'score', type: 'number', initialValue: 0, scope: 'global' },
                { name: 'hp', type: 'number', initialValue: 100, scope: 'global' },
            ],
            achievements: [
                { id: 'ach1', title: 'A1', points: 10, shortDescription: '', isVisible: true },
            ],
        });
        const stats = computeStoryStats(story);
        expect(stats.variableCount).toBe(2);
        expect(stats.achievementCount).toBe(1);
    });

    it('counts endings across multiple scenes', () => {
        const story = makeStory({
            scenes: [
                makeScene({ id: 's1', nodes: [makeStartNode(), makeEndingNode({ id: 'e1' })] }),
                makeScene({ id: 's2', nodes: [makeStartNode(), makeEndingNode({ id: 'e2' }), makeEndingNode({ id: 'e3' })] }),
            ],
            sceneOrder: ['s1', 's2'],
        });
        expect(computeStoryStats(story).endingCount).toBe(3);
    });
});
