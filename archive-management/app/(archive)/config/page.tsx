import { queryConfigsAction, getConfigGroupsAction } from "./actions";
import { ConfigManagementClient } from "./config-management-client";

interface ConfigPageProps {
  searchParams: Promise<{
    group?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ConfigPage({ searchParams }: ConfigPageProps) {
  // Parse query parameters
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const group = params.group;
  const search = params.search;

  // Fetch initial data on the server
  const [configsResult, groupsResult] = await Promise.all([
    queryConfigsAction({
      page,
      pageSize: 20,
      group,
      search,
    }),
    getConfigGroupsAction(),
  ]);

  const configs = configsResult.success ? configsResult.data : null;
  const groups = groupsResult.success ? groupsResult.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统配置</h1>
          <p className="text-sm text-gray-600 mt-1">
            {configs ? `共 ${configs.total} 条配置` : "加载中..."}
          </p>
        </div>
      </div>

      {/* Client Component for interactivity */}
      <ConfigManagementClient
        initialConfigs={configs}
        initialGroups={groups}
        initialPage={page}
        initialGroup={group}
        initialSearch={search}
      />
    </div>
  );
}
