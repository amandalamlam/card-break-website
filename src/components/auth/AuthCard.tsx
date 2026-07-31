import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="glass-panel rounded-3xl p-8 shadow-2xl shadow-black/30">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm leading-6 text-muted">{subtitle}</p> : null}
        </div>
        {children}
        {footer ? <div className="mt-6 border-t border-border/70 pt-6 text-center text-sm">{footer}</div> : null}
      </div>
    </div>
  );
}
