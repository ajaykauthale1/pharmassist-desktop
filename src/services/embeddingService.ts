import { EmbeddingWorkerResponse } from './embeddingWorker';

class EmbeddingService {
    private static instance: EmbeddingService;
    private workers: Worker[] = [];
    private loadingPromise: Promise<void> | null = null;
    private pendingRequests: Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void }> = new Map();
    private nextWorkerIndex = 0;

    private constructor() { }

    public static getInstance(): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService();
        }
        return EmbeddingService.instance;
    }

    public async loadModel(): Promise<void> {
        if (this.workers.length > 0) return;

        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            try {
                // Use hardware concurrency, but cap at 8 as requested (and to prevent OOM)
                // Default to 4 if hardwareConcurrency is not available
                const coreCount = navigator.hardwareConcurrency || 4;
                const workerCount = Math.min(coreCount, 8);

                console.log(`Initializing embedding worker pool with ${workerCount} workers...`);

                for (let i = 0; i < workerCount; i++) {
                    const worker = new Worker(
                        new URL('./embeddingWorker.ts', import.meta.url),
                        { type: 'module' }
                    );

                    worker.onmessage = (event: MessageEvent<EmbeddingWorkerResponse>) => {
                        const { type, data, error } = event.data;

                        if (type === 'generate_complete' && data?.batchId) {
                            const request = this.pendingRequests.get(data.batchId);
                            if (request) {
                                request.resolve(data.embeddings);
                                this.pendingRequests.delete(data.batchId);
                            }
                        } else if (type === 'error' && data?.batchId) {
                            const request = this.pendingRequests.get(data.batchId);
                            if (request) {
                                request.reject(new Error(error));
                                this.pendingRequests.delete(data.batchId);
                            }
                        }
                    };

                    this.workers.push(worker);
                }

                console.log('Embedding worker pool initialized');
            } catch (error) {
                console.error('Failed to initialize embedding worker pool:', error);
                throw error;
            } finally {
                this.loadingPromise = null;
            }
        })();

        return this.loadingPromise;
    }

    private getNextWorker(): Worker {
        if (this.workers.length === 0) {
            throw new Error('Worker pool not initialized');
        }
        const worker = this.workers[this.nextWorkerIndex];
        this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
        return worker;
    }

    public async generateEmbedding(text: string): Promise<number[]> {
        if (this.workers.length === 0) {
            await this.loadModel();
        }

        const batchId = Math.random().toString(36).substring(7);

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(batchId, {
                resolve: (embeddings: number[][]) => resolve(embeddings[0]),
                reject
            });

            const worker = this.getNextWorker();
            worker.postMessage({
                type: 'generate',
                data: { texts: [text], batchId }
            });
        });
    }

    public async generateEmbeddings(texts: string[]): Promise<number[][]> {
        if (this.workers.length === 0) {
            await this.loadModel();
        }

        const batchId = Math.random().toString(36).substring(7);

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(batchId, { resolve, reject });

            const worker = this.getNextWorker();
            worker.postMessage({
                type: 'generate',
                data: { texts, batchId }
            });
        });
    }

    /**
     * Generate embeddings in parallel batches with progress tracking
     */
    public async generateEmbeddingsParallel(
        texts: string[],
        onProgress?: (current: number, total: number) => void,
        batchSize: number = 20
    ): Promise<number[][]> {
        if (this.workers.length === 0) {
            await this.loadModel();
        }

        const embeddings: number[][] = [];
        let completed = 0;
        const promises: Promise<number[][]>[] = [];

        // Distribute batches across workers
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);

            // Create a promise for this batch
            const batchPromise = this.generateEmbeddings(batch).then(batchEmbeddings => {
                completed += batch.length;
                onProgress?.(completed, texts.length);
                return batchEmbeddings;
            });

            promises.push(batchPromise);
        }

        // Wait for all batches to complete
        try {
            const results = await Promise.all(promises);
            // Flatten results
            results.forEach(batchResult => embeddings.push(...batchResult));
        } catch (error) {
            console.error('Error generating embeddings:', error);
            throw error;
        }

        return embeddings;
    }

}

export const embeddingService = EmbeddingService.getInstance();
