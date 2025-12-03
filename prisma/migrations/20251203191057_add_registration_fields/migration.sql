-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptedDeclaration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelation" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "medicalConditions" TEXT,
ADD COLUMN     "medications" TEXT;
