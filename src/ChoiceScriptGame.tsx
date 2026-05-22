import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import type { Game } from './games';

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string | undefined;

async function fileGitHubIssue(title: string, body: string) {
    if (!GITHUB_TOKEN) return;
    await fetch('https://api.github.com/repos/jonborchardt/ml-cyoa/issues', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body }),
    });
}

interface Props {
    game: Game;
    onStart?: () => void;
    onPageTurn?: () => void;
    onChoiceMade?: (label: string) => void;
}

export function ChoiceScriptGame({ game, onStart, onPageTurn, onChoiceMade }: Props) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const send = () => {
            iframe.contentWindow?.postMessage(
                {
                    type: 'load-game',
                    title: game.title,
                    author: game.authors.map((a) => a.name).join(', '),
                    coverImage: game.coverImage ?? null,
                    sceneList: game.sceneList,
                    scenes: game.scenes,
                    startingStats: {},
                },
                window.location.origin
            );
        };

        const onMessage = (e: MessageEvent) => {
            if (e.source !== iframe.contentWindow) return;
            if (e.data?.type === 'host-ready') send();
            if (e.data?.type === 'game-started') onStart?.();
            if (e.data?.type === 'page-turn') onPageTurn?.();
            if (e.data?.type === 'choice-made') onChoiceMade?.(e.data.label as string);
            if (e.data?.type === 'navigate-home') navigate('/');
            if (e.data?.type === 'report-bug') fileGitHubIssue(e.data.title, e.data.body);
        };

        window.addEventListener('message', onMessage);
        // Belt-and-suspenders: also send on load in case host-ready fires before listener attaches.
        iframe.addEventListener('load', send);
        return () => {
            window.removeEventListener('message', onMessage);
            iframe.removeEventListener('load', send);
        };
    }, [game, navigate, onStart, onPageTurn, onChoiceMade]);

    // Bust the iframe cache when switching games so the engine resets cleanly.
    const src = `${import.meta.env.BASE_URL}choicescript/host.html?g=${encodeURIComponent(game.id)}`;

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            <iframe
                ref={iframeRef}
                key={game.id}
                src={src}
                title={game.title}
                style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
            />
        </Box>
    );
}
