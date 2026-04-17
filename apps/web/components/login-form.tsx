"use client";

import { useSignIn } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldDescription, FieldGroup } from "@workspace/ui/components/field";
import { cn } from "@workspace/ui/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

const errorMessages: Record<string, string> = {
  OAuthSignin: "There was a problem starting the sign-in flow. Please try again.",
  OAuthCallback: "There was a problem completing sign-in. Please try again.",
  OAuthAccountNotLinked: "This email is already associated with a different sign-in method.",
  AccessDenied: "You don't have permission to sign in.",
  Configuration: "The authentication server is misconfigured. Contact your administrator.",
  Verification: "The sign-in link is no longer valid.",
  Default: "Something went wrong during sign-in. Please try again.",
};

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 23 23" aria-hidden="true">
      <title>Microsoft</title>
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

export function LoginForm({
  className,
  callbackUrl,
  error,
  ...props
}: React.ComponentProps<"div"> & { callbackUrl?: string; error?: string }) {
  const signIn = useSignIn();
  const [loading, setLoading] = useState(false);
  const errorMessage = error ? (errorMessages[error] ?? errorMessages.Default) : null;

  const handleSignIn = () => {
    setLoading(true);
    void signIn({ callbackUrl });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to eng-hub</CardTitle>
          <CardDescription>Use your work Microsoft account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-destructive text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}
            <Field>
              <Button
                type="button"
                variant="outline"
                onClick={handleSignIn}
                disabled={loading}
                className="h-11"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <MicrosoftLogo />}
                {loading ? "Redirecting…" : "Continue with Microsoft"}
              </Button>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By continuing you agree to your organization's acceptable use policy.
      </FieldDescription>
    </div>
  );
}
