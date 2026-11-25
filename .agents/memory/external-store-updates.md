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
The owner confirmed switching to OS account `edahouse_ordis` using
`sudo -iu edahouse_ordis` and using `~/www/edahouse.ordis.co.il/` as the
project directory. Resolve its absolute path with `pwd` when needed.
Do not infer the PostgreSQL login from the OS account or directory name.

The owner requested a fresh installation of `dk.ordis.co.il` on the same
server, using OS account `edahouse_ordis`, project directory
`/var/www/edahouse_ordis/data/www/dk.ordis.co.il`, database `dk_ordis`,
and application port `5002`. The initial catalog must have no products or
categories.

**Why:** This is a new installation, not a restoration of eDAHouse data.
The owner reported that the separate `dk_ordis` database was empty.

**How to apply:** Verify the database is still empty before schema writes.
Do not copy another store's records or credentials, and do not seed demo
catalog data. Because both shops use the same OS account, scope PM2 operations
to the individual process; never restart or stop all processes for this setup.
The owner approved a per-store opt-out of demo initialization while preserving
other installations' behavior. Keep new-store-only environment settings in
that project's configuration, not the shared OS user's shell profile.
When giving shell commands after switching to the store's OS account, use
`cd ~/www/dk.ordis.co.il/` rather than the long absolute path.

**Why:** The owner explicitly corrected the command format to the home-relative
path after switching users. Both resolve to the same directory; keep the
absolute path for identifying filesystem destinations, not routine `cd` commands.

The replacement eDAHouse server runs PostgreSQL 15.19. The prepared recovery
dump exported by PostgreSQL 16.10 was successfully imported there, with the
expected record counts confirmed by the owner.

**Why:** The recovery README recommended PostgreSQL 16, but that recommendation
is not a requirement for this verified recovery on the existing server.

**How to apply:** Do not require a major PostgreSQL upgrade solely because
this dump's header says 16.10. This result applies to the inspected recovery
dump, not to arbitrary restores from newer PostgreSQL versions.

Select recovery sources by their contents, not archive filenames.

**Why:** A recovered source-code archive had a later date in its name than the newest business records in the accompanying database. A newer-looking code archive does not establish a newer database backup.

**How to apply:** Check continuity of product/order/user IDs and original creation dates, compare store identity without disclosing contact details, and match media references against archive contents. Preserve old source code for reference rather than replacing current security fixes with it.
