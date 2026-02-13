"""AI-powered electrical symbol detection and counting using Gemini Vision."""

import json
import base64
import io
from dataclasses import dataclass, field
from typing import Optional

from PIL import Image


@dataclass
class DetectedSymbol:
    """A single detected electrical symbol."""
    symbol_type: str
    count: int
    confidence: float
    locations: list[list[float]] = field(default_factory=list)
    notes: str = ""


@dataclass
class PageAnalysis:
    """Analysis results for a single drawing page."""
    page_number: int
    symbols: list[DetectedSymbol]
    page_type: str = ""  # "electrical", "architectural", "mechanical", etc.
    is_electrical: bool = False
    raw_response: str = ""
    annotated_image: Optional[Image.Image] = None


ANALYSIS_PROMPT = """You are an expert electrical estimator analyzing a residential electrical floor plan drawing.
This drawing follows Canadian Electrical Code (CEC) / NEC symbol conventions.

TASK: Identify and count EVERY electrical symbol on this drawing page.

For each symbol type found, provide:
1. The symbol type (use the standardized names below)
2. The exact count
3. A confidence score (0.0 to 1.0) for your count accuracy
4. Approximate x,y locations as percentages of the image (0-100)

STANDARDIZED SYMBOL NAMES (use these exactly):
- duplex_receptacle (standard 15A/20A outlet)
- gfci_receptacle (ground fault circuit interrupter outlet)
- weather_resistant_receptacle
- split_receptacle
- dedicated_receptacle (for specific appliances)
- single_pole_switch
- three_way_switch
- four_way_switch
- dimmer_switch
- recessed_light
- surface_mount_light
- pendant_light
- track_light
- wall_sconce
- exterior_light
- pot_light (same as recessed)
- fluorescent_light
- led_panel_light
- ceiling_fan
- exhaust_fan
- range_hood_fan
- smoke_detector
- co_detector
- smoke_co_combo
- data_outlet
- tv_outlet
- phone_outlet
- doorbell
- thermostat
- panel_board
- subpanel
- junction_box
- ev_charger_outlet
- dryer_outlet
- range_outlet
- ac_disconnect
- outdoor_receptacle
- motion_sensor
- occupancy_sensor

Also determine:
- Is this page an electrical plan? (true/false)
- What type of page is this? (electrical, architectural, mechanical, plumbing, cover, schedule, detail, other)

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
  "is_electrical": true,
  "page_type": "electrical",
  "symbols": [
    {"symbol_type": "duplex_receptacle", "count": 14, "confidence": 0.95, "locations": [[25.5, 30.2], [45.1, 30.5]], "notes": ""},
    {"symbol_type": "single_pole_switch", "count": 8, "confidence": 0.90, "locations": [[10.0, 20.0]], "notes": ""}
  ],
  "observations": "Any relevant notes about the drawing"
}

If this is NOT an electrical page, return:
{"is_electrical": false, "page_type": "architectural", "symbols": [], "observations": "This appears to be an architectural floor plan"}

COUNT CAREFULLY. Double-check your counts. Mark confidence lower if symbols are unclear or overlapping.
"""


class ElectricalAnalyzer:
    """Analyzes electrical drawings using Gemini Vision API."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        self.api_key = api_key
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def _image_to_base64(self, img: Image.Image) -> str:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def analyze_page(
        self, img: Image.Image, page_number: int = 0
    ) -> PageAnalysis:
        """Analyze a single drawing page for electrical symbols."""
        client = self._get_client()

        # Convert image to bytes for API
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        image_bytes = buf.getvalue()

        from google.genai import types

        response = client.models.generate_content(
            model=self.model,
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                        types.Part.from_text(text=ANALYSIS_PROMPT),
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,  # Low temperature for consistent counting
                max_output_tokens=4096,
            ),
        )

        raw_text = response.text.strip()
        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        return self._parse_response(raw_text, page_number)

    def _parse_response(self, raw_text: str, page_number: int) -> PageAnalysis:
        """Parse the JSON response from the AI into structured data."""
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            return PageAnalysis(
                page_number=page_number,
                symbols=[],
                page_type="unknown",
                is_electrical=False,
                raw_response=raw_text,
            )

        symbols = []
        for sym in data.get("symbols", []):
            symbols.append(
                DetectedSymbol(
                    symbol_type=sym.get("symbol_type", "unknown"),
                    count=sym.get("count", 0),
                    confidence=sym.get("confidence", 0.0),
                    locations=sym.get("locations", []),
                    notes=sym.get("notes", ""),
                )
            )

        return PageAnalysis(
            page_number=page_number,
            symbols=symbols,
            page_type=data.get("page_type", "unknown"),
            is_electrical=data.get("is_electrical", False),
            raw_response=raw_text,
        )

    def analyze_drawing_set(
        self, images: dict[int, Image.Image]
    ) -> list[PageAnalysis]:
        """Analyze multiple pages from a drawing set."""
        results = []
        for page_num, img in sorted(images.items()):
            analysis = self.analyze_page(img, page_num)
            results.append(analysis)
        return results


def aggregate_counts(analyses: list[PageAnalysis]) -> dict[str, int]:
    """Aggregate symbol counts across all electrical pages."""
    totals: dict[str, int] = {}
    for analysis in analyses:
        if not analysis.is_electrical:
            continue
        for sym in analysis.symbols:
            if sym.symbol_type in totals:
                totals[sym.symbol_type] += sym.count
            else:
                totals[sym.symbol_type] = sym.count
    return totals


def get_low_confidence_items(
    analyses: list[PageAnalysis], threshold: float = 0.80
) -> list[tuple[int, DetectedSymbol]]:
    """Return items below confidence threshold for user review."""
    flagged = []
    for analysis in analyses:
        for sym in analysis.symbols:
            if sym.confidence < threshold:
                flagged.append((analysis.page_number, sym))
    return flagged
