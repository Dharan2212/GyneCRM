const {
  Joi,
  objectIdSchema,
  nullableString,
  nullableNumber,
  nullableDate,
  paginationSchema,
  emptyObjectSchema,
} = require('../../utils/validation');

const optionalNullableString = Joi.string().trim().allow('', null);

const listMastersSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  is_active: Joi.boolean().optional(),
  category: Joi.string().trim().max(120).optional(),
  test_catalog_id: objectIdSchema.optional(),
  search: Joi.string().trim().max(120).optional(),
  ...paginationSchema,
});

const entityIdSchema = Joi.object({
  id: objectIdSchema.required(),
});

const appointmentTypeCreateSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  name: Joi.string().trim().min(2).max(120).required(),
  code: Joi.string().trim().min(2).max(50).required(),
  description: optionalNullableString.max(255).optional(),
  is_active: Joi.boolean().optional(),
});

const appointmentTypeUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  code: Joi.string().trim().min(2).max(50).optional(),
  description: optionalNullableString.max(255).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const serviceCatalogCreateSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  name: Joi.string().trim().min(2).max(150).required(),
  category: optionalNullableString.max(120).optional(),
  default_price: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional(),
});

const serviceCatalogUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  category: optionalNullableString.max(120).optional(),
  default_price: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const testCatalogCreateSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  name: Joi.string().trim().min(2).max(150).required(),
  code: Joi.string().trim().min(2).max(50).required(),
  category: optionalNullableString.max(120).optional(),
  reference_unit: optionalNullableString.max(60).optional(),
  is_active: Joi.boolean().optional(),
});

const testCatalogUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  code: Joi.string().trim().min(2).max(50).optional(),
  category: optionalNullableString.max(120).optional(),
  reference_unit: optionalNullableString.max(60).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const labReferenceRangeCreateSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  test_catalog_id: objectIdSchema.required(),
  parameter_name: Joi.string().trim().min(1).max(150).required(),
  normal_min: Joi.number().allow(null).optional(),
  normal_max: Joi.number().allow(null).optional(),
  unit: optionalNullableString.max(60).optional(),
  notes: optionalNullableString.max(255).optional(),
});

const labReferenceRangeUpdateSchema = Joi.object({
  test_catalog_id: objectIdSchema.optional(),
  parameter_name: Joi.string().trim().min(1).max(150).optional(),
  normal_min: Joi.number().allow(null).optional(),
  normal_max: Joi.number().allow(null).optional(),
  unit: optionalNullableString.max(60).optional(),
  notes: optionalNullableString.max(255).optional(),
}).min(1);

const protocolMilestoneSchema = Joi.object({
  week: Joi.number().integer().min(0).required(),
  title: Joi.string().trim().min(1).max(150).required(),
  description: optionalNullableString.max(255).optional(),
  test_rule: optionalNullableString.max(255).optional(),
  message_template_id: optionalNullableString.max(120).optional(),
});

const hospitalProtocolCreateSchema = Joi.object({
  hospital_id: objectIdSchema.optional(),
  protocol_name: Joi.string().trim().min(2).max(150).required(),
  category: Joi.string().trim().valid('pregnancy', 'ivf', 'gynac', 'uncategorized').required(),
  milestones: Joi.array().items(protocolMilestoneSchema).max(100).optional(),
  is_active: Joi.boolean().optional(),
});

const hospitalProtocolUpdateSchema = Joi.object({
  protocol_name: Joi.string().trim().min(2).max(150).optional(),
  category: Joi.string().trim().valid('pregnancy', 'ivf', 'gynac', 'uncategorized').optional(),
  milestones: Joi.array().items(protocolMilestoneSchema).max(100).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

module.exports = {
  listMastersSchema,
  entityIdSchema,
  appointmentTypeCreateSchema,
  appointmentTypeUpdateSchema,
  serviceCatalogCreateSchema,
  serviceCatalogUpdateSchema,
  testCatalogCreateSchema,
  testCatalogUpdateSchema,
  labReferenceRangeCreateSchema,
  labReferenceRangeUpdateSchema,
  hospitalProtocolCreateSchema,
  hospitalProtocolUpdateSchema,
};
