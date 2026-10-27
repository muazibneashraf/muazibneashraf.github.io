import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import {
  ExperienceSection,
  ContactSection,
} from "@/components/PortfolioSections";
import { getContent } from "@/lib/content-store";
export const revalidate = 0;
export async function generateMetadata(): Promise<Metadata> { const content = await getContent(); return { title: content.extracurricular.title.replace(/\.$/, ''), description: content.extracurricular.intro }; }
export default async function Experience() {
  const content = await getContent();
  return (
    <SiteFrame content={content}>
      <ExperienceSection content={content} standalone />
      <ContactSection content={content} />
    </SiteFrame>
  );
}
