/**
 * Splits text into smaller chunks for embedding.
 * Target size: ~500 characters
 * Overlap: ~50 characters
 */
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    if (!text) return [];

    // Clean text: remove excessive newlines and spaces
    const cleanText = text.replace(/\s+/g, ' ').trim();

    if (cleanText.length <= chunkSize) {
        return [cleanText];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < cleanText.length) {
        let end = start + chunkSize;

        // If we're not at the end, try to break at a sentence or space
        if (end < cleanText.length) {
            // Look for sentence ending (.!?) within the last 20% of the chunk
            const lookback = Math.floor(chunkSize * 0.2);
            const searchRegion = cleanText.substring(end - lookback, end);
            const sentenceBreak = searchRegion.search(/[.!?]\s/);

            if (sentenceBreak !== -1) {
                end = end - lookback + sentenceBreak + 1;
            } else {
                // Fallback to last space
                const lastSpace = cleanText.lastIndexOf(' ', end);
                if (lastSpace > start) {
                    end = lastSpace;
                }
            }
        }

        chunks.push(cleanText.substring(start, end).trim());

        // Move start forward, respecting overlap
        start = end - overlap;

        // Prevent infinite loops if overlap is too big or no progress made
        if (start >= end) {
            start = end;
        }
    }

    return chunks;
}
