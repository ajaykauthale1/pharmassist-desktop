import { Resource, SearchResult } from '../types';

export function searchResources(query: string, resources: Resource[]): SearchResult[] {
    if (!query.trim()) {
        return [];
    }

    const searchTerms = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const resource of resources) {
        const content = resource.content.toLowerCase();
        let matches = 0;
        let snippetStart = -1;

        // Count matches and find first match position
        for (const term of searchTerms) {
            const regex = new RegExp(term, 'gi');
            const termMatches = (content.match(regex) || []).length;
            matches += termMatches;

            if (snippetStart === -1 && termMatches > 0) {
                snippetStart = content.indexOf(term.toLowerCase());
            }
        }

        if (matches > 0) {
            // Extract snippet around first match
            const snippetLength = 200;
            const start = Math.max(0, snippetStart - 50);
            const end = Math.min(resource.content.length, start + snippetLength);
            let snippet = resource.content.substring(start, end);

            // Find page number
            let page: number | undefined;
            if (resource.pageBoundaries) {
                const boundary = resource.pageBoundaries.find(b => snippetStart >= b.start && snippetStart < b.end);
                if (boundary) {
                    page = boundary.page;
                }
            }

            // Add ellipsis if needed
            if (start > 0) snippet = '...' + snippet;
            if (end < resource.content.length) snippet = snippet + '...';

            // Highlight matches in snippet
            for (const term of searchTerms) {
                const regex = new RegExp(`(${term})`, 'gi');
                snippet = snippet.replace(regex, '<mark>$1</mark>');
            }

            results.push({
                resource,
                snippet,
                matches,
                page
            });
        }
    }

    // Sort by number of matches (descending)
    return results.sort((a, b) => b.matches - a.matches);
}

export function extractMedicationsFromText(text: string): string[] {
    // Simple extraction - looks for common medication patterns
    const medications: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
        const lower = line.toLowerCase();
        // Look for lines that might contain medication names
        if (
            lower.includes('medication') ||
            lower.includes('drug') ||
            lower.includes('tablet') ||
            lower.includes('mg') ||
            lower.includes('capsule')
        ) {
            // Extract potential medication names (simple heuristic)
            const words = line.split(/\s+/);
            for (const word of words) {
                // Capitalize first letter medications (simple pattern)
                if (word.length > 3 && /^[A-Z][a-z]+$/.test(word)) {
                    if (!medications.includes(word)) {
                        medications.push(word);
                    }
                }
            }
        }
    }

    return medications.slice(0, 10); // Limit to top 10
}

export interface GroupedResult {
    resource: Resource;
    pages: Map<number, SearchResult[]>;
    matches: number;
}

export function groupResults(results: SearchResult[]): GroupedResult[] {
    const groups = new Map<string, GroupedResult>();

    for (const result of results) {
        if (!groups.has(result.resource.id)) {
            groups.set(result.resource.id, {
                resource: result.resource,
                pages: new Map(),
                matches: 0
            });
        }
        const group = groups.get(result.resource.id)!;
        group.matches += result.matches;

        const page = result.page || 0; // 0 for unknown/text files
        if (!group.pages.has(page)) {
            group.pages.set(page, []);
        }
        group.pages.get(page)!.push(result);
    }

    return Array.from(groups.values()).sort((a, b) => b.matches - a.matches);
}
