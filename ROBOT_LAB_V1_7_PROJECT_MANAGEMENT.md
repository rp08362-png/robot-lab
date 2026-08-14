# ROBOT LAB V1.7 — Project Management

## Edit Project
Every project workspace now has:
- Edit Project
- Delete Project

Editable fields:
- project name
- type
- status
- description

Imported Project Bundle metadata remains intact:
- Source of Truth
- imported release history
- private original bundle backup

## Delete Project
Deletion requires:
1. opening the project;
2. pressing Delete Project;
3. typing the exact project name;
4. confirming the permanent deletion.

The deletion sequence is:
1. collect project-owned private Storage paths;
2. delete those Storage objects through the authenticated Supabase Storage API;
3. only if Storage deletion succeeds, remove the project records from ROBOT LAB;
4. sync the updated project state.

If private Storage deletion fails, the project is NOT removed from application state.

## Preserved knowledge
Deleting a project does not destroy general knowledge:
- Ideas linked to the deleted project become Global / Unassigned.
- Library resources have the deleted project removed from `projectIds`.
- If that was their only project link, they become global.

## Removed project-owned data
- project record
- BOM
- tests
- problems
- decisions
- notes
- private project files
- imported project assets
- releases
- Project Bundle import records

## HUMANOID 180 special case
The old HUMANOID project predates generic project scoping for some simulator data.
Deleting it therefore also resets:
- poses
- sequences
- motion log
- robot roadmap
- architecture state
- servo calibration to safe seed defaults
- simulator/control connection state

## Storage permissions
Actual file deletion depends on the authenticated user's Storage DELETE/SELECT policies. The app deliberately refuses to remove the project metadata if the private files could not be deleted, preventing orphaned Storage objects.
