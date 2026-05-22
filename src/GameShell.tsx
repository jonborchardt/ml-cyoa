import { useCallback, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { gamesById } from './games';
import { GameTabHeader } from './GameTabHeader';
import { ChoiceScriptGame } from './ChoiceScriptGame';
import { FlowPanel } from './FlowPanel';
import { AuthorsPanel } from './AuthorsPanel';

export function GameShell() {
    const { gameId } = useParams<{ gameId: string }>();
    const { pathname } = useLocation();
    const game = gameId ? gamesById[gameId] : undefined;

    const tabValue = pathname.endsWith('/flow') ? 1 : pathname.endsWith('/authors') ? 2 : 0;

    // Lazy-mount Flow and Authors only after first visit.
    // Use the initial tabValue so a direct link to /flow or /authors renders immediately.
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

            {/* Story — always mounted so the iframe never resets */}
            <Box sx={{ flex: 1, minHeight: 0, flexDirection: 'column', display: tabValue === 0 ? 'flex' : 'none' }}>
                <ChoiceScriptGame game={game} onChoiceMade={handleChoiceMade} />
            </Box>

            {tabsVisited.has(1) && (
                <Box sx={{ flex: 1, minHeight: 0, display: tabValue === 1 ? 'block' : 'none' }}>
                    <FlowPanel game={game} choiceHistory={choiceHistory} />
                </Box>
            )}

            {tabsVisited.has(2) && (
                <Box sx={{ flex: 1, overflow: 'auto', display: tabValue === 2 ? 'block' : 'none' }}>
                    <AuthorsPanel game={game} />
                </Box>
            )}
        </Box>
    );
}
