"use client";

import clsx from "clsx";
import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

type AlertProps = {
  variant?: "info" | "success" | "error";
  children: ReactNode;
  floating?: boolean;
  duration?: number;
  onDismiss?: () => void;
};

const styles: Record<NonNullable<AlertProps["variant"]>, string> = {
  info: "border-sky-100 bg-sky-50 text-sky-800",
  success: "border-emerald-100 bg-emerald-50 text-emerald-800",
  error: "border-rose-100 bg-rose-50 text-rose-800"
};

export default function Alert({
  children,
  variant = "info",
  floating = true,
  duration = 3000,
  onDismiss
}: AlertProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setVisible(true);
    if (!floating) {
      return;
    }
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [children, variant, duration, floating, onDismiss]);

  if (!visible) {
    return null;
  }

  const content = (
    <div
      className={clsx(
        "rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg",
        styles[variant],
        floating ? "pointer-events-auto" : ""
      )}
    >
      {children}
    </div>
  );

  if (!floating) {
    return content;
  }

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed right-6 top-6 z-50 flex w-full max-w-sm flex-col gap-3">{content}</div>,
    document.body
  );
}
