import { redirect } from "next/navigation";

export default function AdminApplicationsPage() {
  redirect("/admin/vendors");
}

export const instant = false;
