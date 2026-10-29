import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { isSignupAllowed } from "@/lib/env";
import { signUp } from "../actions";

export default async function SignupPage() {
  // Read ALLOW_SIGNUP per request rather than baking it in at build time
  await connection();
  if (!isSignupAllowed()) notFound();

  return (
    <AuthCard title="Create account">
      <AuthForm
        action={signUp}
        submitLabel="Create account"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
        ]}
        footer={
          <Link href="/login" className="hover:text-foreground">
            Already have an account? Sign in
          </Link>
        }
      />
    </AuthCard>
  );
}
