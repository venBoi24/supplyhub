import { describe, expect, it } from "vitest";

import { LOCALE_COOKIE } from "@/i18n/config";
import { localeBootstrapScript } from "@/i18n/bootstrap";

/**
 * The bootstrap runs as a blocking inline script in <head>, so it is exercised here
 * exactly as the browser sees it: with the three globals it touches.
 */
function bootstrap({
  cookie = "",
  storage = null,
  storageThrows = false,
  language = "en-US",
}: {
  cookie?: string;
  storage?: string | null;
  storageThrows?: boolean;
  language?: string;
}) {
  const html = { lang: "", dir: "" };
  const document = { cookie, documentElement: html };
  const window = {
    localStorage: {
      getItem: () => {
        if (storageThrows) throw new Error("SecurityError: storage is blocked");
        return storage;
      },
    },
  };
  const navigator = { language };

  // eslint-disable-next-line no-new-func -- mirrors how the browser evaluates the script
  new Function("document", "window", "navigator", localeBootstrapScript)(
    document,
    window,
    navigator,
  );

  return html;
}

describe("locale document bootstrap", () => {
  it("applies the cookie locale before first paint", () => {
    expect(bootstrap({ cookie: `${LOCALE_COOKIE}=sw` })).toEqual({ lang: "sw", dir: "ltr" });
  });

  it("marks right-to-left for Arabic so the shell never lays out as LTR", () => {
    expect(bootstrap({ cookie: `${LOCALE_COOKIE}=ar` })).toEqual({ lang: "ar", dir: "rtl" });
  });

  it("ignores surrounding cookies and falls back to localStorage", () => {
    expect(bootstrap({ cookie: "other=1; supplyhub_theme=dark", storage: "fr" })).toEqual({
      lang: "fr",
      dir: "ltr",
    });
  });

  it("rejects an unsupported stored value instead of trusting it", () => {
    expect(bootstrap({ cookie: `${LOCALE_COOKIE}=de`, storage: "zh" })).toEqual({
      lang: "zh",
      dir: "ltr",
    });
  });

  it("detects the browser language on a first visit", () => {
    expect(bootstrap({ language: "zh-CN" })).toEqual({ lang: "zh", dir: "ltr" });
    expect(bootstrap({ language: "de-DE" })).toEqual({ lang: "en", dir: "ltr" });
  });

  it("still runs when storage is blocked", () => {
    expect(bootstrap({ cookie: `${LOCALE_COOKIE}=sw`, storageThrows: true })).toEqual({
      lang: "sw",
      dir: "ltr",
    });
    expect(bootstrap({ storageThrows: true })).toEqual({ lang: "en", dir: "ltr" });
  });
});
