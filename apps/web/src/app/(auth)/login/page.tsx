import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { isSignupAllowed } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { signIn } from "../actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <AuthCard title="Sign in">
      <AuthForm
        action={signIn}
        submitLabel="Sign in"
        hidden={{ next: safeNextPath(next) }}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
        footer={
          <div className="flex flex-col gap-2">
            <Link href="/forgot-password" className="hover:text-foreground">
              Forgot password?
            </Link>
            {isSignupAllowed() && (
              <Link href="/signup" className="hover:text-foreground">
                Create account
              </Link>
            )}
          </div>
        }
      />
    </AuthCard>
  );
}
