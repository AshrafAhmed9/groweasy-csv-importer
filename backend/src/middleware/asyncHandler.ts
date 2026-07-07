import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Express 4 doesn't catch rejected promises from async route handlers; this forwards them to errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
