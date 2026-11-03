-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PICKUP', 'DELIVERY');

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "delivery_method" "DeliveryMethod" NOT NULL DEFAULT 'PICKUP',
  ADD COLUMN "delivery_distance_km" DECIMAL(10, 3),
  ADD COLUMN "customer_latitude" DECIMAL(10, 7),
  ADD COLUMN "customer_longitude" DECIMAL(10, 7);
