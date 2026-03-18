function success(res, data = {}, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function error(res, message = 'Error', status = 500, meta = {}) {
  return res.status(status).json({ success: false, message, meta });
}

module.exports = { success, error };
