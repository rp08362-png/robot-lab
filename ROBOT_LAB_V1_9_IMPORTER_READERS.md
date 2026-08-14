# ROBOT LAB V1.9 — Recursive Importer + Project Readers

## Discovery rule
The importer discovers every non-directory entry exposed by JSZip across the complete ZIP tree.

Source of Truth and ASSET_INDEX are metadata only:
- labels
- featured order
- variants
- release metadata
- project identity / project_id

They DO NOT limit imported assets.

## Mandatory case-insensitive classification
- GLB / GLTF → 3D Models
- STEP / STP / STL → Mechanical / CAD
- C / CPP / H / INO → Firmware
- any file under Bench_Tests → Bench Tests
- any file under Procurement → Procurement
- PNG / JPG / JPEG / WEBP under References → References
- CSV → BOM only when BOM-style headers are detected
- release/version metadata → Releases
- Source of Truth / ASSET_INDEX → Metadata

## BOM
Original CSV is preserved.
CSV rows are parsed into structured BOM records.
Supported concepts include:
item, part, part_number, quantity, qty, description, price, supplier_link, supplier, variant.

Budget and Premium are stored as distinct variants and never deduplicated into one row.

## Archive ZIPs
ZIP files inside /Archive/ are preserved as release/backup files.
The importer never recursively opens nested archive ZIPs.

## Existing-project strategies
Matching is by project_id first.

Update:
- replace files that have the same discovered original path;
- add new files;
- preserve existing extra paths and user content.

Merge:
- add new discovered paths and new BOM rows;
- keep matching existing imported paths untouched.

Replace Project Data:
- remove previous imported files, BOM, releases and import records;
- rebuild from the selected ZIP;
- preserve project identity, custom icon, notes, ideas and Library links.

Counts are recalculated from the final imported state AFTER the full operation.

## Featured
Featured flags from Source of Truth / ASSET_INDEX only change sort order.
All recursively-discovered GLBs remain imported.

## Built-in readers
CSV:
- authenticated private download
- parsed locally
- mobile scrollable table

STEP / STP:
- OpenCascade WASM triangulation
- interactive Three.js viewer
- orbit / zoom / technical views / dimensions / snapshot

STL:
- Three.js STLLoader
- interactive viewer
- orbit / zoom / technical views / dimensions / snapshot

GLB / glTF:
- model-viewer

## TP7 V0.14 expected validation target
For TP7_RADIO_V0_14_R1_COMPAT_APP_BUNDLE.zip the requested approximate target is:
- 23 GLB / glTF
- 16 STEP/STL
- 18 structured BOM rows + source CSV files
- 2 Firmware
- 2 Bench Tests
- 2 Procurement
- 17 References

The actual bundle was not available in the current chat/library during this build, so these exact counts could not be runtime-verified against the real archive. V1.9 classifies from the full file tree specifically to support this target.
