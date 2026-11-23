import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, localeDir } from "./config";

/**
 * Blocking document bootstrap for the selected language.
 *
 * The locale lives in a first-party cookie, and Server Components already read it
 * — but the root layout has to stay prerenderable for Cache Components, so it
 * cannot call `cookies()` itself. Without help the served document therefore says
 * `<html lang="en">`, and Arabic only flips to right-to-left after hydration.
 *
 * This inline script runs synchronously while the HTML is parsed, before the first
 * paint, and stamps the same `lang`/`dir` the server would have chosen. It mirrors
 * the resolution order used by `I18nProvider` (cookie → localStorage → browser
 * language → default) and touches no rendered text, so it cannot cause a hydration
 * mismatch. See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
 */
const directories = Object.fromEntries(LOCALES.map((locale) => [locale, localeDir(locale)]));

export const localeBootstrapScript = [
  "(function(){try{",
  `var locales=${JSON.stringify(LOCALES)};`,
  `var dirs=${JSON.stringify(directories)};`,
  `var key=${JSON.stringify(LOCALE_COOKIE)};`,
  "var value=null;",
  "var parts=document.cookie.split(';');",
  "for(var i=0;i<parts.length;i++){var c=parts[i].trim();",
  "if(c.indexOf(key+'=')===0){value=c.slice(key.length+1);break;}}",
  "if(locales.indexOf(value)<0){try{value=window.localStorage.getItem(key);}catch(e){}}",
  "if(locales.indexOf(value)<0){",
  "var tag=(navigator.language||'').toLowerCase().split('-')[0];",
  `value=locales.indexOf(tag)>=0?tag:${JSON.stringify(DEFAULT_LOCALE)};}`,
  "var el=document.documentElement;",
  "el.lang=value;",
  "el.dir=dirs[value]||'ltr';",
  "}catch(e){}})();",
].join("");
