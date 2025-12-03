
import * as pdfjsLib from 'pdfjs-dist';
import { WorkerPool, ProgressCallback } from './workerPool';
import { chunkText } from './textChunker';

// Configure worker to use local file to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;

export interface PDFExtractionProgress {
    stage: 'loading' | 'extracting' | 'complete';
    currentPage?: number;
    totalPages?: number;
    percentage?: number;
}

export async function extractTextFromPDF(
    file: File,
    onProgress?: (progress: PDFExtractionProgress) => void
): Promise<{ text: string; chunks: string[]; chunksMetadata: { page: number }[]; pageBoundaries: { page: number; start: number; end: number }[] }> {
    try {
        // Report loading stage
        onProgress?.({ stage: 'loading' });

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        // Report extraction start
        onProgress?.({
            stage: 'extracting',
            currentPage: 0,
            totalPages,
            percentage: 0
        });

        // Use parallel processing for large PDFs (> 10 pages)
        if (totalPages > 10) {
            const workerPool = new WorkerPool();

            const progressCallback: ProgressCallback = (progress) => {
                onProgress?.({
                    stage: 'extracting',
                    currentPage: progress.currentPage,
                    totalPages: progress.totalPages,
                    percentage: progress.overallProgress
                });
            };

            // Pass the file directly - each worker will read its own copy
            const result = await workerPool.extractTextParallel(
                file,
                totalPages,
                progressCallback
            );

            onProgress?.({ stage: 'complete', percentage: 100 });
            return result;
        } else {
            // For small PDFs, use sequential processing
            let fullText = '';
            const allChunks: string[] = [];
            const chunksMetadata: { page: number }[] = [];
            const pageBoundaries: { page: number; start: number; end: number }[] = [];

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');

                const start = fullText.length;
                fullText += pageText + '\n\n';
                const end = fullText.length;

                pageBoundaries.push({ page: pageNum, start, end });

                // Chunk this page's text
                const pageChunks = chunkText(pageText);
                allChunks.push(...pageChunks);

                // Add metadata for these chunks
                pageChunks.forEach(() => {
                    chunksMetadata.push({ page: pageNum });
                });

                onProgress?.({
                    stage: 'extracting',
                    currentPage: pageNum,
                    totalPages,
                    percentage: (pageNum / totalPages) * 100
                });
            }

            onProgress?.({ stage: 'complete', percentage: 100 });
            return { text: fullText.trim(), chunks: allChunks, chunksMetadata, pageBoundaries };
        }
    } catch (error: any) {
        console.error('Error extracting PDF text:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        throw new Error(`Failed to extract text from PDF: ${error.message || 'Unknown error'}`);
    }
}

export async function extractTextFromTextFile(file: File): Promise<{ text: string; chunks: string[]; chunksMetadata: { page: number }[]; pageBoundaries: { page: number; start: number; end: number }[] }> {
    const text = await file.text();
    const chunks = chunkText(text);
    // Text files don't have pages, so return empty metadata
    const chunksMetadata = chunks.map(() => ({ page: 1 }));
    const pageBoundaries: { page: number; start: number; end: number }[] = [];
    return { text, chunks, chunksMetadata, pageBoundaries };
}
