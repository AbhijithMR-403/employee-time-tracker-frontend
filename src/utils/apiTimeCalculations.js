import { apiClient } from './api';

// Use API for time calculations instead of local calculations
export const generateWorkSessions = async (
  timeEntries,
  startDate,
  endDate
) => {
  try {
    const response = await apiClient.getWorkSessions({
      start_date: startDate,
      end_date: endDate,
    });
    
    return (response.results || response).map((session) => ({
      employeeId: session.employee,
      date: session.date,
      punchIn: session.punch_in,
      punchOut: session.punch_out,
      breakStart: session.break_start,
      breakEnd: session.break_end,
      totalHours: parseFloat(session.total_hours || '0'),
      breakDuration: parseFloat(session.break_duration || '0'),
      workingHours: parseFloat(session.working_hours || '0'),
      isLateIn: session.is_late_in,
      isEarlyOut: session.is_early_out,
      status: session.status,
      punchCycles: session.punch_cycles?.map((cycle) => ({
        punchIn: cycle.punch_in,
        punchOut: cycle.punch_out,
        isLateIn: cycle.is_late_in,
        isEarlyOut: cycle.is_early_out,
      })) || [],
    }));
  } catch (error) {
    console.error('Error fetching work sessions:', error);
    return [];
  }
};

export const getCurrentWorkSession = async (
  employeeId,
  timeEntries,
  date
) => {
  try {
    const sessions = await generateWorkSessions([], date, date);
    return sessions.find(session => session.employeeId === employeeId) || null;
  } catch (error) {
    console.error('Error fetching current work session:', error);
    return null;
  }
};

export const getCurrentWorkStatus = async (
  employeeId,
  timeEntries,
  date
) => {
  try {
    return await apiClient.getWorkStatus(employeeId);
  } catch (error) {
    console.error('Error fetching work status:', error);
    return {
      canPunchIn: true,
      canPunchOut: false,
      canStartBreak: false,
      canEndBreak: false,
      currentStatus: 'not_started',
      lastAction: undefined,
    };
  }
};

export const isLateEntry = (
  timestamp,
  businessHours,
  type
) => {
  // This will be calculated by the backend
  return false;
};

export const isEarlyEntry = (
  timestamp,
  businessHours,
  type
) => {
  // This will be calculated by the backend
  return false;
};

export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

export const exportToCSV = async (workSessions, employees) => {
  try {
    const blob = await apiClient.exportCSV({
      start_date: workSessions[0]?.date || new Date().toISOString().split('T')[0],
      end_date: workSessions[workSessions.length - 1]?.date || new Date().toISOString().split('T')[0],
      include_punch_cycles: true,
    });
    
    return await blob.text();
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return '';
  }
};