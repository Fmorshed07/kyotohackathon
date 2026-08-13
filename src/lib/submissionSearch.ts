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
    member_name_list?: string[] | null;
    team_members?: Array<{ name?: string | null }> | null;
    short_description?: string | null;
  }
) =>
  matchesSearchQuery(query, [
    submission.title,
    submission.team_name,
    submission.member_names,
    ...(submission.member_name_list ?? []),
    ...(submission.team_members ?? []).map((member) => member.name),
    submission.short_description,
  ]);
