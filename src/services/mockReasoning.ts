import { SymptomData, AnalysisResult, MedicationResult, RemedyMatch, SymptomMatch } from '../types';
import { getResources } from './resourceStorage';
import { embeddingService } from './embeddingService';
import { searchVectors } from './vectorStore';

export async function analyzeSymptomsWithMockData(data: SymptomData): Promise<AnalysisResult> {
    const symptoms = data.symptoms.toLowerCase();

    // 1. Generate embedding for symptoms
    let remedyMatches: RemedyMatch[] = [];

    try {
        console.log('Generating embedding for symptoms:', symptoms);
        const queryEmbedding = await embeddingService.generateEmbedding(symptoms);

        console.log('Searching vector store...');
        const vectorResults = await searchVectors(queryEmbedding, 30); // Top 30 chunks for better aggregation
        console.log('Raw vector results:', vectorResults);

        // Get resource information for each result
        const resources = await getResources();
        const resourceMap = new Map(resources.map(r => [r.id, r]));

        // Filter by minimum score threshold
        const filteredResults = vectorResults.filter(r => r.score > 0.1);

        // Aggregate by remedy
        const remedyMap = new Map<string, {
            matches: SymptomMatch[];
            totalScore: number;
        }>();

        for (const result of filteredResults) {
            const remedyName = result.doc.remedy || 'Unknown Remedy';
            const resource = resourceMap.get(result.doc.resourceId);

            const symptomMatch: SymptomMatch = {
                symptom: result.doc.text.substring(0, 100) + '...', // First 100 chars as symptom description
                section: result.doc.section || 'General',
                page: result.doc.page || 0,
                snippet: result.doc.text.substring(0, 200) + (result.doc.text.length > 200 ? '...' : ''),
                score: result.score,
                resourceId: result.doc.resourceId,
                resourceTitle: resource?.title || 'Medical Resource'
            };

            if (!remedyMap.has(remedyName)) {
                remedyMap.set(remedyName, {
                    matches: [],
                    totalScore: 0
                });
            }

            const remedyData = remedyMap.get(remedyName)!;
            remedyData.matches.push(symptomMatch);
            remedyData.totalScore += result.score;
        }

        // Convert to RemedyMatch array and calculate percentages
        remedyMatches = Array.from(remedyMap.entries()).map(([remedyName, data]) => {
            const matchCount = data.matches.length;
            const averageScore = data.totalScore / matchCount;

            // Estimate total symptoms (rough heuristic)
            // In a real implementation, you'd parse the actual symptom count from input
            const totalSymptoms = 5; // Placeholder
            const matchPercentage = Math.min(100, (matchCount / totalSymptoms) * 100);

            return {
                remedyName,
                matchCount,
                totalSymptoms,
                matchPercentage,
                averageScore,
                symptomMatches: data.matches.sort((a, b) => b.score - a.score) // Sort by score
            };
        });

        // Sort remedies by match count and average score
        remedyMatches.sort((a, b) => {
            if (b.matchCount !== a.matchCount) {
                return b.matchCount - a.matchCount;
            }
            return b.averageScore - a.averageScore;
        });

        console.log('Remedy matches:', remedyMatches);


    } catch (err) {
        console.error('Vector search failed, falling back to mock', err);
    }

    let conditions: string[] = [];
    let primaryMedications: MedicationResult[] = [];
    let explanation = '';
    let additionalNotes = '';

    if (remedyMatches.length > 0) {
        // Use remedy-based recommendations
        const topRemedy = remedyMatches[0];

        // Extract conditions from remedy matches
        conditions.push(`Symptoms match ${topRemedy.remedyName} (${Math.round(topRemedy.matchPercentage)}% match)`);

        // Create medications from top remedies
        primaryMedications = remedyMatches.slice(0, 3).map(remedy => ({
            name: remedy.remedyName,
            type: 'generic' as const,
            description: `${remedy.matchCount} symptom match${remedy.matchCount !== 1 ? 'es' : ''} found (${Math.round(remedy.averageScore * 100)}% relevance)`
        }));

        explanation = `Based on semantic analysis of ${remedyMatches.length} matching remedies. ${topRemedy.remedyName} shows the highest symptom coverage with ${topRemedy.matchCount} matches across ${new Set(topRemedy.symptomMatches.map(m => m.section)).size} different sections.`;

        const topSections = topRemedy.symptomMatches.slice(0, 3).map(m => m.section).join(', ');
        additionalNotes = `**Top Remedy: ${topRemedy.remedyName}**\n\nMatching sections: ${topSections}\n\n${remedyMatches.length > 1 ? `**Other matching remedies:** ${remedyMatches.slice(1, 4).map(r => r.remedyName).join(', ')}` : ''}`;
    }

    // Fallback to mock data if no resources or no matches
    if (primaryMedications.length === 0) {
        // Check if we have any resources uploaded
        const resources = await getResources();

        // Simple mock logic based on keywords
        if (symptoms.includes('fever') || symptoms.includes('temperature')) {
            conditions.push('Possible viral infection');
        }
        if (symptoms.includes('headache') || symptoms.includes('pain')) {
            conditions.push('Tension headache');
        }
        if (symptoms.includes('cough')) {
            conditions.push('Upper respiratory tract infection');
        }
        if (conditions.length === 0) {
            conditions.push('General malaise');
        }

        // Mock medications (prioritize generics)
        primaryMedications = [
            {
                name: 'Paracetamol',
                type: 'generic',
                description: '500mg tablet, take 1-2 tablets every 4-6 hours as needed for pain/fever'
            },
            {
                name: 'Ibuprofen',
                type: 'generic',
                description: '200mg tablet, take 1-2 tablets every 6-8 hours with food'
            },
            {
                name: 'Tylenol',
                type: 'branded',
                description: 'Branded paracetamol alternative'
            }
        ];

        explanation = `Based on the symptoms "${data.symptoms}", the likely conditions are ${conditions.join(', ')}. The recommended medications prioritize generic options for cost-effectiveness.`;
        additionalNotes = resources.length === 0
            ? 'No medical resources uploaded. Upload PDFs or text files in the Resources page for more accurate recommendations.'
            : 'No specific matches found in uploaded resources. Showing default recommendations. Try uploading more specific medical references.';
    }

    return {
        conditions,
        primaryMedications,
        explanation,
        additionalNotes,
        remedyMatches
    };
}
