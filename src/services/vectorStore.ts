import localforage from 'localforage';

export interface VectorDocument {
    id: string;
    resourceId: string;
    text: string;
    embedding: number[];
    metadata?: any;
    page?: number;
    remedy?: string;        // Remedy name (e.g., "Arsenicum Album")
    section?: string;       // Section type (e.g., "Mind", "Head", "Modalities")
}

const vectorStore = localforage.createInstance({
    name: 'PharmAssist',
    storeName: 'vectors',
});

// Cosine similarity function
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function addVectors(vectors: VectorDocument[]): Promise<void> {
    for (const doc of vectors) {
        await vectorStore.setItem(doc.id, doc);
    }
}

export async function deleteVectorsByResourceId(resourceId: string): Promise<void> {
    const keys: string[] = [];
    await vectorStore.iterate<VectorDocument, void>((value, key) => {
        if (value.resourceId === resourceId) {
            keys.push(key);
        }
    });

    for (const key of keys) {
        await vectorStore.removeItem(key);
    }
}

export async function searchVectors(queryEmbedding: number[], topK: number = 30): Promise<{ doc: VectorDocument; score: number }[]> {
    const results: { doc: VectorDocument; score: number }[] = [];
    let count = 0;

    console.log('Starting vector search iteration...');
    await vectorStore.iterate<VectorDocument, void>((doc, key) => {
        count++;
        const score = cosineSimilarity(queryEmbedding, doc.embedding);
        // console.log(`Checking doc ${key}, score: ${score}`); // Uncomment for verbose logging
        results.push({ doc, score });
    });

    console.log(`Vector store search complete. Checked ${count} documents.`);

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

export async function clearVectorStore(): Promise<void> {
    await vectorStore.clear();
}
