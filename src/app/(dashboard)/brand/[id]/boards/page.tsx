import { auth } from "@/lib/auth";
import { getBrandById } from "@/actions/brand";
import { getBoardTemplates } from "@/actions/board";
import { notFound } from "next/navigation";
import BrandDetail from "@/components/brand/BrandDetail";
import type { SessionUser } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BrandBoardsPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user as SessionUser;
  const brand = await getBrandById(id);

  if (!brand) notFound();

  const templates = await getBoardTemplates();
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return <BrandDetail brand={brand} templates={templates} isSuperAdmin={isSuperAdmin} currentUser={user} />;
}
