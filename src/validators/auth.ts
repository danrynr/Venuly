import vine from "@vinejs/vine";

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(6),
    verify_password: vine.string().minLength(6),
    first_name: vine.string().trim(),
    last_name: vine.string().trim().optional().nullable(),
    referral: vine.string().trim().optional().nullable(),
  }),
);

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
    password: vine.string().trim(),
  }),
);

export const refreshTokenValidator = vine.compile(
  vine.object({
    refreshToken: vine.string(),
  }),
);

export const changePasswordValidator = vine.compile(
  vine.object({
    oldPassword: vine.string().trim(),
    newPassword: vine.string().minLength(6),
  }),
);

export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
  }),
);

export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string(),
    newPassword: vine.string().minLength(6),
  }),
);
