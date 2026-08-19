const SystemLog = require('../models/SystemLog');

const errorHandler = (err, req, res, next) => {
  // Log the full error and stack trace server-side for debugging
  console.error('--- ERROR ---');
  console.error(`Route: ${req.method} ${req.originalUrl}`);
  console.error(err.stack);
  console.error('-------------');

  // Determine status code
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (err.statusCode) {
    statusCode = err.statusCode;
  }

  // Define response message
  let message = err.message;
  
  // If it's a 500 error or generic system error, mask the message from the client
  if (statusCode === 500 || err.name === 'MongoServerError' || err.name === 'CastError') {
    message = 'An unexpected error occurred. Please try again later.';
    statusCode = 500;
  }

  // Handle specific known error types that are safe to expose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Asynchronously save log to database (fire and forget)
  try {
    SystemLog.create({
      level: statusCode >= 500 ? 'critical' : 'error',
      method: req.method,
      url: req.originalUrl,
      message: err.message,
      stack: err.stack,
      status_code: statusCode,
      user_id: req.user ? req.user._id : null
    }).catch(dbErr => console.error('Failed to save SystemLog to DB:', dbErr.message));
  } catch (logErr) {
    console.error('SystemLog creation error:', logErr.message);
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    // Provide stack trace only in development, NOT production
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { errorHandler };
