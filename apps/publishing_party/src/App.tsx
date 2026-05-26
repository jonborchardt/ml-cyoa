import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { GameShell } from './GameShell';
import { HomePage } from './HomePage';
import { MyStoryShell } from '@ml-cyoa/editor';
import type { RenderGamePreview } from '@ml-cyoa/editor';
import { ChoiceScriptGame } from './ChoiceScriptGame';
import { fileGitHubIssue } from './github';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
    },
});

const renderGamePreview: RenderGamePreview = ({ story, scenes, previewKey, disableNavigation }) => (
    <ChoiceScriptGame
        key={story.id + '-' + previewKey}
        game={{
            id: story.id,
            title: story.title || 'My Story',
            authors: [{ name: story.authorName || 'Author', bio: story.authorBio, image: story.authorPhoto }],
            year: new Date(story.createdAt).getFullYear().toString(),
            sceneList: story.sceneOrder.length > 0 ? story.sceneOrder : ['startup'],
            scenes: {},
            coverImage: story.coverImage,
        }}
        scenes={scenes}
        images={story.images}
        disableNavigation={disableNavigation}
    />
);

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
                        <Route path="my/:storyId" element={
                            <MyStoryShell
                                onSubmitStory={fileGitHubIssue}
                                renderGamePreview={renderGamePreview}
                            />
                        }>
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
