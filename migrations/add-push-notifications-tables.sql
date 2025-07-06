-- Migration to add Push Notifications tables for remote server deployment
-- This migration adds tables required for the push notification system
-- Execute this on remote servers that don't have push notification tables

-- Create push_subscriptions table for storing user push notification subscriptions
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create marketing_notifications table for storing marketing notification history
CREATE TABLE IF NOT EXISTS "marketing_notifications" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "title_en" TEXT,
  "message_en" TEXT,
  "title_he" TEXT,
  "message_he" TEXT,
  "title_ar" TEXT,
  "message_ar" TEXT,
  "sent_count" INTEGER DEFAULT 0,
  "created_by" TEXT NOT NULL,
  "sent_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create unique index on push_subscriptions to prevent duplicate subscriptions per user+endpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_push_subscriptions_user_endpoint" 
ON "push_subscriptions" ("user_id", "endpoint");

-- Create index on marketing_notifications for better query performance
CREATE INDEX IF NOT EXISTS "idx_marketing_notifications_created_at" 
ON "marketing_notifications" ("created_at");

-- Verify tables were created successfully
SELECT 'Push notifications tables created successfully' AS status;

-- Check if tables exist and show their structure
\d push_subscriptions;
\d marketing_notifications;