/** Serialized performance review from tRPC (Date fields become strings). */
export type PerformanceReview = {
  id: string;
  personId: string;
  authorId: string;
  cycleLabel: string;
  reviewDate: string;
  coreCompetencyScore: number;
  teamworkScore: number;
  innovationScore: number;
  timeManagementScore: number;
  coreCompetencyComments: string | null;
  teamworkComments: string | null;
  innovationComments: string | null;
  timeManagementComments: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export function computeAverage(
  r: Pick<
    PerformanceReview,
    "coreCompetencyScore" | "teamworkScore" | "innovationScore" | "timeManagementScore"
  >,
): number {
  return (r.coreCompetencyScore + r.teamworkScore + r.innovationScore + r.timeManagementScore) / 4;
}
