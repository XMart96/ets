import { REDIRECT_URL, supabase } from "@/lib/supabase";
import { ApiError } from "./errors";

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Signs in. Throws ApiError with code "email_not_confirmed" (a fresh
 * confirmation link is sent) when the email was never confirmed.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: REDIRECT_URL },
      });
    }
    throw new ApiError(error.message, error.code);
  }
  return data.user;
}

export type SignUpResult = "signed_in" | "confirm_email" | "already_registered";

export async function signUp(
  email: string,
  password: string,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: REDIRECT_URL },
  });
  if (error) throw new ApiError(error.message, error.code);

  // For an already registered email Supabase returns no error but a user
  // without identities, and sends no email.
  if (data.user && data.user.identities?.length === 0) {
    return "already_registered";
  }
  // "Confirm email" off: signed in right away
  return data.session ? "signed_in" : "confirm_email";
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: REDIRECT_URL },
  });
  if (error) throw new ApiError(error.message, error.code);
}

/** Checks the current password, then sets the new one. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) throw new ApiError("not_authenticated");

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (checkError) throw new ApiError("wrong_current_password");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new ApiError(error.message, error.code);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new ApiError(error.message, error.code);
}
