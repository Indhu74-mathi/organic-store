-- AlterEnum: Update OrderStatus enum to include new payment lifecycle states
-- Note: PostgreSQL requires enum values to be committed before use
-- We'll add them one by one, then update data in a separate step

-- Step 1: Add all new enum values (each in its own implicit transaction)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ORDER_CREATED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_SUCCESS';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ORDER_CONFIRMED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

-- Step 2: Update existing orders (this happens after enum values are committed)
-- Convert old statuses to new ones
UPDATE "Order" SET "status" = 'PAYMENT_PENDING'::"OrderStatus" WHERE "status"::text = 'PENDING';
UPDATE "Order" SET "status" = 'ORDER_CONFIRMED'::"OrderStatus" WHERE "status"::text = 'PAID';

-- Step 3: Change default value for new orders
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'ORDER_CREATED'::"OrderStatus";

-- Note: We cannot remove old enum values (PENDING, PAID) in PostgreSQL
-- They will remain in the enum but won't be used by new code

