import React, { useState, useEffect } from 'react';
import { Clock, Coffee, LogIn, LogOut, User, AlertCircle, History, Calendar, TrendingUp } from 'lucide-react';
import { getCurrentWorkSession, getCurrentWorkStatus, getWeeklyHours } from '../utils/apiTimeCalculations';
import { getWorkStatus } from '../utils/apiStorage';

const EmployeeInterface = ({
  employees,
  selectedEmployee,
  setSelectedEmployee,
  onPunchAction,
  businessHours,
  timeEntries,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAutoSelected, setIsAutoSelected] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [workStatus, setWorkStatus] = useState(null);
  const [todayEntries, setTodayEntries] = useState([]);
  const [weeklyHours, setWeeklyHours] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if employee was auto-selected from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const employeeEmail = urlParams.get('employee');
    
    if (employeeEmail && selectedEmployee) {
      const isUrlMatch = selectedEmployee.email.toLowerCase() === employeeEmail.toLowerCase();
      setIsAutoSelected(isUrlMatch);
    } else {
      setIsAutoSelected(false);
    }
  }, [selectedEmployee]);

  // Load work status and session when employee changes
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!selectedEmployee) {
        setCurrentSession(null);
        setWorkStatus(null);
        setTodayEntries([]);
        return;
      }

      setIsLoading(true);
      setIsLoadingWeekly(true);
      try {
        const today = new Date().toLocaleDateString('en-CA');
        
        // Load work status, session, and weekly hours
        const [statusData, sessionData, weeklyData] = await Promise.all([
          getWorkStatus(selectedEmployee.id),
          getCurrentWorkSession(selectedEmployee.id, [], today),
          getWeeklyHours(selectedEmployee.id)
        ]);
        
        
        setWorkStatus(statusData);
        setCurrentSession(sessionData);
        setWeeklyHours(weeklyData);

        // Filter today's entries from the timeEntries prop
        const todaysEntries = timeEntries.filter(entry => 
          entry.employeeId === selectedEmployee.id && 
          entry.timestamp.startsWith(today)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setTodayEntries(todaysEntries);
      } catch (error) {
        console.error('Error loading employee data:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingWeekly(false);
      }
    };

    loadEmployeeData();
  }, [selectedEmployee, timeEntries]);

  const handlePunchAction = async (type) => {
    if (!selectedEmployee) return;

    const timestamp = new Date().toISOString();

    try {
      await onPunchAction({
        employeeId: selectedEmployee.id,
        type,
        timestamp,
        isLate: false, // Will be calculated by backend
        isEarly: false, // Will be calculated by backend
      });

      // Reload work status and weekly hours after punch action
      const [statusData, weeklyData] = await Promise.all([
        getWorkStatus(selectedEmployee.id),
        getWeeklyHours(selectedEmployee.id)
      ]);
      setWorkStatus(statusData);
      setWeeklyHours(weeklyData);
    } catch (error) {
      console.error('Error recording punch action:', error);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusDisplay = () => {
    if (!workStatus) return 'Not Started';
    
    switch (workStatus.current_status || workStatus.currentStatus) {
      case 'not_started':
        return 'Not Clocked In';
      case 'working':
        return 'Working';
      case 'on_break':
        return 'On Break';
      case 'finished':
        return 'Finished for Today';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    if (!workStatus) return 'text-slate-400';
    
    switch (workStatus.current_status || workStatus.currentStatus) {
      case 'not_started':
        return 'text-slate-400';
      case 'working':
        return 'text-green-400';
      case 'on_break':
        return 'text-amber-400';
      case 'finished':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Employee Selection */}
      {!selectedEmployee && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Your Profile</h2>
            <p className="text-slate-600">Choose your employee profile to begin time tracking</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {employees.filter(emp => emp.isActive).map((employee) => (
              <button
                key={employee.id}
                onClick={() => setSelectedEmployee(employee)}
                className="p-6 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-100">
                    <User className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-900">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-slate-600">{employee.employeeId}</p>
                    <p className="text-xs text-slate-500">{employee.department}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time Tracking Interface */}
      {selectedEmployee && (
        <div className="space-y-6">
          {/* Current Time Display */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg text-white p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Welcome, {selectedEmployee.name}</h2>
                <p className="text-blue-100">{selectedEmployee.department} • {selectedEmployee.position}</p>
              </div>
              {/* Only show Switch User button if not auto-selected from URL */}
              {!isAutoSelected && (
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  Switch User
                </button>
              )}
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-8">
              <div>
                <div className="text-5xl font-mono font-bold mb-2">
                  {formatTime(currentTime)}
                </div>
                <div className="text-blue-100 text-lg">
                  {formatDate(currentTime)}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-blue-100 mb-1">Current Status</div>
                <div className={`text-2xl font-semibold ${getStatusColor()}`}>
                  {getStatusDisplay()}
                </div>
                {workStatus?.last_action && (
                  <div className="text-blue-100 text-sm">
                    Last action: {workStatus.last_action.type.replace('_', ' ')} at{' '}
                    {new Date(workStatus.last_action.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-slate-600">Loading...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Punch In */}
                <button
                  onClick={() => handlePunchAction('punch_in')}
                  disabled={!workStatus?.can_punch_in && !workStatus?.canPunchIn}
                  className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                    (!workStatus?.can_punch_in && !workStatus?.canPunchIn)
                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'border-green-200 hover:border-green-500 hover:bg-green-50 text-green-700 hover:text-green-800'
                  }`}
                >
                  <LogIn className="w-8 h-8 mx-auto mb-3" />
                  <div className="font-semibold mb-1">Punch In</div>
                  <div className="text-sm opacity-75">
                    {(workStatus?.current_status || workStatus?.currentStatus) === 'finished' ? 'Start new session' : 'Start your shift'}
                  </div>
                </button>

                {/* Punch Out */}
                <button
                  onClick={() => handlePunchAction('punch_out')}
                  disabled={!workStatus?.can_punch_out && !workStatus?.canPunchOut}
                  className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                    (!workStatus?.can_punch_out && !workStatus?.canPunchOut)
                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'border-red-200 hover:border-red-500 hover:bg-red-50 text-red-700 hover:text-red-800'
                  }`}
                >
                  <LogOut className="w-8 h-8 mx-auto mb-3" />
                  <div className="font-semibold mb-1">Punch Out</div>
                  <div className="text-sm opacity-75">End current session</div>
                </button>

                {/* Break Start */}
                <button
                  onClick={() => handlePunchAction('break_start')}
                  disabled={!workStatus?.can_start_break && !workStatus?.canStartBreak}
                  className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                    (!workStatus?.can_start_break && !workStatus?.canStartBreak)
                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'border-amber-200 hover:border-amber-500 hover:bg-amber-50 text-amber-700 hover:text-amber-800'
                  }`}
                >
                  <Coffee className="w-8 h-8 mx-auto mb-3" />
                  <div className="font-semibold mb-1">Start Break</div>
                  <div className="text-sm opacity-75">Take a break</div>
                </button>

                {/* Break End */}
                <button
                  onClick={() => handlePunchAction('break_end')}
                  disabled={!workStatus?.can_end_break && !workStatus?.canEndBreak}
                  className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                    (!workStatus?.can_end_break && !workStatus?.canEndBreak)
                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'border-blue-200 hover:border-blue-500 hover:bg-blue-50 text-blue-700 hover:text-blue-800'
                  }`}
                >
                  <Clock className="w-8 h-8 mx-auto mb-3" />
                  <div className="font-semibold mb-1">End Break</div>
                  <div className="text-sm opacity-75">Resume work</div>
                </button>
              </div>
            )}
          </div>

          {/* Today's Summary */}
          {currentSession && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Today's Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {currentSession.punchIn || currentSession.punch_in
                      ? new Date(currentSession.punchIn || currentSession.punch_in).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      : '--:--'
                    }
                  </div>
                  <div className="text-sm text-slate-600 mt-1">First Punch In</div>
                  {(currentSession.isLateIn || currentSession.is_late_in) && (
                    <div className="flex items-center justify-center mt-1 text-red-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs">Late</span>
                    </div>
                  )}
                </div>
                
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {currentSession.punchOut || currentSession.punch_out
                      ? new Date(currentSession.punchOut || currentSession.punch_out).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      : '--:--'
                    }
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Last Punch Out</div>
                  {(currentSession.isEarlyOut || currentSession.is_early_out) && (
                    <div className="flex items-center justify-center mt-1 text-amber-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs">Early</span>
                    </div>
                  )}
                </div>
                
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {Math.round(currentSession.breakDuration || currentSession.break_duration || 0)}m
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Break Time</div>
                </div>
                
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">
                    {(currentSession.workingHours || currentSession.working_hours || 0).toFixed(1)}h
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Working Hours</div>
                </div>
              </div>

              {/* Punch Cycles */}
              {currentSession.punchCycles && currentSession.punchCycles.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <History className="w-5 h-5 text-slate-600" />
                    <h4 className="font-medium text-slate-900">Punch In/Out Cycles</h4>
                  </div>
                  <div className="space-y-2">
                    {currentSession.punchCycles.map((cycle, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-slate-600">Cycle {index + 1}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-900">
                              {new Date(cycle.punchIn || cycle.punch_in).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {(cycle.isLateIn || cycle.is_late_in) && (
                              <span className="text-xs text-red-600 bg-red-100 px-1 rounded">Late</span>
                            )}
                          </div>
                          <span className="text-slate-400">→</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-900">
                              {cycle.punchOut || cycle.punch_out
                                ? new Date(cycle.punchOut || cycle.punch_out).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'In Progress'
                              }
                            </span>
                            {(cycle.isEarlyOut || cycle.is_early_out) && (
                              <span className="text-xs text-amber-600 bg-amber-100 px-1 rounded">Early</span>
                            )}
                          </div>
                        </div>
                        {(cycle.punchOut || cycle.punch_out) && (
                          <div className="text-sm text-slate-600">
                            {((new Date(cycle.punchOut || cycle.punch_out).getTime() - new Date(cycle.punchIn || cycle.punch_in).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weekly Hours Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Last 7 Days</h3>
                {isLoadingWeekly && (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <button
                onClick={async () => {
                  if (!selectedEmployee) return;
                  setIsLoadingWeekly(true);
                  try {
                    const weeklyData = await getWeeklyHours(selectedEmployee.id);
                    setWeeklyHours(weeklyData);
                  } catch (error) {
                    console.error('Error refreshing weekly hours:', error);
                  } finally {
                    setIsLoadingWeekly(false);
                  }
                }}
                disabled={isLoadingWeekly}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh
              </button>
            </div>
            
            {weeklyHours ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-900">
                      {weeklyHours.totalHours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-blue-700 mt-1">Total Hours</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-900">
                      {weeklyHours.daysWorked}
                    </div>
                    <div className="text-sm text-green-700 mt-1">Days Worked</div>
                  </div>
                  
                  <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-900">
                      {weeklyHours.averageHoursPerDay.toFixed(1)}h
                    </div>
                    <div className="text-sm text-amber-700 mt-1">Avg/Day</div>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-2xl font-bold text-slate-900">
                      {weeklyHours.totalBreakTime.toFixed(0)}m
                    </div>
                    <div className="text-sm text-slate-700 mt-1">Break Time</div>
                  </div>
                </div>

                {/* Weekly Date Range */}
                <div className="text-center mb-4 p-3 bg-slate-50 rounded-lg">
                                  <div className="text-sm text-slate-600">
                  {new Date(weeklyHours.weekStart).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })} - {new Date(weeklyHours.weekEnd).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })} (Last 7 days)
                </div>
                </div>

                {/* Daily Breakdown */}
                {weeklyHours.dailyBreakdown.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-slate-600" />
                      <h4 className="font-medium text-slate-900">Daily Breakdown</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                             {weeklyHours.dailyBreakdown.map((day, index) => (
                         <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                           <div className="flex items-center justify-between mb-2">
                             <span className="font-medium text-slate-900">{day.dayName}</span>
                             <span className="text-sm text-slate-600">
                               {new Date(day.date).toLocaleDateString('en-US', { 
                                 month: 'short', 
                                 day: 'numeric' 
                               })}
                             </span>
                           </div>
                           
                           {/* Punch Times */}
                           <div className="mb-2 space-y-1">
                             <div className="flex items-center justify-between text-xs">
                               <span className="text-slate-600">In:</span>
                               <span className="font-medium text-slate-900">
                                 {day.punchIn 
                                   ? new Date(day.punchIn).toLocaleTimeString('en-US', {
                                       hour: '2-digit',
                                       minute: '2-digit'
                                     })
                                   : '--:--'
                                 }
                               </span>
                             </div>
                             <div className="flex items-center justify-between text-xs">
                               <span className="text-slate-600">Out:</span>
                               <span className="font-medium text-slate-900">
                                 {day.punchOut 
                                   ? new Date(day.punchOut).toLocaleTimeString('en-US', {
                                       hour: '2-digit',
                                       minute: '2-digit'
                                     })
                                   : '--:--'
                                 }
                               </span>
                             </div>
                           </div>
                           
                           <div className="flex items-center justify-between">
                             <span className="text-lg font-semibold text-slate-900">
                               {day.hours.toFixed(1)}h
                             </span>
                             <div className="flex items-center space-x-1">
                               {day.isLate && (
                                 <span className="text-xs text-red-600 bg-red-100 px-1 rounded">Late</span>
                               )}
                               {day.isEarly && (
                                 <span className="text-xs text-amber-600 bg-amber-100 px-1 rounded">Early</span>
                               )}
                             </div>
                           </div>
                           {day.breakTime > 0 && (
                             <div className="text-xs text-slate-500 mt-1">
                               Break: {day.breakTime.toFixed(0)}m
                             </div>
                           )}
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-600">No weekly data available</p>
                <p className="text-sm text-slate-500 mt-1">Start working to see your weekly hours</p>
              </div>
            )}
          </div>

          {/* Today's Activity Log */}
          {todayEntries.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Today's Activity Log</h3>
              <div className="space-y-3">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        entry.type === 'punch_in' ? 'bg-green-500' :
                        entry.type === 'punch_out' ? 'bg-red-500' :
                        entry.type === 'break_start' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`} />
                      <span className="font-medium text-slate-900">
                        {entry.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      {entry.isLate && (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">Late</span>
                      )}
                      {entry.isEarly && (
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">Early</span>
                      )}
                    </div>
                    <span className="text-sm text-slate-600">
                      {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeInterface;