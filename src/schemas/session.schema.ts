import { z } from 'zod';

export const SessionSchema = z
  .object({
    id: z.string({
      required_error: "IDは必須です",
      invalid_type_error: "IDは文字列である必要があります",
    }),
    sessionToken: z.string({
      required_error: "セッショントークンは必須です",
      invalid_type_error: "セッショントークンは文字列である必要があります",
    }),
    userId: z.string({
      required_error: "ユーザーIDは必須です",
      invalid_type_error: "ユーザーIDは文字列である必要があります",
    }),
    expires: z.date({
      required_error: "有効期限は必須です",
      invalid_type_error: "有効期限は有効な日付である必要があります",
    }),
  })
  .strict({ message: "予期しないフィールドが含まれています" });
