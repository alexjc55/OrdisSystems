---
name: PDF share on mobile (WhatsApp)
description: How to generate a correct A4 PDF from HTML on mobile and share via navigator.share without breaking the user-gesture chain.
---

## The problem
On mobile (iOS/Android), generating PDF from the main-page DOM with html2pdf fails because:
- `from(string)` creates a `position:fixed;left:0;right:0` container → width = mobile viewport (~390px), not 794px → two-column A4 layout is clipped on the left.
- `from(element)` with hidden element (opacity:0, z-index:-1, overflow:hidden clipper) → html2canvas renders transparent or zero-size content → empty PDF.
- Opening a print window works (new window has full-width viewport), but requires an extra user tap.
- `navigator.share()` requires a synchronous user gesture; any `await` through a macrotask (setTimeout, event listener) breaks the chain on iOS Safari.

## The solution that works
**Hidden 794px iframe + pre-generated blob**

1. When the print overlay opens, create a hidden `<iframe>` positioned off-screen:
   `position:fixed; top:0; left:-800px; width:794px; height:1123px; border:none`
2. Write `printDocHtml` (+ injected `<script src="html2pdf CDN">` + auto-generate script) into the iframe via `document.write()`.
3. Inside the iframe, html2pdf runs in a **794px viewport** context (iframe's own viewport = iframe's CSS width). The two-column A4 layout renders correctly.
4. The auto-generate script stores the finished Blob on `window.pdfBlobReady` inside the iframe.
5. When the user taps the WhatsApp button:
   - Access `pdfFrame.contentWindow.pdfBlobReady` **synchronously** (no await needed).
   - Call `navigator.share({ files: [file] })` **inside the click handler** → user gesture is preserved → iOS share sheet works.
   - If the blob isn't ready yet (very fast tap): show a spinner, poll, then fall back to a direct download (gesture chain is broken, so sharing is skipped).

**Why:** html2canvas runs inside the iframe where the viewport is 794px — not the narrow mobile viewport of the main page. The iframe's off-screen position in the parent doesn't affect its internal rendering.

## Key: user gesture preservation
`navigator.share` must be called synchronously (or via microtask `await`) within a user gesture handler. Macrotasks (setTimeout, event listeners like postMessage/onload) break the chain. Pre-generating the blob avoids any async wait at share time.
