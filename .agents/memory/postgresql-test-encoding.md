---
name: Disposable PostgreSQL test encoding
description: Avoid misleading multilingual catalog failures in temporary PostgreSQL clusters.
---

Temporary PostgreSQL clusters initialized with `--no-locale` must explicitly use UTF-8 when testing multilingual store data.

**Why:** The environment's default encoding can be SQL_ASCII. Cyrillic or emoji fixtures then fail with an encoding error before reaching the application behavior being tested, obscuring genuine schema errors.

**How to apply:** Set `--encoding=UTF8` in disposable-cluster setup rather than assuming local initialization matches deployed store encoding.
