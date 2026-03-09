import vine, { SimpleMessagesProvider } from "@vinejs/vine";

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().minLength(3).maxLength(255),
    password: vine.string().minLength(8).maxLength(64),
  }),
);

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email().minLength(3).maxLength(255),
    password: vine.string().minLength(8).maxLength(64),
    verify_password: vine.string().minLength(8).maxLength(64),
    first_name: vine.string().minLength(2).maxLength(255),
    last_name: vine.string().minLength(1).maxLength(255).optional(),
    referral: vine.string().minLength(9).maxLength(9).optional(),
  }),
);

export const updateAccessTokenValidator = vine.compile(
  vine.object({
    accessToken: vine.string().jwt(),
  }),
);

export const refreshTokenValidator = vine.compile(
  vine.object({
    refreshToken: vine.string().jwt(),
  }),
);

vine.messagesProvider = new SimpleMessagesProvider({
  "email.email": "Please provide a valid email address.",
  "email.minLength": "Email must be at least 3 characters long.",
  "email.maxLength": "Email must be at most 255 characters long.",
  "password.minLength": "Password must be at least 8 characters long.",
  "password.maxLength": "Password must be at most 64 characters long.",
  "verify_password.required": "Please confirm your password.",
  "first_name.minLength": "First name is required.",
  "first_name.maxLength": "First name must be at most 255 characters long.",
  "last_name.minLength": "Last name is required.",
  "last_name.maxLength": "Last name must be at most 255 characters long.",
  "referral.minLength": "Referral code must be exactly 9 characters long.",
  "referral.maxLength": "Referral code must be exactly 9 characters long.",
  "accessToken.required": "Access token is required.",
  "accessToken.exists": "Invalid access token.",
  "refreshToken.required": "Refresh token is required.",
  "refreshToken.exists": "Invalid refresh token.",
});
