import { Box } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

interface Props {
    src?: string;
    title: string;
    /** css width value */
    width?: string | number;
    /** border radius — defaults to 0 so card clips it flush */
    borderRadius?: number | string;
    /** css aspect-ratio — defaults to 1/1 (square) */
    aspectRatio?: string;
}

export function CoverArt({ src, title, width = '100%', borderRadius = 0, aspectRatio = '1 / 1' }: Props) {
    return (
        <Box
            sx={{
                width,
                aspectRatio,
                borderRadius,
                overflow: 'hidden',
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
            {src ? (
                <Box
                    component="img"
                    src={src}
                    alt={title}
                    loading="lazy"
                    sx={{ width: '100%' }}
                />
            ) : (
                <AutoStoriesIcon sx={{ fontSize: 52, color: 'grey.300' }} />
            )}
        </Box>
    );
}
