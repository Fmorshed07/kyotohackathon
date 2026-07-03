export const normalizeSearchQuery = (query: string) => query.trim().toLowerCase();

export const matchesSearchQuery = (
  query: string,
  fields: Array<string | null | undefined>
) => {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  return fields.some((field) => field?.toLowerCase().includes(normalized));
};

export const submissionMatchesSearch = (
  query: string,
  submission: {
    title?: string | null;
    team_name?: string | null;
    member_names?: string | null;
    short_description?: string | null;
  }
) =>
  matchesSearchQuery(query, [
    submission.title,
    submission.team_name,
    submission.member_names,
    submission.short_description,
  ]);
