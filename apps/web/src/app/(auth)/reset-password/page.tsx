import { updatePassword } from "../actions";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";

/** Reached from the emailed reset link via /auth/confirm, which signs the user in first. */
export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password">
      <AuthForm
        action={updatePassword}
        submitLabel="Update password"
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
          { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthCard>
  );
}
