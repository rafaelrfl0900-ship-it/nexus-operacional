import { cn } from "@/lib/format";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

const variants = {
  primary: "border-cyan-300/30 bg-cyan-300/[0.12] text-cyan-50 hover:bg-cyan-300/20",
  secondary: "border-slate-400/30 bg-white/5 text-slate-100 hover:bg-white/10",
  danger: "border-rose-300/30 bg-rose-300/10 text-rose-100 hover:bg-rose-300/20"
};

export function Button({ className, children, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
