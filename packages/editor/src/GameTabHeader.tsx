import { Box, Button, Tab, Tabs } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Game } from './types';

interface Props {
    game: Game;
    basePath?: string;
    homePath?: string;
}

export function GameTabHeader({ game, basePath, homePath = '/' }: Props) {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const tabValue = pathname.endsWith('/flow') ? 2 : pathname.endsWith('/authors') ? 1 : 0;
    const base = basePath ?? `/${game.id}`;
    const paths = [base, `${base}/authors`, `${base}/flow`];

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
                to={homePath}
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
                <Tab label="Authors" value={1} sx={{ minHeight: 48, py: 0 }} />
                <Tab label="Flow" value={2} sx={{ minHeight: 48, py: 0 }} />
            </Tabs>
        </Box>
    );
}
