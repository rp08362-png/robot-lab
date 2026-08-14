# ROBOT LAB V1.6 — Import Project Bundle

## Main flow
Projects → Import Project Bundle → select `.zip`.

The browser:
1. reads and decompresses the ZIP locally with JSZip;
2. searches recursively for `TP7_RADIO_PROJECT_SOURCE_OF_TRUTH_V0_13.json`;
3. also supports a generic fallback `*_PROJECT_SOURCE_OF_TRUTH_*.json`;
4. parses the Source of Truth before any project asset is uploaded;
5. creates or updates the private project;
6. saves the original ZIP as an immutable private project backup;
7. uploads extracted files only to the authenticated private storage;
8. classifies and distributes the files into project sections.

## TP-7 RADIO mapping
When the exact Source of Truth filename is found:
- Project: `TP-7 RADIO V1`
- Current release: `V0.13`

Automatic categories:
- `.glb` / `.gltf` → 3D Models
- `.step` / `.stp` / `.stl` → Mechanical / CAD
- CSV / BOM → BOM
- firmware folders and source/build extensions → Firmware
- bench/test material → Bench Tests
- procurement/supplier/sourcing material → Procurement
- images → References
- version/release material → Releases
- original ZIP → private Bundle Backup
- Source of Truth JSON → Source of Truth

## BOM
CSV BOM files are parsed locally. The importer maps common fields such as:
- name / item / component / part / description
- qty / quantity / count
- category / group / type
- status / state
- notes / supplier / reference / part number

The original CSV is also preserved as a private project file.

## Releases
The exact TP-7 Source of Truth sets `V0.13` as current.
Other release/version patterns found in bundle paths are registered as release history.

## Privacy
ZIP extraction/classification is local in the browser.
No public link is created.
The only network writes are explicit authenticated uploads to the ROBOT LAB private project storage:
- original bundle backup;
- extracted project files;
- normal private project-state sync.

## Import safety
If no Source of Truth JSON exists, the import stops before the bundle is distributed.
If the Source of Truth cannot be parsed, the import stops.
Offline import is intentionally blocked because the requirement includes preserving the original ZIP as a private project backup.
