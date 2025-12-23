-- AlterTable: Add snapshot fields to OrderItem
-- These fields store the exact state at time of order creation

-- Add discountPercent field (snapshot of discount at time of order)
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER;

-- Add finalPrice field (snapshot of final price: unitPrice * quantity)
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "finalPrice" INTEGER;

-- Update existing OrderItems to calculate finalPrice from unitPrice * quantity
-- Set discountPercent to 0 for existing items (we don't have historical discount data)
UPDATE "OrderItem" 
SET 
  "finalPrice" = "unitPrice" * "quantity",
  "discountPercent" = 0
WHERE "finalPrice" IS NULL;

-- Make finalPrice NOT NULL after backfilling
ALTER TABLE "OrderItem" ALTER COLUMN "finalPrice" SET NOT NULL;

