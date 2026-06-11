export interface CardCopyBenchmarkEvaluation {
  passed: boolean;
  score: number;
  subScores: Record<string, number>;
  blockers: string[];
  warnings: string[];
  panelStats: Array<{
    panelId: string;
    headlineChars: number;
    bodyChars: number;
    bodyWords: number;
    artDirectionChars: number;
    imagePromptChars: number;
  }>;
}

export function evaluateCardCopy(input: {
  cardCopy: unknown;
  request: {
    memory_notes?: string[];
    [key: string]: unknown;
  };
}): CardCopyBenchmarkEvaluation;
