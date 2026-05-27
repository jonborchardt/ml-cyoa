import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getMyStory, type MyStory } from './myStoryStore';
import { GameTabHeader } from './GameTabHeader';
import { MyStoryFlowPanel } from './MyStoryFlowPanel';
import { MyStoryAuthorsPanel } from './MyStoryAuthorsPanel';
import { serializeStory } from './serializeStory';
import type { Game } from './types';

export type RenderGamePreview = (props: {
    story: MyStory;
    scenes?: Record<string, string>;
    previewKey: string;
    disableNavigation?: boolean;
}) => ReactNode;

interface MyStoryShellProps {
    onSubmitStory?: (title: string, body: string) => Promise<void>;
    renderGamePreview?: RenderGamePreview;
}

export function MyStoryShell({ onSubmitStory, renderGamePreview }: MyStoryShellProps) {
    const { storyId } = useParams<{ storyId: string }>();
    const { pathname } = useLocation();

    const tabValue = pathname.endsWith('/flow') ? 2 : pathname.endsWith('/authors') ? 1 : 0;

    const [tabsVisited, setTabsVisited] = useState<Set<number>>(() => new Set([tabValue]));
    if (!tabsVisited.has(tabValue)) {
        setTabsVisited(new Set([...tabsVisited, tabValue]));
    }

    const [story, setStory] = useState<MyStory | null>(() => (storyId ? getMyStory(storyId) : null));
    const [storyVersion, setStoryVersion] = useState(0);

    const handleStoryChange = useCallback((updated: MyStory) => {
        setStory(updated);
    }, []);

    // Bump version when user switches to Story tab so the iframe reloads.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (tabValue === 0) setStoryVersion(v => v + 1);
    }, [tabValue]);

    const storyScenes = useMemo(
        () => {
            if (!story) return undefined;
            const files = serializeStory(story);
            return Object.fromEntries(files.entries());
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [storyVersion],
    );

    if (!story) {
        return (
            <Box sx={{ p: 4 }}>
                <Button component={Link} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
                    Home
                </Button>
                <Typography variant="h5">Story not found</Typography>
            </Box>
        );
    }

    const gameAdapter: Game = {
        id: story.id,
        title: story.title || 'My Story',
        authors: [{ name: story.authorName || 'Author', bio: story.authorBio, image: story.authorPhoto }],
        year: new Date(story.createdAt).getFullYear().toString(),
        sceneList: story.sceneOrder.length > 0 ? story.sceneOrder : ['startup'],
        scenes: storyScenes ?? { startup: '' },
        coverImage: story.coverImage,
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <GameTabHeader game={gameAdapter} basePath={`/my/${story.id}`} homePath="/mystories" />

            <Box sx={{ flex: 1, minHeight: 0, flexDirection: 'column', display: tabValue === 0 ? 'flex' : 'none' }}>
                {renderGamePreview
                    ? renderGamePreview({ story, scenes: storyScenes, previewKey: String(storyVersion) })
                    : null}
            </Box>

            {tabsVisited.has(1) && (
                <Box sx={{ flex: 1, overflow: 'auto', display: tabValue === 1 ? 'block' : 'none' }}>
                    <MyStoryAuthorsPanel story={story} />
                </Box>
            )}

            {tabsVisited.has(2) && (
                <Box sx={{ flex: 1, minHeight: 0, display: tabValue === 2 ? 'flex' : 'none', flexDirection: 'column' }}>
                    <MyStoryFlowPanel
                        story={story}
                        onStoryChange={handleStoryChange}
                        onSubmitStory={onSubmitStory}
                        renderGamePreview={renderGamePreview}
                    />
                </Box>
            )}
        </Box>
    );
}
