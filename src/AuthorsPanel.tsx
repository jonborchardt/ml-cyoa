import { Box, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import type { Author, Game } from './games';

function AuthorCard({ author, index }: { author: Author; index: number }) {
    const imageRight = index % 2 === 1;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: imageRight ? 'row-reverse' : 'row' },
                gap: { xs: 2, md: 4 },
                alignItems: { md: 'flex-start' },
                mb: 5,
            }}>
            <Box
                sx={{
                    flexShrink: 0,
                    width: { xs: 140, md: 180 },
                    mx: { xs: 'auto', md: 0 },
                }}>
                <Box
                    sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        bgcolor: 'grey.100',
                        borderRadius: 2,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid',
                        borderColor: 'grey.200',
                    }}>
                    {author.image ? (
                        <Box
                            component="img"
                            src={author.image}
                            alt={author.name}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <PersonIcon sx={{ fontSize: 72, color: 'grey.300' }} />
                    )}
                </Box>
            </Box>
            <Box sx={{ flex: 1, textAlign: { xs: 'center', md: imageRight ? 'right' : 'left' } }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {author.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {author.bio ?? 'Author bio coming soon.'}
                </Typography>
            </Box>
        </Box>
    );
}

export function AuthorsPanel({ game }: { game: Game }) {
    return (
        <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>
                About the Authors
            </Typography>
            {game.authors.map((author, i) => (
                <AuthorCard key={author.name} author={author} index={i} />
            ))}
        </Box>
    );
}
