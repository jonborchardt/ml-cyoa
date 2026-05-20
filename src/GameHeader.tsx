import { Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export function GameHeader() {
    return (
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Button
                component={Link}
                to="/"
                startIcon={<ArrowBackIcon />}
                size="small">
                Home
            </Button>
        </Box>
    );
}
