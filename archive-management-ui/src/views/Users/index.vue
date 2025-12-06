<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import SearchableTable from '@/components/common/SearchableTable.vue'
import type { User, TableColumn, SearchCondition } from '@/types'

// 响应式数据
const tableRef = ref()
const editFormRef = ref<FormInstance>()
const loading = ref(false)
const users = ref<User[]>([])
const selectedUsers = ref<User[]>([])

// 搜索表单
let searchForm = reactive({
  username: '',
  role: '',
  status: ''
})

// 分页数据
let pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 编辑弹窗控制
const editDialogVisible = ref(false)
const currentEditUser = ref<User | null>(null)

// 编辑表单数据（处理 null 值）
const editFormData = computed(() => {
  if (!currentEditUser.value) {
    return {
      username: '',
      role: 'user',
      password: '',
      status: 'active'
    }
  }
  return currentEditUser.value
})

// 搜索条件配置
const searchConditions: SearchCondition[] = [
  {
    field: 'username',
    label: '用户名',
    type: 'input',
    placeholder: '请输入用户名'
  },
  {
    field: 'role',
    label: '角色',
    type: 'select',
    placeholder: '请选择角色',
    options: [
      { label: '管理员', value: 'admin' },
      { label: '普通用户', value: 'user' }
    ]
  },
  {
    field: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '正常', value: 'active' },
      { label: '已禁用', value: 'disabled' }
    ]
  }
]

// 表格列配置
const tableColumns: TableColumn[] = [
  {
    prop: 'username',
    label: '用户名',
    width: 120,
    sortable: true
  },
  {
    prop: 'role',
    label: '角色',
    width: 100,
    sortable: true,
    formatter: (row) => row.role === 'admin' ? '管理员' : '普通用户'
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    sortable: true,
    formatter: (row) => row.status === 'active' ? '正常' : '已禁用'
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 160,
    sortable: true,
    formatter: (row) => new Date(row.createdAt).toLocaleString()
  }
]

// 加载用户数据
const loadUsers = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))

    // 生成模拟数据
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        role: 'admin',
        avatar: '',
        createdAt: '2024-01-01T00:00:00',
        status: 'active'
      },
      {
        id: '2',
        username: 'user1',
        role: 'user',
        avatar: '',
        createdAt: '2024-01-02T00:00:00',
        status: 'active'
      },
      {
        id: '3',
        username: 'user2',
        role: 'user',
        avatar: '',
        createdAt: '2024-01-03T00:00:00',
        status: 'active'
      },
      {
        id: '4',
        username: 'user3',
        role: 'user',
        avatar: '',
        createdAt: '2024-01-04T00:00:00',
        status: 'disabled'
      },
      {
        id: '5',
        username: 'manager',
        role: 'admin',
        avatar: '',
        createdAt: '2024-01-05T00:00:00',
        status: 'active'
      }
    ]

    // 应用搜索过滤
    let filteredUsers = mockUsers.filter(user => {
      if (searchForm.username && !user.username.includes(searchForm.username)) {
        return false
      }
      if (searchForm.role && user.role !== searchForm.role) {
        return false
      }
      if (searchForm.status && user.status !== searchForm.status) {
        return false
      }
      return true
    })

    // 分页
    const start = (pagination.page - 1) * pagination.size
    const end = start + pagination.size
    users.value = filteredUsers.slice(start, end)
    pagination.total = filteredUsers.length
  } catch (error) {
    console.error('加载用户数据失败:', error)
    ElMessage.error('加载用户数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索表单更新处理
const handleSearchFormUpdate = (newForm: any) => {
  Object.assign(searchForm, newForm)
}

// 分页更新处理
const handlePaginationUpdate = (newPagination: any) => {
  Object.assign(pagination, newPagination)
}

// 搜索处理
const handleSearch = () => {
  pagination.page = 1
  loadUsers()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    username: '',
    role: '',
    status: ''
  })
  handleSearch()
}

// 选择变化处理
const handleSelectionChange = (selection: User[]) => {
  selectedUsers.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  loadUsers()
}

// 当前页变化
const handleCurrentChange = (current: number) => {
  pagination.page = current
  loadUsers()
}

// 排序变化
const handleSortChange = (sort: { column: any; prop: string; order: string }) => {
  console.log('排序变化:', sort)
  loadUsers()
}

// 新增用户
const handleAdd = () => {
  currentEditUser.value = null
  editDialogVisible.value = true
}

// 编辑用户
const handleEdit = (user: User) => {
  currentEditUser.value = { ...user }
  editDialogVisible.value = true
}

// 删除用户
const handleDelete = async (user: User) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户"${user.username}"吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟删除API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success('删除成功')
    loadUsers()
  } catch {
    // 用户取消
  }
}

// 切换用户状态
const toggleUserStatus = async (user: User) => {
  try {
    const newStatus = user.status === 'active' ? 'disabled' : 'active'
    const action = newStatus === 'active' ? '启用' : '禁用'

    await ElMessageBox.confirm(
      `确定要${action}用户"${user.username}"吗？`,
      `${action}确认`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟状态切换API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success(`${action}成功`)
    loadUsers()
  } catch {
    // 用户取消
  }
}

// 重置密码
const handleResetPassword = async (user: User) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户"${user.username}"的密码吗？`,
      '重置密码确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟重置密码API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success('密码重置成功，新密码为：123456')
  } catch {
    // 用户取消
  }
}

// 保存用户表单
const saveUser = async (form: FormInstance | undefined) => {
  if (!form) return

  try {
    const valid = await form.validate()
    if (!valid) return

    // 模拟保存API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success(currentEditUser.value ? '更新成功' : '新增成功')
    editDialogVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('保存失败:', error)
  }
}

// 编辑表单验证规则
const editFormRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: !currentEditUser.value, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

// 页面初始化
onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div class="users-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增用户
      </el-button>
    </div>

    <!-- 搜索和表格 -->
    <SearchableTable
      ref="tableRef"
      :data="users"
      :loading="loading"
      :columns="tableColumns"
      :search-conditions="searchConditions"
      :search-form="searchForm"
      :pagination="pagination"
      :show-selection="true"
      :batch-operations="[]"
      @update:search-form="handleSearchFormUpdate"
      @update:pagination="handlePaginationUpdate"
      @search="handleSearch"
      @reset="handleReset"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <!-- 角色列 -->
      <template #role="{ row }">
        <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
          {{ row.role === 'admin' ? '管理员' : '普通用户' }}
        </el-tag>
      </template>

      <!-- 状态列 -->
      <template #status="{ row }">
        <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
          {{ row.status === 'active' ? '正常' : '已禁用' }}
        </el-tag>
      </template>

      <!-- 操作列 -->
      <el-table-column label="操作" width="240" align="center" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button
              type="primary"
              size="small"
              text
              @click="handleEdit(row)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              :type="row.status === 'active' ? 'warning' : 'success'"
              size="small"
              text
              @click="toggleUserStatus(row)"
            >
              <el-icon>
                <SwitchButton v-if="row.status === 'active'" />
                <Open v-else />
              </el-icon>
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button
              type="info"
              size="small"
              text
              @click="handleResetPassword(row)"
            >
              <el-icon><Key /></el-icon>
              重置密码
            </el-button>
            <el-button
              type="danger"
              size="small"
              text
              @click="handleDelete(row)"
              :disabled="row.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </SearchableTable>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="currentEditUser ? '编辑用户' : '新增用户'"
      width="500px"
      @close="currentEditUser = null"
    >
      <el-form
        ref="editFormRef"
        :model="currentEditUser || {}"
        :rules="editFormRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="editFormData.username"
            placeholder="请输入用户名"
            :disabled="!!currentEditUser"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="editFormData.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
          <div v-if="!currentEditUser" class="form-tip">
            密码长度至少6位，建议包含字母、数字和特殊字符
          </div>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="editFormData.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editFormData.status">
            <el-radio label="active">正常</el-radio>
            <el-radio label="disabled">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser(editFormRef)">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-management {
  padding: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
}

.table-actions .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

.form-tip {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .table-actions {
    flex-direction: column;
    gap: 4px;
  }

  .table-actions .el-button {
    width: 100%;
    justify-content: flex-start;
  }
}

/* 紧凑模式适配 */
.compact .page-header {
  margin-bottom: 16px;
}
</style>