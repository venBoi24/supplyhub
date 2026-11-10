import Link from "next/link";

import { listCategorySummaries, listVendorSummaries } from "@/features/catalog/queries";
import { getServerI18n } from "@/i18n/server";

import { PageShell } from "./page-shell";
import { Wordmark } from "./wordmark";

const footerLinkClassName =
  "inline-flex w-fit text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

export async function SiteFooter() {
  const [categories, vendors] = await Promise.all([listCategorySummaries(), listVendorSummaries()]);
  const { t } = await getServerI18n();

  return (
    <footer className="mt-20 hidden border-t border-border bg-primary text-primary-foreground md:block">
      <PageShell className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.8fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Wordmark />
            <p className="mt-5 text-sm leading-6 text-primary-foreground/70">{t("footer.blurb")}</p>
            <p className="eyebrow mt-8 text-primary-foreground/60">{t("footer.demoCatalog")}</p>
            <p className="mt-2 text-xs leading-5 text-primary-foreground/55">
              {t("announcement.notice")}
            </p>
          </div>

          <div>
            <h2 className="eyebrow text-primary-foreground/60">{t("footer.shop")}</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/products" className={footerLinkClassName}>
                  {t("footer.allObjects")}
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/categories/${category.slug}`} className={footerLinkClassName}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-primary-foreground/60">{t("footer.studios")}</h2>
            <ul className="mt-4 space-y-2.5">
              {vendors.map((vendor) => (
                <li key={vendor.slug}>
                  <Link href={`/vendors/${vendor.slug}`} className={footerLinkClassName}>
                    {vendor.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/vendors" className={footerLinkClassName}>
                  {t("footer.allStudios")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-primary-foreground/60">{t("footer.browse")}</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/search" className={footerLinkClassName}>
                  {t("footer.search")}
                </Link>
              </li>
              <li>
                <Link href="/products?sort=newest" className={footerLinkClassName}>
                  {t("footer.newestArrivals")}
                </Link>
              </li>
              <li>
                <Link href="/products?sort=price-asc" className={footerLinkClassName}>
                  {t("footer.lowestPrice")}
                </Link>
              </li>
              <li>
                <Link href="/delivery-live?persona=buyer" className={footerLinkClassName}>
                  {t("footer.liveTracking")}
                </Link>
              </li>
              <li>
                <Link href="/experience" className={footerLinkClassName}>
                  {t("footer.protectionHub")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.copyright")}</p>
          <p className="font-mono tracking-[0.12em] uppercase">{t("footer.stack")}</p>
        </div>
      </PageShell>
    </footer>
  );
}
