import { Box, Button, Grid, Typography } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useLocation } from 'react-router-dom';
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
      }}
    >
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

export function HomePage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const isAlpha = new URLSearchParams(search).has('alpha');
  const byYear = groupByYear(games.filter((g) => !g.hidden));

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 3, sm: 5 }, py: 6 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AutoStoriesIcon sx={{ fontSize: 64, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            Mid-Level Choose Your Own Adventure
          </Typography>
        </Box>
        {isAlpha && (
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => navigate('/mystories')}
          >
            My Stories
          </Button>
        )}
      </Box>
      <Typography
        variant="body1"
        color="warning"
        sx={{ mt: 3, mb: 3, fontSize: '1.66rem' }}
      >
        BEWARE and WARNING!
      </Typography>
      <Typography
        variant="body1"
        sx={{ lineHeight: 1.8, mb: 2, fontSize: '0.75rem' }}
      >
        This book is different from other books.
      </Typography>
      <Typography
        variant="body1"
        sx={{ lineHeight: 1.8, mb: 2, fontSize: '0.92rem' }}
      >
        The mid-level at Spruce Street School worked in teams of three and four
        to create these stories. Each team imagined the theme of their story and
        crafted the beginning together. But the different middles and multiples
        endings are the work of each individual team member.
      </Typography>
      <Typography
        variant="body1"
        sx={{ lineHeight: 1.8, mb: 5, fontSize: '1.08rem' }}
      >
        In this story YOU, and you alone will encounter dangers, choices, and
        peril, as that is part of the genre of Choose Your Own Adventure,
        otherwise known as CYOA!
      </Typography>

      {byYear.map(([year, yearGames]) => (
        <Box key={year} sx={{ mb: 5 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
              pb: 1,
            }}
          >
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
