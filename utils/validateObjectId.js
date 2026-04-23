const mongoose = require('mongoose');
const AppError = require('./AppError');

function validateObjectId(id, label = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${label}`, 400);
  }
}

module.exports = validateObjectId;
