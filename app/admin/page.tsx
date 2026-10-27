import "./admin.css";
import type { Metadata } from "next";
import { AdminStudio } from "./AdminStudio";
import { getContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const { theme, site } = await getContent();
  return <AdminStudio theme={theme} site={site} />;
}
