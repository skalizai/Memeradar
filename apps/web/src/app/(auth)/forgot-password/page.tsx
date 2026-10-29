import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset password">
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
        footer={
          <Link href="/login" className="hover:text-foreground">
            Back to sign in
          </Link>
        }
      />
    </AuthCard>
  );
}
