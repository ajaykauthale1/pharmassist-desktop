import { Box, Container, Typography, Button, Paper, Stack } from '@mui/material';
import { Add as AddIcon, Folder as FolderIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const navigate = useNavigate();

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
                    PharmAssist
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    Medical Assistance Tool for Pharmacies
                </Typography>
            </Box>

            <Stack spacing={3}>
                <Paper
                    elevation={2}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                            elevation: 4,
                            transform: 'translateY(-2px)',
                        },
                    }}
                    onClick={() => navigate('/session')}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <AddIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                        <Box>
                            <Typography variant="h5" gutterBottom>
                                New Patient Session
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Start a new consultation and get medication recommendations
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                <Paper
                    elevation={2}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                            elevation: 4,
                            transform: 'translateY(-2px)',
                        },
                    }}
                    onClick={() => navigate('/resources')}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FolderIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                        <Box>
                            <Typography variant="h5" gutterBottom>
                                Manage Resources
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Upload and manage medical reference materials
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    );
}
