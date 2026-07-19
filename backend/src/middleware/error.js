const humanize = (err) => {
  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field];
    const labels = {
      username: 'Username',
      email: 'Email address',
      phone: 'Phone number',
      sku: 'SKU',
      barcode: 'Barcode',
      name: 'Name',
    };
    const label = labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
    return { status: 409, message: `${label} "${value}" is already taken. Please use a different ${label.toLowerCase()}.` };
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => {
      if (e.kind === 'required') return `${e.path} is required.`;
      if (e.kind === 'minlength') return `${e.path} must be at least ${e.properties.minlength} characters.`;
      if (e.kind === 'maxlength') return `${e.path} must be at most ${e.properties.maxlength} characters.`;
      if (e.kind === 'min') return `${e.path} must be at least ${e.properties.min}.`;
      if (e.kind === 'max') return `${e.path} must be at most ${e.properties.max}.`;
      if (e.kind === 'enum') return `"${e.value}" is not a valid option for ${e.path}.`;
      return e.message;
    });
    return { status: 400, message: messages.join(' ') };
  }

  // Mongoose cast error (invalid ID format)
  if (err.name === 'CastError') {
    return { status: 400, message: `Invalid value for "${err.path}". Please check and try again.` };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return { status: 401, message: 'Your session is invalid. Please log in again.' };
  }
  if (err.name === 'TokenExpiredError') {
    return { status: 401, message: 'Your session has expired. Please log in again.' };
  }

  // MongoDB network / connection
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
    return { status: 503, message: 'Unable to connect to the database. Please try again shortly.' };
  }

  return { status: err.statusCode || 500, message: err.message || 'Something went wrong. Please try again.' };
};

const errorHandler = (err, req, res, next) => {
  console.error(err);
  const { status, message } = humanize(err);
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, raw: err.message }),
  });
};

const notFound = (req, res) => res.status(404).json({ message: 'Page or resource not found. Please check the URL.' });

module.exports = { errorHandler, notFound };
