import { Request, Response } from "express";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";
import { updateProfileValidator } from "../validators/profile";
import { uploadStream } from "../service/cloudinary";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    console.log("Getting profile for userId:", userId);

    if (!userId) {
      const response = responseFormatter({
        code: 401,
        status: "error",
        message: "User not authenticated.",
      });
      return res.status(401).send(response);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      const response = responseFormatter({
        code: 404,
        status: "error",
        message: "User not found.",
      });
      return res.status(404).send(response);
    }

    const response = responseFormatter({
      code: 200,
      status: "success",
      message: "User profile retrieved successfully.",
      data: user,
    });
    res.status(200).send(response);
  } catch (error) {
    console.error("Profile retrieval error:", error);
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: "Internal server error.",
    });
    res.status(500).send(response);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      const response = responseFormatter({
        code: 401,
        status: "error",
        message: "User not authenticated.",
      });
      return res.status(401).send(response);
    }

    console.log("Request Body:", req.body);
    
    let validatedData;
    try {
      validatedData = await updateProfileValidator.validate(req.body);
      console.log("Validated profile update data:", validatedData);
    } catch (err: any) {
      console.error("Validation error:", err);
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: err.messages || "Validation failed.",
      });
      return res.status(400).send(response);
    }
    const { last_name } = validatedData;

    if (!last_name) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: "last_name is required for update.",
      });
      return res.status(400).send(response);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastName: last_name,
      },
    });

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response = responseFormatter({
      code: 200,
      status: "success",
      message: "User profile updated successfully.",
      data: userData,
    });
    res.status(200).send(response);
  } catch (error) {
    console.error("Profile update error:", error);
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: "Internal server error.",
    });
    res.status(500).send(response);
  }
};

export const updateProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      const response = responseFormatter({
        code: 401,
        status: "error",
        message: "User not authenticated.",
      });
      return res.status(401).send(response);
    }

    if (!req.file) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: "No file uploaded.",
      });
      return res.status(400).send(response);
    }

    const uploadResult = await uploadStream(req.file.buffer, "profiles");

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        profilePicture: uploadResult.secure_url,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response = responseFormatter({
      code: 200,
      status: "success",
      message: "Profile picture updated successfully.",
      data: user,
    });
    res.status(200).send(response);
  } catch (error) {
    console.error("Profile picture update error:", error);
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: "Internal server error.",
    });
    res.status(500).send(response);
  }
};
