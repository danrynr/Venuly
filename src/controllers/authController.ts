import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";
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
      prisma.$transaction(
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
              points: parseInt(process.env.POINT_PER_USER!), // Award points to the referrer
              expiredAt: new Date(Date.now() + "3months"), // Set expiration date for points (3 months from now)
            },
          });

          await tx.userCoupon.create({
            data: {
              userId: user.id,
              couponCode: generateCouponCode("COUP"), // Generate a coupon code for the new user
              discount: parseInt(process.env.REFERRAL_DISCOUNT_AMOUNT!), // Set discount amount for the coupon
              expiredAt: new Date(Date.now() + "3months"), // Set expiration date for the coupon (3 months from now)
            },
          });
        },
        { isolationLevel: "Serializable" },
      ); // Use Serializable isolation level to prevent race conditions
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
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: "Internal server error.",
      data: error,
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
    console.log("Received refresh token request with body:", req.body);
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

    if (!refreshToken) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: "Refresh token is required.",
      });
      return res.status(400).send(response);
    }
    console.log("Received refresh token:", refreshToken);
    const decoded = verifyRefreshToken(refreshToken); // This now only verifies signature

    if (!decoded) {
      const response = responseFormatter({
        code: 403,
        status: "error",
        message: "Invalid or expired refresh token.",
      });
      return res.status(403).send(response);
    }

    // Validate refresh token against database
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

    // Generate new access token
    const newAccessToken = generateAccessToken(user, roles);
    const newRefreshToken = generateRefreshToken(user, roles);

    // Store the new refresh token in the database and invalidate the old one
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

    // Invalidate refresh token from the database
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
