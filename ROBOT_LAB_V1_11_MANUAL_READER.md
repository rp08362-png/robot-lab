# ROBOT LAB V1.11 — In-App Manual Reader

## Goal
Manuals are not merely stored. They can be read inside ROBOT LAB.

## Supported in-app reading
- PDF → PDF.js, rendered to canvas page-by-page
- DOCX → Mammoth conversion to HTML
- ODT → local ZIP/XML extraction and semantic text rendering
- RTF → local text conversion
- TXT → text reader
- Markdown → local lightweight Markdown renderer
- HTML / HTM → sanitized HTML reader

Legacy binary `.DOC` remains storable but is not parsed inside the private browser-only reader. Convert it to DOCX or PDF for reliable in-app reading.

## PDF controls
- previous / next page
- page counter
- zoom in / out
- responsive fit-to-width
- phone Back returns to project Manuals

## Privacy
Files are loaded through the same temporary authenticated signed URLs used by ROBOT LAB private Storage.
The document is rendered in the user's browser.
The reader does not send manuals to Google Docs, Microsoft Office Online or other document-viewer services.

## DOCX security
Mammoth converts DOCX to HTML in the browser using an ArrayBuffer.
External file access is explicitly disabled.
Converted HTML is sanitized with DOMPurify before insertion into the ROBOT LAB DOM.

## HTML / Markdown
HTML manuals are sanitized before rendering.
Markdown is converted locally and then sanitized.

## Libraries
- PDF.js 5.7.284
- Mammoth.js 1.12.0
- DOMPurify 3.4.7
