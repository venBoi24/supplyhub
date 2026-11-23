import { getServerI18n } from "@/i18n/server";

export async function SkipLink() {
  const { t } = await getServerI18n();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring focus:outline-none"
    >
      {t("nav.skipToContent")}
    </a>
  );
}
