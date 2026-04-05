import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { responseFormatter } from "./responseFormatter";

// Augment the Request type to include a 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        roles: string[];
      };
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    const response = responseFormatter({
      code: 401,
      status: "error",
      message: "Authentication token required.",
    });
    return res.status(401).send(response);
  }

  const decodedUser = verifyAccessToken(token);

  if (!decodedUser) {
    const response = responseFormatter({
      code: 403,
      status: "error",
      message: "Invalid or expired authentication token.",
    });
    return res.status(403).send(response);
  }

  console.log("Decoded user from token:", decodedUser);
  req.user = { 
    userId: decodedUser.userId,
    roles: decodedUser.roles
  };
  next();
};

export const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roles.some((role) => roles.includes(role))) {
      return res.status(403).send(
        responseFormatter({
          code: 403,
          status: "error",
          message: "Forbidden: Access denied.",
        }),
      );
    }
    next();
  };
};
