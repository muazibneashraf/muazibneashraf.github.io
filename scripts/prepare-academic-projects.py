"""Prepare the approved academic projects locally. Never commits or publishes."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import zipfile
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
GITHUB = "https://github.com/muazibneashraf/Bracu_Courses/tree/main/"
CROP = {"x": 50, "y": 50, "zoom": 100, "fit": "contain"}


def project(slug, title, category, course, summary, description, stack, challenge,
            outcomes, limitations, source, flow, credits=()):
    return {
        "id": slug, "slug": slug, "title": title, "year": course,
        "category": category, "summary": summary, "description": description,
        "stack": stack, "repository": GITHUB + quote(source, safe="/"),
        "liveUrl": "", "role": "Academic project" if "CSE" in course else "Website development",
        "challenge": challenge, "outcomes": outcomes, "limitations": limitations,
        "flow": flow, "credits": [{"label": "Context", "value": course},
            *[{"label": k, "value": v} for k, v in credits]],
        "cover": "", "coverCrop": CROP,
        "featured": True, "aspect": "landscape", "videoUrl": "",
        "gallery": [], "galleryCrops": [],
        "walkthroughSteps": [],
        "visual": {"kind": "custom", "heading": title, "description": category,
                   "footer": course, "labels": flow},
    }


PROJECTS = [
    project("customer-churn", "Customer Churn Prediction", "AI / ML", "CSE422 · Spring 2025",
        "A group project comparing five machine-learning models for predicting customer churn.",
        "We worked with consumer data to predict whether a customer would leave a service. We cleaned the data, prepared the features and compared five classifiers using the same train/test split. The report brings together our results and the reasoning behind the comparison.",
        ["Python", "scikit-learn", "pandas", "NumPy", "Matplotlib", "Jupyter"],
        "Prepare a mix of numerical and categorical data, then compare the models fairly.",
        ["Prepared numerical and categorical features for a binary churn-prediction task.",
         "Compared Logistic Regression, Decision Tree, Neural Network, KNN and Naive Bayes classifiers.",
         "Documented the dataset, preprocessing, model training and comparison in a jointly authored course report."],
        "A CSE422 course group project. The results come from the course dataset.",
        "CSE422", ["Consumer data", "Preprocessing", "Model comparison", "Evaluation"],
        [("Project type", "Course group project")]),
    project("compiler-toolchain", "Compiler Front End & Intermediate Code", "Systems", "CSE420 · Compiler labs",
        "A small compiler for a C-like language, built across three Flex and Bison labs.",
        "I built this in stages: first the scanner and parser, then symbol tables and semantic checks, followed by an abstract syntax tree and intermediate-code generation. Each lab builds on the previous one, so the source shows how the compiler developed.",
        ["C++", "Flex", "Bison", "Compiler design"],
        "Track variables and scope, catch invalid programs and turn supported expressions into intermediate code.",
        ["Defined token recognition and grammar rules with Flex and Bison.",
         "Implemented scoped symbol-table structures and semantic error reporting across successive lab stages.",
         "Added AST node structures and three-address-code generation in the later submission."],
        "The compiler handles the language subset used in the CSE420 labs. The repository keeps each stage separately.",
        "CSE420", ["Source", "Lexer / parser", "AST + symbols", "Intermediate code"]),
    project("minivsfs", "MiniVSFS File System Tools", "Systems", "CSE321 · File systems",
        "Two C programs: one builds a filesystem image, the other adds files to it.",
        "For CSE321, we worked directly with the disk layout: a superblock, inode table, allocation bitmaps and directory entries. The file-adder finds free space, writes the file and updates the metadata.",
        ["C", "File systems", "CRC32", "CLI"],
        "Write file contents and update the filesystem metadata without leaving them out of sync.",
        ["Implemented image creation with configurable image size and inode count.",
         "Represented allocation with inode/data bitmaps and up to 12 direct data blocks per file.",
         "Added file insertion and metadata checksums, including CRC32 helpers."],
        "A CSE321 course group project. The tools read and write image files; they do not mount a filesystem.",
        "CSE321/MiniVSFS_Group9_Submission", ["Create image", "Allocate blocks", "Write file", "Update metadata"],
        [("Project type", "Course group project")]),
    project("pet-segmentation", "Pet Segmentation & Classification", "AI / ML", "CSE428 · Spring 2026",
        "A PyTorch project that predicts a pet's breed and separates it from the image background.",
        "I used the Oxford-IIIT Pet dataset to work on two tasks together: finding the animal in each image and predicting its breed. A shared U-Net encoder feeds a mask decoder and a classification head. I also implemented attention gates and wrote scripts for training, evaluation and visual comparisons.",
        ["Python", "PyTorch", "NumPy", "Matplotlib", "U-Net", "Jupyter"],
        "Use the same image features for both a foreground mask and a breed prediction.",
        ["Prepared binary foreground masks from trimaps, including boundary pixels.",
         "Implemented base and attention-gated U-Net variants with a joint classification head.",
         "Prepared training, evaluation and three-panel prediction visualization tools; retained a short CPU training run locally."],
        "The saved local run is a short CPU experiment. It is useful for checking the training and visualization code, but it is not a final benchmark of the two variants.",
        "Other-Courses/CSE428", ["Image + trimap", "Shared encoder", "Mask + class", "Evaluation"]),
    project("opengl-games", "OpenGL Interactive Graphics", "Graphics", "CSE423 · Graphics coursework",
        "Two graphics assignments: a diamond-catching game and a 3D shooting game.",
        "These CSE423 assignments helped me work through drawing, movement and camera controls in OpenGL. The 2D game draws with a midpoint line algorithm. The 3D game adds a player, enemies, projectiles and different camera views.",
        ["Python", "PyOpenGL", "GLUT", "Computer graphics"],
        "Keep drawing, input and collision checks working together as the scene changes.",
        ["Used a midpoint line algorithm and point drawing to render the 2D diamond-catching scene.",
         "Implemented input callbacks, collision checks, scoring and restart/pause behaviour in the game submissions.",
         "Built a 3D scene with camera controls, moving enemies and projectiles."],
        "Built for the CSE423 assignment tasks using course templates. The repository also contains scaffold and assisted-development versions alongside my named submissions.",
        "CSE423", ["Input", "Game state", "Transforms", "OpenGL render"]),
    project("recipe-database", "Recipe & Cultural Heritage Database", "Database design", "CSE370 · Database design",
        "ER and schema diagrams for a recipe collection with reviews and cultural details.",
        "I designed a database for traditional and modern recipes, including their ingredients and cultural background. Users can be linked to reviews and saved recipes, while tags and cultural details connect back to each recipe. The work includes an ER diagram and a relational schema.",
        ["Database design", "ER modeling", "draw.io"],
        "Decide which information belongs in its own entity and how the relationships should connect.",
        ["Modelled recipes, ingredients, cultural details, tags, users, reviews and saved recipes.",
         "Represented traditional/modern recipe and admin/regular user specializations.",
         "Prepared ER and schema diagrams to communicate relationships and key fields."],
        "This entry covers the two database-design diagrams prepared for CSE370.",
        "CSE370", ["Recipes", "Ingredients + culture", "Users", "Reviews + saved recipes"]),
    project("central-public-college", "Central Public College Website", "Full-stack", "College website",
        "A Bengali and English college website with an admin panel for content updates.",
        "I built this site for Gazipur Central Public College using React and TypeScript. It puts programs, admission guidance, campus photos and contact details in one place. The admin panel updates the same content used by the public pages through Firebase Realtime Database.",
        ["React", "TypeScript", "Vite", "Firebase", "Tailwind CSS"],
        "Make college information easy to find on a phone and easy for the admin to update.",
        ["Built responsive public sections and mobile navigation for college and admission information.",
         "Connected editable site content to an admin portal and Firebase Realtime Database integration.",
         "Included loading states, scroll reveals and fallback content."],
        "The site includes fallback content so its public information can still be shown when the database is unavailable.",
        "", ["Admin edit", "Firebase content", "React interface", "Public information"]),
]
PROJECTS[-1]["repository"] = "https://github.com/muazibneashraf/Central-Public-college-Dashboard"

STEP_DETAILS = {
    "customer-churn": ["Inspect demographic, purchasing and membership features with a binary Churn target.", "Handle missing values, encode categorical features and scale numerical columns.", "Train and compare supervised classifiers on a consistent data split.", "Review classification metrics and the model-comparison report."],
    "compiler-toolchain": ["Read a program written in the supported C-like language subset.", "Recognize tokens and apply the Flex/Bison grammar.", "Track scoped symbols, report semantic errors and build AST nodes.", "Translate supported AST constructs into three-address intermediate code."],
    "minivsfs": ["Create the image, superblock, inode table and root directory.", "Find free inode and data-block positions in the allocation bitmaps.", "Copy file contents into allocated direct blocks.", "Write directory entries, inode metadata and checksums back to the image."],
    "pet-segmentation": ["Load Oxford-IIIT Pet images and convert trimaps into binary foreground masks.", "Encode the image with shared U-Net features; the attention variant gates skip connections.", "Decode a segmentation mask and predict an image-level class from the bottleneck.", "Evaluate mask overlap and classification metrics, then visualize true and predicted masks."],
    "opengl-games": ["Read keyboard and mouse callbacks for movement and game controls.", "Update positions, collisions, scores and game state.", "Apply coordinate, model and camera transforms for the current scene.", "Draw the 2D or 3D scene through OpenGL and GLUT callbacks."],
    "recipe-database": ["Model traditional and modern recipes with their identifying fields.", "Connect ingredients, tags and cultural details to recipes.", "Represent user entities and their admin/regular specialization.", "Link reviews and saved recipes to both users and recipes in the schema."],
    "central-public-college": ["Edit the college's public content through the admin portal.", "Read shared content through Firebase Realtime Database integration.", "Render the bilingual public interface with React and TypeScript.", "Present academic programs, admission guidance, gallery and contact information."],
}
SCENE_COPY = {
    "customer-churn": ("CLASSIFIER COMPARISON", "FEATURES / CLASSIFIERS"),
    "compiler-toolchain": ("FROM SOURCE TO CODE", "TOKENS / AST / IR"),
    "minivsfs": ("ON-DISK LAYOUT", "INODES / BITMAPS / BLOCKS"),
    "pet-segmentation": ("SEGMENTATION STUDY", "IMAGE / MASK / BREED"),
    "opengl-games": ("2D + 3D SCENES", "INPUT / COLLISIONS / CAMERA"),
    "recipe-database": ("RECIPE RELATIONSHIPS", "ENTITIES / KEYS / RELATIONSHIPS"),
    "central-public-college": ("CONTENT EDITING", "PUBLIC PAGES / CONTENT UPDATES"),
}
for item in PROJECTS:
    years = {"customer-churn": "2025", "pet-segmentation": "2026"}
    item["year"] = years.get(item["id"], "")
    item["credits"] = [{"label": credit["label"], "value": "Group project" if credit["value"] == "Course group project" else credit["value"]}
                       for credit in item["credits"] if credit["label"] != "Context"]
    replacements = {
        "A CSE422 course group project.": "A group project built around a consumer dataset.",
        "For CSE321, we worked": "We worked",
        "A CSE321 course group project.": "A group project.",
        "The compiler handles the language subset used in the CSE420 labs.": "The compiler handles a small C-like language.",
        "These CSE423 assignments": "These graphics projects",
        "Built for the CSE423 assignment tasks using course templates.": "Based on assignment tasks and supplied templates.",
        "This entry covers the two database-design diagrams prepared for CSE370.": "The work consists of two database-design diagrams.",
    }
    for field in ["summary", "description", "challenge", "limitations"]:
        for old, new in replacements.items():
            item[field] = item[field].replace(old, new)
    item["visual"]["heading"], item["visual"]["footer"] = SCENE_COPY[item["id"]]
    item["role"] = {
        "customer-churn": "Group project", "compiler-toolchain": "Compiler project",
        "minivsfs": "File systems project", "pet-segmentation": "Image processing project",
        "opengl-games": "Graphics projects", "recipe-database": "Database design",
        "central-public-college": "Website development",
    }[item["id"]]
    item["walkthroughSteps"] = [{
        "id": f"{item['id']}-step-{i + 1}", "title": title,
        "detail": STEP_DETAILS[item["id"]][i], "tech": item["stack"][:3],
        "payload": json.dumps({"stage": title, "context": "Illustrative workflow", "project": item["title"]}, indent=2),
    } for i, title in enumerate(item["flow"])]


def prepare(study):
    baseline = ROOT / "tmp/academic-sync-baseline"
    baseline.mkdir(parents=True, exist_ok=True)
    content_path = ROOT / "data/portfolio-content.json"
    if not (baseline / "portfolio-content.json").exists():
        shutil.copy2(content_path, baseline / "portfolio-content.json")
        shutil.copy2(ROOT / "public/resume.pdf", baseline / "resume.pdf")
    content = json.loads(content_path.read_text(encoding="utf-8"))
    existing = {p["id"] for p in PROJECTS}
    content["projects"] = [p for p in content["projects"] if p["id"] not in existing] + PROJECTS
    featured = {"icu-analyzer", "lifeline", "customer-churn", "central-public-college"}
    for item in content["projects"]:
        item["featured"] = item["id"] in featured
    additions = {"web": ["Vite", "Firebase"], "data": ["pandas"],
                 "ai": ["scikit-learn", "U-Net"], "tools": ["Flex", "Bison", "PyOpenGL"]}
    for group in content["sections"]["skills"]["groups"]:
        for skill in additions.get(group["id"], []):
            if skill not in group["items"]:
                group["items"].append(skill)
            if skill not in content["about"]["skills"]:
                content["about"]["skills"].append(skill)
    for p in content["projects"]:
        if p["id"] == "portfolio-platform":
            p["repository"] = "https://github.com/muazibneashraf/muazibneashraf.github.io"
            p.update({
                "summary": "The site you're on, with an admin panel for updating projects, page text and my CV.",
                "description": "I built this portfolio with Next.js, React and TypeScript. Project pages, the homepage and the admin panel share the same content. I can update that content and read contact messages without editing the page components.",
                "challenge": "Keep the site easy to update while giving visitors a clear view of my work.",
                "outcomes": ["Connected the homepage, project pages and admin panel to shared content.",
                             "Built the project archive, contact inbox and in-page CV viewer.",
                             "Added the interactive globe, project diagrams and motion controls."],
                "limitations": "I maintain the content through the admin panel and the application code in the linked repository.",
            })
        elif p["id"] == "admission-lottery":
            p["repository"] = "https://github.com/muazibneashraf/College_Admission_System"
            p.update({
                "summary": "A Flask application for college admission and lottery workflows.",
                "description": "I built this project around a Flask backend, separate page assets and database migrations. The repository includes the application routes, configuration and Render deployment setup.",
                "challenge": "Keep the admission workflow, database changes and deployment setup in a structure I can maintain.",
                "outcomes": ["Separated the Flask application code from its page assets and configuration.",
                             "Organized the API routes and database migrations.",
                             "Prepared the application configuration for Render."],
                "limitations": "A personal web application. The repository contains the source and deployment configuration.",
            })
    content["sections"]["walkthrough"].update({
        "intro": "Choose a project and step through how it works.",
        "modeLabel": "PROJECT FLOW", "requestLabel": "STEP",
        "stepDetail": "The example below shows the shape of the data at this step.",
    })
    content["sections"]["projectsPage"].update({
        "eyebrow": "PROJECTS",
        "intro": "Things I've built and worked on, from course assignments to web applications. Open a project for the details and code.",
    })
    descriptions = [
        "I helped organize club activities as part of the organising and management team.",
        "I was a junior executive in the forum during my time at BRAC University.",
        "I was a general member while studying computer science at BRAC University.",
        "I handled communications as the club's secretary.",
        "I've volunteered with Ashia Foundation since 2018.",
    ]
    for item, description in zip(content["extracurricular"]["items"], descriptions):
        item["description"] = description
    content_path.write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    course = study / "BracU_Courses"
    manifest = []

    def write(relative, data, origin):
        dest = course / relative
        if dest.exists() and dest.read_bytes() != data:
            raise RuntimeError(f"Will not overwrite a differing file: {dest}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        manifest.append({"path": relative, "source": origin, "sha256": hashlib.sha256(data).hexdigest()})

    for stage, archive in [("lab-02", "CSE420/21101177_Lab 2.zip"),
                           ("lab-03", "CSE420/21101177_Lab 3.zip"),
                           ("lab-04", "CSE420/lab4/21101177.zip")]:
        with zipfile.ZipFile(study / archive) as z:
            for entry in z.infolist():
                if entry.is_dir():
                    continue
                name = Path(entry.filename).name
                if Path(name).suffix in {".l", ".y", ".h", ".c", ".sh"}:
                    write(f"CSE420/{stage}/{name}", z.read(entry), f"{archive}!{entry.filename}")
    with zipfile.ZipFile(study / "CSE321/21101177_CSE321_Lab Assignment 02.zip") as z:
        for name in ["problem_1.c", "problem_2.c"]:
            write(f"CSE321/21101177_LabAssignment2/{name}", z.read(f"New folder/{name}"),
                  f"CSE321/21101177_CSE321_Lab Assignment 02.zip!New folder/{name}")
    # Only student-labelled network submissions, not the peer/reference folders.
    for folder in (study / "CSE421").iterdir():
        if folder.is_dir() and folder.name.startswith("21101177"):
            for file in folder.rglob("*.pka"):
                write(str(file.relative_to(study)).replace("\\", "/"), file.read_bytes(), str(file.relative_to(study)))
    docs = [
        ("CSE422/CSE422 Project Report Final The Main One.docx", "CSE422/reports/Customer_Churn_Group17.docx"),
        ("CSE340/21101177_10.pdf", "CSE340/21101177_Cache_Conscious_Design.pdf"),
        ("CSE428/21101177_A1.pdf", "Other-Courses/CSE428/reports/21101177_CNN_and_Vision_Transformer.pdf"),
        ("cse341/21101177_CSE341 Assignment 1.pdf", "CSE341/21101177_Assignment1.pdf"),
        ("CSE461/G1_LabReport02_CSE461.docx.pdf", "CSE461/reports/Group1_Ultrasonic_Distance.pdf"),
        ("CSE461/G1_LabReport03_CSE461.pdf", "CSE461/reports/Group1_Servo_Motor.pdf"),
        ("CSE461/21101177_ Muaz Ibne Ashraf_04_CSE461 Lab Report (Kinematics).pdf", "CSE461/reports/21101177_Kinematics.pdf"),
        ("CST309/CST309 group project.pdf", "Other-Courses/CST309/Group6_Digital_Rights.pdf"),
        ("CST309/21101177_Muaz Ibne Ashraf_04_CST309_Midterm Assessment.docx", "Other-Courses/CST309/21101177_Democratic_Exclusion.docx"),
    ]
    for source, dest in docs:
        write(dest, (study / source).read_bytes(), source)
    for file in (study / "CSE370").glob("21101177*.pdf"):
        write(f"CSE370/reports/{file.name}", file.read_bytes(), str(file.relative_to(study)))
    review = ROOT / "docs/academic-sync"
    review.mkdir(parents=True, exist_ok=True)
    (review / "prepared-files.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(PROJECTS)} portfolio entries and {len(manifest)} coursework files locally.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--study-root", type=Path, default=Path("D:/Study"))
    prepare(parser.parse_args().study_root)
