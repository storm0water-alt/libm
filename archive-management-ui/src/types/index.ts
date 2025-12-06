// 用户相关类型
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  avatar?: string;
  password?: string; // 编辑时的密码字段
  createdAt: string;
  status: 'active' | 'disabled';
}

// 登录表单类型
export interface LoginForm {
  username: string;
  password: string;
  captcha?: string;
  remember: boolean;
}

// 档案相关类型
export interface Archive {
  id: string;
  archiveId: string; // 档号
  fondsNumber: string; // 全宗号
  retentionPeriod: string; // 保管期限
  retentionPeriodCode: string; // 保管期限代码
  year: string; // 年度
  organizationIssueCode: string; // 机构问题代码
  boxNumber: string; // 盒号
  itemNumber: string; // 件号
  title: string; // 题名
  organizationIssue: string; // 机构问题
  responsiblePerson: string; // 责任者
  documentNumber: string; // 文号
  date: string; // 日期
  pageNumber: string; // 页号
  remarks: string; // 备注
  // 保持原有系统字段
  fileName?: string; // 文件名
  fileSize?: number; // 文件大小（字节）
  storageLocation?: string; // 存储位置
  fileType?: string; // 文件类型
  status?: 'active' | 'archived' | 'deleted';
  description?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 搜索表单类型
export interface SearchForm {
  archiveId?: string; // 档号
  fondsNumber?: string; // 全宗号
  retentionPeriod?: string; // 保管期限
  retentionPeriodCode?: string; // 保管期限代码
  year?: string; // 年度
  organizationIssueCode?: string; // 机构问题代码
  boxNumber?: string; // 盒号
  itemNumber?: string; // 件号
  title?: string; // 题名
  organizationIssue?: string; // 机构问题
  responsiblePerson?: string; // 责任者
  documentNumber?: string; // 文号
  date?: string; // 日期
  dateRange?: [string, string];
  pageNumber?: string; // 页号
  remarks?: string; // 备注
  // 保持原有系统字段
  fileName?: string;
  minSize?: number;
  maxSize?: number;
  storageLocation?: string;
  fileType?: string;
  status?: string;
  keyword?: string; // 全局搜索关键词
}

// 分页类型
export interface Pagination {
  page: number;
  size: number;
  total: number;
}

// 操作日志类型
export interface OperationLog {
  id: string;
  operator: string;
  operatorName: string;
  operationType: 'create' | 'update' | 'delete' | 'download' | 'import' | 'export';
  targetId: string;
  targetName: string;
  description?: string;
  ip: string;
  userAgent?: string;
  createdAt: string;
}

// 入库记录类型
export interface ImportRecord {
  id: string;
  fileName: string;
  originalPath: string;
  targetPath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  fileSize: number;
  processedSize: number;
  error?: string;
  operator: string;
  createdAt: string;
  completedAt?: string;
}

// 文件信息类型
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  modifiedAt: string;
  isSelected: boolean;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  code: number;
}

// 列表响应类型
export interface ListResponse<T> {
  list: T[];
  pagination: Pagination;
}

// 统计数据类型
export interface StatData {
  title: string;
  value: number | string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: number;
}

// 菜单项类型
export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  path: string;
  children?: MenuItem[];
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

// 表格列配置类型
export interface TableColumn {
  prop: string;
  label: string;
  width?: number | string;
  minWidth?: number | string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  formatter?: (row: any, column: any, cellValue: any) => string;
}

// 搜索条件配置类型
export interface SearchCondition {
  field: string;
  label: string;
  type: 'input' | 'select' | 'daterange' | 'number' | string;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
}

// 批量操作类型
export interface BatchOperation {
  key: string;
  label: string;
  icon: string;
  type: 'primary' | 'success' | 'warning' | 'danger';
  action: (selectedRows: any[]) => Promise<void>;
  confirm?: boolean;
  confirmMessage?: string;
}

// 主题配置类型
export interface ThemeConfig {
  primaryColor: string;
  darkMode: boolean;
  compactMode: boolean;
}

// 搜索查询类型（全局搜索）
export interface SearchQuery {
  keyword: string;
  filters?: SearchFilters;
  pagination?: PaginationConfig;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 搜索结果类型
export interface SearchResult {
  id: string;
  archiveId: string;
  fileName: string;
  content?: string; // 搜索匹配的内容片段
  highlight?: string; // 高亮显示的文本
  relevanceScore: number; // 相关性评分
  fileType: string;
  createDate: string;
  fileSize: number;
  storageLocation: string;
  description?: string;
  tags?: string[];
}

// 搜索响应类型
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  pagination: PaginationInfo;
  searchTime: number; // 搜索耗时（毫秒）
  suggestions?: string[]; // 搜索建议
}

// 搜索过滤器类型
export interface SearchFilters {
  fileType?: string[];
  dateRange?: [string, string];
  storageLocation?: string[];
  tags?: string[];
  status?: ('active' | 'archived')[];
  sizeRange?: [number, number];
}

// 分页配置类型
export interface PaginationConfig {
  page: number;
  size: number;
}

// 分页信息类型
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// 搜索状态类型
export interface SearchState {
  query: SearchQuery;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  searchTime: number;
  totalResults: number;
  currentPage: number;
  pageSize: number;
}

// 搜索历史记录类型
export interface SearchHistory {
  id: string;
  keyword: string;
  timestamp: string;
  resultCount: number;
}

// 搜索建议类型
export interface SearchSuggestion {
  text: string;
  type: 'keyword' | 'filename' | 'archiveId';
  highlight?: string;
}

// 应用状态类型
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  theme: ThemeConfig;
  sidebarCollapsed: boolean;
  loading: boolean;
}