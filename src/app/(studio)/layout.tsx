import { SkipLink } from "@/components/storefront/skip-link";
import { ToasterProvider } from "@/components/ui/toaster";

export default function StudioWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToasterProvider>
      <SkipLink />
      {children}
    </ToasterProvider>
  );
}
