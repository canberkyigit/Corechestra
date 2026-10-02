import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva("app-btn", {
  variants: {
    variant: {
      primary: "app-btn--primary",
      secondary: "app-btn--secondary",
      ghost: "app-btn--ghost",
      danger: "app-btn--danger",
    },
    size: {
      sm: "app-btn--sm",
      md: "app-btn--md",
    },
    fullWidth: {
      true: "w-full",
      false: "",
    },
  },
  defaultVariants: {
    variant: "secondary",
    size: "md",
    fullWidth: false,
  },
});

export function Button({ className, variant, size, fullWidth, ...props }) {
  return <button {...props} className={cn(buttonVariants({ variant, size, fullWidth }), className)} />;
}

const badgeVariants = cva("app-badge", {
  variants: {
    tone: {
      neutral: "app-badge--neutral",
      blue: "app-badge--blue",
      green: "app-badge--green",
      amber: "app-badge--amber",
      orange: "app-badge--orange",
      red: "app-badge--red",
      purple: "app-badge--purple",
      cyan: "app-badge--cyan",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export function Badge({ className, tone, ...props }) {
  return <span {...props} className={cn(badgeVariants({ tone }), className)} />;
}

export function Input({ className, ...props }) {
  return <input {...props} className={cn("app-field", className)} />;
}

export function Select({ className, children, ...props }) {
  return <select {...props} className={cn("app-select", className)}>{children}</select>;
}

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn("app-surface app-empty-state", className)}>
      {icon && <div className="app-empty-state__icon">{icon}</div>}
      {title && <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">{title}</h3>}
      {description && <p className="text-sm app-subtle-copy max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

export function DataCard({ className, children, muted = false, ...props }) {
  return <section {...props} className={cn(muted ? "app-surface-muted" : "app-surface", className)}>{children}</section>;
}

export function SectionHeader({ kicker, title, subtitle, action, className }) {
  return (
    <div className={cn("app-detail-header", className)}>
      <div className="min-w-0">
        {kicker && <div className="app-kicker mb-1.5">{kicker}</div>}
        {title && <h2 className="app-detail-title">{title}</h2>}
        {subtitle && <p className="mt-2 app-subtle-copy max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
