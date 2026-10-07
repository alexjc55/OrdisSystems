---
name: Safe merge setup
description: Why automatic merge reconciliation must not run interactive schema pushes.
---

Keep automatic post-merge setup limited to dependency reconciliation, checks, and builds. Apply schema changes only through separately reviewed migrations.

**Why:** A code-only security merge triggered schema introspection and an unrelated prompt about truncating existing catalog relationships. Piping the word "No" did not resolve the interactive prompt, and setup timed out. Increasing the timeout or forcing schema changes would not address the data risk.

**How to apply:** Do not reintroduce automatic drizzle-kit schema pushes or force flags to make post-merge setup succeed. Allow enough timeout for dependency installation and the production build; use the post-merge setup runner to verify both setup and workflow reconciliation.
