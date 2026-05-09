/**
 * Converts the frontend data.js (window.DATA_JSON = [...])
 * to a plain JSON file for the backend.
 *
 * Usage: node scripts/convert-data.js
 */
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../../data.js');
const outputFile = path.join(__dirname, '../data/pilgrims.json');

const raw = fs.readFileSync(sourceFile, 'utf8');

// Strip the window.DATA_JSON = prefix and trailing semicolon
const jsonStr = raw
  .replace(/^﻿/, '')           // Remove BOM
  .replace(/^window\.DATA_JSON\s*=\s*/, '')
  .replace(/;\s*$/, '')
  .trim();

const rawData = JSON.parse(jsonStr);

// Normalize all Arabic text fields from visual-form Unicode (FE70-FEFF) to standard Unicode
const TEXT_FIELDS = ['name', 'region', 'floor', 'relation'];
const data = rawData.map(r => {
  const out = { ...r };
  for (const field of TEXT_FIELDS) {
    if (out[field]) out[field] = out[field].normalize('NFKC');
  }
  return out;
});

fs.writeFileSync(outputFile, JSON.stringify(data), 'utf8');
console.log(`Converted ${data.length} records → ${outputFile}`);
