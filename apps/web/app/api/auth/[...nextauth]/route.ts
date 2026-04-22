import { handlers } from "@workspace/auth/entra-config";

export const GET: (typeof handlers)["GET"] = handlers.GET;
export const POST: (typeof handlers)["POST"] = handlers.POST;
