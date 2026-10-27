import type {} from "react/canary";
import { ViewTransition, type ReactNode } from "react";
import "./project-navigation.css";

/** Each project is mounted once per route, so matching names can carry its
 * artwork and title between the card and the case study in either direction. */
export function ProjectTransition({ slug, part, children }: {
  slug: string;
  part: "art" | "title";
  children: ReactNode;
}) {
  return <ViewTransition
    name={`project-${part}-${slug}`}
    default="none"
    share={`project-shared-${part}`}
  >{children}</ViewTransition>;
}

