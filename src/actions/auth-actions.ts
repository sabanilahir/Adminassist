"use server";

import { prisma } from "@/lib/prisma";
import { registerSchema, loginSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const result = registerSchema.safeParse({
    name,
    email,
    password,
    confirmPassword,
  });

  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return {
      error: "User with this email already exists",
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "USER",
    },
  });

  return { success: true };
}

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const result = loginSchema.safeParse({ email, password });

  if (!result.success) {
    return {
      error: result.error.errors[0].message,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Credentials")) {
      return {
        error: "Invalid email or password",
      };
    }
    throw error;
  }
}