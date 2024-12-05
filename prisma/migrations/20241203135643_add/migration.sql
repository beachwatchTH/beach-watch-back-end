/*
  Warnings:

  - Added the required column `nameEng` to the `Beach` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Beach" ADD COLUMN     "nameEng" VARCHAR(255) NOT NULL;
