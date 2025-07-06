# Quick Delivery Migration Guide for VPS

## What Changed
The `delivery_fee` column has been removed from the `orders` table. Delivery costs are now calculated dynamically from store settings.

## Quick Deployment (30 seconds)

### Option 1: Automated Script
```bash
# Run the automated deployment script
./scripts/deploy-delivery-migration.sh
```

### Option 2: Manual SQL
```bash
# Connect to your database
psql -h localhost -U your_username -d your_database

# Remove the column
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_fee;

# Verify (should return no rows)
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'delivery_fee';

# Exit
\q

# Restart your application
pm2 restart your-app-name
```

## Files Created for VPS Deployment
1. `migrations/remove-delivery-fee-from-orders.sql` - SQL migration file
2. `scripts/deploy-delivery-migration.sh` - Automated deployment script  
3. `VPS-DELIVERY-MIGRATION-GUIDE.md` - Detailed guide with troubleshooting

## Verification
After migration, check that:
- Orders in admin panel show correct delivery fees (15₪ when no free delivery threshold)
- Changing store delivery settings affects all orders immediately
- No "delivery_fee" column in orders table: `\d orders` in psql

## Rollback (Emergency Only)
```sql
ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0.00 NOT NULL;
```

**Note**: Rollback not recommended as application code expects dynamic calculation.