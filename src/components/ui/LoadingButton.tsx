import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: ReactNode;
};

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="mr-2 h-4 w-4 shrink-0" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
