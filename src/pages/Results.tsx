import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Paper,
    Button,
    Stack,
    Chip,
    Divider,
    IconButton,
} from '@mui/material';
import {
    Add as AddIcon,
    LocalPharmacy as PharmacyIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { AnalysisResult } from '../types';
import Disclaimer from '../components/common/Disclaimer';
import PdfViewer from '../components/PdfViewer';

export default function Results() {
    const location = useLocation();
    const navigate = useNavigate();
    const { results, patientName } = location.state as { results: AnalysisResult; patientName?: string } || {};

    // PDF Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingResource, setViewingResource] = useState<{ id: string; title: string; page: number } | null>(null);

    if (!results) {
        navigate('/session');
        return null;
    }

    function handleViewPage(resourceId: string, title: string, page: number) {
        setViewingResource({ id: resourceId, title, page });
        setViewerOpen(true);
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Analysis Results
                </Typography>
                {patientName && (
                    <Typography variant="body1" color="text.secondary">
                        Patient: {patientName}
                    </Typography>
                )}
            </Box>

            {/* Section 1: Primary Recommendations */}
            <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Section 1: Primary Recommendations
                </Typography>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Likely Conditions
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
                        {results.conditions.map((condition, index) => (
                            <Chip key={index} label={condition} color="primary" variant="outlined" />
                        ))}
                    </Stack>

                    <Typography variant="h6" gutterBottom>
                        Recommended Medications
                    </Typography>
                    <Stack spacing={2}>
                        {results.primaryMedications.map((med, index) => (
                            <Paper
                                key={index}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    bgcolor: med.type === 'generic' ? '#e8f5e9' : '#fff3e0',
                                    border: '1px solid',
                                    borderColor: med.type === 'generic' ? '#4caf50' : '#ff9800',
                                    borderRadius: 2,
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <PharmacyIcon color={med.type === 'generic' ? 'success' : 'warning'} />
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {med.name}
                                            <Chip
                                                label={med.type.toUpperCase()}
                                                size="small"
                                                color={med.type === 'generic' ? 'success' : 'warning'}
                                                sx={{ ml: 1 }}
                                            />
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {med.description}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>

                    <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="body2">
                            <strong>Explanation:</strong> {results.explanation}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Remedy Recommendations Section */}
            {results.remedyMatches && results.remedyMatches.length > 0 && (
                <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        🏆 Remedy Recommendations (Ranked by Symptom Match)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Based on semantic analysis of {results.remedyMatches.length} matching remedies from Boericke's Materia Medica
                    </Typography>

                    <Stack spacing={3}>
                        {results.remedyMatches.slice(0, 5).map((remedy, index) => (
                            <Paper
                                key={index}
                                elevation={index === 0 ? 3 : 1}
                                sx={{
                                    p: 3,
                                    bgcolor: index === 0 ? '#f0f7ff' : 'white',
                                    border: index === 0 ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                    borderRadius: 2,
                                }}
                            >
                                {/* Remedy Header */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {index + 1}. {remedy.remedyName}
                                        </Typography>
                                        {index === 0 && (
                                            <Chip
                                                label="TOP MATCH"
                                                size="small"
                                                color="primary"
                                                sx={{ fontWeight: 600 }}
                                            />
                                        )}
                                    </Box>
                                    <Chip
                                        label={`${Math.round(remedy.matchPercentage)}% match`}
                                        color={remedy.matchPercentage > 70 ? 'success' : remedy.matchPercentage > 40 ? 'warning' : 'default'}
                                        sx={{ fontWeight: 600 }}
                                    />
                                </Box>

                                {/* Match Summary */}
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    <strong>{remedy.matchCount}</strong> symptom match{remedy.matchCount !== 1 ? 'es' : ''} found across{' '}
                                    <strong>{new Set(remedy.symptomMatches.map(m => m.section)).size}</strong> section{new Set(remedy.symptomMatches.map(m => m.section)).size !== 1 ? 's' : ''}
                                    {' '}(Average relevance: {Math.round(remedy.averageScore * 100)}%)
                                </Typography>

                                {/* Symptom Matches */}
                                <Stack spacing={1.5}>
                                    {remedy.symptomMatches.slice(0, 5).map((match, matchIdx) => (
                                        <Box
                                            key={matchIdx}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 2,
                                                p: 1.5,
                                                bgcolor: '#fafafa',
                                                borderRadius: 1,
                                                border: '1px solid #e0e0e0'
                                            }}
                                        >
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                                        {match.section}
                                                    </Typography>
                                                    {match.page > 0 && (
                                                        <Chip
                                                            label={`Page ${match.page}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ height: 18, fontSize: '0.7rem' }}
                                                        />
                                                    )}
                                                    <Chip
                                                        label={`${Math.round(match.score * 100)}%`}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ height: 18, fontSize: '0.7rem' }}
                                                    />
                                                </Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', fontStyle: 'italic' }}>
                                                    "{match.snippet}"
                                                </Typography>
                                            </Box>
                                            {match.page > 0 && (
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleViewPage(match.resourceId, match.resourceTitle, match.page)}
                                                    title="View Page"
                                                >
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    ))}
                                    {remedy.symptomMatches.length > 5 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ pl: 1.5 }}>
                                            + {remedy.symptomMatches.length - 5} more match{remedy.symptomMatches.length - 5 !== 1 ? 'es' : ''}
                                        </Typography>
                                    )}
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>

                    {results.remedyMatches.length > 5 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                            + {results.remedyMatches.length - 5} more matching remed{results.remedyMatches.length - 5 !== 1 ? 'ies' : 'y'}
                        </Typography>
                    )}
                </Paper>
            )}


            {/* Section 2: Additional Notes */}
            <Paper elevation={1} sx={{ p: 4, mb: 3, borderRadius: 3, bgcolor: '#fafafa' }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Section 2: Additional Notes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {results.additionalNotes || 'No additional notes available.'}
                </Typography>
            </Paper>

            <Disclaimer />

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/session')}
                    sx={{ px: 4 }}
                >
                    New Session
                </Button>
            </Box>

            {/* PDF Viewer Modal */}
            {viewingResource && (
                <PdfViewer
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    resourceId={viewingResource.id}
                    title={viewingResource.title}
                    initialPage={viewingResource.page}
                />
            )}
        </Container>
    );
}
