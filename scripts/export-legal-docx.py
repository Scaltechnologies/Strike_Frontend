"""Builds DOCX versions of the legal documents from legal-docs/legal-documents.json.

Run after `node scripts/export-legal-html.mts` (which writes the JSON):
    python scripts/export-legal-docx.py
Requires python-docx (`pip install python-docx`). It is a release-tooling script only, not an
app dependency.
"""
import json
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.opc.constants import RELATIONSHIP_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "legal-docs"
OUT = {"terms": "STRIKE_Terms_and_Conditions.docx", "privacy": "STRIKE_Privacy_Policy.docx",
       "accountDeletion": "STRIKE_Account_Deletion.docx"}
PRIMARY = RGBColor(0xCC, 0x22, 0x00)
TEXT = RGBColor(0x1A, 0x1A, 0x1A)


def add_hyperlink(paragraph, text, url, bold):
    rel = paragraph.part.relate_to(url, RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), rel)
    run = OxmlElement("w:r")
    props = OxmlElement("w:rPr")
    for tag, val in (("w:color", "CC2200"), ("w:u", "single")):
        el = OxmlElement(tag)
        el.set(qn("w:val"), val)
        props.append(el)
    if bold:
        props.append(OxmlElement("w:b"))
    run.append(props)
    t = OxmlElement("w:t")
    t.text = text
    t.set(qn("xml:space"), "preserve")
    run.append(t)
    link.append(run)
    paragraph._p.append(link)


def fill(paragraph, segments):
    for seg in segments:
        if seg["kind"] == "link":
            add_hyperlink(paragraph, seg["text"], seg["href"], seg["bold"])
        else:
            paragraph.add_run(seg["text"]).bold = seg["bold"]


def build(doc_json, path):
    d = Document()
    normal = d.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    for level, size in ((1, 18), (2, 14), (3, 12)):
        st = d.styles[f"Heading {level}"]
        st.font.color.rgb = PRIMARY if level < 3 else TEXT
        st.font.size = Pt(size)

    p = d.add_paragraph("STRIKE · " + doc_json["company"]["legalName"])
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title = d.add_heading(doc_json["title"], level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for label, key in (("Effective date", "effectiveDate"), ("Last updated", "lastUpdated")):
        if doc_json.get(key):
            m = d.add_paragraph(f"{label}: {doc_json[key]}")
            m.alignment = WD_ALIGN_PARAGRAPH.CENTER

    for section in doc_json["sections"]:
        d.add_heading(section["heading"], level=1)
        for block in section["body"]:
            if "paragraph" in block:
                fill(d.add_paragraph(), block["paragraph"])
            elif "subheading" in block:
                d.add_heading(block["subheading"], level=3)
            elif "bullets" in block:
                for item in block["bullets"]:
                    fill(d.add_paragraph(style="List Bullet"), item)
            elif "numbered" in block:
                for n, item in enumerate(block["numbered"], 1):
                    # Explicit numbers so each list restarts at 1 regardless of Word's list state.
                    para = d.add_paragraph()
                    para.paragraph_format.left_indent = Pt(18)
                    para.paragraph_format.first_line_indent = Pt(-18)
                    para.add_run(f"{n}.\t")
                    fill(para, item)

    footer = d.sections[0].footer.paragraphs[0]
    footer.text = f"© 2026 {doc_json['company']['legalName']}  |  {doc_json['title']}"
    d.save(path)


def main():
    data = json.loads((DOCS / "legal-documents.json").read_text(encoding="utf-8"))
    for key, name in OUT.items():
        if data[key]["isDraft"]:
            print(f"skip {name}: document is a draft", file=sys.stderr)
            continue
        build(data[key], DOCS / name)
        print(f"wrote {DOCS / name}")


if __name__ == "__main__":
    main()
