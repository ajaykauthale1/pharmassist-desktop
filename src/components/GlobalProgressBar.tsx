import {
    Box,
    LinearProgress,
    Typography,
    IconButton,
    Paper,
    Fade,
    Tooltip
} from '@mui/material';
import { Close as CloseIcon, Error as ErrorIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useProcessing } from '../contexts/ProcessingContext';

export default function GlobalProgressBar() {
    const { isProcessing, progress, status, error, cancelUpload, resetStatus } = useProcessing();

    // Show if processing, or if there's an error/success message (until dismissed)
    const visible = isProcessing || !!error || (status.includes('Complete') && progress === 100);

    if (!visible) return null;

    return (
        <Fade in={visible}>
            <Paper
                elevation={4}
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2000, // Above everything
                    borderRadius: 0,
                    borderBottom: '1px solid rgba(0,0,0,0.12)'
                }}
            >
                <Box sx={{ width: '100%' }}>
                    {isProcessing && (
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ height: 4 }}
                        />
                    )}
                    <Box sx={{
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: error ? '#ffebee' : 'background.paper'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {error ? (
                                <ErrorIcon color="error" fontSize="small" />
                            ) : status.includes('Complete') ? (
                                <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    {progress.toFixed(0)}%
                                </Typography>
                            )}

                            <Typography variant="body2" color={error ? 'error' : 'text.primary'}>
                                {error || status}
                            </Typography>
                        </Box>

                        <Box>
                            {isProcessing ? (
                                <Tooltip title="Cancel Upload">
                                    <IconButton size="small" onClick={cancelUpload} color="error">
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <IconButton size="small" onClick={resetStatus}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Fade>
    );
}
