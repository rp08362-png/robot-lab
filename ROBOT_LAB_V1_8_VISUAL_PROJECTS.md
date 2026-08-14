# ROBOT LAB V1.8 — Visual Project Cleanup

## Project presentation
Imported projects are now presented as normal ROBOT LAB projects.
The import mechanism remains internal, but the workspace no longer displays:
- PROJECT BUNDLE
- IMPORTED PROJECT BUNDLE
- Private imported workspace

TP-7 RADIO V1 therefore looks like a normal project with its V0.13 release.

## File previews
Small visual preview squares are used for:
- JPG / PNG / WebP / GIF / SVG
- GLB / glTF
- STL
- STEP / STP

Rendering:
- images: authenticated signed image URL
- GLB/glTF: `<model-viewer>`
- STL: Three.js STLLoader
- STEP/STP: occt-import-js (OpenCascade WebAssembly) → Three.js mesh preview

Private Storage files remain private. Preview URLs are signed temporary URLs created only after authentication.

STEP/STL renderers are only invoked when their preview scrolls near the viewport to reduce mobile load.

## Project icons
Edit Project now contains a Project Icon control.
The user can:
- choose a custom image;
- preview it before saving;
- replace the current icon;
- reset to the default project visual.

Custom icons are saved in private Storage under the authenticated user's ROBOT LAB path.
Project deletion also deletes the custom icon.

## Internal data
Source of Truth, release metadata, import records and original ZIP backup remain preserved internally.
Only the visual presentation was cleaned up.
