import { z } from "zod";

export { z };

export class ValidationError extends Error {
  messages: string[];
  errors: { field: string; message: string; rule: string }[];

  constructor(zodError: z.ZodError) {
    super("Validation failed");
    this.name = "ValidationError";
    this.messages = zodError.issues.map((i) => i.message);
    this.errors = zodError.issues.map((i) => ({
      field: i.path.join(".") || "value",
      message: i.message,
      rule: i.code,
    }));
  }
}

export function makeValidator<T extends z.ZodTypeAny>(schema: T) {
  return {
    validate: async (data: unknown): Promise<z.infer<T>> => {
      const result = schema.safeParse(data);
      if (!result.success) throw new ValidationError(result.error);
      return result.data;
    },
  };
}
