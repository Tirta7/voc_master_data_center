UPDATE tables SET status = 'AVAILABLE', active_transaction_id = NULL, start_time = NULL, end_time = NULL, duration = NULL, order_id = NULL;
UPDATE transactions SET status = 'COMPLETED', is_active = false WHERE status = 'ACTIVE' OR is_active = true;
