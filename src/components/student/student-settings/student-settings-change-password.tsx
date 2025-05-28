"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/lib/fetcher";
import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const StudentSettingsChangePassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // setIsLoading(!isLoading);
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const passowrds = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    if (passowrds.newPassword !== passowrds.confirmPassword) {
      toast.error("パスワードが一致しません！");
      return;
    }
    try {
      const result: { message: string } = await fetcher(
        "/api/students/me/password",
        {
          method: "PATCH",
          body: JSON.stringify(passowrds),
          credentials: "include",
        }
      );

      toast.success(result.message);
      form.reset();
    } catch (err: any) {
      console.log("Error on changing password service:", err);
      if (err.info && err.info.error) {
        toast.error(err.info.error as string);
      } else {
        toast.error("Something went wrong!");
      }
    } finally {
      // setIsLoading(!isLoading);
    }
  };
  return (
    <div>
      <div className="text-2xl font-semibold uppercase">change password</div>

      <form className="my-5 flex flex-col gap-5 " onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <div>
            your current password <span className="text-red-500">*</span>
          </div>{" "}
          <Input
            placeholder="current password..."
            name="currentPassword"
            // type="password"
            required
          ></Input>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            set new password <span className="text-red-500">*</span>
          </div>{" "}
          <Input
            name="newPassword"
            placeholder="new password..."
            // type="password"
            required
          ></Input>
        </div>{" "}
        <div className="flex flex-col gap-2">
          <div>
            repeat new password <span className="text-red-500">*</span>
          </div>
          <Input
            name="confirmPassword"
            placeholder="repeat password..."
            required
          ></Input>
        </div>
        {isLoading ? (
          <Button className="mt-4" type="button">
            <Loader2 />
            changing...
          </Button>
        ) : (
          <Button className="mt-4" type="submit">
            CHANGE
          </Button>
        )}
      </form>
    </div>
  );
};

export default StudentSettingsChangePassword;
