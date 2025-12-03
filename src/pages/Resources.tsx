import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Paper,
    Box,
    Button,
    Stack,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    TextField,
    InputAdornment,
    CircularProgress,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    Description as TextIcon,
    Search as SearchIcon,
    Home as HomeIcon,
    ExpandMore as ExpandMoreIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { Resource, SearchResult } from '../types';
import {
    saveResource,
    getResources,
    deleteResource,
} from '../services/resourceStorage';
import { searchResources, groupResults, GroupedResult } from '../services/resourceSearch';
import { useProcessing } from '../contexts/ProcessingContext';
import { deleteVectorsByResourceId } from '../services/vectorStore';
import PdfViewer from '../components/PdfViewer';

export default function Resources() {
    const navigate = useNavigate();
    const [resources, setResources] = useState<Resource[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // PDF Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingResource, setViewingResource] = useState<{ id: string; title: string; page: number } | null>(null);

    useEffect(() => {
        loadResources();
        // Restore from OPFS if needed
        restoreFromPersistentStorage();
    }, []);

    useEffect(() => {
        if (searchQuery.trim()) {
            const results = searchResources(searchQuery, resources);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, resources]);

    const groupedResults = useMemo(() => {
        return groupResults(searchResults);
    }, [searchResults]);

    async function loadResources() {
        setLoading(true);
        try {
            const loaded = await getResources();
            setResources(loaded);
        } catch (err) {
            setError('Failed to load resources');
        } finally {
            setLoading(false);
        }
    }

    async function restoreFromPersistentStorage() {
        try {
            const { persistentStorage } = await import('../services/persistentStorage');
            const storedResourceIds = await persistentStorage.listStoredResources();

            if (storedResourceIds.length === 0) return;

            console.log(`Found ${storedResourceIds.length} resources in OPFS, checking for restoration...`);

            const currentResources = await getResources();
            const currentIds = new Set(currentResources.map(r => r.id));

            // Restore any resources that are in OPFS but not in IndexedDB
            for (const resourceId of storedResourceIds) {
                if (!currentIds.has(resourceId)) {
                    console.log(`Restoring resource ${resourceId} from OPFS...`);

                    const data = await persistentStorage.loadResourceData(resourceId);
                    if (data) {
                        // Restore to IndexedDB
                        await saveResource(data.metadata);

                        // Restore vectors
                        const vectors = data.chunks.map((chunk, i) => ({
                            id: `${resourceId}-${i}`,
                            resourceId,
                            text: chunk,
                            embedding: data.embeddings[i]
                        }));
                        await addVectors(vectors);

                        console.log(`✓ Restored resource ${resourceId}`);
                    }
                }
            }

            await loadResources();
        } catch (err) {
            console.error('Failed to restore from persistent storage:', err);
        }
    }

    const { startUpload, isProcessing } = useProcessing();

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Reset file input
        event.target.value = '';

        try {
            await startUpload(file);
            // Reload resources after upload completes (or we can listen to context changes)
            // For now, we'll just reload when the user stays on the page
            await loadResources();
        } catch (err: any) {
            // Error is handled in context, but we can show a local alert if needed
            console.error('Upload failed:', err);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        try {
            await deleteResource(id);
            await deleteVectorsByResourceId(id);

            // Also delete from persistent storage
            const { persistentStorage } = await import('../services/persistentStorage');
            await persistentStorage.deleteResourceData(id);

            await loadResources();
        } catch (err) {
            setError('Failed to delete resource');
        }
    }

    function handleViewPage(resourceId: string, title: string, page: number) {
        setViewingResource({ id: resourceId, title, page });
        setViewerOpen(true);
    }

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDate(timestamp: number): string {
        return new Date(timestamp).toLocaleDateString();
    }

    const displayResources = searchResults.length > 0
        ? searchResults.map(r => r.resource) // This is just for the list view if we kept it, but we're changing the search view
        : resources;

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Medical Resources
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {resources.length} resource{resources.length !== 1 ? 's' : ''} uploaded
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<HomeIcon />}
                    onClick={() => navigate('/')}
                >
                    Home
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Upload Section */}
            <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Upload New Resource
                </Typography>
                <Button
                    variant="contained"
                    component="label"
                    startIcon={isProcessing ? <CircularProgress size={20} /> : <UploadIcon />}
                    disabled={isProcessing}
                    sx={{ mt: 1 }}
                >
                    {isProcessing ? 'Uploading in background...' : 'Choose File (PDF or TXT)'}
                    <input
                        type="file"
                        hidden
                        accept=".pdf,.txt"
                        onChange={handleFileUpload}
                    />
                </Button>
            </Paper>

            {/* Search Section */}
            <TextField
                fullWidth
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3 }}
            />

            {/* Search Results Info */}
            {searchResults.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Found {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''} in {groupedResults.length} document{groupedResults.length !== 1 ? 's' : ''}
                </Alert>
            )}

            {/* Resources List / Search Results */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : searchResults.length > 0 ? (
                    // Grouped Search Results
                    groupedResults.map((group) => (
                        <Accordion key={group.resource.id} defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                    {group.resource.type === 'pdf' ? (
                                        <PdfIcon color="error" />
                                    ) : (
                                        <TextIcon color="primary" />
                                    )}
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        {group.resource.title}
                                    </Typography>
                                    <Chip
                                        label={`${group.matches} match${group.matches !== 1 ? 'es' : ''}`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ ml: 'auto', mr: 2 }}
                                    />
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ bgcolor: '#f8f9fa' }}>
                                {Array.from(group.pages.entries())
                                    .sort(([pageA], [pageB]) => pageA - pageB)
                                    .map(([page, results]) => (
                                        <Box key={page} sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 1 }}>
                                                <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
                                                    Page {page}
                                                </Typography>
                                                {group.resource.type === 'pdf' && (
                                                    <Button
                                                        size="small"
                                                        startIcon={<ViewIcon />}
                                                        onClick={() => handleViewPage(group.resource.id, group.resource.title, page)}
                                                    >
                                                        View Page
                                                    </Button>
                                                )}
                                            </Box>
                                            <Stack spacing={1}>
                                                {results.map((result, idx) => (
                                                    <Paper key={idx} elevation={0} sx={{ p: 1.5, bgcolor: 'white', border: '1px solid #e0e0e0' }}>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            dangerouslySetInnerHTML={{ __html: result.snippet }}
                                                            sx={{
                                                                '& mark': {
                                                                    bgcolor: '#ffeb3b',
                                                                    fontWeight: 600,
                                                                },
                                                            }}
                                                        />
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </Box>
                                    ))}
                            </AccordionDetails>
                        </Accordion>
                    ))
                ) : (
                    // Default Resource List (No Search)
                    <Paper elevation={1} sx={{ borderRadius: 2 }}>
                        {resources.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    {searchQuery ? 'No resources found matching your search' : 'No resources uploaded yet'}
                                </Typography>
                            </Box>
                        ) : (
                            <List>
                                {resources.map((resource, index) => (
                                    <ListItem
                                        key={resource.id}
                                        divider={index < resources.length - 1}
                                        sx={{ py: 2 }}
                                    >
                                        <Box sx={{ mr: 2 }}>
                                            {resource.type === 'pdf' ? (
                                                <PdfIcon color="error" sx={{ fontSize: 40 }} />
                                            ) : (
                                                <TextIcon color="primary" sx={{ fontSize: 40 }} />
                                            )}
                                        </Box>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="subtitle1">{resource.title}</Typography>
                                                    <Chip
                                                        label={resource.type.toUpperCase()}
                                                        size="small"
                                                        color={resource.type === 'pdf' ? 'error' : 'primary'}
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatFileSize(resource.fileSize)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Uploaded: {formatDate(resource.uploadedAt)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {resource.content.length} characters
                                                    </Typography>
                                                </Stack>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                {resource.type === 'pdf' && (
                                                    <IconButton
                                                        edge="end"
                                                        onClick={() => handleViewPage(resource.id, resource.title, 1)}
                                                        color="primary"
                                                        title="View PDF"
                                                    >
                                                        <ViewIcon />
                                                    </IconButton>
                                                )}
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => handleDelete(resource.id)}
                                                    color="error"
                                                    title="Delete"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                )}
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
