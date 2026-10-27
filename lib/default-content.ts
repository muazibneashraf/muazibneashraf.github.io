import content from "../data/portfolio-content.json";
import type { SiteContent } from "./types";
import { withEditableContent } from "./editable-content";
export const defaultContent = withEditableContent(content as unknown as SiteContent);
