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
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: err.messages,
      });
      return res.status(400).send(response);
    }

    const {
      email,
      password,
      verify_password,
      first_name,
      last_name,
      referral,
    } = validatedData;

    // if referral code is provided make sure it is exactly 9 characters long
    if (referral && referral.length !== 9) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: "Referral code must be exactly 9 characters long.",
      });
      return res.status(400).send(response);
    }

    if (!email || !password || !verify_password || !first_name) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: "Required fields are missing.",
      });
      return res.status(400).send(response);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({ where: { email } });

    if (existingUser) {
      const response = responseFormatter({
        code: 409,
        status: "error",
        message: "User with this email already exists.",
      });
      return res.status(409).send(response);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const passwordsMatch = await bcrypt.compare(
      verify_password,
      hashedPassword,
    );
    if (!passwordsMatch) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: "Password do not match.",
      });
      return res.status(400).send(response);
    }

    const referralUser = referral
      ? await prisma.user.findFirst({
          where: { referralCode: referral },
        })
      : null;

    if (referral && !referralUser) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: "Invalid referral code.",
      });
      return res.status(400).send(response);
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: first_name,
        lastName: last_name || null,
        referralCode: generateReferralCode(first_name),
      },
    });

    // Assign default role 'customer'
    const customerRole = await prisma.role.findFirst({
      where: { name: "customer" },
    });
    if (customerRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: customerRole.id,
        },
      });
    }

    if (referralUser) {
      // Correct date logic for 3 months
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      await prisma.$transaction(
        async (tx) => {
          await tx.referral.create({
            data: {
              referrerId: referralUser.id,
              reffereeId: user.id,
            },
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
        },
        { isolationLevel: "Serializable" },
      );
    }

    if (!user) {
      const response = responseFormatter({
        code: 500,
        status: "error",
        message: "Failed to create user.",
      });
      return res.status(500).send(response);
    }

    const response = responseFormatter({
      code: 201,
      status: "success",
      message: "User registered successfully.",
    });
    res.status(201).send(response);
  } catch (error: any) {
    console.error("Registration error:", error);
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: "Internal server error.",
    });
    res.status(500).send(response);
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

    const roles = user.userRoles.map((ur) => ur.role.name);

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

    const roles = user.userRoles.map((ur) => ur.role.name);

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
    const { oldPassword, newPassword } = await changePasswordValidator.validate(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).send(responseFormatter({ code: 404, status: "error", message: "User not found." }));
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Current password incorrect." }));
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "Password updated successfully." }));
  } catch (error: any) {
    return res.status(400).send(responseFormatter({ code: 400, status: "error", message: error.messages || "Request failed." }));
  }
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email } = await forgotPasswordValidator.validate(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak user existence in production, but requirement says "reset if forgotten"
      return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "If that email exists, a reset link has been sent." }));
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpires: expires },
    });

    // In a real app, this would be a link to your frontend
    const resetLink = `http://localhost:3000/api/auth/reset-password?token=${token}`;
    
    await sendMail(
      user.email,
      "Password Reset Request",
      `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`
    );

    return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "Reset link sent to your email." }));
  } catch (error: any) {
    return res.status(400).send(responseFormatter({ code: 400, status: "error", message: error.messages || "Request failed." }));
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = await resetPasswordValidator.validate(req.body);

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Invalid or expired reset token." }));
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

    return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "Password reset successfully. You can now log in." }));
  } catch (error: any) {
    return res.status(400).send(responseFormatter({ code: 400, status: "error", message: error.messages || "Request failed." }));
  }
};
