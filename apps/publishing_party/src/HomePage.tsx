import { Box, Button, Grid, Typography } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useLocation } from 'react-router-dom';
import { games, type Game } from './games';

function groupByYear(gs: typeof games): [string, typeof games][] {
  const map = new Map<string, typeof games>();
  for (const g of gs) {
    if (!map.has(g.year)) map.set(g.year, []);
    map.get(g.year)!.push(g);
  }
  return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
}

const SPINE_W = 10; // px — thickness of the book spine

function GameCard({ g, onClick }: { g: Game; onClick: () => void }) {
  const names = g.authors.map((a) => a.name);
  const authorLine = names.length < 2 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  return (
    // Perspective container
    <Box sx={{ perspective: '3000px', cursor: 'pointer' }} onClick={onClick}>
      {/* Book — rotates as a whole on hover */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '2 / 3',
          borderRadius: '2px 4px 4px 2px',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s, box-shadow 0.5s',
          boxShadow: '13px 13px 8px 0px rgba(151,146,153,0.6)',
          '&:hover': {
            transform: 'rotate3d(0,1,0,18deg)',
            boxShadow: '8px 8px 10px 0px rgba(151,146,153,0.5)',
          },
        }}
      >
        {/* Spine — a separate plane rotated -90° around Y, centered on the left edge */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: `-${SPINE_W / 2}px`,
            width: `${SPINE_W}px`,
            height: '100%',
            bgcolor: 'rgba(232,229,234,1)',
            transform: 'rotate3d(0,1,0,-90deg)',
            borderRadius: '2px 0 0 2px',
          }}
        />

        {/* Front cover — pushed forward SPINE_W/2 px in Z */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transformOrigin: '0% 50%',
            transform: `translate3d(0,0,${SPINE_W / 2}px)`,
            zIndex: 10,
            // Crease line near the hinge
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '10px',
              bottom: 0,
              width: '3px',
              background: 'rgba(0,0,0,0.08)',
              boxShadow: '1px 0 3px rgba(255,255,255,0.12)',
              pointerEvents: 'none',
            },
          }}
        >
          {/* Actual cover surface */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '0 3px 3px 0',
              boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.1)',
              bgcolor: '#f0ead8',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              pl: `${SPINE_W}px`,
            }}
          >
            {/* Red banner */}
            <Box
              sx={{
                bgcolor: '#cc0000',
                mx: 1,
                mt: 1,
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 0.4,
                flexShrink: 0,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Arial Narrow, Arial, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.42rem',
                  color: '#e0d8c4',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                Choose Your Own Adventure
              </Typography>
            </Box>

            {/* Title — large, uppercase, dark maroon, ruled above and below */}
            <Box
              sx={{
                borderTop: '1.5px solid #5a1a1a',
                borderBottom: '1.5px solid #5a1a1a',
                mx: 1,
                mt: 0.5,
                py: 0.4,
                flexShrink: 0,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  px: 0.5,
                  lineHeight: 1.15,
                  color: '#5a1a1a',
                  letterSpacing: '0.02em',
                }}
              >
                {g.title}
              </Typography>
            </Box>

            {/* Author — just below title */}
            <Typography
              sx={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '0.52rem',
                textAlign: 'center',
                color: '#5a1a1a',
                pt: 0.3,
                pb: 0.5,
                flexShrink: 0,
              }}
            >
              by {authorLine}
            </Typography>

            {/* Cover image — large, framed, fills remaining space */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                mx: 0.75,
                mb: 0.75,
                borderRadius: '3px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {g.coverImage ? (
                <Box
                  component="img"
                  src={g.coverImage}
                  alt={g.title}
                  loading="lazy"
                  sx={{
                    width: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <Box
                  sx={{ width: '100%', height: '100%', bgcolor: '#e0d8c4' }}
                />
              )}
            </Box>
          </Box>
        </Box>
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
        sx={{ lineHeight: 1.8, mb: 2 }}
      >
        These books are different from other books.
      </Typography>
      <Typography
        variant="body1"
        sx={{ lineHeight: 1.8, mb: 2 }}
      >
        The mid-level at Spruce Street School worked in teams of three and four
        to create these stories. Each team imagined the theme of their story and
        crafted the beginning together. But the different middles and multiples
        endings are the work of each individual team member.
      </Typography>
      <Typography
        variant="body1"
        sx={{ lineHeight: 1.8, mb: 5 }}
      >
        In these stories YOU, and you alone will encounter dangers, choices, and
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
          <Grid container spacing={3}>
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
