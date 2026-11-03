const MAX_IMAGE_ALT_LENGTH = 160;

export function productImageAlt(productName: string): string {
  const name = productName.replace(/\s+/g, " ").trim();

  return (name ? `Photo of ${name}` : "Product photo").slice(0, MAX_IMAGE_ALT_LENGTH);
}
