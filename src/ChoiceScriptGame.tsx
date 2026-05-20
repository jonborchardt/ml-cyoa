import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import type { Game } from './games';

interface Props {
    game: Game;
}

export function ChoiceScriptGame({ game }: Props) {
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
                    author: game.authors.join(', '),
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
            if (e.data?.type === 'navigate-home') navigate('/');
        };

        window.addEventListener('message', onMessage);
        // Belt-and-suspenders: also send on load in case host-ready fires before listener attaches.
        iframe.addEventListener('load', send);
        return () => {
            window.removeEventListener('message', onMessage);
            iframe.removeEventListener('load', send);
        };
    }, [game, navigate]);

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
