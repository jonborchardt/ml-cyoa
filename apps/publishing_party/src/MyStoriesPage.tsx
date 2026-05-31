import { useMemo, useState } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    Grid, IconButton, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';
import { listMyStories, createMyStory, deleteMyStory, computeStoryStats } from '@ml-cyoa/editor';
import type { MyStory } from '@ml-cyoa/editor';
import { ImportDialog } from '@ml-cyoa/editor';
import { CoverArt } from './CoverArt';

function relativeTime(ts: number): string {
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function StatPill({ label }: { label: string }) {
    return (
        <Box component="span" sx={{
            display: 'inline-block',
            px: 0.75, py: 0.15,
            bgcolor: 'grey.100',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            fontSize: '0.65rem',
            lineHeight: 1.6,
            color: 'text.secondary',
            whiteSpace: 'nowrap',
        }}>
            {label}
        </Box>
    );
}

function MyStoryCard({ story, onDelete }: { story: MyStory; onDelete: () => void }) {
    const navigate = useNavigate();
    const stats = useMemo(() => computeStoryStats(story), [story]);
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
            onClick={() => navigate(`/my/${story.id}/flow`)}>
            <Box sx={{ borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
                <CoverArt src={story.coverImage} title={story.title || 'My Story'} />
            </Box>
            <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {story.title || 'My Story'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {story.authorName || 'Author'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                    <StatPill label={`${stats.totalWords.toLocaleString()} words`} />
                    <StatPill label={`${stats.endingCount} ending${stats.endingCount !== 1 ? 's' : ''}`} />
                    <StatPill label={relativeTime(story.updatedAt)} />
                </Box>
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

export function MyStoriesPage() {
    const navigate = useNavigate();
    const [myStories, setMyStories] = useState<MyStory[]>(() => listMyStories());
    const [deleteTarget, setDeleteTarget] = useState<MyStory | null>(null);
    const [importOpen, setImportOpen] = useState(false);

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

    const handleImported = (story: MyStory) => {
        setMyStories(listMyStories());
        navigate(`/my/${story.id}/flow`);
    };

    return (
        <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 3, sm: 5 }, py: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
                    My Stories
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, pt: 0.5 }}>
                    <Button startIcon={<UploadFileIcon />} variant="outlined" onClick={() => setImportOpen(true)}>
                        Import
                    </Button>
                    <Button startIcon={<AddIcon />} variant="contained" onClick={handleAdd}>
                        Write a Story
                    </Button>
                </Box>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Write your own Choose Your Own Adventure story using the built-in editor.
                Stories are saved in your browser and can be exported as a ChoiceScript ZIP
                or full JSON backup.
            </Typography>

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

            <Box sx={{ mt: 4 }}>
                <Button
                    startIcon={<PeopleIcon />}
                    onClick={() => navigate('/')}
                    variant="outlined">
                    See stories written by others
                </Button>
            </Box>

            <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={handleImported} />

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
        </Box>
    );
}
