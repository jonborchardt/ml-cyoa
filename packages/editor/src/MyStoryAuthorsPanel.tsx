import { Box, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import type { MyStory } from './myStoryStore';

export function MyStoryAuthorsPanel({ story }: { story: MyStory }) {
    const hasPhoto = !!story.authorPhoto;
    const hasBio = !!story.authorBio;

    return (
        <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>
                About the Author
            </Typography>
            {hasPhoto || hasBio ? (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: { xs: 2, md: 4 },
                        alignItems: { md: 'flex-start' },
                        mb: 5,
                    }}>
                    <Box sx={{ flexShrink: 0, width: { xs: 140, md: 180 }, mx: { xs: 'auto', md: 0 } }}>
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
                            {hasPhoto ? (
                                <Box
                                    component="img"
                                    src={story.authorPhoto}
                                    alt={story.authorName}
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <PersonIcon sx={{ fontSize: 72, color: 'grey.300' }} />
                            )}
                        </Box>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                            {story.authorName || 'Author'}
                        </Typography>
                        {hasBio && (
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                                {story.authorBio}
                            </Typography>
                        )}
                    </Box>
                </Box>
            ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <PersonIcon sx={{ fontSize: 72, color: 'grey.300', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {story.authorName || 'Author'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        No author bio yet. Add one in the Flow tab&apos;s Story Info panel.
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
