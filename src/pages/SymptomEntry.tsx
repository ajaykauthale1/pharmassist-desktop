import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    Stack,
    InputAdornment,
} from '@mui/material';
import {
    Person as PersonIcon,
    Description as DescriptionIcon,
    Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { SymptomData } from '../types';
import { analyzeSymptomsWithMockData } from '../services/mockReasoning';

export default function SymptomEntry() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<SymptomData>({
        patientName: '',
        symptoms: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.symptoms.trim()) {
            alert('Please enter symptoms');
            return;
        }

        // Analyze symptoms with mock data (now async)
        const results = await analyzeSymptomsWithMockData(formData);

        // Navigate to results page with data
        navigate('/results', { state: { results, patientName: formData.patientName } });
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    New Patient Session
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Enter patient symptoms to get medication recommendations
                </Typography>
            </Box>

            <Paper elevation={1} sx={{ p: 4, borderRadius: 3 }}>
                <form onSubmit={handleSubmit}>
                    <Stack spacing={4}>
                        <TextField
                            fullWidth
                            label="Patient Name (Optional)"
                            name="patientName"
                            value={formData.patientName}
                            onChange={handleChange}
                            placeholder="e.g. John Doe"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            variant="outlined"
                        />

                        <TextField
                            fullWidth
                            required
                            label="Symptoms"
                            name="symptoms"
                            value={formData.symptoms}
                            onChange={handleChange}
                            multiline
                            rows={8}
                            placeholder="Describe symptoms in detail... (e.g., fever, headache, cough)"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                                        <DescriptionIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            variant="outlined"
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => navigate('/')}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                size="large"
                                type="submit"
                                startIcon={<AnalyticsIcon />}
                                sx={{ px: 4 }}
                            >
                                Analyze Symptoms
                            </Button>
                        </Box>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
