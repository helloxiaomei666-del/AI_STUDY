import { jsonOk, requireApiUser } from "@/lib/api";

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => jsonOk(user));
}
