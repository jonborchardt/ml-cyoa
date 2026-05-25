import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import type { Game } from './games';
import { fileGitHubIssue } from './github';

interface Props {
    game: Game;
    scenes?: Record<string, string>;
    images?: Record<string, string>;
    onStart?: () => void;
    onPageTurn?: () => void;
    onChoiceMade?: (label: string) => void;
    disableNavigation?: boolean;
}

export function ChoiceScriptGame({ game, scenes, images, onStart, onPageTurn, onChoiceMade, disableNavigation }: Props) {
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
                    scenes: scenes ?? game.scenes,
                    images: images ?? {},
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
            if (e.data?.type === 'navigate-home' && !disableNavigation) navigate('/');
            if (e.data?.type === 'report-bug') fileGitHubIssue(e.data.title, e.data.body);
        };

        window.addEventListener('message', onMessage);
        iframe.addEventListener('load', send);
        return () => {
            window.removeEventListener('message', onMessage);
            iframe.removeEventListener('load', send);
        };
    }, [game, scenes, images, navigate, onStart, onPageTurn, onChoiceMade, disableNavigation]);

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
