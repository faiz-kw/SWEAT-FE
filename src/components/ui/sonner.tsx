import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:pointer-events-auto group-[.toast]:cursor-pointer group-[.toast]:opacity-80 hover:group-[.toast]:opacity-100 group-[.toast]:border-border group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:shadow-sm group-[.toast]:hover:bg-muted group-[.toast]:transition-opacity",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
