// Type definitions for JSDoc comments

/**
 * @typedef {Object} Employee
 * @property {string} id
 * @property {string} name
 * @property {string} employeeId
 * @property {string} email
 * @property {string} department
 * @property {string} position
 * @property {boolean} isActive
 * @property {string} createdAt
 */

/**
 * @typedef {Object} TimeEntry
 * @property {string} id
 * @property {string} employeeId
 * @property {'punch_in' | 'punch_out' | 'break_start' | 'break_end'} type
 * @property {string} timestamp
 * @property {boolean} [isLate]
 * @property {boolean} [isEarly]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} BusinessHours
 * @property {string} startTime - HH:MM format
 * @property {string} endTime - HH:MM format
 * @property {number} breakDuration - minutes
 * @property {number} lateThreshold - minutes
 */

/**
 * @typedef {Object} AdminUser
 * @property {string} id
 * @property {string} email
 * @property {string} password
 * @property {string} name
 * @property {string} role
 * @property {boolean} isActive
 * @property {string} createdAt
 */

/**
 * @typedef {Object} PunchCycle
 * @property {string} punchIn
 * @property {string} [punchOut]
 * @property {boolean} isLateIn
 * @property {boolean} isEarlyOut
 */

/**
 * @typedef {Object} WorkSession
 * @property {string} employeeId
 * @property {string} date
 * @property {string} [punchIn]
 * @property {string} [punchOut]
 * @property {string} [breakStart]
 * @property {string} [breakEnd]
 * @property {number} totalHours
 * @property {number} breakDuration
 * @property {number} workingHours
 * @property {boolean} isLateIn
 * @property {boolean} isEarlyOut
 * @property {'complete' | 'in_progress' | 'on_break'} status
 * @property {PunchCycle[]} [punchCycles]
 */

export {};