---
name: Browser fixture language initialization
description: Why isolated real-source browser fixtures must set language before importing application modules.
---

Initialize the browser's language preference before importing real application
modules in an isolated fixture. Do not rely solely on an awaited language change
after imports.

**Why:** Application internationalization initialization schedules its own
language change when initialization completes. In an isolated ES module bundle,
that completion can run after the fixture's language change and restore the
initial default. This made non-Russian test cases render Russian even though the
fixture awaited its requested language.

**How to apply:** Set the intended initial preference in the fixture document
before its module script loads; verify both translated UI and document direction.
Keep the application's language initialization unchanged.
