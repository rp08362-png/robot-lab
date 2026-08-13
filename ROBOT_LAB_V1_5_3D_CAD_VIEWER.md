# ROBOT LAB V1.5 — 3D / CAD Viewer

## Engine
Uses Google's open-source `<model-viewer>` web component, pinned to version 4.3.1.

## Entry points
- Home → 3D / CAD Viewer
- More → Tools → 3D / CAD Viewer
- Any project Overview → 3D / CAD
- Project Files → GLB → Open 3D
- Library → resource type `model3d`

## V1.5 features
- Open a local `.glb` from Android/iOS/desktop file picker.
- Open a remote HTTPS GLB URL.
- Touch rotation and pinch zoom via model-viewer camera controls.
- Front / Right / Back / Left / Top / ISO views.
- Reset camera.
- Fit / reframe model.
- Fullscreen.
- Light / dark background.
- Optional technical grid.
- PNG snapshot.
- Bounding-box X/Y/Z dimensions.
- Bounding-box centre.
- AR entry point when supported.
- Save a locally-opened GLB into the private files of a ROBOT LAB project.
- Open a saved project GLB directly back into the 3D viewer.

## Privacy
Local-file viewing uses an in-browser object URL. The model is not uploaded merely by opening it.
Uploading only happens when the user explicitly chooses `Save GLB` for a project.

## AR caveat
WebXR can keep the AR experience inside the browser. External Android Scene Viewer may need a network-accessible model URL because it is a separate application and may re-download the original model.

## Current CAD scope
This is a GLB/glTF viewer, not a parametric CAD editor. Bounding-box dimensions are derived from the glTF model. Measurement picking, section planes, exploded assemblies, technical hotspots and annotation editing are suitable future V1.6/V2 extensions.
