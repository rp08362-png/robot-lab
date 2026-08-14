# ROBOT LAB V1.10 — Manuals + Android Back Navigation

## Manuals
Every project now has a dedicated `Manuals` tab.

Manuals is intentionally separate from:
- Files
- References
- Library
- Notes

Accepted manual documents:
- PDF
- DOC / DOCX
- ODT
- RTF
- TXT
- Markdown
- HTML

Files uploaded in Manuals are stored as private project files with `category = manuals`.
They are excluded from the generic Project Files list.

For Project Bundle imports, document files found under `/Manual/` or `/Manuals/` are classified as Manuals.

## Phone Back button
ROBOT LAB now maintains a browser/PWA navigation history for application screens.

The navigation state includes:
- page
- active project
- project tab
- Control tab
- More tab
- Library tab
- Ideas tab

On Android, the system Back key/gesture now walks backwards through ROBOT LAB navigation rather than requiring the visible `← All Projects` button.

The scroll position of the screen being left is stored in browser history. When going back, ROBOT LAB restores that previous screen and its previous scroll position.

Non-navigation renders — servo changes, sync refresh, status updates — do not create history entries.
