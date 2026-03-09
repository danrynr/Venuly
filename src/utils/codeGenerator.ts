import { randomBytes } from "crypto";

export const generateReferralCode = (prefix: string): string => {
  prefix = prefix.slice(0, 4); // Ensure prefix is at most 4 characters and uppercase
  return (prefix + randomBytes(5).toString("hex").slice(0, 5)).toUpperCase();
};

export const generateCouponCode = (prefix: string): string => {
  prefix = prefix.slice(0, 4); // Ensure prefix is at most 4 characters and uppercase
  return (prefix + randomBytes(6).toString("hex").slice(0, 6)).toUpperCase();
};
