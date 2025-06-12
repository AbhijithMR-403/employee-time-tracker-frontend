import { TimeEntry, BusinessHours, WorkSession } from '../types';

export const generateWorkSessions = (
  timeEntries: TimeEntry[],
  startDate: string,
  endDate: string
): WorkSession[] => {
  const sessions: WorkSession[] = [];
  const employeeEntries: { [key: string]: TimeEntry[] } = {};

  // Group entries by employee and date
  timeEntries
    .filter(entry => {
      const entryDate = entry.timestamp.split('T')[0];
      return entryDate >= startDate && entryDate <= endDate;
    })
    .forEach(entry => {
      const key = `${entry.employeeId}-${entry.timestamp.split('T')[0]}`;
      if (!employeeEntries[key]) {
        employeeEntries[key] = [];
      }
      employeeEntries[key].push(entry);
    });

  // Generate work sessions
  Object.entries(employeeEntries).forEach(([key, entries]) => {
    const [employeeId, date] = key.split('-');
    const sortedEntries = entries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const session = createWorkSession(employeeId, date, sortedEntries);
    if (session) {
      sessions.push(session);
    }
  });

  return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const createWorkSession = (
  employeeId: string,
  date: string,
  entries: TimeEntry[]
): WorkSession | null => {
  if (entries.length === 0) return null;

  const punchIns = entries.filter(e => e.type === 'punch_in').sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const punchOuts = entries.filter(e => e.type === 'punch_out').sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const breakStarts = entries.filter(e => e.type === 'break_start').sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const breakEnds = entries.filter(e => e.type === 'break_end').sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (punchIns.length === 0) return null;

  // Calculate total working hours from all punch in/out cycles
  let totalWorkingHours = 0;
  let totalBreakTime = 0;

  // Process each punch in/out cycle
  for (let i = 0; i < punchIns.length; i++) {
    const punchIn = punchIns[i];
    const punchOut = punchOuts[i]; // Corresponding punch out (if exists)

    if (punchOut) {
      // Calculate hours for this cycle
      const cycleHours = (new Date(punchOut.timestamp).getTime() - new Date(punchIn.timestamp).getTime()) / (1000 * 60 * 60);
      
      // Calculate break time within this cycle
      let cycleBreakTime = 0;
      breakStarts.forEach((breakStart, breakIndex) => {
        const breakEnd = breakEnds[breakIndex];
        const breakStartTime = new Date(breakStart.timestamp).getTime();
        const breakEndTime = breakEnd ? new Date(breakEnd.timestamp).getTime() : null;
        const punchInTime = new Date(punchIn.timestamp).getTime();
        const punchOutTime = new Date(punchOut.timestamp).getTime();

        // Only count breaks that fall within this punch in/out cycle
        if (breakStartTime >= punchInTime && breakStartTime <= punchOutTime) {
          if (breakEndTime && breakEndTime <= punchOutTime) {
            cycleBreakTime += (breakEndTime - breakStartTime) / (1000 * 60);
          } else if (!breakEndTime) {
            // Break started but not ended within this cycle
            cycleBreakTime += (punchOutTime - breakStartTime) / (1000 * 60);
          }
        }
      });

      totalBreakTime += cycleBreakTime;
      totalWorkingHours += Math.max(0, cycleHours - (cycleBreakTime / 60));
    }
  }

  // Handle ongoing breaks (break started but not ended)
  const lastPunchIn = punchIns[punchIns.length - 1];
  const lastPunchOut = punchOuts[punchOuts.length - 1];
  const isCurrentlyWorking = !lastPunchOut || (lastPunchIn && new Date(lastPunchIn.timestamp) > new Date(lastPunchOut.timestamp));

  if (isCurrentlyWorking) {
    const currentTime = new Date().getTime();
    const lastPunchInTime = new Date(lastPunchIn.timestamp).getTime();
    
    // Add current working time
    const currentWorkingHours = (currentTime - lastPunchInTime) / (1000 * 60 * 60);
    
    // Check for ongoing break
    const lastBreakStart = breakStarts[breakStarts.length - 1];
    const lastBreakEnd = breakEnds[breakEnds.length - 1];
    let currentBreakTime = 0;

    if (lastBreakStart && (!lastBreakEnd || new Date(lastBreakStart.timestamp) > new Date(lastBreakEnd.timestamp))) {
      const breakStartTime = new Date(lastBreakStart.timestamp).getTime();
      if (breakStartTime >= lastPunchInTime) {
        currentBreakTime = (currentTime - breakStartTime) / (1000 * 60);
        totalBreakTime += currentBreakTime;
      }
    }

    totalWorkingHours += Math.max(0, currentWorkingHours - (currentBreakTime / 60));
  }

  // Determine current status
  let status: WorkSession['status'] = 'complete';
  if (isCurrentlyWorking) {
    const lastBreakStart = breakStarts[breakStarts.length - 1];
    const lastBreakEnd = breakEnds[breakEnds.length - 1];
    
    if (lastBreakStart && (!lastBreakEnd || new Date(lastBreakStart.timestamp) > new Date(lastBreakEnd.timestamp))) {
      status = 'on_break';
    } else {
      status = 'in_progress';
    }
  }

  // Calculate total hours (first punch in to last punch out)
  const firstPunchIn = punchIns[0];
  const lastValidPunchOut = punchOuts[punchOuts.length - 1];
  const totalHours = lastValidPunchOut 
    ? (new Date(lastValidPunchOut.timestamp).getTime() - new Date(firstPunchIn.timestamp).getTime()) / (1000 * 60 * 60)
    : isCurrentlyWorking 
      ? (new Date().getTime() - new Date(firstPunchIn.timestamp).getTime()) / (1000 * 60 * 60)
      : 0;

  return {
    employeeId,
    date,
    punchIn: firstPunchIn.timestamp,
    punchOut: lastValidPunchOut?.timestamp,
    breakStart: breakStarts[0]?.timestamp,
    breakEnd: breakEnds[0]?.timestamp,
    totalHours,
    breakDuration: totalBreakTime,
    workingHours: totalWorkingHours,
    isLateIn: !!firstPunchIn.isLate,
    isEarlyOut: !!lastValidPunchOut?.isEarly,
    status,
    // Add detailed punch cycles for reporting
    punchCycles: punchIns.map((punchIn, index) => ({
      punchIn: punchIn.timestamp,
      punchOut: punchOuts[index]?.timestamp,
      isLateIn: !!punchIn.isLate,
      isEarlyOut: !!punchOuts[index]?.isEarly,
    })),
  };
};

export const getCurrentWorkSession = (
  employeeId: string,
  timeEntries: TimeEntry[],
  date: string
): WorkSession | null => {
  const todayEntries = timeEntries.filter(entry => 
    entry.employeeId === employeeId && 
    entry.timestamp.startsWith(date)
  );

  if (todayEntries.length === 0) return null;

  return createWorkSession(employeeId, date, todayEntries);
};

export const getCurrentWorkStatus = (
  employeeId: string,
  timeEntries: TimeEntry[],
  date: string
): {
  canPunchIn: boolean;
  canPunchOut: boolean;
  canStartBreak: boolean;
  canEndBreak: boolean;
  currentStatus: 'not_started' | 'working' | 'on_break' | 'finished';
  lastAction?: TimeEntry;
} => {
  const todayEntries = timeEntries
    .filter(entry => entry.employeeId === employeeId && entry.timestamp.startsWith(date))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (todayEntries.length === 0) {
    return {
      canPunchIn: true,
      canPunchOut: false,
      canStartBreak: false,
      canEndBreak: false,
      currentStatus: 'not_started',
    };
  }

  const lastEntry = todayEntries[todayEntries.length - 1];
  const punchIns = todayEntries.filter(e => e.type === 'punch_in');
  const punchOuts = todayEntries.filter(e => e.type === 'punch_out');
  const breakStarts = todayEntries.filter(e => e.type === 'break_start');
  const breakEnds = todayEntries.filter(e => e.type === 'break_end');

  // Determine current status based on last action
  let currentStatus: 'not_started' | 'working' | 'on_break' | 'finished' = 'not_started';
  let canPunchIn = false;
  let canPunchOut = false;
  let canStartBreak = false;
  let canEndBreak = false;

  // Check if currently punched in (more punch ins than punch outs)
  const isPunchedIn = punchIns.length > punchOuts.length;
  
  // Check if currently on break (more break starts than break ends)
  const isOnBreak = breakStarts.length > breakEnds.length;

  if (!isPunchedIn) {
    // Not currently punched in - can punch in
    currentStatus = punchOuts.length > 0 ? 'finished' : 'not_started';
    canPunchIn = true;
    canPunchOut = false;
    canStartBreak = false;
    canEndBreak = false;
  } else if (isOnBreak) {
    // Currently on break
    currentStatus = 'on_break';
    canPunchIn = false;
    canPunchOut = false;
    canStartBreak = false;
    canEndBreak = true;
  } else {
    // Currently working
    currentStatus = 'working';
    canPunchIn = false;
    canPunchOut = true;
    canStartBreak = true;
    canEndBreak = false;
  }

  return {
    canPunchIn,
    canPunchOut,
    canStartBreak,
    canEndBreak,
    currentStatus,
    lastAction: lastEntry,
  };
};

export const isLateEntry = (
  timestamp: string,
  businessHours: BusinessHours,
  type: TimeEntry['type']
): boolean => {
  if (type !== 'punch_in') return false;

  const entryTime = new Date(timestamp);
  const [startHour, startMinute] = businessHours.startTime.split(':').map(Number);
  
  const businessStart = new Date(entryTime);
  businessStart.setHours(startHour, startMinute, 0, 0);
  
  const lateThreshold = businessStart.getTime() + (businessHours.lateThreshold * 60 * 1000);
  
  return entryTime.getTime() > lateThreshold;
};

export const isEarlyEntry = (
  timestamp: string,
  businessHours: BusinessHours,
  type: TimeEntry['type']
): boolean => {
  if (type !== 'punch_out') return false;

  const entryTime = new Date(timestamp);
  const [endHour, endMinute] = businessHours.endTime.split(':').map(Number);
  
  const businessEnd = new Date(entryTime);
  businessEnd.setHours(endHour, endMinute, 0, 0);
  
  return entryTime.getTime() < businessEnd.getTime();
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

export const exportToCSV = (workSessions: WorkSession[], employees: any[]): string => {
  const headers = [
    'Employee Name',
    'Employee ID',
    'Date',
    'First Punch In',
    'Last Punch Out',
    'Total Hours',
    'Break Duration (min)',
    'Working Hours',
    'Punch Cycles',
    'Late Arrivals',
    'Early Departures',
    'Status'
  ];

  const rows = workSessions.map(session => {
    const employee = employees.find(emp => emp.id === session.employeeId);
    const punchCycles = session.punchCycles || [];
    const cyclesText = punchCycles.map((cycle, index) => 
      `Cycle ${index + 1}: ${new Date(cycle.punchIn).toLocaleTimeString()} - ${
        cycle.punchOut ? new Date(cycle.punchOut).toLocaleTimeString() : 'In Progress'
      }${cycle.isLateIn ? ' (Late)' : ''}${cycle.isEarlyOut ? ' (Early)' : ''}`
    ).join('; ');

    return [
      employee?.name || 'Unknown',
      employee?.employeeId || 'Unknown',
      session.date,
      session.punchIn ? new Date(session.punchIn).toLocaleTimeString() : '',
      session.punchOut ? new Date(session.punchOut).toLocaleTimeString() : '',
      session.totalHours.toFixed(2),
      Math.round(session.breakDuration),
      session.workingHours.toFixed(2),
      cyclesText,
      punchCycles.filter(c => c.isLateIn).length,
      punchCycles.filter(c => c.isEarlyOut).length,
      session.status
    ];
  });

  return [headers, ...rows].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
};