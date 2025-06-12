import { Employee, TimeEntry, BusinessHours, AdminUser } from '../types';

interface StorageData {
  employees: Employee[];
  timeEntries: TimeEntry[];
  businessHours: BusinessHours;
  adminUsers: AdminUser[];
}

const STORAGE_KEY = 'timetracker_data';

export const getStoredData = (): StorageData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      
      // Ensure all required fields exist and merge with defaults if missing
      const defaultData = getDefaultData();
      
      return {
        employees: data.employees && data.employees.length > 0 ? data.employees : defaultData.employees,
        timeEntries: data.timeEntries || defaultData.timeEntries,
        businessHours: data.businessHours || defaultData.businessHours,
        adminUsers: data.adminUsers || defaultData.adminUsers,
      };
    }
  } catch (error) {
    console.error('Error loading stored data:', error);
  }
  
  return getDefaultData();
};

export const saveData = (data: StorageData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

export const getDefaultData = (): StorageData => ({
  employees: [
    {
      id: '1',
      name: 'John Smith',
      employeeId: 'EMP001',
      email: 'john.smith@company.com',
      department: 'Engineering',
      position: 'Software Developer',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      employeeId: 'EMP002',
      email: 'sarah.johnson@company.com',
      department: 'Marketing',
      position: 'Marketing Manager',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Michael Brown',
      employeeId: 'EMP003',
      email: 'michael.brown@company.com',
      department: 'Sales',
      position: 'Sales Representative',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Roshan Alex Raj',
      employeeId: 'EMP004',
      email: 'roshanalexraj@gmail.com',
      department: 'Engineering',
      position: 'Senior Developer',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Emily Davis',
      employeeId: 'EMP005',
      email: 'emily.davis@company.com',
      department: 'Human Resources',
      position: 'HR Manager',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'David Wilson',
      employeeId: 'EMP006',
      email: 'david.wilson@company.com',
      department: 'Finance',
      position: 'Financial Analyst',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '7',
      name: 'Lisa Chen',
      employeeId: 'EMP007',
      email: 'lisa.chen@company.com',
      department: 'Design',
      position: 'UX Designer',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '8',
      name: 'Robert Taylor',
      employeeId: 'EMP008',
      email: 'robert.taylor@company.com',
      department: 'Operations',
      position: 'Operations Manager',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '9',
      name: 'Jennifer Martinez',
      employeeId: 'EMP009',
      email: 'jennifer.martinez@company.com',
      department: 'Marketing',
      position: 'Content Specialist',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '10',
      name: 'Alex Thompson',
      employeeId: 'EMP010',
      email: 'alex.thompson@company.com',
      department: 'Engineering',
      position: 'DevOps Engineer',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  timeEntries: [],
  businessHours: {
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    lateThreshold: 15,
  },
  adminUsers: [
    {
      id: 'admin1',
      email: 'admin@gmail.com',
      password: 'admin@123',
      name: 'System Administrator',
      role: 'Super Admin',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
});

export const initializeDefaultData = (): void => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    saveData(getDefaultData());
  } else {
    // Force update to ensure all new employees are included
    try {
      const data = JSON.parse(existing);
      const defaultData = getDefaultData();
      
      // Check if we need to add new employees
      const existingEmployeeIds = (data.employees || []).map((emp: Employee) => emp.id);
      const newEmployees = defaultData.employees.filter(emp => !existingEmployeeIds.includes(emp.id));
      
      if (newEmployees.length > 0) {
        data.employees = [...(data.employees || []), ...newEmployees];
        data.adminUsers = data.adminUsers || defaultData.adminUsers;
        saveData(data);
      }
    } catch (error) {
      console.error('Error updating stored data:', error);
      saveData(getDefaultData());
    }
  }
};

// Function to reset data (useful for testing)
export const resetToDefaultData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  saveData(getDefaultData());
};