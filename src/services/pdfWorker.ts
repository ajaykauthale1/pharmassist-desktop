import * as pdfjsLib from 'pdfjs-dist';
import { chunkText } from './textChunker';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `${self.location.origin}/pdf.worker.min.mjs`;

export interface WorkerMessage {
    type: 'extract' | 'cancel';
    data?: {
        pdfData: ArrayBuffer;
        startPage: number;
        endPage: number;
        workerId: number;
    };
}

export interface WorkerResponse {
    type: 'progress' | 'complete' | 'error';
    data?: {
        workerId: number;
        currentPage?: number;
        totalPages?: number;
        text?: string;
        chunks?: string[];
        chunksMetadata?: { page: number }[];
        pageBoundaries?: { page: number; start: number; end: number }[];
        error?: string;
    };
}

let cancelled = false;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, data } = event.data;

    if (type === 'cancel') {
        cancelled = true;
        return;
    }

    if (type === 'extract' && data) {
        cancelled = false;
        const { pdfData, startPage, endPage, workerId } = data;

        try {
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            let extractedText = '';
            const allChunks: string[] = [];
            const chunksMetadata: { page: number }[] = [];
            const pageBoundaries: { page: number; start: number; end: number }[] = [];

            for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                if (cancelled) {
                    self.postMessage({
                        type: 'error',
                        data: { workerId, error: 'Cancelled by user' }
                    } as WorkerResponse);
                    return;
                }

                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');

                const start = extractedText.length;
                extractedText += pageText + '\n\n';
                const end = extractedText.length;

                pageBoundaries.push({ page: pageNum, start, end });

                // Chunk this page's text
                const pageChunks = chunkText(pageText);
                allChunks.push(...pageChunks);

                // Add metadata for these chunks
                pageChunks.forEach(() => {
                    chunksMetadata.push({ page: pageNum });
                });

                // Report progress
                self.postMessage({
                    type: 'progress',
                    data: {
                        workerId,
                        currentPage: pageNum,
                        totalPages: endPage - startPage + 1
                    }
                } as WorkerResponse);
            }

            // Send complete message
            self.postMessage({
                type: 'complete',
                data: {
                    workerId,
                    text: extractedText.trim(),
                    chunks: allChunks,
                    chunksMetadata,
                    pageBoundaries
                }
            } as WorkerResponse);

        } catch (error: any) {
            self.postMessage({
                type: 'error',
                data: {
                    workerId,
                    error: error.message || 'Unknown error'
                }
            } as WorkerResponse);
        }
    }
};
