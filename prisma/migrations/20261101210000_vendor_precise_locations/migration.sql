ALTER TABLE "vendors"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "street" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "latitude" DECIMAL(10, 7),
  ADD COLUMN "longitude" DECIMAL(10, 7);
