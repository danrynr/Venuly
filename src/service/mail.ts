import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.mailtrap.io",
  port: Number(process.env.MAIL_PORT) || 2525,
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: '"Venuly" <noreply@venuly.com>',
      to,
      subject,
      html,
    });
    console.log("[Mail] Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("[Mail] Error sending email:", error);
    throw error;
  }
};
