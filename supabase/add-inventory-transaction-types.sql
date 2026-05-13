-- Compatibility helper for older Supabase projects that created transaction_type before waste/restock existed.
alter type transaction_type add value if not exists 'waste';
alter type transaction_type add value if not exists 'restock';
