import { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    IconButton,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    NavigateNext as NextIcon,
    NavigateBefore as PrevIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { persistentStorage } from '../services/persistentStorage';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

interface PdfViewerProps {
    open: boolean;
    onClose: () => void;
    resourceId: string;
    title: string;
    initialPage?: number;
}

export default function PdfViewer({ open, onClose, resourceId, title, initialPage = 1 }: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [scale, setScale] = useState(1.5);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Reset state when opening new resource
    useEffect(() => {
        if (open) {
            setCurrentPage(initialPage);
            loadPdf();
        } else {
            setPdfDoc(null);
            setError(null);
        }
    }, [open, resourceId, initialPage]);

    // Render page when doc, page, or scale changes
    useEffect(() => {
        if (pdfDoc) {
            renderPage();
        }
    }, [pdfDoc, currentPage, scale]);

    async function loadPdf() {
        setLoading(true);
        setError(null);
        try {
            const blob = await persistentStorage.loadFile(resourceId);
            if (!blob) {
                throw new Error('PDF file not found in storage. It may have been uploaded before this feature was added.');
            }

            const arrayBuffer = await blob.arrayBuffer();
            const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(doc);
        } catch (err: any) {
            console.error('Failed to load PDF:', err);
            setError(err.message || 'Failed to load PDF');
        } finally {
            setLoading(false);
        }
    }

    async function renderPage() {
        if (!pdfDoc || !canvasRef.current) return;

        try {
            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;
        } catch (err) {
            console.error('Error rendering page:', err);
        }
    }

    function handlePrevPage() {
        setCurrentPage(prev => Math.max(1, prev - 1));
    }

    function handleNextPage() {
        if (pdfDoc) {
            setCurrentPage(prev => Math.min(pdfDoc.numPages, prev + 1));
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { height: '90vh', display: 'flex', flexDirection: 'column' }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" component="div" noWrap sx={{ maxWidth: '70%' }}>
                    {title}
                </Typography>
                <Box>
                    <IconButton onClick={() => setScale(s => Math.max(0.5, s - 0.25))} title="Zoom Out">
                        <ZoomOutIcon />
                    </IconButton>
                    <Typography variant="body2" component="span" sx={{ mx: 1 }}>
                        {Math.round(scale * 100)}%
                    </Typography>
                    <IconButton onClick={() => setScale(s => Math.min(3, s + 0.25))} title="Zoom In">
                        <ZoomInIcon />
                    </IconButton>
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                        sx={{ ml: 2 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ p: 4 }}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                ) : (
                    <Box sx={{ p: 2, minHeight: '100%', display: 'flex', justifyContent: 'center' }}>
                        <canvas ref={canvasRef} style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
                <Button
                    startIcon={<PrevIcon />}
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1 || loading}
                >
                    Previous
                </Button>
                <Typography sx={{ mx: 2 }}>
                    Page {currentPage} of {pdfDoc?.numPages || '--'}
                </Typography>
                <Button
                    endIcon={<NextIcon />}
                    onClick={handleNextPage}
                    disabled={!pdfDoc || currentPage >= pdfDoc.numPages || loading}
                >
                    Next
                </Button>
            </DialogActions>
        </Dialog>
    );
}
