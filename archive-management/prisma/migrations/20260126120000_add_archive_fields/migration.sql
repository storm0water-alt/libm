-- Alter table
ALTER TABLE "Archive" ADD COLUMN "archiveNo" TEXT,
ADD COLUMN "deptIssue" TEXT,
ADD COLUMN "responsible" TEXT,
ADD COLUMN "docNo" TEXT,
ADD COLUMN "remark" TEXT,
ADD COLUMN "year" INTEGER;

-- Create unique index
CREATE UNIQUE INDEX "Archive_archiveNo_key" ON "Archive"("archiveNo");

-- Create index
CREATE INDEX "Archive_year_idx" ON "Archive"("year");
