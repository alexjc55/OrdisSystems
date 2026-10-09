---
name: Headless keyboard verification
description: Distinguishing browser-automation focus problems from real control defects.
---

Do not interpret a failed synthetic keyboard activation as a product defect without verifying foreground browser focus and the dispatched event sequence.

**Why:** In a newly created headless Chromium target, focusing a native button and dispatching Enter did not activate it, with no browser exception. Programmatic clicking activated the same control and its interaction checks passed. The keyboard-automation failure's cause was not established.

**How to apply:** Check target activation, document focus and keyboard event dispatch before diagnosing accessibility failures. Report click-only tests as click tests, not as keyboard verification.
