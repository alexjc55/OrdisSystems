---
name: External store updates
description: Deployment scope and keeping emergency server fixes consistent with repository updates.
---

The user maintains multiple stores on an external server under PM2 and normally updates them from GitHub. Changes in this Replit workspace do not automatically update those stores.

**Why:** During a security incident, an emergency fix was installed directly on the external server while GitHub connectivity was unavailable. A subsequent repository update could overwrite such a fix if the main project was not updated too.

**How to apply:** Reconcile emergency server fixes into the main project before advising repository-based updates. Distinguish local verification from external-server installation. Do not assume stores share a database, or that restarting PM2 revokes database-backed sessions. Code-only authorization fixes need no schema migration, but session revocation remains a separate operation requiring confirmed database scope.
