import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import {
  AboutSection,
  SkillsSection,
  ContactSection,
} from "@/components/PortfolioSections";
import { getContent } from "@/lib/content-store";
export const revalidate = 0;
export async function generateMetadata(): Promise<Metadata> { const content = await getContent(); return { title: content.about.title.replace(/\.$/, ''), description: content.about.lede }; }
export default async function About() {
  const content = await getContent();
  return (
    <SiteFrame content={content}>
      <AboutSection content={content} standalone />
      <SkillsSection content={content} />
      <ContactSection content={content} />
    </SiteFrame>
  );
}
