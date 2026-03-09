import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import "dotenv/config";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = "venuly"
): Promise<UploadApiResponse> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: "auto",
    });
    return result;
  } catch (error) {
    throw error as UploadApiErrorResponse;
  }
};

export const uploadStream = (
  buffer: Buffer,
  folder: string = "venuly"
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: "auto" },
      (error, result) => {
        if (error) return reject(error);
        if (result) resolve(result);
      }
    );
    Readable.from(buffer).pipe(upload);
  });
};

export const deleteFromCloudinary = async (
  publicId: string
): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};

export default cloudinary;
