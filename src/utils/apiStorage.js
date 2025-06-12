import { apiClient } from './api';

// Convert API response to frontend format
const convertApiEmployee = (apiEmployee) => ({
  id: apiEmployee.id,
  name: apiEmployee.name,
  employeeId: apiEmployee.employee_id,
  email: apiEmployee.email,
  department: apiEmployee.department,
  position: apiEmployee.position,
  isActive: apiEmployee.is_active,
  createdAt: apiEmployee.created_at,
});

const convertApiTimeEntry = (apiEntry) => ({
  id: apiEntry.id,
  employeeId: apiEntry.employee,
  type: apiEntry.type,
  timestamp: apiEntry.timestamp,
  isLate: apiEntry.is_late,
  isEarly: apiEntry.is_early,
  notes: apiEntry.notes,
});

const convertApiBusinessHours = (apiHours) => ({
  startTime: apiHours.start_time?.substring(0, 5) || '09:00',
  endTime: apiHours.end_time?.substring(0, 5) || '17:00',
  breakDuration: apiHours.break_duration || 60,
  lateThreshold: apiHours.late_threshold || 15,
});

const convertApiAdminUser = (apiUser) => ({
  id: apiUser.id,
  email: apiUser.email,
  password: '', // Don't store password
  name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
  role: apiUser.role,
  isActive: apiUser.is_active,
  createdAt: apiUser.created_at,
});

const convertApiWorkSession = (apiSession) => ({
  employeeId: apiSession.employee,
  date: apiSession.date,
  punchIn: apiSession.punch_in,
  punchOut: apiSession.punch_out,
  breakStart: apiSession.break_start,
  breakEnd: apiSession.break_end,
  totalHours: parseFloat(apiSession.total_hours || '0'),
  breakDuration: parseFloat(apiSession.break_duration || '0'),
  workingHours: parseFloat(apiSession.working_hours || '0'),
  isLateIn: apiSession.is_late_in,
  isEarlyOut: apiSession.is_early_out,
  status: apiSession.status,
  punchCycles: apiSession.punch_cycles?.map((cycle) => ({
    punchIn: cycle.punch_in,
    punchOut: cycle.punch_out,
    isLateIn: cycle.is_late_in,
    isEarlyOut: cycle.is_early_out,
  })) || [],
});

// Convert frontend format to API format
const convertToApiEmployee = (employee) => ({
  name: employee.name,
  employee_id: employee.employeeId,
  email: employee.email,
  department: employee.department,
  position: employee.position,
  is_active: employee.isActive,
});

const convertToApiBusinessHours = (hours) => ({
  start_time: hours.startTime + ':00',
  end_time: hours.endTime + ':00',
  break_duration: hours.breakDuration,
  late_threshold: hours.lateThreshold,
  is_active: true,
});

const convertToApiAdminUser = (user) => {
  const [firstName, ...lastNameParts] = user.name.split(' ');
  return {
    email: user.email,
    password: user.password,
    first_name: firstName || '',
    last_name: lastNameParts.join(' ') || '',
    role: user.role,
    is_active: user.isActive,
    username: user.email, // Use email as username
  };
};

export const getStoredData = async () => {
  try {
    const [employeesResponse, businessHoursResponse, adminUsersResponse] = await Promise.all([
      apiClient.getEmployees(),
      apiClient.getCurrentBusinessHours(),
      apiClient.getAdminUsers(),
    ]);

    return {
      employees: employeesResponse.results?.map(convertApiEmployee) || employeesResponse.map?.(convertApiEmployee) || [],
      timeEntries: [], // Will be loaded separately when needed
      businessHours: convertApiBusinessHours(businessHoursResponse),
      adminUsers: adminUsersResponse.results?.map(convertApiAdminUser) || adminUsersResponse.map?.(convertApiAdminUser) || [],
    };
  } catch (error) {
    console.error('Error loading data from API:', error);
    // Return default data if API fails
    return getDefaultData();
  }
};

export const saveData = async (data) => {
  // Data is automatically saved through API calls, no need to implement this
  console.log('Data saved through API calls');
};

export const getDefaultData = () => ({
  employees: [],
  timeEntries: [],
  businessHours: {
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    lateThreshold: 15,
  },
  adminUsers: [],
});

export const initializeDefaultData = async () => {
  // No need to initialize default data with API backend
  console.log('Using API backend - no default data initialization needed');
};

// API-specific functions
export const addEmployee = async (employee) => {
  const response = await apiClient.createEmployee(convertToApiEmployee(employee));
  return convertApiEmployee(response);
};

export const updateEmployee = async (employee) => {
  const response = await apiClient.updateEmployee(employee.id, convertToApiEmployee(employee));
  return convertApiEmployee(response);
};

export const addTimeEntry = async (entry) => {
  const response = await apiClient.punchAction({
    employee_id: entry.employeeId,
    type: entry.type,
    timestamp: entry.timestamp,
    notes: entry.notes,
  });
  return convertApiTimeEntry(response.data);
};

export const updateBusinessHours = async (hours) => {
  const response = await apiClient.updateBusinessHours(convertToApiBusinessHours(hours));
  return convertApiBusinessHours(response);
};

export const addAdminUser = async (user) => {
  const response = await apiClient.createAdminUser(convertToApiAdminUser(user));
  return convertApiAdminUser(response);
};

export const updateAdminUser = async (user) => {
  const response = await apiClient.updateAdminUser(user.id, convertToApiAdminUser(user));
  return convertApiAdminUser(response);
};

export const deleteAdminUser = async (adminId) => {
  await apiClient.deleteAdminUser(adminId);
};

export const getWorkSessions = async (startDate, endDate, employeeId) => {
  const response = await apiClient.getWorkSessions({
    start_date: startDate,
    end_date: endDate,
    employee_id: employeeId,
  });
  
  return (response.results || response).map(convertApiWorkSession);
};

export const getWorkStatus = async (employeeId) => {
  return await apiClient.getWorkStatus(employeeId);
};

export const getEmployeeByEmail = async (email) => {
  try {
    const response = await apiClient.getEmployeeByEmail(email);
    return convertApiEmployee(response);
  } catch (error) {
    return null;
  }
};

export const exportToCSV = async (startDate, endDate, employeeId) => {
  return await apiClient.exportCSV({
    start_date: startDate,
    end_date: endDate,
    employee_id: employeeId,
    include_punch_cycles: true,
  });
};

// Reset function for testing (not applicable with API backend)
export const resetToDefaultData = () => {
  console.log('Reset not applicable with API backend');
};