# PDF → data.js Extraction Tool

## Quick Start

```
# 1. Install dependency (one time only)
pip install pdfplumber

# 2. Replace hajPDF.pdf with your new PDF, then run:
python pdf_to_data.py

# OR point it at any PDF directly:
python pdf_to_data.py C:\path\to\newfile.pdf
```

## What it does
1. Reads every page of the PDF
2. Detects floor headers (الدور الأول … الدور الثالث عشر)
3. Detects room headers (غرفة رقم … سعة الغرفة …)
4. Parses each pilgrim row and extracts:
   - `floor`, `room`, `room_capacity`, `row_num`
   - `request_num`, `national_id`, `name`, `passport`
   - `region` (governorate), `flight_code`, `relation`
5. Writes `data.js` ready for `index.html`

## Output format
```js
window.DATA_JSON = [{"floor":"الدور الأول","room":"101",...}, ...]
```

## Notes
- Works with any PDF that follows the same Ministry of Interior report format
- "البحر الاحمر" (2-word region) is handled automatically
- Duplicate national IDs are deduplicated (first occurrence kept)
- Run `test_parser.py` to validate output against a known-good data.js
