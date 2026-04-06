const getVine = async () => {
  const { default: vine } = await import("@vinejs/vine");
  return vine;
};

export const registerValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine
      .compile(
        vine.object({
          email: vine.string().email(),
          password: vine.string().minLength(6),
          verify_password: vine.string().minLength(6),
          first_name: vine.string().trim(),
          last_name: vine.string().trim().optional().nullable(),
          referral: vine.string().trim().optional().nullable(),
        }),
      )
      .validate(data);
  },
};

export const loginValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine
      .compile(
        vine.object({
          email: vine.string().email().trim(),
          password: vine.string().trim(),
        }),
      )
      .validate(data);
  },
};

export const refreshTokenValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine
      .compile(
        vine.object({
          refreshToken: vine.string(),
        }),
      )
      .validate(data);
  },
};

export const changePasswordValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine
      .compile(
        vine.object({
          oldPassword: vine.string().trim(),
          newPassword: vine.string().minLength(6),
        }),
      )
      .validate(data);
  },
};

export const forgotPasswordValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine
      .compile(
        vine.object({
          email: vine.string().email().trim(),
        }),
      )
      .validate(data);
  },
};

export const resetPasswordValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine
      .compile(
        vine.object({
          token: vine.string(),
          newPassword: vine.string().minLength(6),
        }),
      )
      .validate(data);
  },
};
