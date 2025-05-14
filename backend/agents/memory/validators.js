const { validate: uuidValidate } = require('uuid');

function isValidUUID(id) {
  return typeof id === 'string' && uuidValidate(id);
}

function isValidAgentType(type) {
  if (typeof type !== 'string') return false;
  const validTypes = [
    'nutrition', 'workout', 'research', 'adjustment', 'system'
  ];
  return validTypes.includes(type.toLowerCase().trim());
}

function validateMemoryInput(content) {
  if (!content) {
    throw new Error("Memory content cannot be empty");
  }
  return true;
}

module.exports = {
  isValidUUID,
  isValidAgentType,
  validateMemoryInput,
}; 