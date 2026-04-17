import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing";

type RouteHandler = (req: Request) => Promise<Response>;

const handlers = createRouteHandler({ router: ourFileRouter });

export const GET = handlers.GET as unknown as RouteHandler;
export const POST = handlers.POST as unknown as RouteHandler;
