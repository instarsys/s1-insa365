-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "check_in_distance" INTEGER,
ADD COLUMN     "check_in_location_name" TEXT,
ADD COLUMN     "check_out_distance" INTEGER,
ADD COLUMN     "check_out_location_name" TEXT,
ADD COLUMN     "is_out_of_range" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "gps_enforcement_mode" TEXT NOT NULL DEFAULT 'OFF';

-- AlterTable
ALTER TABLE "work_locations" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
