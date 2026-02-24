INSERT INTO users (id, username, password, role, status, created_at, updated_at)
VALUES (
    'admin_001',
    'admin',
    '$2b$12$ZPQFQsK1ECCdv5K6NTqYGHrFOFsWdLx/Jqg',
    'admin',
    'enabled',
    NOW(),
    NOW()
) ON CONFLICT (username) DO NOTHING;

INSERT INTO system_configs (id, config_key, config_value, config_type, description, "group", is_system, created_at, updated_at)
VALUES
(gen_random_uuid(), 'system.initialized', 'true', 'boolean', '系统是否已初始化', 'system', true, NOW(), NOW()),
(gen_random_uuid(), 'system.version', '1.0.0', 'string', '系统版本号', 'system', true, NOW(), NOW()),
(gen_random_uuid(), 'system.admin.created', 'true', 'boolean', '管理员账户已创建', 'system', true, NOW(), NOW());

INSERT INTO archives (archiveID, archiveNo, fondsNo, retentionPeriod, retentionCode, year, deptCode, boxNo, pieceNo, title, deptIssue, responsible, docNo, date, pageNo, remark, fileUrl, createdAt, updatedAt)
VALUES
('demo_001', 'DEMO-2024-001', '001', '永久', 'Y', '2024', '001', '001', '001', '演示档案 - 年度工作总结', '办公室', '系统管理员', '文号〔2024〕1号', '2024-12-31', '1-10', '重要演示档案', '/demo/archives/2024-summary.pdf', NOW(), NOW()),
('demo_002', 'DEMO-2024-002', '001', '长期', 'C', '2024', '002', '002', '002', '演示档案 - 财务制度', '财务部', '财务主管', '文号〔2024〕15号', '2024-06-15', '11-25', '财务相关制度文件', '/demo/archives/finance-rules.pdf', NOW(), NOW());

INSERT INTO operation_logs (id, operator, operation, target, ip, time, archiveId, action, entityType, entityId, description, metadata, created_at, userId)
VALUES (gen_random_uuid(), 'system', 'system_init', 'database', 'localhost', NOW(), NULL, 'initialize', 'system_config', 'system_configs', '系统初始化', '{"initialized": true, "version": "1.0.0"}'::jsonb, (SELECT id FROM users WHERE username = 'admin' LIMIT 1), NOW());

DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成！';
    RAISE NOTICE '管理员账户: admin / admin123';
    RAISE NOTICE '测试档案数据已创建';
END
$$;
