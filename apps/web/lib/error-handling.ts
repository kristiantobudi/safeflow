import { AxiosError } from "axios";
import { CSSProperties } from "react";
import { toast } from "sonner";

export const ERROR_MESSAGE = {
  GENERIC: "Something went wrong. Please try again later.",
};

export class ErrorHandling {
  static handle(error: unknown) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        return toast.error("Failed", {
          style: {
            "--normal-bg":
              "color-mix(in oklab, var(--destructive) 10%, var(--background))",
            "--normal-text": "var(--destructive)",
            "--normal-border": "var(--destructive)",
          } as CSSProperties,
          description: "Please login first, " + error.response?.data.message,
          closeButton: true,
        });
      }

      if (error.code === "ERR_BAD_REQUEST") {
        return toast.error("Failed", {
          style: {
            "--normal-bg":
              "color-mix(in oklab, var(--destructive) 10%, var(--background))",
            "--normal-text": "var(--destructive)",
            "--normal-border": "var(--destructive)",
          } as CSSProperties,
          description: error.response?.data.message,
          closeButton: true,
        });
      }

      toast.error("Failed", {
        style: {
          "--normal-bg":
            "color-mix(in oklab, var(--destructive) 10%, var(--background))",
          "--normal-text": "var(--destructive)",
          "--normal-border": "var(--destructive)",
        } as CSSProperties,
        description: ERROR_MESSAGE.GENERIC,
        closeButton: true,
      });
    }
  }
}
