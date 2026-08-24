import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

// Augment NextAuth's types so `role` and `id` are typed on session/token
// everywhere we use `auth()` or `useSession()`.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

// next-auth/jwt re-exports from @auth/core/jwt; augment the original module
// so declaration merging actually applies.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
