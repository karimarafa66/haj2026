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

const data = JSON.parse(jsonStr);

fs.writeFileSync(outputFile, JSON.stringify(data), 'utf8');
console.log(`Converted ${data.length} records → ${outputFile}`);
