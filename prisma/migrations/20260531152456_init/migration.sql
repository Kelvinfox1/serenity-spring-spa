-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "bookings" (
    "id" SERIAL NOT NULL,
    "reference_id" TEXT NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "experience" VARCHAR(100) NOT NULL,
    "booking_date" DATE NOT NULL,
    "booking_time" VARCHAR(10) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "therapist_preference" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_reference_id_key" ON "bookings"("reference_id");
