# Online payment provider switches

For each independently hosted store, add these non-secret switches to its server
environment or `.env`:

```dotenv
PAYMENT_HYP_ENABLED=true
PAYMENT_GROW_ENABLED=true
PAYMENT_ALLPAY_ENABLED=true
PAYMENT_PAYME_ENABLED=true
```

Set a provider to `false` to remove it from the settings selector and block new
payment initiation through it. If all four are `false`, the complete online
payment settings block is hidden; offline payment methods remain available.

Omitted switches default to `true` for compatibility with existing stores.
Values `true`/`false` (case-insensitive) and `1`/`0` are accepted. Other values
produce an explicit configuration error, not a silent fallback.

Restart the store process after changing its environment, for example:

```bash
pm2 restart edahouse --update-env
```

Use the actual process name for other stores, then reload the browser. If PM2
supplies these same variables directly, update that source too; editing `.env`
does not necessarily override an existing process environment variable.

These flags do not delete saved provider configuration, merchant credentials,
orders or pending payments. Verified callbacks, reconciliation and processing of
already initiated payments remain available. They are NOT an emergency switch
for refusing previously authorized transactions or rotating merchant keys.

The browser receives only boolean availability through `/api/config`, never the
environment contents. Customer settings report a disabled provider as
unavailable even if its merchant credentials remain saved.

No database migration is needed.
