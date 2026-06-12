import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/next-auth";
import { getPrimaryOrganizationForUser } from "@/lib/organizations";

type SessionUser = { user?: { id?: string; role?: string } };

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ href: "/investor" });
  }

  if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
    return NextResponse.json({ href: "/admin" });
  }

  const organization = await getPrimaryOrganizationForUser(userId);
  return NextResponse.json({ href: organization ? "/company" : "/investor" });
}
