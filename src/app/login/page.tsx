"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Kanban } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      // #region agent log
      console.log("[DEBUG-AUTH] signIn result:", JSON.stringify(result));
      // #endregion

      if (result?.error) {
        setError(`Auth error: ${result.error} | status: ${result.status} | url: ${result.url}`);
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(`Unexpected result: ${JSON.stringify(result)}`);
      }
    } catch (err: unknown) {
      setError(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <Input
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          autoFocus
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign in
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-2xl mb-4">
            <Kanban size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <Suspense
          fallback={
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center text-gray-400">
              Loading...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact your administrator for account access
        </p>
      </div>
    </div>
  );
}
