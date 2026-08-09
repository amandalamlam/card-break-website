-- Phase 8E: Add "shipped" status for admin fulfillment workflow
-- Run in Supabase SQL Editor after phase8_post_break_shipping.sql

alter type public.shipping_request_status add value if not exists 'shipped' after 'pending';
