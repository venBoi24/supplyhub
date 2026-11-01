-- The demo marketplace settles in Tanzanian shillings so checkout can reach the TZS-only
-- LynxPay provider. Currency remains an explicit column; this only changes the default.
ALTER TABLE "products" ALTER COLUMN "currency" SET DEFAULT 'TZS';
