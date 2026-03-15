import { requireSuperAdmin } from "@/lib/auth-utils";
import { getApiKeys, getActiveUsersForApiKey } from "@/actions/api-key";
import ApiKeyManagement from "@/components/admin/ApiKeyManagement";

export default async function ApiKeysPage() {
  // #region agent log — Hypothesis A/D/E: page entry
  console.error('[DEBUG-fcb7c3] ApiKeysPage: entering');
  fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fcb7c3'},body:JSON.stringify({sessionId:'fcb7c3',location:'admin/api-keys/page.tsx:6',message:'ApiKeysPage entering',data:{},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  try {
    await requireSuperAdmin();
    // #region agent log — Hypothesis D: auth check passed
    console.error('[DEBUG-fcb7c3] ApiKeysPage: requireSuperAdmin passed');
    fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fcb7c3'},body:JSON.stringify({sessionId:'fcb7c3',location:'admin/api-keys/page.tsx:12',message:'requireSuperAdmin passed',data:{},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  } catch (e: unknown) {
    // #region agent log — Hypothesis D: auth failed
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error('[DEBUG-fcb7c3] ApiKeysPage: requireSuperAdmin FAILED:', errMsg, e);
    fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fcb7c3'},body:JSON.stringify({sessionId:'fcb7c3',location:'admin/api-keys/page.tsx:18',message:'requireSuperAdmin FAILED',data:{error:errMsg},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    throw e;
  }

  let apiKeys: Awaited<ReturnType<typeof getApiKeys>>;
  let users: Awaited<ReturnType<typeof getActiveUsersForApiKey>>;

  try {
    [apiKeys, users] = await Promise.all([
      getApiKeys(),
      getActiveUsersForApiKey(),
    ]);
    // #region agent log — Hypothesis A/C: data fetched ok
    console.error('[DEBUG-fcb7c3] ApiKeysPage: data fetched, apiKeys:', apiKeys.length, 'users:', users.length);
    fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fcb7c3'},body:JSON.stringify({sessionId:'fcb7c3',location:'admin/api-keys/page.tsx:32',message:'data fetched OK',data:{apiKeysCount:apiKeys.length,usersCount:users.length},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (e: unknown) {
    // #region agent log — Hypothesis A/C: data fetch FAILED
    const errMsg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    const errStack = e instanceof Error ? e.stack : undefined;
    console.error('[DEBUG-fcb7c3] ApiKeysPage: DATA FETCH FAILED:', errMsg);
    console.error('[DEBUG-fcb7c3] Stack:', errStack);
    fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fcb7c3'},body:JSON.stringify({sessionId:'fcb7c3',location:'admin/api-keys/page.tsx:39',message:'DATA FETCH FAILED',data:{error:errMsg,stack:errStack},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw e;
  }

  // #region agent log — Hypothesis E: about to render
  try {
    console.error('[DEBUG-fcb7c3] ApiKeysPage: rendering with data, first key sample:', JSON.stringify(apiKeys[0] ?? 'empty'));
    fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fcb7c3'},body:JSON.stringify({sessionId:'fcb7c3',location:'admin/api-keys/page.tsx:48',message:'rendering',data:{firstKey:apiKeys[0]??null,firstUser:users[0]??null},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
  } catch {}
  // #endregion

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
