#!/bin/bash
# 合并所有 migration SQL 文件为一个完整的离线迁移脚本

OUTPUT_FILE="init-schema.sql"
MIGRATIONS_DIR="prisma/migrations"

echo "-- ============================================================ --" > $OUTPUT_FILE
echo "-- Archive Management System - Database Schema (Offline)      --" >> $OUTPUT_FILE
echo "-- Generated: $(date)                                         --" >> $OUTPUT_FILE
echo "-- ============================================================ --" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# 按时间顺序合并所有 migration SQL
for dir in $(ls -1 $MIGRATIONS_DIR | grep -E "^[0-9]" | sort); do
    migration_file="$MIGRATIONS_DIR/$dir/migration.sql"
    if [ -f "$migration_file" ]; then
        echo "-- Migration: $dir" >> $OUTPUT_FILE
        echo "" >> $OUTPUT_FILE
        cat "$migration_file" >> $OUTPUT_FILE
        echo "" >> $OUTPUT_FILE
        echo "" >> $OUTPUT_FILE
    fi
done

echo "-- ============================================================ --" >> $OUTPUT_FILE
echo "-- Create indexes for better performance                        --" >> $OUTPUT_FILE
echo "-- ============================================================ --" >> $OUTPUT_FILE

# 添加性能优化索引
cat >> $OUTPUT_FILE << 'INDEXEOF'

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS "Archive_archiveNo_idx" ON "Archive"("archiveNo");
CREATE INDEX IF NOT EXISTS "Archive_fondsNo_idx" ON "Archive"("fondsNo");
CREATE INDEX IF NOT EXISTS "Archive_year_idx" ON "Archive"("year");
CREATE INDEX IF NOT EXISTS "Archive_title_idx" ON "Archive"("title");
CREATE INDEX IF NOT EXISTS "Archive_createdAt_idx" ON "Archive"("createdAt");

CREATE INDEX IF NOT EXISTS "OperationLog_userId_idx" ON "OperationLog"("userId");
CREATE INDEX IF NOT EXISTS "OperationLog_operation_idx" ON "OperationLog"("operation");
CREATE INDEX IF NOT EXISTS "OperationLog_time_idx" ON "OperationLog"("time");

CREATE INDEX IF NOT EXISTS "SystemConfig_configKey_idx" ON "SystemConfig"("configKey");
CREATE INDEX IF NOT EXISTS "SystemConfig_group_idx" ON "SystemConfig"("group");

INDEXEOF

echo "✅ Created $OUTPUT_FILE"
echo "File size: $(wc -c < $OUTPUT_FILE) bytes"
