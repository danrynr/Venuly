import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";
import { sendMail } from "../service/mail";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import {
  generateCouponCode,
  generateReferralCode,
} from "../utils/codeGenerator";
import {
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../validators/auth";

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;

// ------------------- Authentication Controllers ------------------
// ----------------------- User Registration ------------------
export const registerController = async (req: Request, res: Response) => {
  try {
    let validatedData;
    try {
      validatedData = await registerValidator.validate(req.body);
    } catch (err: any) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: err.messages || "Validation failed.",
          data: err.errors,
        }),
      );
    }

    const {
      email,
      password,
      verify_password,
      first_name,
      last_name,
      referral,
      role,
    } = validatedData;

    // Password match check
    if (password !== verify_password) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Passwords do not match.",
        }),
      );
    }

    // Referral code check (only if provided and not empty)
    const sanitizedReferral = referral?.trim();
    const hasReferral = sanitizedReferral && sanitizedReferral.length > 0;

    if (hasReferral && sanitizedReferral.length !== 9) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Referral code must be exactly 9 characters long.",
        }),
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).send(
        responseFormatter({
          code: 409,
          status: "error",
          message: "User with this email already exists.",
        }),
      );
    }

    const referralUser = hasReferral
      ? await prisma.user.findUnique({
          where: { referralCode: sanitizedReferral },
        })
      : null;

    if (hasReferral && !referralUser) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Invalid referral code.",
        }),
      );
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user and referral rewards in a transaction
    const newUser = await prisma.$transaction(
      async (tx: any) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName: first_name,
            lastName: last_name || null,
            referralCode: generateReferralCode(first_name),
          },
        });

        // Assign role based on request (defaults to 'customer')
        const assignedRole = await tx.role.findUnique({
          where: { name: role },
        });
        if (assignedRole) {
          await tx.userRole.create({
            data: { userId: user.id, roleId: assignedRole.id },
          });
        }

        // Handle referral logic
        if (referralUser) {
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

          await tx.referral.create({
            data: { referrerId: referralUser.id, reffereeId: user.id },
          });

          await tx.userPoint.create({
            data: {
              userId: referralUser.id,
              points: parseInt(process.env.POINT_PER_USER!) || 10000,
              expiredAt: threeMonthsFromNow,
            },
          });

          await tx.userCoupon.create({
            data: {
              userId: user.id,
              couponCode: generateCouponCode("COUP"),
              discount: parseInt(process.env.REFERRAL_DISCOUNT_AMOUNT!) || 10,
              expiredAt: threeMonthsFromNow,
            },
          });
        }

        return user;
      },
      { isolationLevel: "Serializable" },
    );

    return res.status(201).send(
      responseFormatter({
        code: 201,
        status: "success",
        message: "User registered successfully.",
      }),
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: "Internal server error.",
      }),
    );
  }
};

// ----------------------- User Login ----------------------
export const loginController = async (req: Request, res: Response) => {
  try {
    let validatedData;
    try {
      validatedData = await loginValidator.validate(req.body);
    } catch (err: any) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: err.messages,
      });
      return res.status(400).send(response);
    }

    const { email, password } = validatedData;

    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      const response = responseFormatter({
        code: 401,
        status: "error",
        message: "Invalid credentials.",
      });
      return res.status(401).send(response);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const response = responseFormatter({
        code: 401,
        status: "error",
        message: "Invalid credentials.",
      });
      return res.status(401).send(response);
    }

    const roles = user.userRoles.map((ur: any) => ur.role.name);

    const accessToken = generateAccessToken(user, roles);
    const refreshToken = generateRefreshToken(user, roles);

    // Store the refresh token in the database
    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
      },
    });

    const response = responseFormatter({
      code: 200,
      status: "success",
      message: "Logged in successfully.",
      data: {
        accessToken,
        refreshToken,
      },
    });
    res.status(200).send(response);
  } catch (error) {
    console.error("Login error:", error);
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: "Internal server error.",
    });
    res.status(500).send(response);
  }
};

// ------------------------ Token Refresh ----------------------
export const refreshController = async (req: Request, res: Response) => {
  try {
    let validatedData;
    try {
      validatedData = await refreshTokenValidator.validate(req.body);
    } catch (err: any) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: err.messages,
      });
      return res.status(400).send(response);
    }
    const { refreshToken } = validatedData;

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      const response = responseFormatter({
        code: 403,
        status: "error",
        message: "Invalid or expired refresh token.",
      });
      return res.status(403).send(response);
    }

    const storedAuthToken = await prisma.authToken.findFirst({
      where: { token: refreshToken, userId: decoded.userId },
    });

    if (!storedAuthToken) {
      const response = responseFormatter({
        code: 403,
        status: "error",
        message: "Invalid or expired refresh token.",
      });
      return res.status(403).send(response);
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      const response = responseFormatter({
        code: 403,
        status: "error",
        message: "User not found.",
      });
      return res.status(403).send(response);
    }

    const roles = user.userRoles.map((ur: any) => ur.role.name);

    const newAccessToken = generateAccessToken(user, roles);
    const newRefreshToken = generateRefreshToken(user, roles);

    await prisma.$transaction([
      prisma.authToken.deleteMany({
        where: { userId: user.id },
      }),
      prisma.authToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
        },
      }),
    ]);

    const response = responseFormatter({
      code: 200,
      status: "success",
      message: "Session refreshed successfully.",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
    res.status(200).send(response);
  } catch (error) {
    console.error("Refresh error:", error);
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: "Internal server error.",
    });
    res.status(500).send(response);
  }
};

// ------------------------- User Logout ----------------------
export const logoutController = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: "Refresh token is required for logout.",
      });
      return res.status(400).send(response);
    }

    await prisma.authToken.deleteMany({
      where: { userId: req.user?.userId },
    });

    const response = responseFormatter({
      code: 200,
      status: "success",
      message: "User logged out successfully.",
    });
    res.status(200).send(response);
  } catch (error) {
    console.error("Logout error:", error);
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: "Internal server error.",
    });
    res.status(500).send(response);
  }
};

// ------------------------- Password Management ----------------------

export const changePasswordController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = await changePasswordValidator.validate(
      req.body,
    );

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).send(
        responseFormatter({
          code: 404,
          status: "error",
          message: "User not found.",
        }),
      );
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Current password incorrect.",
        }),
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Password updated successfully.",
      }),
    );
  } catch (error: any) {
    return res.status(400).send(
      responseFormatter({
        code: 400,
        status: "error",
        message: error.messages || "Request failed.",
      }),
    );
  }
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email } = await forgotPasswordValidator.validate(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).send(
        responseFormatter({
          code: 200,
          status: "success",
          message: "If that email exists, a reset link has been sent.",
        }),
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpires: expires },
    });

    const frontendUrl = process.env.FRONTEND_URL;
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await sendMail(
      user.email,
      "Password Reset Request",
      `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    );

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Reset link sent to your email.",
      }),
    );
  } catch (error: any) {
    return res.status(400).send(
      responseFormatter({
        code: 400,
        status: "error",
        message: error.messages || "Request failed.",
      }),
    );
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = await resetPasswordValidator.validate(
      req.body,
    );

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Invalid or expired reset token.",
        }),
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Password reset successfully. You can now log in.",
      }),
    );
  } catch (error: any) {
    return res.status(400).send(
      responseFormatter({
        code: 400,
        status: "error",
        message: error.messages || "Request failed.",
      }),
    );
  }
};
