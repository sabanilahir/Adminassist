import { Role, UserType } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      userType: UserType;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    userType: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    userType: UserType;
  }
}