#!/usr/bin/env python3
"""
pdf_to_data.py  —  Extract Haj pilgrim data from PDF and write data.js

Usage:
    python pdf_to_data.py                        # uses hajPDF.pdf in same folder
    python pdf_to_data.py path/to/other.pdf      # any PDF

Output:
    data.js  (same folder as the script)

Requirements:
    pip install pdfplumber
"""

import sys
import io
import re
import json
import os
import unicodedata
from pathlib import Path

# ── stdout UTF-8 for console debug prints ───────────────────────────────────
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
PDF_PATH   = Path(sys.argv[1]) if len(sys.argv) > 1 else SCRIPT_DIR / 'Ajyad.pdf'
OUT_PATH   = SCRIPT_DIR / 'data.js'

if not PDF_PATH.exists():
    print(f'ERROR: PDF not found: {PDF_PATH}')
    sys.exit(1)

try:
    import pdfplumber
except ImportError:
    print('pdfplumber not installed. Run: pip install pdfplumber')
    sys.exit(1)

# ── Helpers ──────────────────────────────────────────────────────────────────
def nfkc(s: str) -> str:
    """Normalize Arabic presentation forms → base Unicode."""
    return unicodedata.normalize('NFKC', str(s or '')).strip()


def fix_arabic_name(raw: str) -> str:
    """Convert visual-form Arabic name to logical reading order.

    PDFs store Arabic in visual (right-to-left) order:
    - characters within each word are reversed
    - words themselves are in reversed order
    Apply NFKC per word, reverse chars within each word, then reverse word order.
    """
    words = raw.split()
    if not words:
        return ''
    fixed = [nfkc(w)[::-1] for w in words]
    return ' '.join(reversed(fixed))


# ── Floor keyword map (ordered: specific → general) ─────────────────────────
# Keys are the visual/presentation-form Arabic that pdfplumber extracts.
# Values are the clean display Arabic stored in data.js.
FLOOR_KEYWORDS = [
    ('ﺮﺸﻋ ﺚﻟﺎﺜﻟﺍ ﺭﻭﺪﻟﺍ',  'الدور الثالث عشر'),
    ('ﺮﺸﻋ ﻲﻧﺎﺜﻟﺍ ﺭﻭﺪﻟﺍ',  'الدور الثاني عشر'),
    ('ﺮﺸﻋ ﻱﺩﺎﺤﻟﺍ ﺭﻭﺪﻟﺍ',  'الدور الحادي عشر'),
    ('ﺮﺷﺎﻌﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور العاشر'),
    ('ﻊﺳﺎﺘﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور التاسع'),
    ('ﻦﻣﺎﺜﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور الثامن'),
    ('ﻊﺑﺎﺴﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور السابع'),
    ('ﺱﺩﺎﺴﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور السادس'),
    ('ﺲﻣﺎﺨﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور الخامس'),
    ('ﻊﺑﺍﺮﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور الرابع'),
    ('ﺚﻟﺎﺜﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور الثالث'),
    ('ﻲﻧﺎﺜﻟﺍ ﺭﻭﺪﻟﺍ',      'الدور الثاني'),
    ('ﻝﻭﻻﺍ ﺭﻭﺪﻟﺍ',        'الدور الأول'),
]

# ── Region map: visual-form token(s) → display Arabic ───────────────────────
# Checked in order; first match wins.
REGION_PATTERNS = [
    # 2-word regions first (before single-word overlaps)
    (lambda tokens: 'ﺦﻴﺸﻟﺍ' in tokens and 'ﺮﻔﻛ' in tokens,    'كفر الشيخ'),
    (lambda tokens: 'ﺮﺤﺒﻟﺍ' in tokens and 'ﺮﻤﺣﻻﺍ' in tokens,  'البحر الاحمر'),
    (lambda tokens: 'ﺮﺤﺒﻟﺍ' in tokens,                           'البحر الاحمر'),  # fallback
    (lambda tokens: 'ﻪﻴﻓﻮﻨﻤﻟﺍ' in tokens,                        'ﺍﻟﻤﻨﻮﻓﻴﻪ'),
    (lambda tokens: 'ﻪﻴﺑﻮﻴﻠﻘﻟﺍ' in tokens,                        'ﺍﻟﻘﻠﻴﻮﺑﻴﻪ'),
    (lambda tokens: 'ﺔﻳﺮﺤﺒﻟﺍ' in tokens or 'ﻪﻳﺮﺤﺒﻟﺍ' in tokens, 'ﺍﻟﺒﺤﻴﺮﻩ'),
    (lambda tokens: 'ﺔﻴﺑﺮﻐﻟﺍ' in tokens,                          'ﺍﻟﻐﺮﺑﻴﻪ'),
    (lambda tokens: 'ﺕﻻﺯﺎﻨﺘﻟﺍ' in tokens,                        'التنازلات'),
    (lambda tokens: 'ﺎﻨﻗ' in tokens,                               'ﻗﻨﺎ'),
    (lambda tokens: 'ﺓﺮﻫﺎﻘﻟﺍ' in tokens,                          'ﺍﻟﻘﺎﻫﺮﻩ'),
    (lambda tokens: 'ﻪﻴﻣﻮﻴﻔﻟﺍ' in tokens,                         'ﺍﻟﻔﻴﻮﻣﻴﻪ'),
    (lambda tokens: 'ﺮﻤﺣﻻﺍ' in tokens,                            'البحر الاحمر'),  # الاحمر alone
]

# Known relation tokens in visual/presentation form
RELATION_TOKENS_VISUAL = {
    'ﺐﻠﻃ ﻡﺪﻘﻣ': 'ﻃﻠﺐ ﻣﻘﺪﻡ',
    'ﺖﺧﺃ': 'ﺃﺧﺖ',
    'ﺥﺃ': 'ﺃﺥ',
    'ﻦﺑﺍ': 'ﺍﺑﻦ',
    'ﺔﻨﺑﺍ': 'ﺍﺑﻨﻪ',
    'ﺝﻭﺰﻟﺍ': 'ﺍﻟﺰﻭﺝ',
    'ﺔﺟﻭﺰﻟﺍ': 'ﺍﻟﺰﻭﺟﻪ',
    'ﺔﺟﻭﺯ': 'ﺯﻭﺟﻪ',
    'ﺝﻭﺯ': 'ﺯﻭﺝ',
    'ﺏﻷﺍ': 'ﺍﻷﺏ',
    'ﻡﻷﺍ': 'ﺍﻷﻡ',
    'ﻡﺃ': 'ﺃﻡ',
    'ﺓﺎﻤﺤﻟﺍ': 'ﺍﻟﺤﻤﺎﺓ',
    'ﻡﺎﻤﺤﻟﺍ': 'ﺍﻟﺤﻤﺎﻡ',
    'ﺪﻴﻔﺤﻟﺍ': 'ﺍﻟﺤﻔﻴﺪ',
    'ﺓﺪﻴﻔﺤﻟﺍ': 'ﺍﻟﺤﻔﻴﺪﻩ',
    'ﻩﺮﻫﺎﺼﻣ': 'ﻣﺼﺎﻫﺮﻩ',
    'ﻪﺑﺎﺴﻧ': 'ﻧﺴﺐ',
    'ﺥﻷﺍ ﺔﻨﺑﺃ': 'ابنة الأخ',
    'ﻝﺎﺨﻟﺍ ﻪﻨﺑﺍ': 'ابن الخال',
    'ﻝﺎﺨﻟﺍ ﺔﻨﺑﺍ': 'ابنة الخال',
}

# Single-token relation words (to exclude from region detection)
RELATION_SINGLE_TOKENS = {
    'ﺐﻠﻃ', 'ﻡﺪﻘﻣ', 'ﺖﺧﺃ', 'ﺥﺃ', 'ﻦﺑﺍ', 'ﺔﻨﺑﺍ',
    'ﺝﻭﺰﻟﺍ', 'ﺔﺟﻭﺰﻟﺍ', 'ﺔﺟﻭﺯ', 'ﺝﻭﺯ',
    'ﺏﻷﺍ', 'ﻡﻷﺍ', 'ﻡﺃ',
    'ﺓﺎﻤﺤﻟﺍ', 'ﻡﺎﻤﺤﻟﺍ', 'ﺪﻴﻔﺤﻟﺍ', 'ﺓﺪﻴﻔﺤﻟﺍ',
    'ﻩﺮﻫﺎﺼﻣ', 'ﻪﺑﺎﺴﻧ', 'ﻝﺎﺨﻟﺍ', 'ﺥﻷﺍ', 'ﺔﻨﺑﺃ',
}

SKIP_PHRASES = ['ﺕﺎﻈﺣﻼﻣ', 'ﻑﺮﻐﻟﺎﺑ', 'ﺓﺭﺍﺯﻭ', 'ﺓﺭﺍﺩﻹﺍ', 'ﻕﺪﻨﻓ', 'ﻑﺮﻏ ﻰﻠﻋ', 'ﻝﺎﻤﺟﺇ']


# ── Core parser ───────────────────────────────────────────────────────────────
def detect_floor(line: str) -> str | None:
    for key, val in FLOOR_KEYWORDS:
        if key in line:
            return val
    return None


def detect_room(line: str) -> tuple[str, str] | None:
    """Returns (room_number, capacity) or None."""
    if 'ﺔﻓﺮﻏ' not in line or ':' not in line or 'ﻢﻗﺭ' not in line:
        return None
    nums = re.findall(r'\d+', line)
    rooms = [n for n in nums if len(n) >= 3]
    caps  = [n for n in nums if len(n) <= 2]
    if rooms:
        return rooms[0], (caps[0] if caps else '')
    return None


def detect_relation(line: str) -> str:
    """Extract relation from start of line."""
    # 2-token relation
    for key, val in RELATION_TOKENS_VISUAL.items():
        if line.startswith(key):
            return nfkc(val)
    # single token
    first = line.split()[0] if line.split() else ''
    if first in RELATION_SINGLE_TOKENS:
        return nfkc(first)
    return ''


def detect_region(parts: list[str]) -> str:
    """Match region from token list before passport."""
    token_set = set(parts)
    for predicate, display in REGION_PATTERNS:
        if predicate(token_set):
            return display
    # Fallback: visual-form tokens are in reversed order; reverse before joining
    cands = [p for p in parts if not re.match(r'^\d+$', p) and p not in RELATION_SINGLE_TOKENS]
    if not cands:
        return ''
    last2 = cands[-2:]
    return ' '.join(nfkc(t) for t in reversed(last2))


def parse_pdf(pdf_path: Path) -> list[dict]:
    records = []
    current_floor = ''
    current_room  = ''
    current_cap   = ''

    with pdfplumber.open(str(pdf_path)) as pdf:
        total = len(pdf.pages)
        print(f'PDF: {pdf_path.name}  |  {total} pages')

        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ''
            lines = text.split('\n')

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Skip header / footer lines
                if any(skip in line for skip in SKIP_PHRASES):
                    continue

                # Floor detection
                fl = detect_floor(line)
                if fl:
                    current_floor = fl

                # Room detection
                rm = detect_room(line)
                if rm:
                    current_room, current_cap = rm
                    continue

                # Data row: must contain a 14-digit national ID
                nat_match = re.search(r'\d{14}', line)
                if not nat_match or not current_room or not current_floor:
                    continue

                national_id = nat_match.group(0)

                # Passport: letter + 7-9 digits
                pass_match = re.search(r'[A-Z]\d{7,9}', line)
                if not pass_match:
                    continue
                passport = pass_match.group(0)

                parts = line.split()

                # ── row_num: last short numeric token (1-4 digits) ──────────
                row_num = ''
                for p in reversed(parts):
                    if re.match(r'^\d{1,4}$', p):
                        row_num = p
                        break

                # ── request_num: 3-6 digit number not equal to row_num/room ─
                request_num = ''
                for p in parts:
                    if (re.match(r'^\d{3,6}$', p)
                            and p != row_num
                            and p != national_id
                            and p != current_room):
                        request_num = p
                        break

                # ── Segment BEFORE passport ──────────────────────────────────
                idx_pass = line.find(passport)
                before   = line[:idx_pass].strip().split()

                # ── flight_code: first pure 3-digit token before passport ────
                flight_code = ''
                for p in before:
                    if re.match(r'^\d{1,3}$', p):
                        flight_code = p
                        break
                # Fallback: any 1-3 digit in whole line
                if not flight_code:
                    for p in parts:
                        if re.match(r'^\d{1,3}$', p) and p != row_num:
                            flight_code = p
                            break

                # ── region: tokens before passport, after removing relation/digits ─
                region = detect_region(before)

                # ── relation ──────────────────────────────────────────────────
                relation = detect_relation(line)
                # Fallback NFKC relation from first token if still empty
                if not relation and before:
                    relation = nfkc(before[0])

                # ── name: text between passport and national_id ───────────────
                idx_nat  = line.find(national_id)
                name = ''
                if idx_pass != -1 and idx_nat != -1:
                    if idx_pass < idx_nat:
                        name = line[idx_pass + len(passport):idx_nat].strip()
                    else:
                        name = line[idx_nat + len(national_id):idx_pass].strip()

                records.append({
                    'floor':         current_floor,
                    'room':          current_room,
                    'room_capacity': current_cap,
                    'row_num':       row_num,
                    'request_num':   request_num,
                    'national_id':   national_id,
                    'name':          fix_arabic_name(name),
                    'passport':      passport,
                    'region':        region,
                    'flight_code':   flight_code,
                    'relation':      relation,
                })

    return records


# ── Post-processing ───────────────────────────────────────────────────────────
def post_process(records: list[dict]) -> list[dict]:
    """
    Clean up known edge-cases:
    - البحر الاحمر split into region/flight_code
    - flight_code '108/1' normalisation
    - Deduplicate by national_id (keep first occurrence)
    """
    seen = {}
    out  = []

    for r in records:
        # Fix: البحر الاحمر mistakenly split
        region_n = nfkc(r['region'])
        fc_n     = nfkc(r['flight_code'])
        if region_n == 'البحر' and 'احمر' in fc_n:
            r['region']      = 'البحر الاحمر'
            r['flight_code'] = '134'          # البحر الاحمر always uses code 134 in this hotel
        elif region_n in ('البحر',) and not r['flight_code'].isdigit():
            r['region'] = 'البحر الاحمر'

        # Fix: '108/1' → '108'
        if '/' in str(r['flight_code']):
            r['flight_code'] = r['flight_code'].split('/')[0]

        # Deduplicate
        nat = r['national_id']
        if nat not in seen:
            seen[nat] = True
            out.append(r)

    return out


# ── Write output ──────────────────────────────────────────────────────────────
def write_data_js(records: list[dict], out_path: Path):
    json_str = json.dumps(records, ensure_ascii=False, separators=(',', ':'))
    content  = '﻿' + 'window.DATA_JSON = ' + json_str + '\n'
    out_path.write_text(content, encoding='utf-8')
    print(f'Written: {out_path}  ({len(records)} records)')


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f'Parsing: {PDF_PATH}')
    records = parse_pdf(PDF_PATH)
    print(f'Raw records extracted: {len(records)}')

    records = post_process(records)
    print(f'After dedup / cleanup: {len(records)}')

    # Summary
    from collections import Counter
    floors  = Counter(r['floor']  for r in records)
    regions = Counter(r['region'] for r in records)
    print('\nFloors:')
    for f, c in sorted(floors.items()):
        print(f'  {f}: {c}')
    print('\nRegions:')
    for r, c in sorted(regions.items(), key=lambda x: -x[1]):
        print(f'  {r}: {c}')

    bad_fc = [r for r in records if r['flight_code'] and not re.match(r'^\d+$', r['flight_code'])]
    if bad_fc:
        print(f'\nWARNING: {len(bad_fc)} records with non-numeric flight_code:')
        for r in bad_fc[:5]:
            print(f'  natid={r["national_id"]} fc={repr(r["flight_code"])} region={r["region"]}')

    write_data_js(records, OUT_PATH)
    print('\nDone. Refresh index.html in your browser.')


if __name__ == '__main__':
    main()
