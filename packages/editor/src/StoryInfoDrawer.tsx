import { useRef } from 'react';
import {
    Box, Button, Drawer, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { compressImage } from './imageUtils';

interface Props {
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
}

export function StoryInfoDrawer({
    open, onClose,
    title, authorName, authorBio, authorPhoto, coverImage, ifid,
    onTitleChange, onAuthorNameChange, onAuthorBioChange,
    onAuthorPhotoChange, onCoverImageChange, onIfidChange,
}: Props) {
    const photoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const compressed = await compressImage(ev.target?.result as string);
            setter(compressed);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose}
            PaperProps={{ sx: { width: 360, p: 2, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight={700}>Story Info</Typography>
                <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
            </Box>
            <Stack spacing={2}>
                <TextField label="Title" value={title} onChange={e => onTitleChange(e.target.value)} required size="small" fullWidth />
                <TextField label="Author Name" value={authorName} onChange={e => onAuthorNameChange(e.target.value)} required size="small" fullWidth />
                <TextField label="Author Bio (optional)" value={authorBio} onChange={e => onAuthorBioChange(e.target.value)} multiline rows={3} size="small" fullWidth />
                <TextField label="IFID (optional)" value={ifid} onChange={e => onIfidChange(e.target.value)} size="small" fullWidth helperText="Interactive Fiction ID (*ifid)" />
                <Box>
                    <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>Author Photo</Typography>
                    <input type="file" accept=".png,.jpg,.jpeg" ref={photoInputRef} style={{ display: 'none' }} onChange={e => handleUpload(e, onAuthorPhotoChange)} />
                    {authorPhoto ? (
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <img src={authorPhoto} alt="author" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                            <IconButton size="small" onClick={() => onAuthorPhotoChange('')} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.25, '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                                <CloseIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                        </Box>
                    ) : (
                        <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={() => photoInputRef.current?.click()}>Upload</Button>
                    )}
                </Box>
                <Box>
                    <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>Cover Image</Typography>
                    <input type="file" accept=".png,.jpg,.jpeg" ref={coverInputRef} style={{ display: 'none' }} onChange={e => handleUpload(e, onCoverImageChange)} />
                    {coverImage ? (
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <img src={coverImage} alt="cover" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                            <IconButton size="small" onClick={() => onCoverImageChange('')} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 0.25, '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' } }}>
                                <CloseIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                        </Box>
                    ) : (
                        <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={() => coverInputRef.current?.click()}>Upload</Button>
                    )}
                </Box>
            </Stack>
        </Drawer>
    );
}
