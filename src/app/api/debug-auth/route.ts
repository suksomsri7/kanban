import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check env vars
  results.hasAuthSecret = !!process.env.AUTH_SECRET;
  results.hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
  results.authUrl = process.env.AUTH_URL || "(not set)";
  results.nextAuthUrl = process.env.NEXTAUTH_URL || "(not set)";
  results.hasDatabaseUrl = !!process.env.DATABASE_URL;
  results.nodeEnv = process.env.NODE_ENV;

  // 2. Check DB connection & user lookup
  try {
    const userCount = await prisma.user.count();
    results.dbConnected = true;
    results.userCount = userCount;

    const admin = await prisma.user.findUnique({
      where: { username: "admin" },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (admin) {
      results.adminFound = true;
      results.adminIsActive = admin.isActive;
      results.adminRole = admin.role;
      results.adminHashLength = admin.passwordHash.length;
      results.adminHashPrefix = admin.passwordHash.substring(0, 7);

      // 3. Verify password
      const isValid = await verifyPassword("admin123", admin.passwordHash);
      results.passwordValid = isValid;
    } else {
      results.adminFound = false;
    }
  } catch (err: unknown) {
    results.dbConnected = false;
    results.dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results);
}
