/**
 * Parser for Boericke's Materia Medica structure
 * Extracts remedy names and section types from text chunks
 */

// Common section headers in Boericke's Materia Medica
const SECTION_PATTERNS = [
    'MIND',
    'HEAD',
    'EYES',
    'EARS',
    'NOSE',
    'FACE',
    'MOUTH',
    'TONGUE',
    'THROAT',
    'STOMACH',
    'ABDOMEN',
    'RECTUM',
    'STOOL',
    'URINARY',
    'MALE',
    'FEMALE',
    'RESPIRATORY',
    'HEART',
    'BACK',
    'EXTREMITIES',
    'SKIN',
    'SLEEP',
    'FEVER',
    'MODALITIES',
    'RELATIONSHIP',
    'DOSE',
    'GENERALITIES'
];

/**
 * Extract remedy name from text
 * Looks for all-caps text at the beginning, typically the remedy name
 */
export function extractRemedyName(text: string): string | null {
    // Pattern 1: All caps at start of text (e.g., "ARSENICUM ALBUM")
    const pattern1 = /^([A-Z][A-Z\s-]+?)(?:\s*[-–—]\s*|\s*\n)/;
    const match1 = text.match(pattern1);
    if (match1) {
        const name = match1[1].trim();
        // Must be at least 2 words or 8 characters to be a remedy name
        if (name.includes(' ') || name.length >= 8) {
            return name;
        }
    }

    // Pattern 2: All caps line followed by description (e.g., "ACONITUM\nMonkshood")
    const pattern2 = /^([A-Z][A-Z\s-]{3,})\s*\n/;
    const match2 = text.match(pattern2);
    if (match2) {
        return match2[1].trim();
    }

    return null;
}

/**
 * Extract section type from text
 * Looks for known section headers
 */
export function extractSection(text: string): string | null {
    const upperText = text.toUpperCase();

    // Check if text starts with a section header
    for (const section of SECTION_PATTERNS) {
        // Look for section header at start or after newline
        const patterns = [
            new RegExp(`^${section}[.:\\s]`, 'i'),
            new RegExp(`\\n${section}[.:\\s]`, 'i'),
            new RegExp(`^${section}$`, 'im'),
        ];

        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return section.charAt(0) + section.slice(1).toLowerCase(); // Title case
            }
        }
    }

    return null;
}

/**
 * Parse a text chunk to extract remedy and section metadata
 */
export function parseChunkMetadata(text: string, previousRemedy?: string): {
    remedy: string | null;
    section: string | null;
} {
    const remedy = extractRemedyName(text) || previousRemedy || null;
    const section = extractSection(text);

    return { remedy, section };
}

/**
 * Determine if text is likely a remedy header
 */
export function isRemedyHeader(text: string): boolean {
    const remedyName = extractRemedyName(text);
    return remedyName !== null && remedyName.length > 0;
}

/**
 * Clean and normalize remedy name
 */
export function normalizeRemedyName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[-–—]/g, '-')
        .toUpperCase();
}
