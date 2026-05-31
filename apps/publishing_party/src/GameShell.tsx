import { lazy, Suspense, useCallback, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { gamesById } from './games';
import { GameTabHeader } from '@ml-cyoa/editor';
import { ChoiceScriptGame } from './ChoiceScriptGame';
import { AuthorsPanel } from './AuthorsPanel';

const FlowPanel = lazy(() => import('./FlowPanel').then(m => ({ default: m.FlowPanel })));

export function GameShell() {
    const { gameId } = useParams<{ gameId: string }>();
    const { pathname } = useLocation();
    const game = gameId ? gamesById[gameId] : undefined;

    const tabValue = pathname.endsWith('/flow') ? 2 : pathname.endsWith('/authors') ? 1 : 0;

    const [tabsVisited, setTabsVisited] = useState<Set<number>>(() => new Set([tabValue]));
    if (!tabsVisited.has(tabValue)) {
        setTabsVisited(new Set([...tabsVisited, tabValue]));
    }

    const [choiceHistory, setChoiceHistory] = useState<string[]>([]);
    const handleChoiceMade = useCallback((label: string) => setChoiceHistory(prev => [...prev, label]), []);

    if (!game) {
        return (
            <Box sx={{ p: 4 }}>
                <Button component={Link} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
                    Home
                </Button>
                <Typography variant="h5">Game not found</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <GameTabHeader game={game} />

            <Box sx={{ flex: 1, minHeight: 0, flexDirection: 'column', display: tabValue === 0 ? 'flex' : 'none' }}>
                <ChoiceScriptGame game={game} onChoiceMade={handleChoiceMade} />
            </Box>

            {tabsVisited.has(1) && (
                <Box sx={{ flex: 1, overflow: 'auto', display: tabValue === 1 ? 'block' : 'none' }}>
                    <AuthorsPanel game={game} />
                </Box>
            )}

            {tabsVisited.has(2) && (
                <Box sx={{ flex: 1, minHeight: 0, display: tabValue === 2 ? 'flex' : 'none', flexDirection: 'column' }}>
                    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>}>
                        <FlowPanel game={game} choiceHistory={choiceHistory} />
                    </Suspense>
                </Box>
            )}
        </Box>
    );
}
