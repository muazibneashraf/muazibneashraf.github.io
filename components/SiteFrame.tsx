import type {} from "react/canary";
import { ViewTransition, type ReactNode } from "react";
import type { SiteContent } from "@/lib/types";
import { siteThemeStyle } from "@/lib/theme";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ResumeOverlay } from "./ResumeOverlay";
import "./page-motion.css";
export function SiteFrame({
  content,
  children,
  openResume = false,
}: {
  content: SiteContent;
  children: ReactNode;
  hideFooterCallout?: boolean;
  openResume?: boolean;
}) {
  const style = siteThemeStyle(content.theme);
  return (
    <ResumeOverlay
      url={content.identity.resumeUrl}
      name={content.identity.name}
      theme={content.theme}
      initiallyOpen={openResume}
    >
      <div className="site-frame" style={style}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader site={content.site} />
        <ViewTransition
          name="site-page"
          default="none"
          enter={{ "site-nav": "page-fade", default: "none" }}
          exit={{ "site-nav": "page-fade", default: "none" }}
          update={{ "site-nav": "page-fade", default: "none" }}
          share={{ "site-nav": "page-fade", default: "none" }}
        >
          <main id="main">{children}</main>
        </ViewTransition>
        <SiteFooter content={content} />
      </div>
    </ResumeOverlay>
  );
}
