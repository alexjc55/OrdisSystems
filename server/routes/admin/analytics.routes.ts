import { Router } from "express";
import { requireAdmin } from "../../middleware/auth-guard";
import { getDB } from "../../db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  tz: z.string().optional().default('UTC')
});

const timeseriesQuerySchema = analyticsQuerySchema.extend({
  granularity: z.enum(['day', 'week', 'month']).optional().default('day')
});

router.get('/admin/analytics/summary', requireAdmin, async (req: any, res) => {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    const db = await getDB();

    const now = new Date();
    const defaultFrom = query.from || now.toISOString().split('T')[0];
    const defaultTo = query.to || now.toISOString().split('T')[0];

    const ordersResult = await db.execute(sql`
      SELECT status, COUNT(*) as count 
      FROM orders 
      WHERE created_at::date BETWEEN ${defaultFrom}::date AND ${defaultTo}::date
      GROUP BY status
    `);

    const ordersByStatus: Record<string, number> = {};
    let totalOrders = 0;
    let completedOrders = 0;

    for (const row of ordersResult.rows) {
      const status = row.status as string;
      const count = parseInt(row.count as string);
      ordersByStatus[status] = count;
      totalOrders += count;
      if (status === 'delivered') {
        completedOrders = count;
      }
    }

    const revenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as count
      FROM orders 
      WHERE status = 'delivered' 
      AND created_at::date BETWEEN ${defaultFrom}::date AND ${defaultTo}::date
    `);

    const revenue = parseFloat(revenueResult.rows[0]?.revenue as string || '0');
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const averageOrderValue = completedOrders > 0 ? revenue / completedOrders : 0;

    res.json({
      ordersByStatus,
      totalOrders,
      completedOrders,
      revenue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics summary' });
  }
});

router.get('/admin/analytics/timeseries', requireAdmin, async (req: any, res) => {
  try {
    const query = timeseriesQuerySchema.parse(req.query);
    const db = await getDB();

    const now = new Date();
    const defaultFrom = query.from || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultTo = query.to || now.toISOString().split('T')[0];

    const ordersTimeseries = await db.execute(sql`
      SELECT 
        DATE_TRUNC(${query.granularity}, created_at) as bucket,
        COUNT(*) as orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders
      FROM orders 
      WHERE created_at::date BETWEEN ${defaultFrom}::date AND ${defaultTo}::date
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    const revenueTimeseries = await db.execute(sql`
      SELECT 
        DATE_TRUNC(${query.granularity}, created_at) as bucket,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      WHERE status = 'delivered' 
      AND created_at::date BETWEEN ${defaultFrom}::date AND ${defaultTo}::date
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    const bucketMap = new Map();

    for (const row of ordersTimeseries.rows) {
      const bucketKey = new Date(row.bucket as string).toISOString().split('T')[0];
      bucketMap.set(bucketKey, {
        bucketStart: bucketKey,
        orders: parseInt(row.orders as string),
        completedOrders: parseInt(row.completed_orders as string),
        revenue: 0
      });
    }

    for (const row of revenueTimeseries.rows) {
      const bucketKey = new Date(row.bucket as string).toISOString().split('T')[0];
      const existing = bucketMap.get(bucketKey);
      if (existing) {
        existing.revenue = parseFloat(row.revenue as string);
      } else {
        bucketMap.set(bucketKey, {
          bucketStart: bucketKey,
          orders: 0,
          completedOrders: 0,
          revenue: parseFloat(row.revenue as string)
        });
      }
    }

    const result = Array.from(bucketMap.values()).sort((a, b) =>
      new Date(a.bucketStart).getTime() - new Date(b.bucketStart).getTime()
    );

    res.json(result);
  } catch (error) {
    console.error('Analytics timeseries error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics timeseries' });
  }
});

router.get('/admin/analytics/active-orders', requireAdmin, async (req: any, res) => {
  try {
    const db = await getDB();

    const activeOrdersResult = await db.execute(sql`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM orders 
      WHERE status NOT IN ('delivered', 'cancelled')
      GROUP BY status
      ORDER BY count DESC
    `);

    let totalActiveOrders = 0;
    let totalActiveAmount = 0;
    const ordersByStatus: Record<string, { count: number; amount: number }> = {};

    for (const row of activeOrdersResult.rows) {
      const status = row.status as string;
      const count = parseInt(row.count as string);
      const amount = parseFloat(row.amount as string);
      ordersByStatus[status] = { count, amount };
      totalActiveOrders += count;
      totalActiveAmount += amount;
    }

    res.json({
      ordersByStatus,
      totalActiveOrders,
      totalActiveAmount: Math.round(totalActiveAmount * 100) / 100
    });
  } catch (error) {
    console.error('Analytics active orders error:', error);
    res.status(500).json({ message: 'Failed to fetch active orders analytics' });
  }
});

export default router;
