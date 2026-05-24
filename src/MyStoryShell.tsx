import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getMyStory, type MyStory } from './myStoryStore';
import { GameTabHeader } from './GameTabHeader';
import { ChoiceScriptGame } from './ChoiceScriptGame';
import { MyStoryFlowPanel } from './MyStoryFlowPanel';
import { MyStoryAuthorsPanel } from './MyStoryAuthorsPanel';
import { serializeFlow } from './serializeFlow';
import type { Game } from './games';

export function MyStoryShell() {
    const { storyId } = useParams<{ storyId: string }>();
    const { pathname } = useLocation();

    const tabValue = pathname.endsWith('/flow') ? 1 : pathname.endsWith('/authors') ? 2 : 0;

    const [tabsVisited, setTabsVisited] = useState<Set<number>>(() => new Set([tabValue]));
    if (!tabsVisited.has(tabValue)) {
        setTabsVisited(new Set([...tabsVisited, tabValue]));
    }

    // story state is kept up to date via onStoryChange from MyStoryFlowPanel.
    // No need to reload from localStorage on every tab switch — the flow panel
    // calls onStoryChange after every auto-save, keeping this in sync.
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

    // storyRef always holds the latest story so storyScenes can read it
    // without adding story to the memo's dependency array.
    const storyRef = useRef(story);
    // eslint-disable-next-line react-hooks/refs
    storyRef.current = story;

    const storyScenes = useMemo(
        // eslint-disable-next-line react-hooks/refs
        () => storyRef.current ? { startup: serializeFlow(storyRef.current.nodes, storyRef.current.edges) } : undefined,
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
        sceneList: ['startup'],
        scenes: storyScenes ?? { startup: '' },
        coverImage: story.coverImage,
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <GameTabHeader game={gameAdapter} basePath={`/my/${story.id}`} />

            <Box sx={{ flex: 1, minHeight: 0, flexDirection: 'column', display: tabValue === 0 ? 'flex' : 'none' }}>
                <ChoiceScriptGame
                    key={story.id + '-v' + storyVersion}
                    game={gameAdapter}
                    scenes={storyScenes}
                    images={story.images}
                />
            </Box>

            {tabsVisited.has(1) && (
                <Box sx={{ flex: 1, minHeight: 0, display: tabValue === 1 ? 'flex' : 'none', flexDirection: 'column' }}>
                    <MyStoryFlowPanel story={story} onStoryChange={handleStoryChange} />
                </Box>
            )}

            {tabsVisited.has(2) && (
                <Box sx={{ flex: 1, overflow: 'auto', display: tabValue === 2 ? 'block' : 'none' }}>
                    <MyStoryAuthorsPanel story={story} />
                </Box>
            )}
        </Box>
    );
}
