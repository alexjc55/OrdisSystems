---
name: API type contracts
description: Preserve existing response shapes when tightening database and API types.
---

Represent joined-query and order-display projections with separate DTOs instead of claiming they return complete database rows. Keep omissions explicit; do not populate extra fields merely to satisfy a table-derived type.

**Why:** Type cleanup was approved without changing store behavior. Returning new fields just to make table types fit would alter existing API payloads, including fields intentionally omitted from public or guest responses.

**How to apply:** When tightening query types, compare the selected fields with the promised response. Use precise projection types for existing subsets and keep database insert types separate from HTTP validation inputs (for example, parsed timestamp strings versus database Dates).
