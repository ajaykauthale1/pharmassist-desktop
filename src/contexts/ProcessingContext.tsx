import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { extractTextFromPDF, extractTextFromTextFile } from '../services/pdfExtractor';
import { embeddingService } from '../services/embeddingService';
import { addVectors } from '../services/vectorStore';
import { saveResource } from '../services/resourceStorage';
import { Resource } from '../types';

interface ProcessingState {
    isProcessing: boolean;
    status: string;
    progress: number;
    error: string | null;
}

interface ProcessingContextType extends ProcessingState {
    startUpload: (file: File) => Promise<void>;
    cancelUpload: () => void;
    resetStatus: () => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ProcessingState>({
        isProcessing: false,
        status: '',
        progress: 0,
        error: null,
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    const resetStatus = useCallback(() => {
        setState(prev => ({ ...prev, status: '', error: null, progress: 0 }));
    }, []);

    const cancelUpload = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setState(prev => ({
                ...prev,
                isProcessing: false,
                status: 'Upload cancelled',
                error: 'Cancelled by user'
            }));
        }
    }, []);

    const startUpload = useCallback(async (file: File) => {
        if (state.isProcessing) return;

        // Create new AbortController
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setState({
            isProcessing: true,
            status: 'Starting upload...',
            progress: 0,
            error: null,
        });


        const startTime = Date.now();

        try {
            let content: string;
            let chunks: string[];
            let chunksMetadata: { page: number }[] = [];
            let pageBoundaries: { page: number; start: number; end: number }[] = [];
            let type: 'pdf' | 'text';

            if (file.type === 'application/pdf') {
                const result = await extractTextFromPDF(file, (progress) => {
                    if (signal.aborted) return;

                    if (progress.stage === 'loading') {
                        setState(prev => ({ ...prev, status: 'Loading PDF...', progress: 5 }));
                    } else if (progress.stage === 'extracting') {
                        const pct = progress.percentage || 0;
                        // Map extraction (0-100) to overall progress (5-40)
                        const overallProgress = 5 + (pct * 0.35);

                        setState(prev => ({
                            ...prev,
                            progress: overallProgress,
                            status: `Extracting text: ${progress.currentPage}/${progress.totalPages} pages`
                        }));
                    }
                });
                content = result.text;
                chunks = result.chunks;
                chunksMetadata = result.chunksMetadata;
                pageBoundaries = result.pageBoundaries;
                type = 'pdf';
            } else if (file.type === 'text/plain') {
                const result = await extractTextFromTextFile(file);
                content = result.text;
                chunks = result.chunks;
                chunksMetadata = result.chunksMetadata;
                // Text files don't have page boundaries
                type = 'text';
                setState(prev => ({ ...prev, progress: 40 }));
            } else {
                throw new Error('Unsupported file type. Please upload PDF or TXT files.');
            }

            if (signal.aborted) throw new Error('Cancelled');

            const resourceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const resource: Resource = {
                id: resourceId,
                title: file.name,
                type,
                content,
                uploadedAt: Date.now(),
                fileSize: file.size,
                chunksMetadata,
                pageBoundaries
            };

            // Generate embeddings
            setState(prev => ({ ...prev, status: 'Preparing chunks...', progress: 45 }));

            if (signal.aborted) throw new Error('Cancelled');

            const vectors = [];

            const embeddings = await embeddingService.generateEmbeddingsParallel(
                chunks,
                (current, total) => {
                    if (signal.aborted) return;

                    const pct = (current / total);
                    // Map embedding (0-100) to overall progress (45-90)
                    const overallProgress = 45 + (pct * 45);
                    const rate = (current / ((Date.now() - startTime) / 1000)).toFixed(1);

                    setState(prev => ({
                        ...prev,
                        progress: overallProgress,
                        status: `Generating embeddings: ${current}/${total} (${(pct * 100).toFixed(0)}%) - ${rate} chunks/sec`
                    }));
                }
            );

            if (signal.aborted) throw new Error('Cancelled');

            // Create vector documents with remedy/section metadata
            setState(prev => ({ ...prev, status: 'Parsing remedy structure...', progress: 90 }));

            // Import remedy parser
            const { parseChunkMetadata } = await import('../services/remedyParser');

            let currentRemedy: string | null = null;
            for (let i = 0; i < chunks.length; i++) {
                // Parse remedy and section from chunk text
                const { remedy, section } = parseChunkMetadata(chunks[i], currentRemedy || undefined);

                // Update current remedy if found
                if (remedy) {
                    currentRemedy = remedy;
                }

                vectors.push({
                    id: `${resourceId}-${i}`,
                    resourceId,
                    text: chunks[i],
                    embedding: embeddings[i],
                    page: chunksMetadata[i]?.page,
                    remedy: currentRemedy || undefined,
                    section: section || undefined
                });
            }

            // Store vectors
            setState(prev => ({ ...prev, status: 'Saving to vector store...', progress: 92 }));
            await addVectors(vectors);

            if (signal.aborted) throw new Error('Cancelled');

            // Save resource metadata
            setState(prev => ({ ...prev, status: 'Saving metadata...', progress: 95 }));
            await saveResource(resource);

            // Save to persistent storage (OPFS)
            setState(prev => ({ ...prev, status: 'Backing up to persistent storage...', progress: 98 }));
            const { persistentStorage } = await import('../services/persistentStorage');
            await persistentStorage.saveResourceData(
                resourceId,
                resource,
                chunks,
                embeddings
            );

            // Save original file if it's a PDF
            if (file.type === 'application/pdf') {
                await persistentStorage.saveFile(resourceId, file);
            }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                progress: 100,
                status: `✓ Complete in ${totalTime}s`
            }));

            // Auto-clear status after 3 seconds
            setTimeout(() => {
                resetStatus();
            }, 3000);

        } catch (err: any) {
            if (err.message === 'Cancelled') {
                // Already handled in cancelUpload or state update
            } else {
                console.error(err);
                setState(prev => ({
                    ...prev,
                    isProcessing: false,
                    error: err.message || 'Failed to upload file',
                    status: 'Error occurred'
                }));
            }
        } finally {
            abortControllerRef.current = null;
        }
    }, [state.isProcessing, resetStatus]);

    return (
        <ProcessingContext.Provider value={{ ...state, startUpload, cancelUpload, resetStatus }}>
            {children}
        </ProcessingContext.Provider>
    );
}

export function useProcessing() {
    const context = useContext(ProcessingContext);
    if (context === undefined) {
        throw new Error('useProcessing must be used within a ProcessingProvider');
    }
    return context;
}
