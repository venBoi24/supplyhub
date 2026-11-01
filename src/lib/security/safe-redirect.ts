const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeNextPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value || CONTROL_CHARACTERS.test(value)) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "http://supplyhub.invalid");

    if (parsed.origin !== "http://supplyhub.invalid") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
