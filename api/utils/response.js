function successResponse(data, message = '操作成功') {
  return {
    data,
    message,
  };
}

function listResponse(data, total, page, pageSize) {
  return {
    data,
    meta: { total, page, pageSize },
    message: '查询成功',
  };
}

function errorResponse(code, message, details = []) {
  const statusMap = {
    validation_error: 400,
    not_found: 404,
    internal_error: 500,
    conflict: 409,
  };

  return {
    status: statusMap[code] || 500,
    body: {
      error: {
        code,
        message,
        details,
      },
    },
  };
}

module.exports = { successResponse, listResponse, errorResponse };
