"""PDF to image conversion and text extraction for electrical drawing analysis."""

import io
import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
from PIL import Image


# Room name patterns for matching table rows
_ROOM_KEYWORDS = {
    "garage", "bedroom", "bath", "bathroom", "kitchen", "living", "dining",
    "hallway", "hall", "entrance", "foyer", "laundry", "closet", "pantry",
    "office", "den", "family", "powder", "utility", "mechanical", "mudroom",
    "stairway", "stairs", "ensuite", "primary", "master", "wic", "w.i.c",
    "suite", "patio", "deck", "entry", "mech", "nook",
}

# Standardized room type mapping from common PDF labels
_ROOM_TYPE_MAP = {
    "garage": "garage",
    "bedroom": "bedroom",
    "master bedroom": "primary_bedroom",
    "primary bedroom": "primary_bedroom",
    "bath": "bathroom",
    "bathroom": "bathroom",
    "ensuite": "bathroom",
    "en-suite": "bathroom",
    "powder": "powder_room",
    "powder room": "powder_room",
    "kitchen": "kitchen",
    "living": "living_room",
    "living room": "living_room",
    "dining": "dining_room",
    "dining room": "dining_room",
    "hallway": "hallway",
    "hall": "hallway",
    "hall way": "hallway",
    "entrance": "entry_foyer",
    "foyer": "entry_foyer",
    "entry": "entry_foyer",
    "laundry": "laundry_room",
    "closet": "closet_standard",
    "wic": "closet_walkin",
    "w.i.c": "closet_walkin",
    "walk-in closet": "closet_walkin",
    "pantry": "pantry",
    "office": "office_den",
    "den": "office_den",
    "family": "family_room",
    "family room": "family_room",
    "utility": "utility_room",
    "mechanical": "utility_room",
    "mudroom": "mudroom",
    "stairway": "stairway",
    "stairs": "stairway",
    "suite": "bedroom",
    "patio": "patio",
    "deck": "patio",
    "mech": "utility_room",
    "nook": "dining_room",
}

# Level name normalization
_LEVEL_MAP = {
    "ground": "main",
    "ground floor": "main",
    "1st floor": "main",
    "first floor": "main",
    "main floor": "main",
    "main": "main",
    "2nd floor": "upper",
    "second floor": "upper",
    "upper": "upper",
    "3rd floor": "upper_2",
    "third floor": "upper_2",
    "basement": "basement",
    "lower": "basement",
}


class PDFProcessor:
    """Converts PDF drawing pages to high-resolution images for AI analysis."""

    DEFAULT_DPI = 300
    MAX_DPI = 600

    def __init__(self, dpi: int = DEFAULT_DPI):
        self.dpi = min(dpi, self.MAX_DPI)
        self._zoom = self.dpi / 72  # PDF default is 72 DPI

    def load_pdf(self, pdf_path: str | Path) -> fitz.Document:
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        if not pdf_path.suffix.lower() == ".pdf":
            raise ValueError(f"Not a PDF file: {pdf_path}")
        return fitz.open(str(pdf_path))

    def get_page_count(self, pdf_path: str | Path) -> int:
        doc = self.load_pdf(pdf_path)
        count = len(doc)
        doc.close()
        return count

    def get_page_thumbnails(
        self, pdf_path: str | Path, thumb_width: int = 300
    ) -> list[Image.Image]:
        """Generate small thumbnails for page selection UI."""
        doc = self.load_pdf(pdf_path)
        thumbnails = []
        for page in doc:
            # Low-res render for thumbnails
            mat = fitz.Matrix(0.5, 0.5)
            pix = page.get_pixmap(matrix=mat)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            img.thumbnail((thumb_width, thumb_width), Image.LANCZOS)
            thumbnails.append(img)
        doc.close()
        return thumbnails

    def page_to_image(
        self, pdf_path: str | Path, page_number: int
    ) -> Image.Image:
        """Convert a single PDF page to a high-resolution PIL Image."""
        doc = self.load_pdf(pdf_path)
        if page_number < 0 or page_number >= len(doc):
            doc.close()
            raise IndexError(
                f"Page {page_number} out of range (0-{len(doc) - 1})"
            )
        page = doc[page_number]
        mat = fitz.Matrix(self._zoom, self._zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        doc.close()
        return img

    def pages_to_images(
        self,
        pdf_path: str | Path,
        page_numbers: Optional[list[int]] = None,
    ) -> dict[int, Image.Image]:
        """Convert multiple PDF pages to images. If page_numbers is None, convert all."""
        doc = self.load_pdf(pdf_path)
        if page_numbers is None:
            page_numbers = list(range(len(doc)))

        images = {}
        mat = fitz.Matrix(self._zoom, self._zoom)
        for pn in page_numbers:
            if 0 <= pn < len(doc):
                pix = doc[pn].get_pixmap(matrix=mat, alpha=False)
                images[pn] = Image.open(io.BytesIO(pix.tobytes("png")))
        doc.close()
        return images

    def image_to_bytes(self, img: Image.Image, format: str = "PNG") -> bytes:
        """Convert a PIL Image to bytes for API submission."""
        buf = io.BytesIO()
        img.save(buf, format=format)
        return buf.getvalue()

    def enhance_for_analysis(self, img: Image.Image) -> Image.Image:
        """Pre-process image for better AI symbol detection."""
        from PIL import ImageEnhance, ImageFilter

        # Increase contrast for clearer symbol edges
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.3)
        # Slight sharpening
        img = img.filter(ImageFilter.SHARPEN)
        return img

    def extract_room_table(
        self, pdf_path: str | Path
    ) -> Optional[list[dict]]:
        """Try to extract a room schedule/count table from the PDF.

        Looks for structured tables with room names, areas, and floor levels.
        Returns a list of dicts: [{"name": str, "area_sqft": float, "level": str}]
        or None if no room table is found.
        """
        doc = self.load_pdf(pdf_path)
        rooms = None

        for page_num in range(len(doc)):
            page = doc[page_num]

            # Method 1: Try PyMuPDF's find_tables() (v1.23+)
            rooms = self._try_find_tables(page)
            if rooms:
                break

            # Method 2: Fall back to text-based parsing
            rooms = self._try_text_parsing(page)
            if rooms:
                break

        doc.close()
        return rooms

    def _try_find_tables(self, page) -> Optional[list[dict]]:
        """Use PyMuPDF's built-in table detection if available."""
        try:
            tables = page.find_tables()
        except AttributeError:
            return None  # PyMuPDF version too old

        for table in tables:
            data = table.extract()
            if not data or len(data) < 3:
                continue

            # Try first few rows as potential header (skip title rows like "ROOM")
            header_idx = None
            name_col = None
            area_col = None
            level_col = None

            for try_row in range(min(5, len(data))):
                row_cells = [
                    str(cell).strip().lower() if cell else ""
                    for cell in data[try_row]
                ]
                nc = ac = lc = None
                for i, h in enumerate(row_cells):
                    if any(kw in h for kw in ("area", "sq ft", "sqft", "sf")):
                        ac = i
                    elif any(kw in h for kw in ("level", "floor", "storey", "story")):
                        lc = i
                    elif any(kw in h for kw in ("name", "space")):
                        nc = i
                # Need at minimum area + name columns to confirm header
                if ac is not None and nc is not None:
                    header_idx = try_row
                    name_col, area_col, level_col = nc, ac, lc
                    break

            if header_idx is None or name_col is None or area_col is None:
                continue

            rooms = []
            current_section_level = ""

            for row in data[header_idx + 1:]:
                cells = [str(cell).strip() if cell else "" for cell in row]

                name = cells[name_col] if name_col < len(cells) else ""
                area_str = cells[area_col] if area_col < len(cells) else ""

                # Skip empty rows and totals
                name_lower = name.lower().strip()
                if not name and not area_str:
                    continue
                if any(kw in name_lower for kw in ("total", "grand total")):
                    continue
                # Skip pure total rows (area with no name or vice versa)
                if not name and area_str:
                    continue

                # Detect section headers: row with name but no valid area,
                # or name matches a level keyword (e.g., "BASEMENT", "MAIN FLOOR")
                area_val = self._parse_area(area_str)
                is_level = any(
                    lk in name_lower
                    for lk in ("basement", "main", "upper", "ground", "first",
                               "second", "third", "lower", "1st", "2nd", "3rd")
                )
                non_empty = sum(1 for c in cells if c.strip())
                if is_level and (non_empty <= 2 or area_val == 0):
                    current_section_level = name
                    continue

                # Skip rows where name doesn't look like a room
                if not any(kw in name_lower for kw in _ROOM_KEYWORDS):
                    continue

                # Sanity check: residential rooms rarely exceed 2500 sqft
                if area_val > 2500 or area_val < 1:
                    continue

                level = ""
                if level_col is not None and level_col < len(cells):
                    level = cells[level_col].strip()
                if not level and current_section_level:
                    level = current_section_level

                rooms.append({
                    "name": name,
                    "area_sqft": area_val,
                    "level": level,
                })

            if len(rooms) >= 2:
                return rooms

        return None

    def _try_text_parsing(self, page) -> Optional[list[dict]]:
        """Parse room table from raw text extraction."""
        text = page.get_text("text")
        if not text:
            return None

        text_lower = text.lower()
        # Check if this page has room schedule indicators
        has_schedule = any(kw in text_lower for kw in (
            "room schedule", "room count", "room list", "area schedule",
            "room summary", "space summary",
        ))
        # Also detect table-like content with room names + numbers
        has_room_names = sum(1 for kw in _ROOM_KEYWORDS if kw in text_lower) >= 3

        if not (has_schedule or has_room_names):
            return None

        lines = text.strip().split("\n")
        rooms = []
        current_level = ""

        for line in lines:
            line = line.strip()
            if not line:
                continue

            line_lower = line.lower()

            # Detect floor/level section headers
            is_level_header = False
            for level_name in _LEVEL_MAP:
                if level_name in line_lower and len(line) < 40:
                    # Only set as level if this line isn't also a data row
                    if not any(kw in line_lower for kw in _ROOM_KEYWORDS if kw != level_name):
                        current_level = line
                        is_level_header = True
                    break
            if is_level_header:
                continue

            # Skip headers and totals
            if any(kw == line_lower.strip() for kw in ("total", "name", "area", "schedule", "level")):
                continue
            if "total" in line_lower and any(c.isdigit() for c in line):
                continue

            # Try to parse as room row
            # Pattern: "NNN SF LEVEL ROOM_NAME" or "ROOM_NAME NNN"
            for kw in _ROOM_KEYWORDS:
                if kw in line_lower:
                    area = self._extract_area_from_line(line)
                    if 5 <= area <= 2500:
                        # Extract room name: remove area number and unit
                        name = re.sub(
                            r'\d+\.?\d*\s*(?:SF|sq\.?\s*ft\.?|sqft)\s*',
                            '', line, flags=re.IGNORECASE,
                        ).strip()
                        # Remove level keywords from name
                        for lk in _LEVEL_MAP:
                            name = re.sub(
                                r'\b' + re.escape(lk) + r'\b', '',
                                name, flags=re.IGNORECASE,
                            ).strip()
                        name = name.strip(" \t-,|")
                        if name:
                            rooms.append({
                                "name": name,
                                "area_sqft": area,
                                "level": current_level,
                            })
                    break

        return rooms if len(rooms) >= 2 else None

    @staticmethod
    def _parse_area(area_str: str) -> float:
        """Parse area value from string, handling various formats."""
        # Remove non-numeric chars except decimal point
        cleaned = re.sub(r"[^\d.]", "", area_str)
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    @staticmethod
    def _extract_area_from_line(line: str) -> float:
        """Extract numeric area value from a text line."""
        # Prefer "NNN SF" pattern first
        sf_match = re.search(r'(\d+\.?\d*)\s*(?:SF|sq\.?\s*ft\.?|sqft)', line, re.IGNORECASE)
        if sf_match:
            val = float(sf_match.group(1))
            if 5 <= val <= 2500:
                return val

        # Fallback: find standalone numbers in reasonable range
        numbers = re.findall(r'\b(\d+\.?\d*)\b', line)
        for num_str in numbers:
            val = float(num_str)
            if 10 <= val <= 2500:
                return val
        return 0.0
