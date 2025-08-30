import { generateResponse } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json(generateResponse(false, 'Internal server error', null, err.message));
};

export const notFoundHandler = (req, res) => {
  res.status(404).json(generateResponse(false, `Route ${req.method} ${req.originalUrl} not found`));
};
