import {
    Accordion, AccordionDetails, AccordionSummary,
    Box, Chip, Drawer, IconButton,
    MenuItem, Select, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DataArrayIcon from '@mui/icons-material/DataArray';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import { StoryInfoDrawer } from './StoryInfoDrawer';
import { VariableManagerPanel } from './VariableManagerPanel';
import { StatsDrawer } from './StatsDrawer';
import { AchievementsDrawer } from './AchievementsDrawer';
import { SubroutineGroupManager } from './SubroutineGroupManager';
import { StoryStatsDrawer } from './StoryStatsDrawer';
import type { MyStory, SubroutineDef } from './myStoryStore';
import type { StatEntry, VariableDef, Achievement } from './types';

interface StoryMenuDrawerProps {
    open: boolean;
    onClose: () => void;

    title: string;
    authorName: string;
    authorBio: string;
    authorPhoto: string;
    coverImage: string;
    ifid: string;
    onTitleChange: (v: string) => void;
    onAuthorNameChange: (v: string) => void;
    onAuthorBioChange: (v: string) => void;
    onAuthorPhotoChange: (v: string) => void;
    onCoverImageChange: (v: string) => void;
    onIfidChange: (v: string) => void;

    story: MyStory;
    onStoryChange: (updated: MyStory) => void;

    statChart: StatEntry[];
    variables: VariableDef[];
    onStatChartChange: (updated: StatEntry[]) => void;

    achievements: Achievement[];
    onAchievementsChange: (updated: Achievement[]) => void;

    subroutines: SubroutineDef[];
    onSubroutinesChange: (updated: SubroutineDef[]) => void;

    globalReuse: 'hide' | 'disable' | '';
    onGlobalReuseChange: (value: 'hide' | 'disable' | '') => void;
}

function CountChip({ count }: { count: number }) {
    if (count === 0) return null;
    return <Chip label={count} size="small" sx={{ ml: 1, height: 18, fontSize: 11 }} />;
}

const itemSx = { '&:before': { display: 'none' }, borderBottom: 1, borderColor: 'divider' };

export function StoryMenuDrawer({
    open, onClose,
    title, authorName, authorBio, authorPhoto, coverImage, ifid,
    onTitleChange, onAuthorNameChange, onAuthorBioChange,
    onAuthorPhotoChange, onCoverImageChange, onIfidChange,
    story, onStoryChange,
    statChart, variables, onStatChartChange,
    achievements, onAchievementsChange,
    subroutines, onSubroutinesChange,
    globalReuse, onGlobalReuseChange,
}: StoryMenuDrawerProps) {
    return (
        <Drawer anchor="left" open={open} onClose={onClose} PaperProps={{ sx: { width: 380, overflowX: 'hidden' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0, justifyContent: 'flex-end' }}>
                <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
            </Box>

            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                <Accordion disableGutters elevation={0} square sx={itemSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <InfoOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">Story Info</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, pl: 1 }}>
                        <StoryInfoDrawer
                            inline
                            title={title} authorName={authorName} authorBio={authorBio}
                            authorPhoto={authorPhoto} coverImage={coverImage} ifid={ifid}
                            onTitleChange={onTitleChange} onAuthorNameChange={onAuthorNameChange}
                            onAuthorBioChange={onAuthorBioChange} onAuthorPhotoChange={onAuthorPhotoChange}
                            onCoverImageChange={onCoverImageChange} onIfidChange={onIfidChange}
                        />
                    </AccordionDetails>
                </Accordion>

                <Accordion disableGutters elevation={0} square sx={itemSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <DataArrayIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">Variables</Typography>
                        <CountChip count={variables.length} />
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        <VariableManagerPanel inline story={story} onChange={onStoryChange} />
                    </AccordionDetails>
                </Accordion>

                <Accordion disableGutters elevation={0} square sx={itemSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <BarChartIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">Stats</Typography>
                        <CountChip count={statChart.length} />
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1 }}>
                        <StatsDrawer inline statChart={statChart} variables={variables} onChange={onStatChartChange} />
                    </AccordionDetails>
                </Accordion>

                <Accordion disableGutters elevation={0} square sx={itemSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <EmojiEventsOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">Achievements</Typography>
                        <CountChip count={achievements.length} />
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1 }}>
                        <AchievementsDrawer inline achievements={achievements} onChange={onAchievementsChange} />
                    </AccordionDetails>
                </Accordion>

                <Accordion disableGutters elevation={0} square sx={itemSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <AccountTreeOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">Subroutines</Typography>
                        <CountChip count={subroutines.length} />
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        <SubroutineGroupManager
                            inline
                            subroutines={subroutines}
                            variables={variables}
                            achievements={achievements}
                            onChange={onSubroutinesChange}
                        />
                    </AccordionDetails>
                </Accordion>

                <Accordion disableGutters elevation={0} square sx={itemSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <ArticleOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">Scene</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Global reuse</Typography>
                        <Select
                            size="small"
                            value={globalReuse}
                            onChange={e => onGlobalReuseChange(e.target.value as 'hide' | 'disable' | '')}
                            displayEmpty
                            fullWidth
                            sx={{ fontSize: 13 }}
                        >
                            <MenuItem value=""><em>None</em></MenuItem>
                            <MenuItem value="hide">*hide_reuse (hide used)</MenuItem>
                            <MenuItem value="disable">*disable_reuse (grey out)</MenuItem>
                        </Select>
                    </AccordionDetails>
                </Accordion>

                <Accordion disableGutters elevation={0} square sx={itemSx}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <QueryStatsIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">Story Statistics</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        <StoryStatsDrawer inline story={story} />
                    </AccordionDetails>
                </Accordion>
            </Box>
        </Drawer>
    );
}
