import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { Home as HomeIcon, Folder as FolderIcon } from '@mui/icons-material';

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static" elevation={1}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
                        PharmAssist
                    </Typography>
                    <Button
                        color="inherit"
                        startIcon={<HomeIcon />}
                        onClick={() => navigate('/')}
                        sx={{
                            fontWeight: location.pathname === '/' ? 700 : 400,
                        }}
                    >
                        Home
                    </Button>
                    <Button
                        color="inherit"
                        startIcon={<FolderIcon />}
                        onClick={() => navigate('/resources')}
                        sx={{
                            fontWeight: location.pathname === '/resources' ? 700 : 400,
                        }}
                    >
                        Resources
                    </Button>
                </Toolbar>
            </AppBar>

            <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
                <Outlet />
            </Box>

            <Box
                component="footer"
                sx={{
                    py: 2,
                    px: 2,
                    mt: 'auto',
                    bgcolor: 'background.paper',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Container maxWidth="md">
                    <Typography variant="caption" color="text.secondary" align="center" display="block">
                        PharmAssist © 2025 - Medical Assistance Tool
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
}
