const supertest = require('supertest');
const { api, authHeaders } = require('./request.helper');
const {
  newObjectId,
  createUser,
  createDoctor,
  createAppointmentType,
  createTestCatalog,
} = require('./factory.helper');

const PASSWORD = 'Dev@12345';

async function login(app, email, password = PASSWORD) {
  const response = await api(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  return {
    response,
    token: response.body?.data?.access_token,
    cookie: response.headers['set-cookie'] || [],
  };
}

async function createAuthContext(app) {
  const hospitalId = newObjectId();
  const admin = await createUser({ hospitalId, role: 'admin', fullName: 'Test Admin' });
  const receptionist = await createUser({ hospitalId, role: 'receptionist', fullName: 'Test Receptionist' });
  const doctorUser = await createUser({ hospitalId, role: 'doctor', fullName: 'Test Doctor User' });
  const doctor = await createDoctor({ hospitalId, userId: doctorUser._id, fullName: 'Test Doctor' });
  const appointmentType = await createAppointmentType({ hospitalId });
  const testCatalog = await createTestCatalog({ hospitalId });

  const adminLogin = await login(app, admin.email);
  const doctorLogin = await login(app, doctorUser.email);
  const receptionistLogin = await login(app, receptionist.email);

  return {
    hospitalId: String(hospitalId),
    admin,
    receptionist,
    doctorUser,
    doctor,
    appointmentType,
    testCatalog,
    adminToken: adminLogin.token,
    doctorToken: doctorLogin.token,
    receptionistToken: receptionistLogin.token,
    adminHeaders: authHeaders(adminLogin.token),
    doctorHeaders: authHeaders(doctorLogin.token),
    receptionistHeaders: authHeaders(receptionistLogin.token),
    password: PASSWORD,
    agent: supertest.agent(app),
  };
}

module.exports = {
  PASSWORD,
  login,
  createAuthContext,
};
