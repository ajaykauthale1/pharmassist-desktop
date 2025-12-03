/**
 * Persistent storage service using OPFS (Origin Private File System) with IndexedDB fallback
 * OPFS data survives app uninstall/reinstall on supported browsers
 */

import { Resource } from '../types';

interface StorageCapabilities {
    hasOPFS: boolean;
    hasIndexedDB: boolean;
}

class PersistentStorage {
    private static instance: PersistentStorage;
    private capabilities: StorageCapabilities = {
        hasOPFS: false,
        hasIndexedDB: false
    };
    private opfsRoot?: FileSystemDirectoryHandle;
    private initialized = false;

    private constructor() { }

    public static getInstance(): PersistentStorage {
        if (!PersistentStorage.instance) {
            PersistentStorage.instance = new PersistentStorage();
        }
        return PersistentStorage.instance;
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Check for OPFS support
        if ('storage' in navigator && 'getDirectory' in navigator.storage) {
            try {
                this.opfsRoot = await navigator.storage.getDirectory();
                this.capabilities.hasOPFS = true;
                console.log('✓ OPFS available - data will persist across reinstalls');
            } catch (error) {
                console.warn('OPFS not available:', error);
            }
        }

        // Check for IndexedDB
        this.capabilities.hasIndexedDB = 'indexedDB' in window;

        this.initialized = true;
        console.log('Storage capabilities:', this.capabilities);
    }

    /**
     * Save resource data to persistent storage
     */
    async saveResourceData(
        resourceId: string,
        metadata: Resource,
        chunks: string[],
        embeddings: number[][]
    ): Promise<void> {
        await this.initialize();

        if (!this.capabilities.hasOPFS) {
            console.log('OPFS not available, using IndexedDB only');
            return;
        }

        try {
            // Create resource directory
            const resourceDir = await this.getOrCreateDirectory(
                this.opfsRoot!,
                `resources/${resourceId}`
            );

            // Save metadata
            await this.writeJSONFile(resourceDir, 'metadata.json', metadata);

            // Save chunks
            await this.writeJSONFile(resourceDir, 'chunks.json', chunks);

            // Save embeddings as binary for efficiency
            await this.writeEmbeddings(resourceDir, 'embeddings.bin', embeddings);

            console.log(`✓ Saved resource ${resourceId} to OPFS`);
        } catch (error) {
            console.error('Failed to save to OPFS:', error);
        }
    }

    /**
     * Load resource data from persistent storage
     */
    async loadResourceData(resourceId: string): Promise<{
        metadata: Resource;
        chunks: string[];
        embeddings: number[][];
    } | null> {
        await this.initialize();

        if (!this.capabilities.hasOPFS) {
            return null;
        }

        try {
            const resourceDir = await this.getDirectory(
                this.opfsRoot!,
                `resources/${resourceId}`
            );

            if (!resourceDir) return null;

            const metadata = await this.readJSONFile<Resource>(resourceDir, 'metadata.json');
            const chunks = await this.readJSONFile<string[]>(resourceDir, 'chunks.json');
            const embeddings = await this.readEmbeddings(resourceDir, 'embeddings.bin');

            if (!metadata || !chunks || !embeddings) return null;

            console.log(`✓ Loaded resource ${resourceId} from OPFS`);
            return { metadata, chunks, embeddings };
        } catch (error) {
            console.error('Failed to load from OPFS:', error);
            return null;
        }
    }

    /**
     * Delete resource data from persistent storage
     */
    async deleteResourceData(resourceId: string): Promise<void> {
        await this.initialize();

        if (!this.capabilities.hasOPFS) return;

        try {
            const resourcesDir = await this.getDirectory(this.opfsRoot!, 'resources');
            if (resourcesDir) {
                await resourcesDir.removeEntry(resourceId, { recursive: true });
                console.log(`✓ Deleted resource ${resourceId} from OPFS`);
            }
        } catch (error) {
            console.error('Failed to delete from OPFS:', error);
        }
    }

    /**
     * List all stored resource IDs
     */
    async listStoredResources(): Promise<string[]> {
        await this.initialize();

        if (!this.capabilities.hasOPFS) return [];

        try {
            const resourcesDir = await this.getDirectory(this.opfsRoot!, 'resources');
            if (!resourcesDir) return [];

            const resourceIds: string[] = [];
            // @ts-ignore - values() is available in OPFS but not in all TypeScript versions
            for await (const entry of resourcesDir.values()) {
                if (entry.kind === 'directory') {
                    resourceIds.push(entry.name);
                }
            }

            return resourceIds;
        } catch (error) {
            console.error('Failed to list resources:', error);
            return [];
        }
    }

    // Helper methods

    private async getOrCreateDirectory(
        parent: FileSystemDirectoryHandle,
        path: string
    ): Promise<FileSystemDirectoryHandle> {
        const parts = path.split('/').filter(p => p);
        let current = parent;

        for (const part of parts) {
            current = await current.getDirectoryHandle(part, { create: true });
        }

        return current;
    }

    private async getDirectory(
        parent: FileSystemDirectoryHandle,
        path: string
    ): Promise<FileSystemDirectoryHandle | null> {
        try {
            const parts = path.split('/').filter(p => p);
            let current = parent;

            for (const part of parts) {
                current = await current.getDirectoryHandle(part);
            }

            return current;
        } catch {
            return null;
        }
    }

    private async writeJSONFile(
        dir: FileSystemDirectoryHandle,
        filename: string,
        data: any
    ): Promise<void> {
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data));
        await writable.close();
    }

    private async readJSONFile<T>(
        dir: FileSystemDirectoryHandle,
        filename: string
    ): Promise<T | null> {
        try {
            const fileHandle = await dir.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const text = await file.text();
            return JSON.parse(text);
        } catch {
            return null;
        }
    }

    private async writeEmbeddings(
        dir: FileSystemDirectoryHandle,
        filename: string,
        embeddings: number[][]
    ): Promise<void> {
        // Convert embeddings to Float32Array for efficient storage
        const totalLength = embeddings.reduce((sum, emb) => sum + emb.length, 0);
        const buffer = new Float32Array(totalLength);

        let offset = 0;
        for (const embedding of embeddings) {
            buffer.set(embedding, offset);
            offset += embedding.length;
        }

        // Store metadata about dimensions
        const metadata = {
            count: embeddings.length,
            dimension: embeddings[0]?.length || 0
        };

        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();

        // Write metadata first (as JSON string with length prefix)
        const metadataStr = JSON.stringify(metadata);
        const metadataLength = new Uint32Array([metadataStr.length]);
        await writable.write(metadataLength);
        await writable.write(metadataStr);

        // Write embeddings
        await writable.write(buffer);
        await writable.close();
    }

    private async readEmbeddings(
        dir: FileSystemDirectoryHandle,
        filename: string
    ): Promise<number[][] | null> {
        try {
            const fileHandle = await dir.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();

            // Read metadata length
            const metadataLength = new Uint32Array(arrayBuffer, 0, 1)[0];

            // Read metadata
            const metadataBytes = new Uint8Array(arrayBuffer, 4, metadataLength);
            const metadataStr = new TextDecoder().decode(metadataBytes);
            const metadata = JSON.parse(metadataStr);

            // Read embeddings
            const dataOffset = 4 + metadataLength;
            const embeddingsData = new Float32Array(arrayBuffer, dataOffset);

            // Reconstruct 2D array
            const embeddings: number[][] = [];
            for (let i = 0; i < metadata.count; i++) {
                const start = i * metadata.dimension;
                const end = start + metadata.dimension;
                embeddings.push(Array.from(embeddingsData.slice(start, end)));
            }

            return embeddings;
        } catch {
            return null;
        }
    }

    /**
     * Save a binary file (e.g., PDF) to persistent storage
     */
    async saveFile(resourceId: string, file: File | Blob): Promise<void> {
        await this.initialize();

        if (!this.capabilities.hasOPFS) return;

        try {
            const resourceDir = await this.getOrCreateDirectory(
                this.opfsRoot!,
                `resources/${resourceId}`
            );

            const fileHandle = await resourceDir.getFileHandle('original.pdf', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(file);
            await writable.close();
        } catch (error) {
            console.error('Failed to save file to OPFS:', error);
        }
    }

    /**
     * Load a binary file (e.g., PDF) from persistent storage
     */
    async loadFile(resourceId: string): Promise<Blob | null> {
        await this.initialize();

        if (!this.capabilities.hasOPFS) return null;

        try {
            const resourceDir = await this.getDirectory(
                this.opfsRoot!,
                `resources/${resourceId}`
            );

            if (!resourceDir) return null;

            const fileHandle = await resourceDir.getFileHandle('original.pdf');
            const file = await fileHandle.getFile();
            return file;
        } catch {
            return null;
        }
    }

    getCapabilities(): StorageCapabilities {
        return { ...this.capabilities };
    }
}

export const persistentStorage = PersistentStorage.getInstance();
