"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { typeVariants } from "./type";

function Card({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border-soft bg-card text-card-foreground shadow-[var(--shadow-md)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}

function CardHeader({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} ref={ref} {...props} />
  );
}

function CardTitle({ children, className, ref, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(typeVariants({ variant: "h3" }), "text-balance", className)}
      ref={ref}
      {...props}
    >
      {children}
    </h2>
  );
}

function CardDescription({ className, ref, ...props }: React.ComponentProps<"p">) {
  return <p className={cn(typeVariants({ variant: "caption" }), className)} ref={ref} {...props} />;
}

function CardContent({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("p-6 pt-0", className)} ref={ref} {...props} />
  );
}

function CardFooter({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center p-6 pt-0", className)} ref={ref} {...props} />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
