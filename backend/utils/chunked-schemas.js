// DEPRECATED: This file is now a thin wrapper re-exporting separated schemas.
// Please import from "./workout-structure-schema" and "./workout-mesocycle-schema" directly.

module.exports = {
  ...require('./workout-structure-schema'),
  ...require('./workout-mesocycle-schema')
};
