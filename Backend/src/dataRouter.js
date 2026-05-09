const express = require('express');
const path = require('path');
const { verifyToken } = require('./auth');

const router = express.Router();

let cachedData = null;

function loadData() {
  if (cachedData) return cachedData;
  try {
    cachedData = require(path.join(__dirname, '../data/pilgrims.json'));
  } catch {
    cachedData = [];
  }
  return cachedData;
}

// GET /api/data — returns all pilgrim records (protected)
router.get('/', verifyToken, (req, res) => {
  const data = loadData();
  res.json({ total: data.length, records: data });
});

// GET /api/data/meta — unique filter values (protected)
router.get('/meta', verifyToken, (req, res) => {
  const data = loadData();
  const floors = [...new Set(data.map(r => r.floor))];
  const rooms = [...new Set(data.map(r => r.room))];
  const regions = [...new Set(data.map(r => r.region))];
  const relations = [...new Set(data.map(r => r.relation))];
  res.json({ floors, rooms, regions, relations });
});

module.exports = router;
