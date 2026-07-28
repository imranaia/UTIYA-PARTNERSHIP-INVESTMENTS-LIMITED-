import { Logo } from "@/components/brand/Logo";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="app-backdrop flex min-h-screen items-center justify-center p-6">
      <GlassPanel strong className="w-full max-w-sm p-8">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center text-lg font-semibold">Sign in</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Daily Investment Operations System
        </p>
        <LoginForm next={next ?? "/dashboard"} />
      </GlassPanel>
    </div>
  );
}
