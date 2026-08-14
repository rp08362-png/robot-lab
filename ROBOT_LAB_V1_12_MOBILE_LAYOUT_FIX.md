# ROBOT LAB V1.12 — Mobile Layout / Horizontal Overflow Fix

## Problem fixed
On some Android devices, a long manual filename/path could make the application document wider than the screen.
Once the browser had horizontally scrolled that oversized page, the whole interface appeared shifted/cut off:
- Edit Project disappeared partly off-screen
- tabs/header were clipped
- manual cards extended beyond the viewport

## Fix
- Page-level horizontal scrolling is disabled.
- Only intentional components may scroll horizontally:
  - project tabs
  - CAD toolbar
  - CSV table
  - document tables
- Long project/manual filenames are contained with `min-width:0`, overflow clipping and ellipsis.
- Manual cards use a mobile two-row layout:
  - icon + filename + delete
  - Read button below
- Project Edit/Delete controls use a contained grid.
- Source-of-Truth paths cannot widen the page.
- Manual Reader contents/images/pre blocks are constrained to phone width.
- Narrow-device fallback added for <=350 px screens.

This is a layout-only corrective release. Project data, Manuals, reader, importer and private storage behavior are unchanged.
