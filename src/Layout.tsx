import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

export function Layout() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Outlet />
        </Box>
    );
}
