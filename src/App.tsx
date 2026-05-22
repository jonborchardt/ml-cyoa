import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { GameShell } from './GameShell';
import { HomePage } from './HomePage';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
    },
});

export function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<HomePage />} />
                        <Route path=":gameId" element={<GameShell />}>
                            <Route index element={null} />
                            <Route path="flow" element={null} />
                            <Route path="authors" element={null} />
                        </Route>
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
