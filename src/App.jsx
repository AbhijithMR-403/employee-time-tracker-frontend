import React, { useState, useEffect } from 'react';
import { Clock, Users, Settings, BarChart3, Calendar, User } from 'lucide-react';
import EmployeeInterface from './components/EmployeeInterface';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { jwtDecode } from 'jwt-decode';

import { 
  getStoredData, 
  addEmployee, 
  updateEmployee, 
  addTimeEntry, 
  updateBusinessHours, 
  addAdminUser, 
  updateAdminUser, 
  deleteAdminUser,
  getEmployeeByEmail,
  initializeDefaultData 
} from './utils/apiStorage';
import { apiClient } from './utils/api';

function App() {
  const [currentView, setCurrentView] = useState('employee');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [businessHours, setBusinessHours] = useState({
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    lateThreshold: 15,
  });
  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if device is mobile and block access
  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = window.innerWidth < 1024 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        await initializeDefaultData();
        const data = await getStoredData();
        
        setEmployees(data.employees);
        setTimeEntries(data.timeEntries);
        setBusinessHours(data.businessHours);
        setAdminUsers(data.adminUsers);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Check URL parameters for employee selection
  useEffect(() => {
    const checkEmployeeFromUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const employeeEmail = urlParams.get('employee');
      
      if (employeeEmail && employees.length === 0) {
        // If employees haven't loaded yet, try to get employee directly
        try {
          const employee = await getEmployeeByEmail(employeeEmail);
          if (employee) {
            setSelectedEmployee(employee);
          }
        } catch (error) {
          console.error('Error fetching employee by email:', error);
        }
      } else if (employeeEmail && employees.length > 0) {
        const employee = employees.find(emp => 
          emp.email.toLowerCase() === employeeEmail.toLowerCase() && emp.isActive
        );
        if (employee) {
          setSelectedEmployee(employee);
        }
      }
    };

    checkEmployeeFromUrl();
  }, [employees]);

  // Reset admin authentication when switching away from admin view
  useEffect(() => {
    if (currentView !== 'admin') {
      setIsAdminAuthenticated(false);
    }
  }, [currentView]);

  const handleAddTimeEntry = async (entry) => {
    try {
      const newEntry = await addTimeEntry(entry);
      setTimeEntries(prev => [newEntry, ...prev]);
    } catch (error) {
      console.error('Error adding time entry:', error);
      setError('Failed to record time entry. Please try again.');
    }
  };

  const handleUpdateEmployee = async (updatedEmployee) => {
    try {
      const updated = await updateEmployee(updatedEmployee);
      setEmployees(prev => prev.map(emp => 
        emp.id === updated.id ? updated : emp
      ));
    } catch (error) {
      console.error('Error updating employee:', error);
      setError('Failed to update employee. Please try again.');
    }
  };

  const handleAddEmployee = async (employee) => {
    try {
      const newEmployee = await addEmployee(employee);
      setEmployees(prev => [...prev, newEmployee]);
    } catch (error) {
      console.error('Error adding employee:', error);
      setError('Failed to add employee. Please try again.');
    }
  };

  const handleUpdateBusinessHours = async (hours) => {
    try {
      const updated = await updateBusinessHours(hours);
      setBusinessHours(updated);
    } catch (error) {
      console.error(error);
      setError('' + error);
    }
  };

  const handleAddAdminUser = async (adminUser) => {
    try {
      const newAdminUser = await addAdminUser(adminUser);
      setAdminUsers(prev => [...prev, newAdminUser]);
    } catch (error) {
      console.error('Error adding admin user:', error);
      setError('Failed to add admin user. Please try again.');
    }
  };

  const handleUpdateAdminUser = async (updatedAdminUser) => {
    try {
      const updated = await updateAdminUser(updatedAdminUser);
      setAdminUsers(prev => prev.map(admin => 
        admin.id === updated.id ? updated : admin
      ));
    } catch (error) {
      console.error('Error updating admin user:', error);
      setError('Failed to update admin user. Please try again.');
    }
  };

  const handleDeleteAdminUser = async (adminId) => {
    try {
      await deleteAdminUser(adminId);
      setAdminUsers(prev => prev.filter(admin => admin.id !== adminId));
    } catch (error) {
      console.error('Error deleting admin user:', error);
      setError('Failed to delete admin user. Please try again.');
    }
  };

  const handleAdminViewClick = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();
  
        if (!isExpired) {
          setIsAdminAuthenticated(true);
          setCurrentView('admin');
          return;
        }
      } catch (err) {
        console.error('Invalid token:', err);
      }
    }

    setIsAdminAuthenticated(false);
    setCurrentView('admin');
    };

  const handleAdminLogin = (token) => {
    apiClient.setToken(token)
    setIsAdminAuthenticated(true);
    setError(null);
  };

  const handleLogout = () => {
    // Clear JWT and any sensitive data
    localStorage.removeItem('token');
  
    // Optional: clear any other user-specific state
    setIsAdminAuthenticated(false);
    setCurrentView('employee'); // Go back to employee view or login page
  };
  
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Desktop Access Only</h1>
          <p className="text-slate-600 mb-4">
            This time tracking system is designed for desktop use only. 
            Please access this application from a desktop or laptop computer.
          </p>
          <div className="text-sm text-slate-500">
            Screen width must be at least 1024px
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Error ⛔</h1>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show admin login if admin view is selected but not authenticated
  if (currentView === 'admin' && !isAdminAuthenticated) {
    return <AdminLogin onLogin={handleAdminLogin} handleLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <img 
                  src="./350x180png.png" 
                  alt="The Service Pilot Logo" 
                  className="h-12 w-auto"
                  onError={(e) => {
                    const target = e.target;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center';
                    fallback.innerHTML = '<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
                    target.parentNode?.insertBefore(fallback, target);
                  }}
                />
              </div>
              <div className="border-l border-slate-300 pl-4">
                <h1 className="text-2xl font-bold text-slate-900">TimeTracker Pro</h1>
                <p className="text-sm text-slate-600">Employee Time Management System</p>
              </div>
            </div>
            
            <nav className="flex space-x-1">
              <button
                onClick={() => setCurrentView('employee')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'employee'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 inline-block mr-2" />
                Employee
              </button>
              <button
                onClick={handleAdminViewClick}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline-block mr-2" />
                Admin
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg font-medium text-red-600 hover:text-red-800 hover:bg-slate-100 transition-colors"
              >
                Logout
              </button>

            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {currentView === 'employee' ? (
          <EmployeeInterface
            employees={employees}
            selectedEmployee={selectedEmployee}
            setSelectedEmployee={setSelectedEmployee}
            onPunchAction={handleAddTimeEntry}
            businessHours={businessHours}
            timeEntries={timeEntries}
          />
        ) : (
          <AdminDashboard
            employees={employees}
            timeEntries={timeEntries}
            businessHours={businessHours}
            adminUsers={adminUsers}
            onUpdateBusinessHours={handleUpdateBusinessHours}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onAddAdminUser={handleAddAdminUser}
            onUpdateAdminUser={handleUpdateAdminUser}
            onDeleteAdminUser={handleDeleteAdminUser}
          />
        )}
      </main>
    </div>
  );
}

export default App;