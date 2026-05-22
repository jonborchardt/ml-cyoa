import { Box, Button, Tab, Tabs } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Game } from './games';

interface Props {
    game: Game;
}

export function GameTabHeader({ game }: Props) {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const tabValue = pathname.endsWith('/flow') ? 1 : pathname.endsWith('/authors') ? 2 : 0;
    const paths = [`/${game.id}`, `/${game.id}/flow`, `/${game.id}/authors`];

    return (
        <Box
            sx={{
                borderBottom: 1,
                borderColor: 'divider',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                px: 1,
                minHeight: 48,
            }}>
            <Button
                component={Link}
                to="/"
                startIcon={<ArrowBackIcon />}
                size="small"
                sx={{ flexShrink: 0, mr: 1 }}>
                Home
            </Button>
            <Tabs
                value={tabValue}
                onChange={(_e, v: number) => navigate(paths[v])}
                sx={{ minHeight: 48 }}>
                <Tab label="Story" value={0} sx={{ minHeight: 48, py: 0 }} />
                <Tab label="Flow" value={1} sx={{ minHeight: 48, py: 0 }} />
                <Tab label="Authors" value={2} sx={{ minHeight: 48, py: 0 }} />
            </Tabs>
        </Box>
    );
}
