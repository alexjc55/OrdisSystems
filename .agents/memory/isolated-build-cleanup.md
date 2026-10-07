---
name: Isolated build cleanup
description: Why disposable builds must isolate plugin temporary caches as well as output.
---

For disposable build checks, isolate the child process's temporary directory as well as the build output.

**Why:** A successful real VPS build left a Tailwind/jiti cache in the parent temporary directory even after the output directory was removed. Vite's output override does not control this cache.

**How to apply:** Give the build process its own temporary directory and remove the whole directory after success or failure. Tests with minimal HTML fixtures alone may miss caches created by the full application's CSS tooling.
