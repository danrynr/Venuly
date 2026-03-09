import { Request, Response, NextFunction } from "express";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { method, url } = req;
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const duration = Date.now() - new Date(timestamp).getTime();
    const { statusCode } = res;
    console.log(
      `[${timestamp}] ${method} ${url} ${statusCode} - ${duration}ms`,
    );
  });
  next();
};
