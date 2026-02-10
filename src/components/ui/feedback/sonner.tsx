import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1a1a1f] group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-slate-400",
          actionButton: "group-[.toast]:bg-violet-500 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-[#121215] group-[.toast]:text-slate-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
