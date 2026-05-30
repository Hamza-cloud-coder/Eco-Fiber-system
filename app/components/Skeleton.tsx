import React from "react";
import { cn } from "../utils/cn";

type SkeletonProps = {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  sx?: React.CSSProperties; // Ignoring sx for Tailwind consistency
};

export const Skeleton = ({
  className,
  variant = "text",
  width,
  height,
  ...props
}: SkeletonProps) => {
  const baseStyles = "animate-pulse bg-slate-200";

  const getVariantStyles = () => {
    switch (variant) {
      case "circular":
        return "rounded-full";
      case "rectangular":
        return "rounded-none";
      case "rounded":
        return "rounded-lg";
      case "text":
      default:
        return "rounded";
    }
  };

  return (
    <div
      className={cn(baseStyles, getVariantStyles(), className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...props.sx,
      }}
    />
  );
};
