import React, { useState, useMemo } from 'react';
import { Calendar, Clock, TrendingUp, Download, Filter, BarChart3, Users, AlertTriangle, History } from 'lucide-react';
import { WorkSession, Employee } from '../types';

interface ReportsViewProps {
  workSessions: WorkSession[];
  employees: Employee[];
  dateRange: { start: string; end: string };
}

const ReportsView: React.FC<ReportsViewProps> = ({
  workSessions,
  employees,
  dateRange,
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [reportType, setReportType] = useState<'overview' | 'detailed' | 'attendance' | 'punch_cycles'>('overview');

  const filteredSessions = useMemo(() => {
    return workSessions.filter(session => 
      selectedEmployee === '' || session.employeeId === selectedEmployee
    );
  }, [workSessions, selectedEmployee]);

  const reportStats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalWorkingHours = filteredSessions.reduce((sum, session) => sum + session.workingHours, 0);
    const totalBreakTime = filteredSessions.reduce((sum, session) => sum + session.breakDuration, 0);
    const lateArrivals = filteredSessions.filter(session => session.isLateIn).length;
    const earlyDepartures = filteredSessions.filter(session => session.isEarlyOut).length;
    const averageHoursPerDay = totalSessions > 0 ? totalWorkingHours / totalSessions : 0;

    // Count total punch cycles
    const totalPunchCycles = filteredSessions.reduce((sum, session) => 
      sum + (session.punchCycles?.length || 0), 0
    );

    // Group by employee for individual stats
    const employeeStats = employees.map(employee => {
      const employeeSessions = filteredSessions.filter(session => session.employeeId === employee.id);
      const employeeHours = employeeSessions.reduce((sum, session) => sum + session.workingHours, 0);
      const employeeLateCount = employeeSessions.filter(session => session.isLateIn).length;
      const employeeEarlyCount = employeeSessions.filter(session => session.isEarlyOut).length;
      const employeePunchCycles = employeeSessions.reduce((sum, session) => 
        sum + (session.punchCycles?.length || 0), 0
      );

      return {
        employee,
        sessions: employeeSessions.length,
        totalHours: employeeHours,
        averageHours: employeeSessions.length > 0 ? employeeHours / employeeSessions.length : 0,
        lateCount: employeeLateCount,
        earlyCount: employeeEarlyCount,
        punchCycles: employeePunchCycles,
        attendanceRate: employeeSessions.length > 0 ? 
          ((employeeSessions.length - employeeLateCount - employeeEarlyCount) / employeeSessions.length) * 100 : 0,
      };
    }).filter(stat => stat.sessions > 0);

    return {
      totalSessions,
      totalWorkingHours,
      totalBreakTime,
      lateArrivals,
      earlyDepartures,
      averageHoursPerDay,
      totalPunchCycles,
      employeeStats,
    };
  }, [filteredSessions, employees]);

  const chartData = useMemo(() => {
    // Group sessions by date for chart
    const dailyData: { [key: string]: { hours: number; sessions: number; cycles: number } } = {};
    
    filteredSessions.forEach(session => {
      if (!dailyData[session.date]) {
        dailyData[session.date] = { hours: 0, sessions: 0, cycles: 0 };
      }
      dailyData[session.date].hours += session.workingHours;
      dailyData[session.date].sessions += 1;
      dailyData[session.date].cycles += session.punchCycles?.length || 0;
    });

    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14); // Last 14 days
  }, [filteredSessions]);

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Employees</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="overview">Overview</option>
                <option value="detailed">Detailed</option>
                <option value="attendance">Attendance</option>
                <option value="punch_cycles">Punch Cycles</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-slate-600">
            {dateRange.start} to {dateRange.end} • {filteredSessions.length} records
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Hours</p>
              <p className="text-2xl font-bold text-slate-900">
                {reportStats.totalWorkingHours.toFixed(1)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Avg Hours/Day</p>
              <p className="text-2xl font-bold text-slate-900">
                {reportStats.averageHoursPerDay.toFixed(1)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Punch Cycles</p>
              <p className="text-2xl font-bold text-slate-900">
                {reportStats.totalPunchCycles}
              </p>
            </div>
            <History className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Late Arrivals</p>
              <p className="text-2xl font-bold text-slate-900">
                {reportStats.lateArrivals}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Early Departures</p>
              <p className="text-2xl font-bold text-slate-900">
                {reportStats.earlyDepartures}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Hours Trend</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {chartData.map(([date, data], index) => {
            const maxHours = Math.max(...chartData.map(([, d]) => d.hours));
            const height = maxHours > 0 ? (data.hours / maxHours) * 100 : 0;
            
            return (
              <div key={date} className="flex flex-col items-center flex-1">
                <div className="w-full flex justify-center mb-2">
                  <div
                    className="bg-blue-600 rounded-t min-h-[4px] w-full max-w-8"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${data.hours.toFixed(1)} hours, ${data.cycles} punch cycles on ${date}`}
                  />
                </div>
                <div className="text-xs text-slate-500 transform -rotate-45 origin-center">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Employee Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="pb-3 text-sm font-medium text-slate-600">Employee</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Days Worked</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Total Hours</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Avg Hours/Day</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Punch Cycles</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Late Count</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Early Count</th>
                </tr>
              </thead>
              <tbody>
                {reportStats.employeeStats.map((stat) => (
                  <tr key={stat.employee.id} className="border-b border-slate-100">
                    <td className="py-3">
                      <div>
                        <div className="font-medium text-slate-900">{stat.employee.name}</div>
                        <div className="text-sm text-slate-500">{stat.employee.department}</div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-900">{stat.sessions}</td>
                    <td className="py-3 text-slate-900">{stat.totalHours.toFixed(1)}</td>
                    <td className="py-3 text-slate-900">{stat.averageHours.toFixed(1)}</td>
                    <td className="py-3 text-slate-900">{stat.punchCycles}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stat.lateCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {stat.lateCount}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stat.earlyCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {stat.earlyCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'punch_cycles' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Punch In/Out Cycles</h3>
          <div className="space-y-6">
            {filteredSessions.map((session) => {
              const employee = employees.find(emp => emp.id === session.employeeId);
              const cycles = session.punchCycles || [];
              
              if (cycles.length === 0) return null;
              
              return (
                <div key={`${session.employeeId}-${session.date}`} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-slate-900">{employee?.name}</h4>
                      <p className="text-sm text-slate-500">{session.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">{cycles.length} cycles</div>
                      <div className="text-sm text-slate-600">{session.workingHours.toFixed(1)}h total</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {cycles.map((cycle, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-slate-600 w-16">#{index + 1}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-900">
                              {new Date(cycle.punchIn).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {cycle.isLateIn && (
                              <span className="text-xs text-red-600 bg-red-100 px-1 rounded">Late</span>
                            )}
                          </div>
                          <span className="text-slate-400">→</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-900">
                              {cycle.punchOut 
                                ? new Date(cycle.punchOut).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'In Progress'
                              }
                            </span>
                            {cycle.isEarlyOut && (
                              <span className="text-xs text-amber-600 bg-amber-100 px-1 rounded">Early</span>
                            )}
                          </div>
                        </div>
                        {cycle.punchOut && (
                          <div className="text-sm text-slate-600 font-medium">
                            {((new Date(cycle.punchOut).getTime() - new Date(cycle.punchIn).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reportType === 'detailed' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Detailed Time Entries</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="pb-3 text-sm font-medium text-slate-600">Date</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Employee</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">First Punch In</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Last Punch Out</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Cycles</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Break (min)</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Working Hours</th>
                  <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => {
                  const employee = employees.find(emp => emp.id === session.employeeId);
                  return (
                    <tr key={`${session.employeeId}-${session.date}`} className="border-b border-slate-100">
                      <td className="py-3 text-slate-900">{session.date}</td>
                      <td className="py-3">
                        <div className="font-medium text-slate-900">{employee?.name}</div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-900">
                            {session.punchIn ? new Date(session.punchIn).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            }) : '--:--'}
                          </span>
                          {session.isLateIn && (
                            <span className="text-red-600 text-xs">(Late)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-900">
                            {session.punchOut ? new Date(session.punchOut).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit'
                            }) : '--:--'}
                          </span>
                          {session.isEarlyOut && (
                            <span className="text-amber-600 text-xs">(Early)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-slate-900">{session.punchCycles?.length || 0}</td>
                      <td className="py-3 text-slate-900">{Math.round(session.breakDuration)}</td>
                      <td className="py-3 text-slate-900">{session.workingHours.toFixed(1)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === 'complete' ? 'bg-green-100 text-green-800' :
                          session.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {session.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'attendance' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Attendance Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Punctuality Report</h4>
              <div className="space-y-3">
                {reportStats.employeeStats.map((stat) => (
                  <div key={stat.employee.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-900">{stat.employee.name}</div>
                      <div className="text-sm text-slate-500">
                        {stat.lateCount} late • {stat.earlyCount} early departures • {stat.punchCycles} cycles
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        stat.attendanceRate >= 90 ? 'text-green-600' :
                        stat.attendanceRate >= 75 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {stat.attendanceRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-500">On-time rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Hours Distribution</h4>
              <div className="space-y-3">
                {reportStats.employeeStats.map((stat) => (
                  <div key={stat.employee.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-900">{stat.employee.name}</span>
                      <span className="text-sm text-slate-600">{stat.totalHours.toFixed(1)}h total</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((stat.averageHours / 8) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {stat.averageHours.toFixed(1)}h average per day
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;