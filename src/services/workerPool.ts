import { WorkerMessage, WorkerResponse } from './pdfWorker';

export interface ProgressCallback {
    (progress: {
        workerId: number;
        currentPage: number;
        totalPages: number;
        overallProgress: number;
    }): void;
}

export class WorkerPool {
    private workers: Worker[] = [];
    private workerCount: number;
    private results: Map<number, { text: string; chunks: string[]; chunksMetadata: { page: number }[]; pageBoundaries: { page: number; start: number; end: number }[] }> = new Map();
    private progressCallback?: ProgressCallback;
    private totalPagesProcessed = 0;
    private totalPages = 0;

    constructor(workerCount?: number) {
        // Use navigator.hardwareConcurrency or default to 4
        this.workerCount = workerCount || Math.min(navigator.hardwareConcurrency || 4, 8);
    }

    async extractTextParallel(
        pdfFile: File | Blob,
        totalPages: number,
        onProgress?: ProgressCallback
    ): Promise<{ text: string; chunks: string[]; chunksMetadata: { page: number }[]; pageBoundaries: { page: number; start: number; end: number }[] }> {
        this.progressCallback = onProgress;
        this.totalPages = totalPages;
        this.totalPagesProcessed = 0;
        this.results.clear();

        // Calculate page ranges for each worker
        const pagesPerWorker = Math.ceil(totalPages / this.workerCount);
        const ranges: Array<{ start: number; end: number }> = [];

        for (let i = 0; i < this.workerCount; i++) {
            const start = i * pagesPerWorker + 1;
            const end = Math.min((i + 1) * pagesPerWorker, totalPages);

            if (start <= totalPages) {
                ranges.push({ start, end });
            }
        }

        // Create workers and process ranges in parallel
        const promises = ranges.map((range, index) =>
            this.processRange(pdfFile, range.start, range.end, index)
        );

        try {
            await Promise.all(promises);

            // Combine results in order
            let fullText = '';
            let allChunks: string[] = [];
            let allMetadata: { page: number }[] = [];
            let allPageBoundaries: { page: number; start: number; end: number }[] = [];

            for (let i = 0; i < ranges.length; i++) {
                const result = this.results.get(i);
                if (result) {
                    const currentTextLength = fullText.length;

                    fullText += result.text + '\n\n';

                    if (result.chunks) {
                        allChunks = allChunks.concat(result.chunks);
                    }
                    if (result.chunksMetadata) {
                        allMetadata = allMetadata.concat(result.chunksMetadata);
                    }
                    if (result.pageBoundaries) {
                        // Offset the boundaries by the current text length
                        const offsetBoundaries = result.pageBoundaries.map(b => ({
                            page: b.page,
                            start: b.start + currentTextLength,
                            end: b.end + currentTextLength
                        }));
                        allPageBoundaries = allPageBoundaries.concat(offsetBoundaries);
                    }
                }
            }

            return { text: fullText.trim(), chunks: allChunks, chunksMetadata: allMetadata, pageBoundaries: allPageBoundaries };
        } finally {
            this.cleanup();
        }
    }

    private async processRange(
        pdfFile: File | Blob,
        startPage: number,
        endPage: number,
        workerId: number
    ): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const worker = new Worker(
                new URL('./pdfWorker.ts', import.meta.url),
                { type: 'module' }
            );

            this.workers.push(worker);

            worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
                const { type, data } = event.data;

                if (type === 'progress' && data) {
                    this.totalPagesProcessed++;
                    if (this.progressCallback) {
                        this.progressCallback({
                            workerId: data.workerId,
                            currentPage: data.currentPage || 0,
                            totalPages: data.totalPages || 0,
                            overallProgress: (this.totalPagesProcessed / this.totalPages) * 100
                        });
                    }
                } else if (type === 'complete' && data) {
                    this.results.set(data.workerId, {
                        text: data.text || '',
                        chunks: data.chunks || [],
                        chunksMetadata: data.chunksMetadata || [],
                        pageBoundaries: data.pageBoundaries || []
                    });
                    resolve();
                } else if (type === 'error' && data) {
                    reject(new Error(data.error || 'Worker error'));
                }
            };

            worker.onerror = (error) => {
                reject(error);
            };

            // Each worker reads its own copy from the File/Blob
            // This avoids ArrayBuffer detachment issues
            const pdfData = await pdfFile.arrayBuffer();

            // Send extraction task to worker
            worker.postMessage({
                type: 'extract',
                data: { pdfData, startPage, endPage, workerId }
            } as WorkerMessage);
        });
    }

    cancel(): void {
        this.workers.forEach(worker => {
            worker.postMessage({ type: 'cancel' } as WorkerMessage);
        });
        this.cleanup();
    }

    private cleanup(): void {
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
    }
}
