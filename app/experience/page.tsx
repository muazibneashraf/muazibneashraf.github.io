import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import { JobExperienceSection } from "@/components/JobExperienceSection";
import { getContent } from "@/lib/content-store";
import { redirect } from "next/navigation";
export const revalidate = 0;
export async function generateMetadata(): Promise<Metadata> { const content = await getContent(); return { title: "Experience", description: content.internship.intro }; }
export default async function JobExperience() {
  const content = await getContent();
  if (!content.internship.items.length) redirect("/");
  return <SiteFrame content={content}><JobExperienceSection content={content} standalone /></SiteFrame>;
}
