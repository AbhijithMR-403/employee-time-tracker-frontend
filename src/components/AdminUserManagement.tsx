import React, { useState } from 'react';
import { Shield, Plus, Edit2, Trash2, Mail, User, Eye, EyeOff, Search, UserCheck } from 'lucide-react';
import { AdminUser } from '../types';

interface AdminUserManagementProps {
  adminUsers: AdminUser[];
  onAddAdminUser: (adminUser: Omit<AdminUser, 'id' | 'createdAt'>) => void;
  onUpdateAdminUser: (adminUser: AdminUser) => void;
  onDeleteAdminUser: (adminId: string) => void;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  adminUsers,
  onAddAdminUser,
  onUpdateAdminUser,
  onDeleteAdminUser,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Admin',
    isActive: true,
  });

  const filteredAdmins = adminUsers.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAdmin) {
      onUpdateAdminUser({
        ...editingAdmin,
        ...formData,
      });
      setEditingAdmin(null);
    } else {
      onAddAdminUser(formData);
      setShowAddForm(false);
    }
    
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Admin',
      isActive: true,
    });
    setShowPassword(false);
  };

  const handleEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: admin.password,
      role: admin.role,
      isActive: admin.isActive,
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Admin',
      isActive: true,
    });
    setShowPassword(false);
  };

  const handleDelete = (adminId: string) => {
    if (adminUsers.length <= 1) {
      alert('Cannot delete the last admin user. At least one admin must remain.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this admin user? This action cannot be undone.')) {
      onDeleteAdminUser(adminId);
    }
  };

  const toggleAdminStatus = (admin: AdminUser) => {
    if (!admin.isActive && adminUsers.filter(a => a.isActive).length <= 1) {
      alert('Cannot deactivate the last active admin user. At least one admin must remain active.');
      return;
    }
    
    onUpdateAdminUser({
      ...admin,
      isActive: !admin.isActive,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Admin User Management</h3>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Admin</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search admin users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Admin Users List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-slate-200">
              <th className="pb-3 text-sm font-medium text-slate-600">Admin User</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Email</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Role</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Status</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Created</th>
              <th className="pb-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdmins.map((admin) => (
              <tr key={admin.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{admin.name}</div>
                      <div className="text-sm text-slate-500">ID: {admin.id}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4">
                  <div className="flex items-center text-sm text-slate-900">
                    <Mail className="w-3 h-3 mr-1 text-slate-400" />
                    {admin.email}
                  </div>
                </td>
                <td className="py-4">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    {admin.role}
                  </span>
                </td>
                <td className="py-4">
                  <button
                    onClick={() => toggleAdminStatus(admin)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      admin.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="py-4 text-sm text-slate-600">
                  {new Date(admin.createdAt).toLocaleDateString()}
                </td>
                <td className="py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(admin)}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit admin user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(admin.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete admin user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Admin Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editingAdmin ? 'Edit Admin User' : 'Add New Admin User'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="HR Admin">HR Admin</option>
                    <option value="Payroll Admin">Payroll Admin</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-slate-700">
                    Active Admin User
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingAdmin ? 'Update' : 'Add'} Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;