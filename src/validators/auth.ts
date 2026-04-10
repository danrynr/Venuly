import { z, makeValidator } from "./vine";

export const registerValidator = makeValidator(
  z.object({
    email: z.string().email(),
    password: z.string().min(6),
    verify_password: z.string().min(6),
    first_name: z.string().trim().min(1),
    last_name: z.string().trim().nullable().optional(),
    referral: z.string().trim().nullable().optional(),
    role: z.enum(["organizer", "customer"]).default("customer"),
  }),
);

export const loginValidator = makeValidator(
  z.object({
    email: z.string().email().trim(),
    password: z.string().trim().min(1),
  }),
);

export const refreshTokenValidator = makeValidator(
  z.object({
    refreshToken: z.string(),
  }),
);

export const changePasswordValidator = makeValidator(
  z.object({
    oldPassword: z.string().trim().min(1),
    newPassword: z.string().min(6),
  }),
);

export const forgotPasswordValidator = makeValidator(
  z.object({
    email: z.string().email().trim(),
  }),
);

export const resetPasswordValidator = makeValidator(
  z.object({
    token: z.string(),
    newPassword: z.string().min(6),
  }),
);
