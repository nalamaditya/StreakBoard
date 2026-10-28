// api/[...path].js
// Vercel Serverless Function catch-all for /api/*
const { handleApiRequest } = require('../lib/api-handler');

module.exports = async (req, res) => {
  try {
    await handleApiRequest(req, res, null);
  } catch (error) {
    console.error('API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
