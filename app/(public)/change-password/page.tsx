import { requireUser } from "@/lib/auth/session";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  await requireUser();

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center py-10">
      <GlassPanel className="p-8">
        <h1 className="mb-1 text-lg font-semibold">Change your password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          For your account&apos;s security, please set a new password.
        </p>
        <ChangePasswordForm />
      </GlassPanel>
    </div>
  );
}
