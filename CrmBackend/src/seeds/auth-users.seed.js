const { connectDatabase, mongoose } = require('../db/mongoose');
const {
  DEV_USERS,
  DEV_PASSWORD,
  resolveHospitalContext,
  ensureDevUser,
  toIdString,
} = require('./dev-bootstrap.helper');

async function run() {
  await connectDatabase();

  const summary = {
    hospital_id: null,
    hospital_source: null,
    users: [],
    credentials: {
      password: DEV_PASSWORD,
    },
    notes: [],
  };

  try {
    const hospitalContext = await resolveHospitalContext();

    summary.hospital_id = toIdString(hospitalContext.hospitalId);
    summary.hospital_source = hospitalContext.source;

    if (hospitalContext.bootstrapped) {
      summary.notes.push(
        'A bootstrap hospital ObjectId context was generated because no existing hospital-linked doctor, patient, or user record was found.'
      );
    }

    for (const spec of DEV_USERS) {
      const result = await ensureDevUser(hospitalContext.hospitalId, spec, DEV_PASSWORD);
      summary.users.push({
        action: result.action,
        id: toIdString(result.id),
        email: result.email,
        role: result.role,
        hospital_id: toIdString(result.hospital_id),
        phone: result.phone,
      });
    }

    console.log('[src][seed:auth-users] Development auth users are ready.');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error('[src][seed:auth-users] Failed:', error.message);

  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error('[src][seed:auth-users] Disconnect failed:', disconnectError.message);
  }

  process.exitCode = 1;
});
