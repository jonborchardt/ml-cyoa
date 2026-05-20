import { Box, Grid, Typography } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { useNavigate } from 'react-router-dom';
import { games, type Game } from './games';
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
                    {g.authors.join(', ')}
                </Typography>
            </Box>
        </Box>
    );
}

export function HomePage() {
    const navigate = useNavigate();
    const byYear = groupByYear(games);

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
