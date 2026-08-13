# ROBOT LAB V1.4 — Multi-Project Architecture

## Global layer
Bottom navigation:
- Home
- Projects
- Ideas
- Library
- More

The global layer is intentionally project-agnostic.

## Projects
A project can be:
- Robotics
- Electronics
- Software
- Research
- 3D / Design
- Other

HUMANOID 180 is the first specialized Robotics project.

## Ideas
Ideas may exist with:
- `projectId = null` → unassigned/global idea
- `projectId = <project id>` → project idea

An unassigned idea can be converted into a new project.

## Resources
Resources use:
- `projectIds = []` → global/unassigned resource
- `projectIds = [id...]` → linked project resources

The data model already permits multiple project associations even though the V1.4 creation UI associates one project at a time.

## HUMANOID 180
Only after opening HUMANOID 180 do robot-specific areas appear:
- Build
- Electronics
- Software
- Parts & BOM
- Control
- Calibration
- Tests
- Problems
- Decisions
- Ideas
- Resources
- Files

Control is no longer part of global navigation.

## Migration
Existing V1.3 content that was implicitly HUMANOID-specific is migrated to `projectId = humanoid-180`.
Existing HUMANOID ideas become project ideas.
New ideas default to Global / Unassigned.
