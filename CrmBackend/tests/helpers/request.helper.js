const supertest = require('supertest');

function api(app) {
  return supertest(app);
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

module.exports = {
  api,
  authHeaders,
};
