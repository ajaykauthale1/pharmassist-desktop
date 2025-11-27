import localforage from 'localforage';
import { Resource } from '../types';

// Configure localforage for resources
const resourceStore = localforage.createInstance({
    name: 'PharmAssist',
    storeName: 'resources',
});

export async function saveResource(resource: Resource): Promise<void> {
    await resourceStore.setItem(resource.id, resource);
}

export async function getResources(): Promise<Resource[]> {
    const resources: Resource[] = [];
    await resourceStore.iterate<Resource, void>((value) => {
        resources.push(value);
    });
    // Sort by upload date (newest first)
    return resources.sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export async function getResource(id: string): Promise<Resource | null> {
    return await resourceStore.getItem<Resource>(id);
}

export async function deleteResource(id: string): Promise<void> {
    await resourceStore.removeItem(id);
}

export async function clearAllResources(): Promise<void> {
    await resourceStore.clear();
}
