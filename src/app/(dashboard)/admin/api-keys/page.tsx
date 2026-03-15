import { requireSuperAdmin } from "@/lib/auth-utils";
import { getApiKeys, getActiveUsersForApiKey } from "@/actions/api-key";
import ApiKeyManagement from "@/components/admin/ApiKeyManagement";

export default async function ApiKeysPage() {
  await requireSuperAdmin();

  const [apiKeys, users] = await Promise.all([
    getApiKeys(),
    getActiveUsersForApiKey(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <p className="text-gray-500 mt-1">
          Manage API keys for external integrations (n8n, Zapier, Make, custom scripts)
        </p>
      </div>
      <ApiKeyManagement initialKeys={apiKeys} users={users} />
    </div>
  );
}
