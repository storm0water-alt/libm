-- ============================================================ --
-- Update: 为 Archive 表增加"密级"字段                           --
-- Date: 2026-04-01                                              --
-- Description: 新增 classificationLevel 字段，用于档案密级管理   --
-- Usage: toolkit.bat db-update init-data\updates\update-2026-04-01-add-classificationLevel.sql
-- ============================================================ --

-- 幂等：如果字段已存在则跳过
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Archive' AND column_name = 'classificationLevel'
    ) THEN
        ALTER TABLE "Archive" ADD COLUMN "classificationLevel" TEXT NOT NULL DEFAULT '';
        RAISE NOTICE '已添加 classificationLevel 字段';
    ELSE
        RAISE NOTICE 'classificationLevel 字段已存在，跳过';
    END IF;
END
$$;
