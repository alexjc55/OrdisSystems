---
name: External store updates
description: Deployment scope and keeping emergency server fixes consistent with repository updates.
---

The user maintains multiple stores on an external server under PM2 and normally updates them from GitHub. Changes in this Replit workspace do not automatically update those stores.

**Why:** During a security incident, an emergency fix was installed directly on the external server while GitHub connectivity was unavailable. A subsequent repository update could overwrite such a fix if the main project was not updated too.

**How to apply:** Reconcile emergency server fixes into the main project before advising repository-based updates. Distinguish local verification from external-server installation. Do not assume stores share a database, or that restarting PM2 revokes database-backed sessions. Code-only authorization fixes need no schema migration, but session revocation remains a separate operation requiring confirmed database scope.

The original hosting provider suffered an attack, and the user reports that the server containing two live stores could not be recovered. The user is rebuilding the stores with a different provider.

**Why:** The surviving database backups are historical snapshots, not copies of the stores at the moment the server was lost.

**How to apply:** Do not assume the original server remains available for a final export or image synchronization. State the recovery cutoff explicitly, keep each store's recovery isolated, and distinguish restoring a backup from recovering later missing data. Do not overwrite the working Replit database to prepare an external-store recovery.

The owner specified the rebuilt eDAHouse project's directory as
`/var/www/edahouse_ordis/data/www/edahouse.ordis.co.il` and its database name as
`edahouse`.

**Why:** These are the owner-provided destinations on the replacement server,
not the old server's home-directory layout.

**How to apply:** Use these destinations for scoped installation instructions,
but verify ownership, database contents and connection settings before writes.
Do not infer the PostgreSQL login or OS account from the directory name.

Select recovery sources by their contents, not archive filenames.

**Why:** A recovered source-code archive had a later date in its name than the newest business records in the accompanying database. A newer-looking code archive does not establish a newer database backup.

**How to apply:** Check continuity of product/order/user IDs and original creation dates, compare store identity without disclosing contact details, and match media references against archive contents. Preserve old source code for reference rather than replacing current security fixes with it.
