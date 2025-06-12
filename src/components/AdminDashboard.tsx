import React, { useState, useMemo } from 'react';
import { Users, Clock, Settings, Download, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { Employee, TimeEntry, BusinessHours, WorkSession, AdminUser } from '../types';
import { generateWorkSessions, exportToCSV } from '../utils/apiTimeCalculations';
import { getWorkSessions, exportToCSV as apiExportCSV } from '../utils/apiStorage';
import BusinessHoursSettings from './BusinessHoursSettings';
import EmployeeManagement from './EmployeeManagement';
import ReportsView from './ReportsView';
import AdminUserManagement from './AdminUserManagement';

interface AdminDashboardProps {
  employees: Employee[];
  timeEntries: TimeEntry[];
  businessHours: BusinessHours;
  adminUsers: AdminUser[];
  onUpdateBusinessHours: (hours: BusinessHours) => void;
  onAddEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onAddAdminUser: (adminUser: Omit<AdminUser, 'id' | 'createdAt'>) => void;
  onUpdateAdminUser: (adminUser: AdminUser) => void;
  onDeleteAdminUser: (adminId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  timeEntries,
  businessHours,
  adminUsers,
  onUpdateBusinessHours,
  onAddEmployee,
  onUpdateEmployee,
  onAddAdminUser,
  onUpdateAdminUser,
  onDeleteAdminUser,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'employees' | 'settings'>('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Load work sessions when date range changes
  React.useEffect(() => {
    const loadWorkSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const sessions = await getWorkSessions(dateRange.start, dateRange.end);
        setWorkSessions(sessions);
      } catch (error) {
        console.error('Error loading work sessions:', error);
        setWorkSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadWorkSessions();
  }, [dateRange]);

  const stats = useMemo(() => {
    const totalHours = workSessions.reduce((sum, session) => sum + session.workingHours, 0);
    const totalBreakTime = workSessions.reduce((sum, session) => sum + session.breakDuration, 0);
    const lateArrivals = workSessions.filter(session => session.isLateIn).length;
    const earlyDepartures = workSessions.filter(session => session.isEarlyOut).length;
    const activeEmployees = employees.filter(emp => emp.isActive).length;

    return {
      totalHours: totalHours.toFixed(1),
      totalBreakTime: Math.round(totalBreakTime),
      lateArrivals,
      earlyDepartures,
      activeEmployees,
      avgHoursPerDay: workSessions.length > 0 ? (totalHours / workSessions.length).toFixed(1) : '0',
    };
  }, [workSessions, employees]);

  const handleExportData = async () => {
    try {
      const blob = await apiExportCSV(dateRange.start, dateRange.end);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet-${dateRange.start}-to-${dateRange.end}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: Calendar },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-6">
          <nav className="flex space-x-1 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium text-sm rounded-t-lg border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 inline-block mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Hours</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalHours}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Employees</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeEmployees}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Late Arrivals</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.lateArrivals}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Early Departures</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.earlyDepartures}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Break Time (min)</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalBreakTime}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg Hours/Day</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.avgHoursPerDay}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
            {isLoadingSessions ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-slate-600">Loading recent activity...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timeEntries
                  .slice(-10)
                  .reverse()
                  .map((entry) => {
                    const employee = employees.find(emp => emp.id === entry.employeeId);
                    const timestamp = new Date(entry.timestamp);
                    
                    return (
                      <div key={entry.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            entry.type === 'punch_in' ? 'bg-green-500' :
                            entry.type === 'punch_out' ? 'bg-red-500' :
                            entry.type === 'break_start' ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`} />
                          <div>
                            <p className="font-medium text-slate-900">{employee?.name || 'Unknown Employee'}</p>
                            <p className="text-sm text-slate-500">
                              {entry.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {entry.isLate && <span className="text-red-600 ml-2">(Late)</span>}
                              {entry.isEarly && <span className="text-amber-600 ml-2">(Early)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900">
                            {timestamp.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {timestamp.toLocaleDateString('en-US')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <ReportsView
          workSessions={workSessions}
          employees={employees}
          dateRange={dateRange}
        />
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <EmployeeManagement
          employees={employees}
          onAddEmployee={onAddEmployee}
          onUpdateEmployee={onUpdateEmployee}
        />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <BusinessHoursSettings
            businessHours={businessHours}
            onUpdateBusinessHours={onUpdateBusinessHours}
          />
          <AdminUserManagement
            adminUsers={adminUsers}
            onAddAdminUser={onAddAdminUser}
            onUpdateAdminUser={onUpdateAdminUser}
            onDeleteAdminUser={onDeleteAdminUser}
          />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;