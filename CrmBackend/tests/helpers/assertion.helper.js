function expectSuccessResponse(response, statusCode = 200) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toEqual(
    expect.objectContaining({
      success: true,
    }),
  );
}

function expectErrorResponse(response, statusCode) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toEqual(
    expect.objectContaining({
      success: false,
      message: expect.any(String),
    }),
  );
}

function expectValidationError(response) {
  expectErrorResponse(response, 400);
  expect(response.body.message).toBe('Validation failed.');
}

module.exports = {
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
};
