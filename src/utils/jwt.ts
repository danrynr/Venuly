import jwt from "jsonwebtoken";

// Ensure JWT secrets are loaded from environment variables
const JWT_ACCESS_SECRET: string = process.env.JWT_ACCESS_SECRET!;
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET!;
const JWT_ACCESS_EXPIRATION: string = process.env.JWT_ACCESS_EXPIRATION!;
const JWT_REFRESH_EXPIRATION: string = process.env.JWT_REFRESH_EXPIRATION!;

const alg = "HS256"; // HMAC SHA-256 algorithm for signing tokens

interface TokenPayload {
  userId: number;
  roles: string[];
}

export const generateAccessToken = (user: any, roles: string[]): string => {
  const payload: TokenPayload = {
    userId: user.id,
    roles,
  };

  console.log(
    "Generating access token with expiration:",
    JWT_ACCESS_EXPIRATION,
  );
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    algorithm: alg,
    expiresIn: `${parseInt(JWT_ACCESS_EXPIRATION)}M`,
  });
};

export const generateRefreshToken = (user: any, roles: string[]): string => {
  const payload: TokenPayload = {
    userId: user.id,
    roles,
  };

  console.log(
    "Generating refresh token with expiration:",
    JWT_REFRESH_EXPIRATION,
  );

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    algorithm: alg,
    expiresIn: `${parseInt(JWT_REFRESH_EXPIRATION)}H`,
  });
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};
