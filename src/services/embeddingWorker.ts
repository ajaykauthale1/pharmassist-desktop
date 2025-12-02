import { pipeline, env } from '@xenova/transformers';

// Skip local model check to fetch from CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: any = null;
const modelName = 'Xenova/all-MiniLM-L6-v2';

self.onmessage = async (event: MessageEvent) => {
    const { type, data } = event.data;

    if (type === 'init') {
        try {
            if (!extractor) {
                extractor = await pipeline('feature-extraction', modelName);
            }
            self.postMessage({ type: 'init_complete' });
        } catch (error: any) {
            self.postMessage({ type: 'error', error: error.message });
        }
    } else if (type === 'generate') {
        try {
            if (!extractor) {
                extractor = await pipeline('feature-extraction', modelName);
            }

            const { texts, batchId } = data;
            const embeddings: number[][] = [];

            for (const text of texts) {
                const output = await extractor(text, { pooling: 'mean', normalize: true });
                embeddings.push(Array.from(output.data));
            }

            self.postMessage({
                type: 'generate_complete',
                data: {
                    batchId,
                    embeddings
                }
            });
        } catch (error: any) {
            self.postMessage({
                type: 'error',
                error: error.message,
                data: { batchId: data.batchId }
            });
        }
    }
};

export interface EmbeddingWorkerMessage {
    type: 'init' | 'generate';
    data?: {
        texts?: string[];
        batchId?: string;
    };
}

export interface EmbeddingWorkerResponse {
    type: 'init_complete' | 'generate_complete' | 'error';
    data?: {
        batchId?: string;
        embeddings?: number[][];
    };
    error?: string;
}
