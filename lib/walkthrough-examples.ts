import type { Project } from "./types";

export type WalkthroughExample = {
  stage: string;
  description?: string;
  file: string;
  kind: "code" | "table" | "flow" | "tree" | "blocks" | "mask" | "scene";
  caption: string;
  lines?: string[];
  columns?: string[];
  rows?: string[][];
  nodes?: string[];
  phase?: number;
};

// Small teaching examples, not recorded runs or model results. Stage titles are
// matched deliberately so an admin-added/reordered stage never gets the wrong demo.
const EXAMPLES: Record<string, WalkthroughExample[]> = {
  "compiler-toolchain": [
    { stage: "Source", file: "example.c", kind: "code", lines: ["int main() {", "    int total;", "    total = 2 + 3 * 4;", "    return total;", "}"], caption: "A small expression to follow through the compiler." },
    { stage: "Lexer / parser", file: "Token stream", kind: "table", columns: ["Lexeme", "Token"], rows: [["total", "ID"], ["=", "ASSIGNOP"], ["2", "CONST_INT"], ["+", "ADDOP"], ["3 * 4", "CONST_INT · MULOP · CONST_INT"]], caption: "The lexer recognizes tokens; the grammar groups the expression." },
    { stage: "AST + symbols", file: "Expression tree", kind: "tree", caption: "Multiplication is grouped before addition; the symbol table tracks total." },
    { stage: "Intermediate code", file: "Three-address code", kind: "code", lines: ["t1 = 3 * 4", "t2 = 2 + t1", "total = t2", "return total"], caption: "The expression becomes a sequence of simpler operations." },
  ],
  "customer-churn": [
    { stage: "Consumer data", file: "Feature sample", kind: "table", columns: ["Age", "Income", "Membership", "Churn"], rows: [["28", "42,000", "Regular", "0"], ["41", "—", "Premium", "1"], ["35", "58,000", "Regular", "0"]], caption: "Illustrative records. Churn is the target, separate from the input features." },
    { stage: "Preprocessing", file: "Prepare features", kind: "flow", nodes: ["Fill missing values", "Encode categories", "Scale numeric columns"], caption: "Convert mixed data into numeric features the classifiers can use." },
    { stage: "Model comparison", file: "Classifier comparison", kind: "flow", nodes: ["Logistic regression · Decision tree", "Neural network · KNN · Naive Bayes", "Compare on the same held-out split"], caption: "Five classifiers are compared on the consumer churn data." },
    { stage: "Evaluation", file: "Evaluation checklist", kind: "table", columns: ["Measure", "What it checks"], rows: [["Precision", "How often a churn prediction is correct"], ["Recall", "How many churn cases are found"], ["F1 score", "Balance between precision and recall"], ["Confusion matrix", "Correct predictions and both error types"]], caption: "Review classification performance and the types of prediction errors." },
  ],
  minivsfs: [
    { stage: "Create image", file: "Disk image layout", kind: "blocks", phase: 0, nodes: ["Superblock", "Bitmaps", "Inode table", "Data blocks"], caption: "The image stores filesystem structures inside one ordinary file." },
    { stage: "Allocate blocks", file: "Allocation bitmap", kind: "blocks", phase: 1, nodes: ["Find free inode", "Find free data blocks", "Mark allocations"], caption: "Highlighted blocks illustrate space reserved for a new file." },
    { stage: "Write file", file: "File → data blocks", kind: "blocks", phase: 2, nodes: ["Read source bytes", "Copy into direct blocks", "Record file size"], caption: "File contents are copied to the allocated region of the image." },
    { stage: "Update metadata", file: "Metadata writeback", kind: "flow", nodes: ["Directory entry → inode", "Inode → allocated blocks", "Metadata + CRC32 checksums"], caption: "Directory entries, allocation state and checksums are written back." },
  ],
  "pet-segmentation": [
    { stage: "Image + trimap", file: "Training input", kind: "mask", phase: 0, caption: "Schematic pet and trimap. The training data comes from Oxford-IIIT Pet." },
    { stage: "Shared encoder", file: "Shared U-Net features", kind: "flow", nodes: ["Image → encoder", "Bottleneck features", "Decoder + classification head"], caption: "One encoder supplies features to the segmentation and classification tasks." },
    { stage: "Mask + class", file: "Two output heads", kind: "mask", phase: 1, caption: "A foreground mask and an image-level class are separate outputs." },
    { stage: "Evaluation", file: "Compare predictions", kind: "table", columns: ["Task", "Review"], rows: [["Segmentation", "True mask vs predicted mask"], ["Mask overlap", "IoU / Dice"], ["Classification", "Predicted class vs label"]], caption: "Compare mask overlap and classification after the experimental training run." },
  ],
  "opengl-games": [
    { stage: "Input", file: "Keyboard callbacks", kind: "scene", phase: 0, caption: "A schematic catcher scene: keyboard input changes horizontal movement." },
    { stage: "Game state", file: "State update", kind: "scene", phase: 1, caption: "The game updates object positions, checks collisions and tracks the score." },
    { stage: "Transforms", file: "Coordinate transforms", kind: "code", lines: ["Input coordinates", "        ↓", "Model / world coordinates", "        ↓", "View + projection", "        ↓", "Screen coordinates"], caption: "2D and 3D exercises use different transforms before drawing." },
    { stage: "OpenGL render", file: "Draw the frame", kind: "scene", phase: 2, caption: "The scene is redrawn through OpenGL / GLUT callbacks." },
  ],
  "recipe-database": [
    { stage: "Recipes", file: "Recipe entity", kind: "table", columns: ["Entity", "Purpose"], rows: [["Recipe", "Identifies a dish"], ["Attributes", "Describe the recipe"], ["Relationships", "Connect it to the rest of the schema"]], caption: "This project is a database design, presented through its ER relationships." },
    { stage: "Ingredients + culture", file: "Recipe relationships", kind: "flow", nodes: ["Ingredients ↔ Recipe", "Recipe ↔ Tags", "Recipe ↔ Cultural details"], caption: "Related entities describe what a recipe contains and its cultural context." },
    { stage: "Users", file: "User specialization", kind: "flow", nodes: ["User", "Admin / Regular user", "Role-specific relationships"], caption: "The diagram models users and their specialization." },
    { stage: "Reviews + saved recipes", file: "Relationship paths", kind: "flow", nodes: ["User → Review → Recipe", "User → Saved recipe → Recipe"], caption: "Reviews and saved recipes each link a user to a recipe in the ER design." },
  ],
  "central-public-college": [
    { stage: "Admin edit", file: "Content editor", kind: "table", columns: ["Content", "Editor action"], rows: [["Public information", "Edit text"], ["Gallery", "Manage images"], ["Admission guidance", "Update information"]], caption: "The admin portal manages the content shown on the public site." },
    { stage: "Firebase content", file: "Shared content", kind: "flow", nodes: ["Admin portal", "Firebase Realtime Database", "Public React interface"], caption: "The editor and public pages read from the same content source." },
    { stage: "React interface", file: "Bilingual interface", kind: "flow", nodes: ["Shared content", "React + TypeScript components", "বাংলা / English"], caption: "The public interface presents content in Bangla and English." },
    { stage: "Public information", file: "Public pages", kind: "table", columns: ["Page content", "Visitor task"], rows: [["Academic programs", "Explore study options"], ["Admission guidance", "Read application information"], ["Gallery", "Browse college images"], ["Contact", "Find contact details"]], caption: "The same information is arranged for desktop and mobile screens." },
  ],
  "portfolio-platform": [
    { stage: "Admin studio", description: "Edit projects, page text and the selected CV in the admin panel.", file: "Content draft", kind: "flow", nodes: ["Edit content", "Preview draft", "Save changes"], caption: "The studio edits the content used across this portfolio." },
    { stage: "Authenticated API", description: "The save request checks the admin session and validates the content.", file: "Content request", kind: "code", lines: ["PUT /api/content", "", "Admin session → authenticate", "Content body  → validate", "Valid update  → save"], caption: "Authentication and validation happen before a content update is accepted." },
    { stage: "Portfolio data", description: "Persist validated content in the configured content store.", file: "Content storage", kind: "flow", nodes: ["Validated content", "Local JSON / private Blob on Vercel", "Shared portfolio content"], caption: "The storage adapter uses local files or Vercel Blob, depending on the environment." },
    { stage: "Server-rendered pages", description: "Render the portfolio from the saved content, with client-side interactions.", file: "Page rendering", kind: "flow", nodes: ["Saved portfolio content", "Next.js server-rendered pages", "Interactive React components"], caption: "GitHub Pages uses a static export of the same site." },
  ],
  "admission-lottery": [
    { stage: "Web interface", description: "Use the web interface to enter and review admission information.", file: "Browser input", kind: "flow", nodes: ["Admission information", "Web form", "Submit request"], caption: "A simplified view of the browser-to-application flow." },
    { stage: "Flask application", description: "Handle the request in the Flask application and apply the admission workflow.", file: "Application layer", kind: "flow", nodes: ["Incoming request", "Flask application logic", "Response"], caption: "The application connects the interface to its backend operations." },
    { stage: "API layer", description: "Pass structured information between the interface and backend.", file: "Request / response", kind: "code", lines: ["Browser", "   ↓ request", "Flask API", "   ↓ application logic", "Structured response", "   ↓", "Updated interface"], caption: "Requests enter through the API; responses update the interface." },
    { stage: "Database migrations", description: "Keep the database structure aligned with the application's models.", file: "Database structure", kind: "flow", nodes: ["SQLAlchemy models", "Database migrations", "Updated schema"], caption: "Migrations track structural changes to the database." },
  ],
  "lifeline": [
    { stage: "Request / offer", description: "Post a request for help or an offer to support someone nearby.", file: "Community post", kind: "flow", nodes: ["Someone needs a hand", "Request / offer", "Someone can help"], caption: "The community workflow starts with a request or an offer." },
    { stage: "Location + urgency", description: "Add location and urgency so people can understand where help is needed.", file: "Post context", kind: "table", columns: ["Detail", "Purpose"], rows: [["Location", "Find nearby activity"], ["Urgency", "Understand priority"], ["Availability", "See who can help"]], caption: "Location and urgency add useful context to a community post." },
    { stage: "Community discovery", description: "Browse requests and offers through the community interface and map.", file: "Discover nearby activity", kind: "flow", nodes: ["Requests + offers", "Map and community discovery", "Open a relevant post"], caption: "People discover activity and decide which post to respond to." },
    { stage: "Real-time chat", description: "Use real-time chat to coordinate with the person behind a post.", file: "Conversation", kind: "flow", nodes: ["Send message", "Socket.IO", "Receive reply"], caption: "Chat supports the conversation after people connect." },
  ],
  "icu-analyzer": [
    { stage: "ICU report", description: "Upload an ICU report to begin the document workflow.", file: "Report upload", kind: "flow", nodes: ["Scanned ICU report", "Upload document", "Prepare for extraction"], caption: "A schematic document workflow for the academic prototype." },
    { stage: "OCR extraction", description: "Extract text from the uploaded report so lab fields can be identified.", file: "Text extraction", kind: "flow", nodes: ["Report image", "OCR text", "Identify lab fields"], caption: "Text extraction precedes the structured lab-value stage." },
    { stage: "Structured lab values", description: "Organize extracted lab fields into structured values for the workflow.", file: "Lab fields", kind: "table", columns: ["Extracted field", "Structured representation"], rows: [["WBC", "Value + unit"], ["Platelets", "Value + unit"], ["Creatinine", "Value + unit"], ["Glucose", "Value + unit"]], caption: "Lab fields pair an extracted value with its unit." },
    { stage: "CNN + LSTM research", description: "Explore the proposed CNN + LSTM approach for mortality-risk research.", file: "Research model", kind: "flow", nodes: ["Structured data", "Proposed CNN + LSTM approach", "Research analysis"], caption: "Proposed academic model; this is not a live prediction or clinical result." },
    { stage: "Report review", description: "Review the processed report within the prototype.", file: "Review workflow", kind: "flow", nodes: ["Processed report", "Review extracted information", "Research context"], caption: "Academic prototype · non-clinical validation." },
  ],
};

export function getWalkthroughExample(project: Pick<Project, "slug">, title: string) {
  return EXAMPLES[project.slug]?.find(example => example.stage === title);
}

export function getWalkthroughScenePhase(project: Pick<Project, "slug">, title: string) {
  return Math.max(0, EXAMPLES[project.slug]?.findIndex(example => example.stage === title) ?? 0);
}
