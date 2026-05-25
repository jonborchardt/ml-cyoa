import { useMemo } from 'react';
import {
    Box, Divider, Drawer, Stack, Typography,
} from '@mui/material';
import type { MyStory } from './myStoryStore';
import type { NodeData } from './parseGameFlow';
import type { Node } from '@xyflow/react';

export interface StoryStats {
    totalNodes: number;
    nodesByType: Record<string, number>;
    totalEdges: number;
    totalWords: number;
    avgWordsPerNode: number;
    endingCount: number;
    variableCount: number;
    achievementCount: number;
    longestPathDepth: number;
    estimatedReadTime: { min: number; max: number };
}

export function computeStoryStats(story: MyStory): StoryStats {
    const nodesByType: Record<string, number> = {};
    let totalNodes = 0;
    let totalEdges = 0;
    let totalWords = 0;
    let endingCount = 0;
    let longestPathDepth = 0;

    for (const scene of story.scenes) {
        totalEdges += scene.edges.length;

        for (const node of scene.nodes) {
            totalNodes++;
            const t = node.type ?? 'unknown';
            nodesByType[t] = (nodesByType[t] ?? 0) + 1;
            if (t === 'ending') endingCount++;

            const content = ((node as Node<NodeData>).data.content as string) ?? '';
            const trimmed = content.trim();
            if (trimmed) {
                totalWords += trimmed.split(/\s+/).length;
            }
        }

        // BFS from start to find longest path depth
        const startNode = scene.nodes.find(n => n.type === 'start');
        if (startNode) {
            const nodeSet = new Set(scene.nodes.map(n => n.id));
            const fwd = new Map<string, string[]>();
            for (const { source, target } of scene.edges) {
                if (!nodeSet.has(source) || !nodeSet.has(target)) continue;
                if (!fwd.has(source)) fwd.set(source, []);
                fwd.get(source)!.push(target);
            }
            const layerOf = new Map<string, number>([[startNode.id, 0]]);
            const queue = [startNode.id];
            while (queue.length > 0) {
                const id = queue.shift()!;
                const depth = layerOf.get(id)!;
                if (depth > longestPathDepth) longestPathDepth = depth;
                for (const child of fwd.get(id) ?? []) {
                    if (!layerOf.has(child)) {
                        layerOf.set(child, depth + 1);
                        queue.push(child);
                    }
                }
            }
        }
    }

    const contentNodes = totalNodes - (nodesByType['start'] ?? 0) - (nodesByType['page_break'] ?? 0);
    const avgWordsPerNode = contentNodes > 0 ? Math.round(totalWords / contentNodes) : 0;
    const baseMinutes = totalWords / 200;
    const estimatedReadTime = {
        min: Math.max(1, Math.round(baseMinutes * 0.6)),
        max: Math.max(1, Math.round(baseMinutes * 1.4)),
    };

    return {
        totalNodes,
        nodesByType,
        totalEdges,
        totalWords,
        avgWordsPerNode,
        endingCount,
        variableCount: story.variables?.length ?? 0,
        achievementCount: story.achievements?.length ?? 0,
        longestPathDepth,
        estimatedReadTime,
    };
}

function StatRow({ label, value }: { label: string; value: string | number }) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body2" fontWeight={600}>{value}</Typography>
        </Stack>
    );
}

interface Props {
    open: boolean;
    story: MyStory;
    onClose: () => void;
}

export function StoryStatsDrawer({ open, story, onClose }: Props) {
    const stats = useMemo(() => computeStoryStats(story), [story]);

    const nodeTypeCounts = Object.entries(stats.nodesByType)
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => a.localeCompare(b));

    return (
        <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 320, p: 2.5 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Story Statistics</Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Overview</Typography>
            <StatRow label="Total nodes" value={stats.totalNodes} />
            <StatRow label="Total choices (edges)" value={stats.totalEdges} />
            <StatRow label="Endings" value={stats.endingCount} />
            <StatRow label="Scenes" value={story.scenes.length} />
            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Writing</Typography>
            <StatRow label="Total words" value={stats.totalWords} />
            <StatRow label="Avg words / node" value={stats.avgWordsPerNode} />
            <StatRow
                label="Est. read time"
                value={
                    stats.estimatedReadTime.min === stats.estimatedReadTime.max
                        ? `${stats.estimatedReadTime.min} min`
                        : `${stats.estimatedReadTime.min}–${stats.estimatedReadTime.max} min`
                }
            />
            <StatRow label="Longest path depth" value={stats.longestPathDepth} />
            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Nodes by type</Typography>
            {nodeTypeCounts.map(([type, count]) => (
                <StatRow key={type} label={type.replace(/_/g, ' ')} value={count} />
            ))}
            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Story design</Typography>
            <StatRow label="Variables" value={stats.variableCount} />
            <StatRow label="Achievements" value={stats.achievementCount} />

            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    Read time is estimated at 200 wpm and varies by path through the story.
                </Typography>
            </Box>
        </Drawer>
    );
}
