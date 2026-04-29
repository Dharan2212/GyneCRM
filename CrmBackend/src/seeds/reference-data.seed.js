const { connectDatabase, mongoose } = require('../db/mongoose');
const AppointmentType = require('../models/AppointmentType');
const ServiceCatalog = require('../models/ServiceCatalog');
const TestCatalog = require('../models/TestCatalog');
const LabReferenceRange = require('../models/LabReferenceRange');
const HospitalProtocol = require('../models/HospitalProtocol');
const {
  DEV_USERS,
  DEV_PASSWORD,
  ensureDevUser,
  ensureDoctorRecord,
  resolveHospitalContext,
  toIdString,
} = require('./dev-bootstrap.helper');

function getDoctorSpec() {
  return DEV_USERS.find((user) => user.role === 'doctor');
}

async function ensureDocument(Model, filter, createPayload) {
  const existing = await Model.findOne(filter).lean();

  if (existing) {
    return {
      action: 'existing',
      document: existing,
    };
  }

  const created = await Model.create(createPayload);
  return {
    action: 'created',
    document: created.toObject ? created.toObject() : created,
  };
}

async function run() {
  await connectDatabase();

  const summary = {
    hospital_id: null,
    hospital_source: null,
    doctor: null,
    masters: {},
    credentials: {
      doctor_password: DEV_PASSWORD,
    },
    notes: [],
  };

  try {
    const hospitalContext = await resolveHospitalContext();
    const hospitalId = hospitalContext.hospitalId;
    const doctorSpec = getDoctorSpec();

    summary.hospital_id = toIdString(hospitalId);
    summary.hospital_source = hospitalContext.source;

    if (hospitalContext.bootstrapped) {
      summary.notes.push(
        'A bootstrap hospital ObjectId context was generated because no existing hospital-linked doctor, patient, or user record was found.'
      );
    }

    const doctorUser = await ensureDevUser(hospitalId, doctorSpec, DEV_PASSWORD);
    const doctorRecord = await ensureDoctorRecord(hospitalId, {
      id: doctorUser.id,
      _id: doctorUser.id,
      full_name: doctorSpec.full_name,
    });

    summary.doctor = {
      status: doctorRecord.action,
      doctor_id: toIdString(doctorRecord.id),
      linked_user_id: toIdString(doctorRecord.linked_user_id),
      email: doctorUser.email,
    };

    if (doctorRecord.note) {
      summary.notes.push(doctorRecord.note);
    }

    const appointmentType = await ensureDocument(
      AppointmentType,
      { hospital_id: hospitalId, code: 'CONSULT' },
      {
        hospital_id: hospitalId,
        name: 'Consultation',
        code: 'CONSULT',
        description: 'Default development consultation type.',
        is_active: true,
      },
    );
    summary.masters.appointment_type = {
      status: appointmentType.action,
      id: toIdString(appointmentType.document._id),
      code: appointmentType.document.code,
    };

    const serviceCatalog = await ensureDocument(
      ServiceCatalog,
      { hospital_id: hospitalId, name: 'OPD Consultation' },
      {
        hospital_id: hospitalId,
        name: 'OPD Consultation',
        category: 'consultation',
        default_price: 500,
        is_active: true,
      },
    );
    summary.masters.service_catalog = {
      status: serviceCatalog.action,
      id: toIdString(serviceCatalog.document._id),
      name: serviceCatalog.document.name,
    };

    const testCatalog = await ensureDocument(
      TestCatalog,
      { hospital_id: hospitalId, code: 'HB' },
      {
        hospital_id: hospitalId,
        name: 'Hemoglobin',
        code: 'HB',
        category: 'lab',
        reference_unit: 'g/dL',
        is_active: true,
      },
    );
    summary.masters.test_catalog = {
      status: testCatalog.action,
      id: toIdString(testCatalog.document._id),
      code: testCatalog.document.code,
    };

    const labReferenceRange = await ensureDocument(
      LabReferenceRange,
      {
        hospital_id: hospitalId,
        test_catalog_id: testCatalog.document._id,
        parameter_name: 'Hemoglobin',
      },
      {
        hospital_id: hospitalId,
        test_catalog_id: testCatalog.document._id,
        parameter_name: 'Hemoglobin',
        normal_min: 12,
        normal_max: 15.5,
        unit: 'g/dL',
        notes: 'Default adult female reference range for development verification.',
      },
    );
    summary.masters.lab_reference_range = {
      status: labReferenceRange.action,
      id: toIdString(labReferenceRange.document._id),
      parameter_name: labReferenceRange.document.parameter_name,
    };

    const hospitalProtocol = await ensureDocument(
      HospitalProtocol,
      { hospital_id: hospitalId, protocol_name: 'Default Pregnancy Protocol', category: 'pregnancy' },
      {
        hospital_id: hospitalId,
        protocol_name: 'Default Pregnancy Protocol',
        category: 'pregnancy',
        milestones: [
          {
            week: 12,
            title: 'First Trimester Review',
            description: 'Development seed milestone for verification and onboarding.',
            test_rule: 'CBC if clinically indicated',
            message_template_id: 'dev-pregnancy-week-12',
          },
        ],
        is_active: true,
      },
    );
    summary.masters.hospital_protocol = {
      status: hospitalProtocol.action,
      id: toIdString(hospitalProtocol.document._id),
      protocol_name: hospitalProtocol.document.protocol_name,
      category: hospitalProtocol.document.category,
    };

    console.log('[src][seed:reference-data] Development reference/master data are ready.');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error('[src][seed:reference-data] Failed:', error.message);
  if (error?.stack && process.env.NODE_ENV !== 'production') {
    console.error(error.stack);
  }

  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error('[src][seed:reference-data] Disconnect failed:', disconnectError.message);
  }

  process.exitCode = 1;
});
