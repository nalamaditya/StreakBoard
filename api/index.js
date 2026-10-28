// api/index.js
// Vercel Serverless Function entry point for all /api/* routes
const { handleApiRequest } = require('../lib/api-handler');

module.exports = async (req, res) => {
  try {
    await handleApiRequest(req, res, null);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
