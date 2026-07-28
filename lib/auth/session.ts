import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { users, roles, rolePermissions, modules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export type SessionData = {
  userId: number;
  username: string;
  fullName: string;
  roleId: number;
  roleKey: string;
  branchId: number | null;
  tokenVersion: number;
};

declare module "iron-session" {
  interface IronSessionData {
    user?: SessionData;
  }
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be set and at least 32 characters long");
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "utiya_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<{ user?: SessionData }>> {
  const cookieStore = await cookies();
  return getIronSession<{ user?: SessionData }>(cookieStore, sessionOptions);
}

// Server Components/layouts: returns the session user or null (no redirect).
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  return session.user ?? null;
}

// Server Components/pages: redirects to /login if unauthenticated.
export async function requireUser(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Re-checks the DB (not just the cookie) so a password reset / deactivation
// takes effect immediately instead of waiting for the cookie to expire.
export async function requireActiveUser(): Promise<SessionData> {
  const sessionUser = await requireUser();
  const db = getDb();
  const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.userId));

  if (!dbUser || !dbUser.isActive || dbUser.tokenVersion !== sessionUser.tokenVersion) {
    const session = await getSession();
    session.destroy();
    redirect("/login");
  }

  if (dbUser.mustChangePassword) {
    redirect("/change-password");
  }

  return sessionUser;
}

export type ModuleAction = "view" | "create" | "edit" | "delete";

// Non-throwing permission lookup — use this in Server Components when you need
// to know *which* actions to render (e.g. hide the "Save" button), not just
// whether the page itself is accessible.
export async function getModulePermission(moduleKey: string) {
  const user = await requireActiveUser();
  const db = getDb();

  const [perm] = await db
    .select({
      canView: rolePermissions.canView,
      canCreate: rolePermissions.canCreate,
      canEdit: rolePermissions.canEdit,
      canDelete: rolePermissions.canDelete,
    })
    .from(rolePermissions)
    .innerJoin(modules, eq(modules.id, rolePermissions.moduleId))
    .where(and(eq(rolePermissions.roleId, user.roleId), eq(modules.key, moduleKey)));

  return {
    user,
    canView: perm?.canView ?? false,
    canCreate: perm?.canCreate ?? false,
    canEdit: perm?.canEdit ?? false,
    canDelete: perm?.canDelete ?? false,
  };
}

// Server Actions/route handlers: throws if the user's role lacks the given
// permission on the given module. Always call this in mutating actions —
// the sidebar hiding a link is not itself an access control mechanism.
export async function requireModule(moduleKey: string, action: ModuleAction = "view") {
  const { user, canView, canCreate, canEdit, canDelete } = await getModulePermission(moduleKey);
  const allowed = { view: canView, create: canCreate, edit: canEdit, delete: canDelete }[action];

  if (!allowed) {
    throw new Error(`Not authorized: role lacks '${action}' on module '${moduleKey}'`);
  }

  return user;
}

export async function getSidebarModules(roleId: number) {
  const db = getDb();
  return db
    .select({
      key: modules.key,
      label: modules.label,
      icon: modules.icon,
      routePrefix: modules.routePrefix,
    })
    .from(rolePermissions)
    .innerJoin(modules, eq(modules.id, rolePermissions.moduleId))
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.canView, true)))
    .orderBy(modules.sortOrder);
}

export async function getRoleByKey(roleKey: string) {
  const db = getDb();
  const [role] = await db.select().from(roles).where(eq(roles.key, roleKey));
  return role;
}
