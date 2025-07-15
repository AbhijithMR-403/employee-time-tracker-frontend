import React, { useState } from 'react';
import { Clock, Save, AlertCircle } from 'lucide-react';

// Utility functions for UTC <-> Local time conversion
function utcToLocalTimeString(utcTimeStr) {
  if (!utcTimeStr || typeof utcTimeStr !== 'string') return '';
  const [h = '00', m = '00', s = '00'] = utcTimeStr.split(":");
  const date = new Date();
  date.setUTCHours(Number(h), Number(m), Number(s || 0), 0);
  // Get local time in "HH:mm"
  return date.toTimeString().slice(0, 5);
}


const BusinessHoursSettings = ({
  businessHours,
  onUpdateBusinessHours,
}) => {
  // Initialize formData with local time for startTime and endTime, fallback to default if missing
  
  const [formData, setFormData] = useState({
    ...businessHours,
    startTime: utcToLocalTimeString(businessHours.startTime),
    endTime: utcToLocalTimeString(businessHours.endTime),
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateBusinessHours(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Business Hours Configuration</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Time */}
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-slate-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* End Time */}
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-slate-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Break Duration */}
            <div>
              <label htmlFor="breakDuration" className="block text-sm font-medium text-slate-700 mb-2">
                Standard Break Duration (minutes)
              </label>
              <input
                type="number"
                id="breakDuration"
                value={formData.breakDuration}
                onChange={(e) => handleChange('breakDuration', parseInt(e.target.value))}
                min="0"
                max="120"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Late Threshold */}
            <div>
              <label htmlFor="lateThreshold" className="block text-sm font-medium text-slate-700 mb-2">
                Late Arrival Threshold (minutes)
              </label>
              <input
                type="number"
                id="lateThreshold"
                value={formData.lateThreshold}
                onChange={(e) => handleChange('lateThreshold', parseInt(e.target.value))}
                min="1"
                max="60"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <AlertCircle className="w-4 h-4" />
              <span>Changes will affect all future time calculations</span>
            </div>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{saved ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">Current Settings Preview</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Work Hours</div>
            <div className="font-semibold text-slate-900">
              {formData.startTime} - {formData.endTime}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Break Duration</div>
            <div className="font-semibold text-slate-900">
              {formData.breakDuration} minutes
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Late Threshold</div>
            <div className="font-semibold text-slate-900">
              {formData.lateThreshold} minutes
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-1">Daily Hours</div>
            <div className="font-semibold text-slate-900">
              {(() => {
                const start = new Date(`2000-01-01T${formData.startTime}:00`);
                const end = new Date(`2000-01-01T${formData.endTime}:00`);
                const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                return `${diff.toFixed(1)} hours`;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessHoursSettings;