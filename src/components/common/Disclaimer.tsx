import { Box, Typography, Paper } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

export default function Disclaimer() {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                mt: 3,
                bgcolor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: 2,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <WarningIcon sx={{ color: '#ff9800', mt: 0.5 }} />
                <Typography variant="body2" color="text.secondary">
                    <strong>Medical Disclaimer:</strong> PharmAssist is not a substitute for professional medical judgment.
                    All medication decisions must be made by a licensed medical practitioner based on the patient's full clinical evaluation.
                </Typography>
            </Box>
        </Paper>
    );
}
