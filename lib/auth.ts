import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Повертає поточного користувача або null якщо не залогінений.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Вимагає автентифікацію. Якщо не залогінений — редіректить на /login.
 * Інакше повертає об'єкт користувача.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}
