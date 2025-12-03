export interface SymptomData {
    patientName?: string;
    symptoms: string;
}

export interface MedicationResult {
    name: string;
    type: 'generic' | 'branded';
    description: string;
}

export interface AnalysisResult {
    conditions: string[];
    primaryMedications: MedicationResult[];
    explanation: string;
    additionalNotes?: string;
    sourceReferences?: SourceReference[];
    remedyMatches?: RemedyMatch[];
}

export interface SourceReference {
    resourceId: string;
    resourceTitle: string;
    page?: number;
    snippet: string;
    score: number;
}

export interface Resource {
    id: string;
    title: string;
    type: 'pdf' | 'text';
    content: string;
    uploadedAt: number;
    fileSize: number;
    chunksMetadata?: { page: number }[];
    pageBoundaries?: { page: number; start: number; end: number }[];
}

export interface SearchResult {
    resource: Resource;
    snippet: string;
    matches: number;
    page?: number;
}

export interface RemedyMatch {
    remedyName: string;
    matchCount: number;
    totalSymptoms: number;
    matchPercentage: number;
    averageScore: number;
    symptomMatches: SymptomMatch[];
}

export interface SymptomMatch {
    symptom: string;
    section: string;
    page: number;
    snippet: string;
    score: number;
    resourceId: string;
    resourceTitle: string;
}
