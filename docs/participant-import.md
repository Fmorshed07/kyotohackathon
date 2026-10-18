# Approved event registrations

Approved Luma CSV guests are registrations, not synthetic login accounts or
project submissions. Existing participant accounts are enrolled by exact
normalized email match. Their role, primary event, other memberships, chosen
profile name and onboarding status are preserved. New guests claim their
approved registration after signing in with the same verified email and
choosing the participant role. Importing sends no emails or password resets.

## Data separation

- `participant_registrations/{sha256}` contains private contact data. Only an
  actual database administrator can write or list arbitrary registrations. A
  verified email owner can query only their own records to claim enrollment.
- `hackathons/{id}/participant_roster/{sha256}` contains exactly a display name,
  participation mode, approved status and source. It contains no email, phone,
  social link, source guest ID or account ID. Only administrators and approved
  judges/mentors assigned to that event can read it.
- Registration identifiers are an event-scoped SHA-256 of normalized email;
  rerunning an import cannot create duplicates. Names never fall back to email.
- Registration counts are separate from teams and submitted projects.

## Import

Keep CSV files outside the repository. Using the existing internal administrator
and the configured Firebase project, first run a read-only plan:

```powershell
node --env-file=.env.local scripts/import-approved-participants.mjs --file="C:\path\approved.csv" --dry-run
```

Add `--apply` instead of `--dry-run` to import. The script pins Impact Osaka's
event ID, Firebase project and official source URL. Each registration, safe
roster record and matching participant enrollment is committed atomically,
then read back. The output reports counts without printing contacts. Reruns
preserve unchanged records and existing memberships.

Raw CSVs and guest contact data must never be committed, included in public
assets, or copied into the judge roster. Existing legacy portal user/submission
read permissions are outside these new isolated collections.
