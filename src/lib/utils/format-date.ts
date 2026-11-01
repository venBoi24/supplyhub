const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatDate(value: Date): string {
  return dateFormatter.format(value);
}

export function formatDateTime(value: Date): string {
  return dateTimeFormatter.format(value) + " UTC";
}
