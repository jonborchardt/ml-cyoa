import { useParams, Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { gamesById } from './games';
import { GameHeader } from './GameHeader';
import { ChoiceScriptGame } from './ChoiceScriptGame';

export function GamePage() {
    const { gameId } = useParams<{ gameId: string }>();
    const game = gameId ? gamesById[gameId] : undefined;

    if (!game) {
        return (
            <Box sx={{ p: 4 }}>
                <Button component={Link} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
                    Home
                </Button>
                <Typography variant="h5">Game not found</Typography>
                <Typography variant="body2" color="text.secondary">
                    No game with id &ldquo;{gameId}&rdquo;.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <GameHeader />
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <ChoiceScriptGame game={game} />
            </Box>
        </Box>
    );
}
