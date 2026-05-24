import { useState } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    Grid, IconButton, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { games, type Game } from './games';
import { listMyStories, createMyStory, deleteMyStory, type MyStory } from './myStoryStore';
import { CoverArt } from './CoverArt';

function groupByYear(gs: typeof games): [string, typeof games][] {
    const map = new Map<string, typeof games>();
    for (const g of gs) {
        if (!map.has(g.year)) map.set(g.year, []);
        map.get(g.year)!.push(g);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function GameCard({ g, onClick }: { g: Game; onClick: () => void }) {
    return (
        <Box
            onClick={onClick}
            sx={{
                cursor: 'pointer',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: 2,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
            }}>
            <CoverArt src={g.coverImage} title={g.title} />
            <Box sx={{ px: 1.5, py: 1.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {g.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {g.authors.map((a) => a.name).join(', ')}
                </Typography>
            </Box>
        </Box>
    );
}

function MyStoryCard({ story, onDelete }: { story: MyStory; onDelete: () => void }) {
    const navigate = useNavigate();
    return (
        <Box
            sx={{
                cursor: 'pointer',
                borderRadius: 2,
                overflow: 'visible',
                bgcolor: 'background.paper',
                boxShadow: 2,
                position: 'relative',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
            }}
            onClick={() => navigate(`/my/${story.id}`)}>
            <Box sx={{ borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
                <CoverArt src={story.coverImage} title={story.title || 'My Story'} />
            </Box>
            <Box sx={{ px: 1.5, py: 1.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {story.title || 'My Story'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {story.authorName || 'Author'}
                </Typography>
            </Box>
            <IconButton
                size="small"
                onClick={e => { e.stopPropagation(); onDelete(); }}
                sx={{
                    position: 'absolute', top: 4, right: 4,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    border: '1px solid', borderColor: 'divider',
                    '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                }}>
                <DeleteIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

export function HomePage() {
    const navigate = useNavigate();
    const byYear = groupByYear(games);

    const [myStories, setMyStories] = useState<MyStory[]>(() => listMyStories());
    const [deleteTarget, setDeleteTarget] = useState<MyStory | null>(null);

    const handleAdd = () => {
        const story = createMyStory();
        setMyStories(listMyStories());
        navigate(`/my/${story.id}/flow`);
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        deleteMyStory(deleteTarget.id);
        setMyStories(listMyStories());
        setDeleteTarget(null);
    };

    return (
        <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 3, sm: 5 }, py: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <AutoStoriesIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
                    Publishing Party
                </Typography>
            </Box>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                Mid-Level Choose Your Own Adventure
            </Typography>

            <Typography variant="body1" sx={{ lineHeight: 1.8, mb: 2 }}>
                One of our favorite traditions at Spruce Street School is our Publishing Parties. In
                each level, when students complete a big writing project, families are invited to
                come see their work in the morning after drop-off. Later in the day, the authors
                share their writing with students from the other levels.
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.8, mb: 5 }}>
                This week, the mid-level students were very proud to present their Choose Your Own
                Adventure Books. They collaborated to create the beginnings before branching off to
                write their own paths, complete with choices and multiple endings.
            </Typography>

            {/* My Stories section */}
            <Box sx={{ mb: 5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        My Stories
                    </Typography>
                    <Button startIcon={<AddIcon />} onClick={handleAdd}>
                        Write a Story
                    </Button>
                </Box>
                {myStories.length === 0 ? (
                    <Typography color="text.secondary">
                        You haven&apos;t written any stories yet.
                    </Typography>
                ) : (
                    <Grid container spacing={2}>
                        {myStories.map(s => (
                            <Grid key={s.id} size={{ xs: 6, sm: 4, md: 3 }}>
                                <MyStoryCard story={s} onDelete={() => setDeleteTarget(s)} />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Delete &ldquo;{deleteTarget?.title || 'My Story'}&rdquo;?</DialogTitle>
                <DialogContent>
                    <Typography>This story will be permanently removed from this device.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>

            {byYear.map(([year, yearGames]) => (
                <Box key={year} sx={{ mb: 5 }}>
                    <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                        {year}
                    </Typography>
                    <Grid container spacing={2}>
                        {yearGames.map((g) => (
                            <Grid key={g.id} size={{ xs: 6, sm: 4, md: 3 }}>
                                <GameCard g={g} onClick={() => navigate(`/${g.id}`)} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            ))}
        </Box>
    );
}
