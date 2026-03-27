import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Upload, Plus, Trash2, FileSpreadsheet, Package, RotateCcw, History, Image as ImageIcon, Link as LinkIcon, RefreshCw, Sparkles, Loader2, Search, Filter, Users, UserPlus, BarChart3, TrendingUp, PieChart, Calendar, Zap, Database, ChevronDown, ExternalLink, Eye, Edit3, Download, Settings, Shield } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart as RePieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

interface Product {
  moduleId: string;
  brand: string;
  code?: string;
  name: string;
  unit: string;
  price: number;
  image: string;
  description?: string;
  shape?: string;
  color?: string;
  glassType?: string;
  borderType?: string;
}

interface AdminDashboardProps {
  catalog: Product[];
  setCatalog: (catalog: Product[]) => void;
  onClose: () => void;
  versions: any[];
  onSaveVersion: () => void;
  onRestoreVersion: (version: any) => void;
  onDeleteVersion: (id: number) => void;
  onExportVersion?: (version: any, type: 'pdf' | 'excel' | 'word') => void;
  onSyncData?: () => void;
  initialTab?: 'catalog' | 'versions' | 'users' | 'warehouse' | 'system';
  currentUser?: any;
}

const MODULE_OPTIONS = [
  { id: 'smarthome', name: 'Smart Home' },
  { id: 'smartlighting', name: 'Smart Lighting' },
  { id: 'security', name: 'Security' },
  { id: 'network', name: 'Network' },
  { id: 'curtain', name: 'Curtain' },
  { id: 'lock', name: 'Lock' },
  { id: 'solar', name: 'Solar' },
  { id: 'gate', name: 'Gate' }
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

function OverviewTab({ versions, users, showToast }: { versions: any[], users: any[], showToast?: (m: string, t?: 'success'|'error') => void }) {
  const stats = useMemo(() => {
    // Business reports by month
    const monthlyData: any = {};
    const quarterlyData: any = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const yearlyData: any = {};

    versions.forEach(v => {
      const date = new Date(v.date.split('/').reverse().join('-'));
      if (isNaN(date.getTime())) return;

      const month = `${date.getMonth() + 1}/${date.getFullYear()}`;
      const year = date.getFullYear().toString();
      const quarter = `Q${Math.floor(date.getMonth() / 3) + 1}`;
      const total = v.data?.grandTotal || 0;

      monthlyData[month] = (monthlyData[month] || 0) + total;
      quarterlyData[quarter] = (quarterlyData[quarter] || 0) + total;
      yearlyData[year] = (yearlyData[year] || 0) + total;
    });

    const monthlyChart = Object.entries(monthlyData).map(([name, value]) => ({ name, value })).sort((a, b) => {
      const [ma, ya] = a.name.split('/').map(Number);
      const [mb, yb] = b.name.split('/').map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    });

    const quarterlyChart = Object.entries(quarterlyData).map(([name, value]) => ({ name, value }));
    const yearlyChart = Object.entries(yearlyData).map(([name, value]) => ({ name, value }));

    // Employee performance (quotes created and revenue)
    const performanceData: any = {};
    const revenueByStaffData: any = {};
    versions.forEach(v => {
      const staff = v.data?.project?.staff || 'Chưa rõ';
      const total = v.data?.grandTotal || 0;
      performanceData[staff] = (performanceData[staff] || 0) + 1;
      revenueByStaffData[staff] = (revenueByStaffData[staff] || 0) + total;
    });

    const performanceChart = Object.entries(performanceData).map(([name, value]) => ({ name, value }));
    const revenueByStaffChart = Object.entries(revenueByStaffData).map(([name, value]) => ({ name, value }));

    return { monthlyChart, quarterlyChart, yearlyChart, performanceChart, revenueByStaffChart };
  }, [versions]);

  const handleExportReport = () => {
    try {
      const data = [
        ['BÁO CÁO TỔNG QUAN HỆ THỐNG'],
        ['Ngày xuất:', new Date().toLocaleString('vi-VN')],
        [''],
        ['KPI TỔNG HỢP'],
        ['Tổng doanh thu dự toán', versions.reduce((sum, v) => sum + (v.data?.grandTotal || 0), 0)],
        ['Tổng số báo giá', versions.length],
        ['Tổng số nhân sự', users.length],
        [''],
        ['DOANH THU THEO THÁNG'],
        ['Tháng', 'Doanh thu (VNĐ)'],
        ...stats.monthlyChart.map(item => [item.name, item.value]),
        [''],
        ['DOANH THU THEO QUÝ'],
        ['Quý', 'Doanh thu (VNĐ)'],
        ...stats.quarterlyChart.map(item => [item.name, item.value]),
        [''],
        ['DOANH THU THEO NHÂN VIÊN'],
        ['Nhân viên', 'Doanh thu (VNĐ)'],
        ...stats.revenueByStaffChart.map(item => [item.name, item.value])
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Overview Report");
      XLSX.writeFile(wb, `Bao_cao_tong_quan_${new Date().getTime()}.xlsx`);
      if (showToast) showToast('Đã xuất báo cáo Excel thành công!');
    } catch (error) {
      console.error('Export error:', error);
      if (showToast) showToast('Lỗi khi xuất báo cáo!', 'error');
    }
  };

  const COLORS = ['#0F4C81', '#1BA1E2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-[#0F4C81] rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Tổng doanh thu dự toán</p>
                <h4 className="text-2xl font-black text-gray-900">
                  {(versions.reduce((sum, v) => sum + (v.data?.grandTotal || 0), 0)).toLocaleString('vi-VN')}đ
                </h4>
              </div>
            </div>
            <p className="text-xs text-gray-400">Dựa trên {versions.length} bản báo giá đã lưu</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Tổng số báo giá</p>
                <h4 className="text-2xl font-black text-gray-900">{versions.length}</h4>
              </div>
            </div>
            <p className="text-xs text-gray-400">Tất cả các phiên bản trong lịch sử</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Đội ngũ nhân sự</p>
                <h4 className="text-2xl font-black text-gray-900">{users.length}</h4>
              </div>
            </div>
            <p className="text-xs text-gray-400">Nhân viên đang hoạt động</p>
          </div>
        </div>

        {/* Business Reports Summary Table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 size={20} className="text-[#0F4C81]" /> Tổng hợp báo cáo kinh doanh
            </h3>
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <button 
                onClick={handleExportReport}
                className="flex items-center gap-2 bg-[#0F4C81] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm"
              >
                <Upload size={14} className="rotate-180" /> Xuất báo cáo Excel
              </button>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                <Calendar size={14} /> Cập nhật: {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Monthly Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Theo tháng</h4>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Gần nhất</span>
              </div>
              <div className="space-y-2">
                {stats.monthlyChart.slice(-5).reverse().map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-sm font-bold text-[#0F4C81]">{Number(item.value).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quarterly Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Theo quý</h4>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Năm nay</span>
              </div>
              <div className="space-y-2">
                {stats.quarterlyChart.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-sm font-bold text-emerald-600">{Number(item.value).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Yearly Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Theo năm</h4>
                <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">Tổng hợp</span>
              </div>
              <div className="space-y-2">
                {stats.yearlyChart.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-sm font-bold text-purple-600">{Number(item.value).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Doanh thu theo tháng Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-[#0F4C81]" /> Xu hướng doanh thu tháng
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyChart}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F4C81" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0F4C81" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [value.toLocaleString('vi-VN') + 'đ', 'Doanh thu']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#0F4C81" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Doanh thu theo Quý & Năm */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BarChart3 size={20} className="text-emerald-600" /> Doanh thu theo Quý & Năm
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.quarterlyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [value.toLocaleString('vi-VN') + 'đ', 'Doanh thu']}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hiệu suất nhân viên (Số lượng) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <PieChart size={20} className="text-[#1BA1E2]" /> Hiệu suất nhân viên (Số báo giá)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={stats.performanceChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.performanceChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Doanh thu theo nhân viên */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Users size={20} className="text-purple-600" /> Doanh thu theo nhân viên
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenueByStaffChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4b5563'}} width={100} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [value.toLocaleString('vi-VN') + 'đ', 'Doanh thu']}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const APP_FEATURES = [
  { id: 'quote', name: 'Báo giá' },
  { id: 'chatbot', name: 'Chatbot' },
  { id: 'catalog', name: 'Danh mục' },
  { id: 'versions', name: 'Lịch sử' },
  { id: 'users', name: 'Nhân sự' },
  { id: 'warehouse', name: 'Kho dữ liệu' },
  { id: 'system', name: 'Hệ thống' },
];

function UsersTab({ showToast }: { showToast?: (m: string, t?: 'success'|'error') => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [permissioningUser, setPermissioningUser] = useState<any | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      });
      if (res.ok) {
        if (showToast) showToast('Dữ liệu nhân sự đã được lưu vào hệ thống!');
      }
    } catch (error) {
      console.error('Failed to save users:', error);
      if (showToast) showToast('Lỗi khi lưu dữ liệu!', 'error');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let newUsers = [...users];
      if (editingUser.id) {
        newUsers = newUsers.map(u => u.id === editingUser.id ? editingUser : u);
      } else {
        newUsers.push({ ...editingUser, id: Date.now().toString(), role: 'employee' });
      }
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsers)
      });
      
      if (res.ok) {
        setUsers(newUsers);
        setEditingUser(null);
      }
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;
    try {
      const newUsers = users.filter(u => u.id !== id);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsers)
      });
      
      if (res.ok) {
        setUsers(newUsers);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleSavePermissions = async () => {
    if (!permissioningUser) return;
    try {
      const newUsers = users.map(u => u.id === permissioningUser.id ? permissioningUser : u);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsers)
      });
      
      if (res.ok) {
        setUsers(newUsers);
        setPermissioningUser(null);
        if (showToast) showToast('Đã cập nhật phân quyền thành công!');
      }
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  };

  const togglePermission = (featureId: string, type: 'full' | 'view' | 'edit') => {
    const currentPerms = permissioningUser.permissions || {};
    const featurePerms = currentPerms[featureId] || { full: false, view: false, edit: false };
    
    let newFeaturePerms = { ...featurePerms, [type]: !featurePerms[type] };
    
    // Logic: If Full is checked, check View and Edit too
    if (type === 'full' && newFeaturePerms.full) {
      newFeaturePerms.view = true;
      newFeaturePerms.edit = true;
    }
    
    const newPerms = { ...currentPerms, [featureId]: newFeaturePerms };
    setPermissioningUser({ ...permissioningUser, permissions: newPerms });
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#0F4C81]" size={32} /></div>;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center p-4 md:p-8">
        <div className="w-full max-w-4xl space-y-8 md:space-y-12">
          {/* Centered Management Section */}
          <div className="bg-white rounded-3xl p-6 md:p-16 shadow-xl border border-gray-100 text-center space-y-6 md:space-y-8">
            <div className="inline-flex p-4 md:p-5 bg-blue-50 text-[#0F4C81] rounded-3xl mb-2 shadow-inner">
              <Users size={40} className="md:w-12 md:h-12" />
            </div>
            <div className="space-y-2 md:space-y-3">
              <h3 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Quản lý tài khoản nhân sự</h3>
              <p className="text-gray-500 max-w-lg mx-auto text-sm md:text-lg leading-relaxed">
                Hệ thống quản trị tập trung giúp bạn dễ dàng cấp quyền, theo dõi và hỗ trợ đội ngũ nhân viên kinh doanh của mình.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-4 md:pt-6">
              <button 
                onClick={() => setEditingUser({ username: '', password: '', name: '' })}
                className="flex items-center justify-center gap-2 md:gap-3 bg-[#0F4C81] text-white px-6 md:px-10 py-3.5 md:py-5 rounded-2xl text-base md:text-lg font-bold hover:bg-[#0a3a63] transition-all shadow-lg hover:shadow-2xl active:scale-95 group"
              >
                <UserPlus size={20} className="md:w-6 md:h-6 group-hover:rotate-12 transition-transform" /> 
                Thêm nhân viên mới
              </button>
              <button 
                onClick={handleManualSave}
                className="flex items-center justify-center gap-2 md:gap-3 bg-emerald-600 text-white px-6 md:px-10 py-3.5 md:py-5 rounded-2xl text-base md:text-lg font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-2xl active:scale-95 group"
              >
                <Save size={20} className="md:w-6 md:h-6 group-hover:scale-110 transition-transform" /> 
                Lưu dữ liệu hệ thống
              </button>
            </div>
          </div>

          {/* User List Section */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between px-2 md:px-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-1.5 md:w-2 h-6 md:h-8 bg-[#0F4C81] rounded-full"></div>
                <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs md:text-sm">Danh sách nhân sự ({users.length})</h4>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-5 font-bold text-gray-600 text-sm">Họ tên</th>
                    <th className="p-5 font-bold text-gray-600 text-sm">Tài khoản</th>
                    <th className="p-5 font-bold text-gray-600 text-sm">Mật khẩu</th>
                    <th className="p-5 font-bold text-gray-600 text-sm">Vai trò</th>
                    <th className="p-5 font-bold text-gray-600 text-sm text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-5 font-medium text-gray-900">{user.name}</td>
                      <td className="p-5 text-gray-600 font-mono">{user.username}</td>
                      <td className="p-5 text-gray-400 font-mono">••••••••</td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <button 
                          onClick={() => setPermissioningUser(user)}
                          className="text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg font-bold transition-colors mr-2 flex items-center gap-1 inline-flex"
                        >
                          <Shield size={14} /> Phân quyền
                        </button>
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold transition-colors mr-2"
                        >
                          Sửa
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {users.map(user => (
                <div key={user.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{user.name}</h4>
                      <p className="text-xs text-gray-500 font-mono">{user.username}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-400 font-mono">••••••••</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPermissioningUser(user)}
                        className="text-emerald-600 text-xs font-bold px-3 py-1.5 bg-emerald-50 rounded-lg flex items-center gap-1"
                      >
                        <Shield size={12} /> Quyền
                      </button>
                      <button 
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 text-xs font-bold px-3 py-1.5 bg-blue-50 rounded-lg"
                      >
                        Sửa
                      </button>
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 p-1.5 bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingUser.id ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  value={editingUser.name}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tài khoản đăng nhập</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  value={editingUser.username}
                  onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  value={editingUser.password}
                  onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#0F4C81] text-white rounded-xl font-bold hover:opacity-90 transition-colors"
                >
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permissioningUser && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Phân quyền nhân sự</h3>
                  <p className="text-sm text-gray-500">Thiết lập quyền hạn cho: <strong>{permissioningUser.name}</strong></p>
                </div>
              </div>
              <button onClick={() => setPermissioningUser(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-hidden border border-gray-100 rounded-2xl mb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tính năng</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Full tính năng</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Xem</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Chỉnh sửa</th>
                  </tr>
                </thead>
                <tbody>
                  {APP_FEATURES.map(feature => {
                    const perms = (permissioningUser.permissions || {})[feature.id] || { full: false, view: false, edit: false };
                    return (
                      <tr key={feature.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-bold text-gray-700">{feature.name}</td>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            checked={perms.full}
                            onChange={() => togglePermission(feature.id, 'full')}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={perms.view}
                            onChange={() => togglePermission(feature.id, 'view')}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                            checked={perms.edit}
                            onChange={() => togglePermission(feature.id, 'edit')}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setPermissioningUser(null)}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSavePermissions}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
              >
                Lưu phân quyền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WarehouseTab({ showToast }: { showToast?: (m: string, t?: 'success'|'error') => void }) {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLink, setEditingLink] = useState<any | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/links');
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLinks = async (updatedLinks: any[]) => {
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLinks)
      });
      if (res.ok) {
        setLinks(updatedLinks);
        if (showToast) showToast('Đã lưu kho dữ liệu thành công!');
      }
    } catch (error) {
      console.error('Failed to save links:', error);
      if (showToast) showToast('Lỗi khi lưu dữ liệu!', 'error');
    }
  };

  const handleAddLink = () => {
    setEditingLink({ id: Date.now().toString(), category: '', url: '', description: '' });
  };

  const handleEditLink = (link: any) => {
    setEditingLink({ ...link });
  };

  const handleDeleteLink = (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa link này?')) return;
    const updated = links.filter(l => l.id !== id);
    handleSaveLinks(updated);
  };

  const onSaveEditing = (e: React.FormEvent) => {
    e.preventDefault();
    let updated;
    if (links.find(l => l.id === editingLink.id)) {
      updated = links.map(l => l.id === editingLink.id ? editingLink : l);
    } else {
      updated = [...links, editingLink];
    }
    handleSaveLinks(updated);
    setEditingLink(null);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#0F4C81]" size={32} /></div>;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-gray-900">Kho dữ liệu Link</h3>
          <button 
            onClick={handleAddLink}
            className="flex items-center gap-2 bg-[#0F4C81] text-white px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-all"
          >
            <Plus size={18} /> Thêm Link mới
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map(link => (
            <div key={link.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#1BA1E2] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                    {link.category || 'Chưa phân loại'}
                  </span>
                  <h4 className="font-bold text-gray-900">{link.description || 'Không có mô tả'}</h4>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditLink(link)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDeleteLink(link.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                <LinkIcon size={14} className="text-gray-400 shrink-0" />
                <span className="text-xs text-gray-500 truncate flex-1">{link.url}</span>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-[#0F4C81] hover:bg-white rounded-md transition-all shadow-sm"
                  title="Mở link"
                >
                  <ExternalLink size={14} />
                </a>
              </div>

              <div className="flex gap-2">
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                >
                  <Eye size={14} /> Xem dữ liệu
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingLink && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Thông tin Link</h3>
              <button onClick={() => setEditingLink(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={onSaveEditing} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Hạng mục</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Smart Home, Lighting..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  value={editingLink.category}
                  onChange={e => setEditingLink({...editingLink, category: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả</label>
                <input 
                  type="text" 
                  required
                  placeholder="Mô tả về link này"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  value={editingLink.description}
                  onChange={e => setEditingLink({...editingLink, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Đường dẫn (URL)</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  value={editingLink.url}
                  onChange={e => setEditingLink({...editingLink, url: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingLink(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#0F4C81] text-white rounded-xl font-bold hover:opacity-90 transition-colors"
                >
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemTab({ showToast }: { showToast?: (m: string, t?: 'success'|'error') => void }) {
  const [restoring, setRestoring] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_thienan_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (showToast) showToast('Đã tải xuống file backup thành công!');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      if (showToast) showToast('Lỗi khi tạo backup!', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowConfirmRestore(true);
    e.target.value = '';
  };

  const executeRestore = async () => {
    if (!pendingFile) return;
    setRestoring(true);
    setShowConfirmRestore(false);
    try {
      const text = await pendingFile.text();
      const data = JSON.parse(text);
      
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        if (showToast) showToast('Đã khôi phục dữ liệu thành công! Hệ thống sẽ tải lại.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error('Restore failed');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      if (showToast) showToast('Lỗi khi khôi phục dữ liệu! Vui lòng kiểm tra định dạng file.', 'error');
    } finally {
      setRestoring(false);
      setPendingFile(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h3 className="text-3xl font-black text-gray-900">Hệ thống & Bảo mật</h3>
          <p className="text-gray-500">Quản lý sao lưu và khôi phục dữ liệu toàn hệ thống</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup Card */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-[#0F4C81]">
              <Download size={40} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-gray-900">Sao lưu dữ liệu</h4>
              <p className="text-sm text-gray-500">
                Tải xuống toàn bộ dữ liệu bao gồm: Danh mục sản phẩm, Nhân sự, Lịch sử báo giá, Kho dữ liệu và Đơn hàng.
              </p>
            </div>
            <button 
              onClick={handleBackup}
              className="w-full py-4 bg-[#0F4C81] text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20"
            >
              <Download size={20} /> Tải xuống bản sao lưu
            </button>
          </div>

          {/* Restore Card */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
              <Upload size={40} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-gray-900">Khôi phục dữ liệu</h4>
              <p className="text-sm text-gray-500">
                Tải lên file backup (.json) để khôi phục lại toàn bộ dữ liệu hệ thống. Lưu ý: Dữ liệu hiện tại sẽ bị ghi đè.
              </p>
            </div>
            <label className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-900/20 cursor-pointer">
              {restoring ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Đang khôi phục...
                </>
              ) : (
                <>
                  <Upload size={20} /> Tải lên & Khôi phục
                </>
              )}
              <input 
                type="file" 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange}
                disabled={restoring}
              />
            </label>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex gap-4 items-start">
          <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
            <Zap size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-amber-900">Lưu ý quan trọng</h5>
            <ul className="text-sm text-amber-800 list-inside list-disc space-y-1">
              <li>Nên thực hiện sao lưu trước khi cập nhật phiên bản mới.</li>
              <li>File backup chứa thông tin nhạy cảm, hãy bảo quản cẩn thận.</li>
              <li>Quá trình khôi phục có thể mất vài giây và sẽ tự động tải lại trang.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmRestore && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <Zap size={32} />
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-2xl font-bold text-gray-900">Xác nhận khôi phục?</h4>
              <p className="text-gray-500">
                Hành động này sẽ <strong>ghi đè toàn bộ dữ liệu hiện tại</strong> bằng dữ liệu từ file backup. Bạn không thể hoàn tác sau khi thực hiện.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setShowConfirmRestore(false);
                  setPendingFile(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={executeRestore}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
              >
                Tiếp tục khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ 
  catalog, 
  setCatalog, 
  onClose, 
  versions, 
  onSaveVersion, 
  onRestoreVersion, 
  onDeleteVersion,
  onExportVersion,
  onSyncData,
  initialTab = 'catalog',
  currentUser
}: AdminDashboardProps) {
  const [localCatalog, setLocalCatalog] = useState<Product[]>([...catalog]);
  const [filterModule, setFilterModule] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'versions' | 'users' | 'warehouse' | 'system'>(initialTab as any || 'overview');
  const [showCatalogActions, setShowCatalogActions] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingVersion, setViewingVersion] = useState<any | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState<number | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const convertDriveLink = (url: string) => {
    if (typeof url === 'string' && url.includes('drive.google.com')) {
      // Handle /file/d/ID/view format
      const fileMatch = url.match(/\/d\/([^\/?]+)/);
      // Handle ?id=ID format
      const idMatch = url.match(/[?&]id=([^&]+)/);
      const id = (fileMatch && fileMatch[1]) || (idMatch && idMatch[1]);
      if (id) {
        // Use googleusercontent for better embedding reliability
        return `https://lh3.googleusercontent.com/d/${id}`;
      }
    }
    return url;
  };

  const handleUpdateProduct = (index: number, field: keyof Product, value: any) => {
    let finalValue = value;
    if (field === 'image') {
      finalValue = convertDriveLink(value);
    }
    const updated = [...localCatalog];
    updated[index] = { ...updated[index], [field]: finalValue };
    setLocalCatalog(updated);
  };

  const handleAddProduct = () => {
    setLocalCatalog([
      ...localCatalog,
      { moduleId: 'smarthome', brand: '', name: 'Sản phẩm mới', unit: 'Cái', price: 0, image: 'https://picsum.photos/seed/new/200/200', code: '', description: '', shape: '', color: '', glassType: '', borderType: '' }
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    setLocalCatalog(localCatalog.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localCatalog)
      });
      
      if (res.ok) {
        setCatalog(localCatalog);
        showToast('Đã lưu thay đổi danh mục sản phẩm lên máy chủ!');
      } else {
        showToast('Có lỗi xảy ra khi lưu dữ liệu!', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Không thể kết nối tới máy chủ!', 'error');
    }
  };

  const handleSync = async () => {
    setConfirmDialog({
      message: 'Bạn có chắc muốn đồng bộ dữ liệu từ Google Sheets? Dữ liệu sản phẩm Lumi hiện tại sẽ bị thay thế.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/catalog/sync', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            setLocalCatalog(data.catalog);
            setCatalog(data.catalog);
            showToast(`Đã đồng bộ ${data.catalog.length} sản phẩm từ Google Sheets!`);
          } else {
            showToast('Lỗi khi đồng bộ dữ liệu.', 'error');
          }
        } catch (error) {
          console.error('Sync error:', error);
          showToast('Lỗi khi đồng bộ dữ liệu.', 'error');
        }
      }
    });
  };

  const handleFullSync = async () => {
    // Moved to App.tsx
  };

  const handleFolderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // Copy files to an array to prevent them from being cleared when we reset the input
    const files = Array.from(e.target.files) as File[];

    setConfirmDialog({
      message: `Hệ thống sẽ tải lên ${files.length} ảnh và tự động gán cho các sản phẩm có mã tương ứng với tên ảnh. Bạn có muốn tiếp tục?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        showToast('Đang xử lý ảnh, vui lòng đợi...');
        
        let updatedCount = 0;
        const updatedCatalog = [...localCatalog];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith('image/')) continue;
          
          const fileName = file.name;
          const lastDotIndex = fileName.lastIndexOf('.');
          const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
          const searchName = baseName.toLowerCase().trim();
          const normalizedSearch = searchName.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
          
          let matched = false;
          let base64: string | null = null;
          
          for (let j = 0; j < updatedCatalog.length; j++) {
            const p = updatedCatalog[j];
            const code = p.code ? p.code.toLowerCase().trim() : '';
            const name = p.name ? p.name.toLowerCase().trim() : '';
            
            const normalizedCode = code.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
            const normalizedName = name.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
            
            let isMatch = false;
            
            if (normalizedCode && normalizedSearch === normalizedCode) isMatch = true;
            else if (normalizedName && normalizedSearch === normalizedName) isMatch = true;
            else if (normalizedCode && (normalizedSearch.startsWith(normalizedCode + ' ') || normalizedSearch.startsWith(normalizedCode + '('))) isMatch = true;
            else if (normalizedName && (normalizedSearch.startsWith(normalizedName + ' ') || normalizedSearch.startsWith(normalizedName + '('))) isMatch = true;
            
            // Fallback to original logic
            if (!isMatch) {
              if (code && searchName === code) isMatch = true;
              else if (name && searchName === name) isMatch = true;
              else if (code && (searchName.startsWith(code + ' ') || searchName.startsWith(code + '(') || searchName.startsWith(code + '_') || searchName.startsWith(code + '-'))) isMatch = true;
              else if (name && (searchName.startsWith(name + ' ') || searchName.startsWith(name + '(') || searchName.startsWith(name + '_') || searchName.startsWith(name + '-'))) isMatch = true;
            }
            
            if (isMatch) {
              try {
                if (!base64) {
                  base64 = await compressImage(file);
                }
                updatedCatalog[j] = { ...updatedCatalog[j], image: base64 };
                matched = true;
              } catch (err) {
                console.error(`Error reading file ${file.name}:`, err);
              }
            }
          }
          if (matched) updatedCount++;
        }
        
        setLocalCatalog(updatedCatalog);
        showToast(`Đã cập nhật ảnh cho ${updatedCount} sản phẩm từ thư mục!`);
      }
    });
    
    e.target.value = ''; // Reset input
  };

  const handleDriveSync = async () => {
    setConfirmDialog({
      message: 'Hệ thống sẽ tự động tìm ảnh trong thư mục Google Drive theo mã và tên thiết bị để cập nhật. Bạn có muốn tiếp tục?',
      onConfirm: async () => {
        setConfirmDialog(null);
        showToast('Đang quét thư mục Google Drive, vui lòng đợi...');
        
        try {
          const res = await fetch('/api/catalog/drive-files');
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Lỗi khi lấy danh sách file từ Drive');
          }
          
          const files = await res.json();
          const imageFiles = files.filter((f: any) => f.mimeType.startsWith('image/'));
          
          if (imageFiles.length === 0) {
            showToast('Không tìm thấy ảnh nào trong thư mục Drive!', 'error');
            return;
          }

          let updatedCount = 0;
          const updatedCatalog = [...localCatalog];

          for (const file of imageFiles) {
            const fileName = file.name;
            const lastDotIndex = fileName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
            const searchName = baseName.toLowerCase().trim();
            const normalizedSearch = searchName.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
            
            let matched = false;
            const driveUrl = `https://lh3.googleusercontent.com/d/${file.id}`;
            
            for (let j = 0; j < updatedCatalog.length; j++) {
              const p = updatedCatalog[j];
              const code = p.code ? p.code.toLowerCase().trim() : '';
              const name = p.name ? p.name.toLowerCase().trim() : '';
              
              const normalizedCode = code.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
              const normalizedName = name.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
              
              let isMatch = false;
              
              if (normalizedCode && normalizedSearch === normalizedCode) isMatch = true;
              else if (normalizedName && normalizedSearch === normalizedName) isMatch = true;
              else if (normalizedCode && (normalizedSearch.startsWith(normalizedCode + ' ') || normalizedSearch.startsWith(normalizedCode + '('))) isMatch = true;
              else if (normalizedName && (normalizedSearch.startsWith(normalizedName + ' ') || normalizedSearch.startsWith(normalizedName + '('))) isMatch = true;
              
              if (!isMatch) {
                if (code && searchName === code) isMatch = true;
                else if (name && searchName === name) isMatch = true;
              }
              
              if (isMatch) {
                updatedCatalog[j] = { ...updatedCatalog[j], image: driveUrl };
                matched = true;
              }
            }
            if (matched) updatedCount++;
          }
          
          setLocalCatalog(updatedCatalog);
          showToast(`Đã cập nhật ${updatedCount} ảnh từ Google Drive!`);
        } catch (error: any) {
          console.error('Drive sync error:', error);
          showToast(error.message || 'Lỗi khi đồng bộ từ Drive. Kiểm tra API Key.', 'error');
        }
      }
    });
  };

  const handleReset = async () => {
    setConfirmDialog({
      message: 'Bạn có chắc muốn khôi phục danh mục về mặc định? Toàn bộ dữ liệu hiện tại sẽ bị xóa.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/catalog/reset', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            setLocalCatalog(data.catalog);
            setCatalog(data.catalog);
            showToast('Đã khôi phục danh mục về mặc định!');
          }
        } catch (error) {
          console.error('Reset error:', error);
          showToast('Lỗi khi khôi phục dữ liệu.', 'error');
        }
      }
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const importedProducts: Product[] = data.map(row => {
        const keys = Object.keys(row);
        const findKey = (patterns: string[]) => keys.find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())));
        
        const moduleIdKey = findKey(['moduleId', 'Hạng mục', 'Phân loại']);
        const brandKey = findKey(['brand', 'Thương hiệu', 'Hãng']);
        const codeKey = findKey(['code', 'Mã']);
        const nameKey = findKey(['name', 'Tên']);
        const descKey = findKey(['description', 'Mô tả', 'Mô_tả']);
        const unitKey = findKey(['unit', 'ĐVT', 'Đơn vị']);
        const priceKey = findKey(['price', 'Giá', 'Đơn giá']);
        const imageKey = findKey(['image', 'Ảnh', 'Hình ảnh']);
        const shapeKey = findKey(['shape', 'Hình dạng', 'Hình_dạng']);
        const colorKey = findKey(['color', 'Màu sắc', 'Màu_sắc']);
        const glassKey = findKey(['glassType', 'Loại kính', 'Loại_kính']);
        const borderKey = findKey(['borderType', 'Loại viền', 'Loại_viền']);

        const brand = row[brandKey!] || row.brand || 'Lumi';
        const name = row[nameKey!] || row.name || row.Tên || 'Sản phẩm';
        const code = row[codeKey!] || row.code || row.Mã || '';
        const description = row[descKey!] || row.description || row.Mô_tả || '';
        const moduleId = row[moduleIdKey!] || (description.toLowerCase().includes('công tắc') || name.toLowerCase().includes('công tắc') ? 'smarthome' : 'smartlighting');

        let shape = row[shapeKey!] || '';
        let color = row[colorKey!] || '';
        let glassType = row[glassKey!] || '';
        let borderType = row[borderKey!] || '';

        // Auto-classify if Lumi
        const isLumi = brand.toLowerCase() === 'lumi' || 
                       name.toLowerCase().includes('lumi') || 
                       code.toLowerCase().startsWith('lm-');

        if (isLumi) {
          const fullDesc = (description + ' ' + name).toLowerCase();
          const lowerCode = code.toLowerCase();
          const isMechanical = fullDesc.includes('công tắc cơ') || fullDesc.includes('ct cơ') || lowerCode.includes('mc');
          
          if (!shape) {
            if (fullDesc.includes('chữ nhật') || fullDesc.includes('ngang') || lowerCode.endsWith('n') || lowerCode.includes('rect')) shape = 'Chữ nhật';
            else if (fullDesc.includes('vuông') || lowerCode.endsWith('v') || lowerCode.includes('sq')) shape = 'Vuông';
          }
          if (!color) {
            if (isMechanical) {
              if (fullDesc.includes('champagne') || fullDesc.includes('vàng be')) color = 'Champagne';
              else if (fullDesc.includes('dark grey') || fullDesc.includes('xám tối') || fullDesc.includes('xám đậm')) color = 'Dark Grey';
            } else {
              if (fullDesc.includes('trắng')) color = 'Trắng';
              else if (fullDesc.includes('đen')) color = 'Đen';
            }
          }
          if (!glassType) {
            if (fullDesc.includes('phẳng')) glassType = 'Kính phẳng';
            else if (fullDesc.includes('lõm')) glassType = 'Kính lõm';
          }
          if (!borderType) {
            if (fullDesc.includes('bo cong champagne') || fullDesc.includes('viền bo champagne')) borderType = 'Viền bo champagne';
            else if (fullDesc.includes('bo cong vàng') || fullDesc.includes('viền bo vàng')) borderType = 'Viền bo vàng';
            else if (fullDesc.includes('phẳng') || fullDesc.includes('viền thẳng') || fullDesc.includes('không viền')) borderType = 'Phẳng';
          }
        }

        let imageUrl = row[imageKey!] || '';
        if (imageUrl.includes('drive.google.com')) {
          const driveIdMatch = imageUrl.match(/\/d\/([^\/]+)/) || imageUrl.match(/id=([^\&]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            imageUrl = `https://drive.google.com/uc?export=view&id=${driveIdMatch[1]}`;
          }
        }

        return {
          moduleId,
          brand,
          code,
          name,
          description,
          unit: row[unitKey!] || 'Cái',
          price: Number(row[priceKey!] || 0),
          image: imageUrl || `https://picsum.photos/seed/${encodeURIComponent(code || name)}/400/400`,
          shape,
          color,
          glassType,
          borderType
        };
      });

      setLocalCatalog([...localCatalog, ...importedProducts]);
      showToast(`Đã nhập ${importedProducts.length} sản phẩm!`);
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file);
      handleUpdateProduct(index, 'image', base64);
      setEditingImageIndex(null);
    } catch (err) {
      console.error('Error compressing image:', err);
      showToast('Có lỗi xảy ra khi xử lý ảnh', 'error');
    }
  };

  const handleAutoClassify = () => {
    setConfirmDialog({
      message: 'Hệ thống sẽ tự động quét mô tả của các thiết bị Lumi để phân loại Hình dạng, Màu sắc, Loại kính và Loại viền. Bạn có muốn tiếp tục?',
      onConfirm: () => {
        setConfirmDialog(null);
        const updated = localCatalog.map(p => {
          const isLumi = p.brand?.toLowerCase() === 'lumi' || 
                         p.name?.toLowerCase().includes('lumi') || 
                         p.code?.toLowerCase().startsWith('lm-');

          if (isLumi) {
            const description = (p.description || (p as any).desc || '');
            const name = p.name || '';
            const code = p.code || '';
            const fullDesc = (description + ' ' + name).toLowerCase();
            const lowerCode = code.toLowerCase();
            const isMechanical = fullDesc.includes('công tắc cơ') || fullDesc.includes('ct cơ') || lowerCode.includes('mc');
            
            let shape = p.shape || '';
            let color = p.color || '';
            let glassType = p.glassType || '';
            let borderType = p.borderType || '';

            if (!shape) {
              if (fullDesc.includes('chữ nhật') || fullDesc.includes('ngang') || lowerCode.endsWith('n') || lowerCode.includes('rect')) shape = 'Chữ nhật';
              else if (fullDesc.includes('vuông') || lowerCode.endsWith('v') || lowerCode.includes('sq')) shape = 'Vuông';
            }
            
            if (!color) {
              if (isMechanical) {
                if (fullDesc.includes('champagne') || fullDesc.includes('vàng be')) color = 'Champagne';
                else if (fullDesc.includes('dark grey') || fullDesc.includes('xám tối') || fullDesc.includes('xám đậm')) color = 'Dark Grey';
              } else {
                if (fullDesc.includes('trắng')) color = 'Trắng';
                else if (fullDesc.includes('đen')) color = 'Đen';
              }
            }
            
            if (!glassType) {
              if (fullDesc.includes('phẳng')) glassType = 'Kính phẳng';
              else if (fullDesc.includes('lõm')) glassType = 'Kính lõm';
            }
            
            if (!borderType) {
              if (fullDesc.includes('bo cong champagne') || fullDesc.includes('viền bo champagne')) borderType = 'Viền bo champagne';
              else if (fullDesc.includes('bo cong vàng') || fullDesc.includes('viền bo vàng')) borderType = 'Viền bo vàng';
              else if (fullDesc.includes('phẳng') || fullDesc.includes('viền thẳng') || fullDesc.includes('không viền')) borderType = 'Phẳng';
            }

            return { ...p, shape, color, glassType, borderType };
          }
          return p;
        });
        setLocalCatalog(updated);
        showToast('Đã tự động phân loại các thiết bị Lumi!');
      }
    });
  };

  const normalizeSearchText = (text: string) => {
    if (!text) return '';
    return text.toLowerCase().replace(/[\s\-\/]/g, '');
  };

  const filteredCatalog = localCatalog.map((p, originalIndex) => ({ ...p, originalIndex })).filter(p => {
    const matchesModule = filterModule === 'all' || p.moduleId === filterModule;
    if (!searchQuery) return matchesModule;
    
    const normalizedQuery = normalizeSearchText(searchQuery);
    if (!normalizedQuery) return matchesModule;
    
    const fieldsToSearch = [
      p.name,
      p.brand,
      p.code,
      p.description,
      p.shape,
      p.color,
      p.glassType,
      p.borderType
    ].map(normalizeSearchText);

    const matchesSearch = fieldsToSearch.some(field => field.includes(normalizedQuery));
    return matchesModule && matchesSearch;
  });

  const formatMoney = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0';
    return amount.toLocaleString('vi-VN');
  };

  const hasPermission = (featureId: string, type: 'full' | 'view' | 'edit') => {
    if (isAdmin) return true;
    const perms = currentUser?.permissions?.[featureId];
    if (!perms) return false;
    if (perms.full) return true;
    return perms[type];
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-7xl h-full md:h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F4C81] p-4 md:p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 md:gap-6 overflow-hidden">
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <FileSpreadsheet size={24} className="md:w-7 md:h-7" />
              <div className="hidden sm:block">
                <h2 className="text-lg md:text-xl font-bold">Trang Quản Trị</h2>
                <p className="text-[10px] md:text-xs opacity-80">Quản lý danh mục và lịch sử</p>
              </div>
            </div>
            
            <div className="flex bg-white/10 rounded-lg p-1 overflow-x-auto scrollbar-hide max-w-[280px] sm:max-w-none">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[10px] md:text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-[#0F4C81]' : 'text-white hover:bg-white/10'}`}
              >
                Tổng quan
              </button>
              {hasPermission('catalog', 'view') && (
                <button 
                  onClick={() => setActiveTab('catalog')}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[10px] md:text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'catalog' ? 'bg-white text-[#0F4C81]' : 'text-white hover:bg-white/10'}`}
                >
                  Danh mục
                </button>
              )}
              {hasPermission('quotation', 'view') && (
                <button 
                  onClick={() => setActiveTab('versions')}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[10px] md:text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'versions' ? 'bg-white text-[#0F4C81]' : 'text-white hover:bg-white/10'}`}
                >
                  Lịch sử
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[10px] md:text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-[#0F4C81]' : 'text-white hover:bg-white/10'}`}
                >
                  Nhân sự
                </button>
              )}
              {hasPermission('warehouse', 'view') && (
                <button 
                  onClick={() => setActiveTab('warehouse')}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[10px] md:text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'warehouse' ? 'bg-white text-[#0F4C81]' : 'text-white hover:bg-white/10'}`}
                >
                  Kho dữ liệu
                </button>
              )}
              {hasPermission('system', 'view') && (
                <button 
                  onClick={() => setActiveTab('system')}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[10px] md:text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'system' ? 'bg-white text-[#0F4C81]' : 'text-white hover:bg-white/10'}`}
                >
                  Hệ thống
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors shrink-0">
            <X size={24} />
          </button>
        </div>

      {activeTab === 'overview' && <OverviewTab versions={versions} users={users} showToast={showToast} />}
      {activeTab === 'warehouse' && <WarehouseTab showToast={showToast} />}
      {activeTab === 'system' && <SystemTab showToast={showToast} />}

      {activeTab === 'catalog' && (
          <>
            {/* Toolbar */}
            <div className="p-3 md:p-4 border-b bg-gray-50 flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center justify-between shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 flex-1">
                <div className="relative flex-1 max-w-none md:max-w-xs">
                  <input 
                    type="text" 
                    placeholder="Tìm sản phẩm..." 
                    className="w-full bg-white border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1BA1E2]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 md:flex-none bg-white border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1BA1E2]"
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                  >
                    <option value="all">Tất cả hạng mục</option>
                    {MODULE_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAddProduct}
                    disabled={!hasPermission('catalog', 'edit')}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors ${!hasPermission('catalog', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Plus size={18} /> <span className="sm:inline">Thêm</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                <div className="relative">
                  <button 
                    onClick={() => setShowCatalogActions(!showCatalogActions)}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <Database size={16} /> Chức năng danh mục <ChevronDown size={14} />
                  </button>

                  {showCatalogActions && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setShowCatalogActions(false)}></div>
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[101] animate-in fade-in slide-in-from-top-2">
                        <a 
                          href="https://drive.google.com/drive/folders/11tAbfQJP-R2TJ3rT-rH3_bhWLkPWL8Vu?usp=drive_link" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-[#0F4C81] transition-colors"
                          onClick={() => setShowCatalogActions(false)}
                        >
                          <ImageIcon size={16} /> Thư viện Drive
                        </a>
                        <label className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer">
                          <ImageIcon size={16} /> Ảnh thư mục
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            //@ts-ignore
                            webkitdirectory="true" 
                            directory="true" 
                            multiple 
                            onChange={(e) => {
                              handleFolderImageUpload(e);
                              setShowCatalogActions(false);
                            }} 
                          />
                        </label>
                        <button 
                          onClick={() => {
                            handleAutoClassify();
                            setShowCatalogActions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                        >
                          <Filter size={16} /> Phân loại Lumi
                        </button>
                        <button 
                          onClick={() => {
                            handleDriveSync();
                            setShowCatalogActions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <RefreshCw size={16} /> Cập nhật Drive
                        </button>
                        {onSyncData && (
                          <button 
                            onClick={() => {
                              onSyncData();
                              setShowCatalogActions(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-colors"
                          >
                            <Zap size={16} /> Đồng bộ tổng
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            handleSync();
                            setShowCatalogActions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                        >
                          <RefreshCw size={16} /> Đồng bộ Sheets
                        </button>
                        <button 
                          onClick={() => {
                            handleReset();
                            setShowCatalogActions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
                        >
                          <RotateCcw size={16} /> Reset danh mục
                        </button>
                        <label className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-[#1BA1E2] transition-colors cursor-pointer">
                          <Upload size={16} /> Nhập Excel
                          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => {
                            handleExcelImport(e);
                            setShowCatalogActions(false);
                          }} />
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <button 
                  onClick={handleSave}
                  disabled={!hasPermission('catalog', 'edit')}
                  className={`w-full md:w-auto flex items-center justify-center gap-2 bg-[#0F4C81] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-colors shadow-md ${!hasPermission('catalog', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Save size={18} /> LƯU THAY ĐỔI
                </button>
              </div>
            </div>

            {/* Table & Mobile Card View */}
            <div className="flex-1 overflow-auto p-3 md:p-6">
              {/* Desktop Table View */}
              <table className="hidden md:table w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left text-xs uppercase tracking-wider text-gray-600">
                    <th className="p-3 border">Hình ảnh</th>
                    <th className="p-3 border">Hạng mục</th>
                    <th className="p-3 border">Thương hiệu</th>
                    <th className="p-3 border">Mã SP</th>
                    <th className="p-3 border">Tên sản phẩm</th>
                    <th className="p-3 border">Mô tả</th>
                    <th className="p-3 border">Hình dạng</th>
                    <th className="p-3 border">Màu sắc</th>
                    <th className="p-3 border">Loại kính</th>
                    <th className="p-3 border">Loại viền</th>
                    <th className="p-3 border">ĐVT</th>
                    <th className="p-3 border">Đơn giá (VNĐ)</th>
                    <th className="p-3 border text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredCatalog.map((prod, idx) => (
                    <tr key={prod.originalIndex} className="hover:bg-gray-50 transition-colors">
                      <td className="p-2 border w-32 relative group">
                        <div className="relative w-16 h-16 mx-auto">
                          <img 
                            src={prod.image || 'https://picsum.photos/seed/product/200/200'} 
                            alt="" 
                            className="w-full h-full rounded object-contain bg-white shadow-sm border border-gray-100" 
                            referrerPolicy="no-referrer" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/product/200/200';
                            }}
                          />
                          <button 
                            onClick={() => setEditingImageIndex(editingImageIndex === prod.originalIndex ? null : prod.originalIndex)}
                            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
                            title="Thay đổi hình ảnh"
                          >
                            <ImageIcon size={16} />
                          </button>
                        </div>

                        {editingImageIndex === prod.originalIndex && (
                          <div className="fixed md:absolute inset-0 md:inset-auto md:top-full md:left-0 flex items-center justify-center md:block bg-black/50 md:bg-transparent z-[120] md:z-50 p-4 md:p-0">
                            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-full max-w-sm md:w-80 animate-in fade-in slide-in-from-top-2">
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="font-bold text-xs uppercase text-gray-500">Cập nhật hình ảnh</h5>
                                <button 
                                  onClick={() => {
                                    setEditingImageIndex(null);
                                  }} 
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Từ Link (URL)</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="Dán link ảnh vào đây..."
                                    className="flex-1 text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#1BA1E2]"
                                    value={prod.image.startsWith('data:') ? '' : prod.image}
                                    onChange={(e) => handleUpdateProduct(prod.originalIndex, 'image', e.target.value)}
                                  />
                                  <div className="bg-gray-100 p-1.5 rounded-lg text-gray-400">
                                    <LinkIcon size={14} />
                                  </div>
                                </div>
                                <a 
                                  href="https://drive.google.com/drive/folders/11tAbfQJP-R2TJ3rT-rH3_bhWLkPWL8Vu?usp=drive_link" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="mt-2 flex items-center justify-center gap-2 w-full py-1.5 bg-blue-50 text-[#0F4C81] rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                                >
                                  <ImageIcon size={12} /> Mở Thư viện Lumi (Drive)
                                </a>
                              </div>

                              <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                  <span className="w-full border-t border-gray-100"></span>
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase">
                                  <span className="bg-white px-2 text-gray-300">Hoặc</span>
                                </div>
                              </div>

                              <label className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 hover:border-[#1BA1E2] transition-all group/upload">
                                <Upload size={16} className="text-gray-400 group-hover/upload:text-[#1BA1E2]" />
                                <span className="text-xs font-bold text-gray-500 group-hover/upload:text-[#1BA1E2]">Tải ảnh lên</span>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={(e) => handleImageUpload(prod.originalIndex, e)} 
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                      <td className="p-2 border">
                        <select 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={prod.moduleId}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'moduleId', e.target.value)}
                        >
                          {MODULE_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 border">
                        <input 
                          type="text" 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={prod.brand}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'brand', e.target.value)}
                        />
                      </td>
                      <td className="p-2 border">
                        <input 
                          type="text" 
                          className="w-full bg-transparent outline-none focus:bg-white font-mono text-xs"
                          value={prod.code || ''}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'code', e.target.value)}
                          placeholder="Mã..."
                        />
                      </td>
                      <td className="p-2 border">
                        <input 
                          type="text" 
                          className="w-full bg-transparent outline-none focus:bg-white font-medium"
                          value={prod.name}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'name', e.target.value)}
                        />
                      </td>
                      <td className="p-2 border">
                        <input 
                          type="text" 
                          className="w-full bg-transparent outline-none focus:bg-white text-xs"
                          value={prod.description || (prod as any).desc || ''}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'description', e.target.value)}
                          placeholder="Mô tả..."
                        />
                      </td>
                      <td className="p-2 border">
                        <select 
                          className="w-full bg-transparent outline-none focus:bg-white text-xs"
                          value={prod.shape || ''}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'shape', e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="Chữ nhật">Chữ nhật</option>
                          <option value="Vuông">Vuông</option>
                        </select>
                      </td>
                      <td className="p-2 border">
                        <select 
                          className="w-full bg-transparent outline-none focus:bg-white text-xs"
                          value={prod.color || ''}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'color', e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="Trắng">Trắng</option>
                          <option value="Đen">Đen</option>
                          <option value="Champagne">Champagne</option>
                          <option value="Dark Grey">Dark Grey</option>
                        </select>
                      </td>
                      <td className="p-2 border">
                        <select 
                          className="w-full bg-transparent outline-none focus:bg-white text-xs"
                          value={prod.glassType || ''}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'glassType', e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="Kính phẳng">Kính phẳng</option>
                          <option value="Kính lõm">Kính lõm</option>
                        </select>
                      </td>
                      <td className="p-2 border">
                        <select 
                          className="w-full bg-transparent outline-none focus:bg-white text-xs"
                          value={prod.borderType || ''}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'borderType', e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="Phẳng">Phẳng</option>
                          <option value="Viền bo champagne">Viền bo champagne</option>
                          <option value="Viền bo vàng">Viền bo vàng</option>
                        </select>
                      </td>
                      <td className="p-2 border w-20">
                        <input 
                          type="text" 
                          className="w-full bg-transparent outline-none focus:bg-white text-center"
                          value={prod.unit}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'unit', e.target.value)}
                        />
                      </td>
                      <td className="p-2 border w-40">
                        <input 
                          type="number" 
                          className="w-full bg-transparent outline-none focus:bg-white text-right font-bold text-[#0F4C81]"
                          value={prod.price}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'price', Number(e.target.value))}
                        />
                      </td>
                      <td className="p-2 border text-center">
                        <button 
                          onClick={() => handleRemoveProduct(prod.originalIndex)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredCatalog.map((prod, idx) => (
                  <div key={prod.originalIndex} className="mobile-card">
                    <div className="flex gap-4 mb-4">
                      <div className="w-20 h-20 shrink-0 relative group">
                        <img 
                          src={prod.image || 'https://picsum.photos/seed/product/200/200'} 
                          alt="" 
                          className="w-full h-full rounded-lg object-contain bg-white border border-gray-100" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/product/200/200';
                          }}
                        />
                        <button 
                          onClick={() => setEditingImageIndex(editingImageIndex === prod.originalIndex ? null : prod.originalIndex)}
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center rounded-lg"
                        >
                          <ImageIcon size={16} />
                        </button>

                        {editingImageIndex === prod.originalIndex && (
                          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[120] p-4">
                            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-full max-w-sm animate-in fade-in slide-in-from-top-2">
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="font-bold text-xs uppercase text-gray-500">Cập nhật hình ảnh</h5>
                                <button 
                                  onClick={() => {
                                    setEditingImageIndex(null);
                                  }} 
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">URL hình ảnh</label>
                                  <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#1BA1E2]"
                                    placeholder="https://..."
                                    value={prod.image || ''}
                                    onChange={(e) => handleUpdateProduct(prod.originalIndex, 'image', e.target.value)}
                                  />
                                  <a 
                                    href="https://drive.google.com/drive/folders/11tAbfQJP-R2TJ3rT-rH3_bhWLkPWL8Vu?usp=drive_link" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-[#0F4C81] rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                                  >
                                    <ImageIcon size={12} /> Mở Thư viện Lumi (Drive)
                                  </a>
                                </div>
                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                  </div>
                                  <div className="relative flex justify-center text-[10px] uppercase">
                                    <span className="bg-white px-2 text-gray-400">Hoặc</span>
                                  </div>
                                </div>
                                <label className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-200 transition-colors">
                                  <Upload size={14} /> Tải ảnh lên
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          const base64 = reader.result as string;
                                          handleUpdateProduct(prod.originalIndex, 'image', base64);
                                          setEditingImageIndex(null);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }} 
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input 
                          type="text" 
                          className="w-full font-bold text-gray-900 bg-transparent outline-none mb-1"
                          value={prod.name}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'name', e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            className="text-xs font-mono text-gray-500 bg-transparent outline-none w-24"
                            value={prod.code || ''}
                            onChange={(e) => handleUpdateProduct(prod.originalIndex, 'code', e.target.value)}
                            placeholder="Mã SP"
                          />
                          <span className="text-gray-300">|</span>
                          <input 
                            type="text" 
                            className="text-xs text-gray-500 bg-transparent outline-none w-20"
                            value={prod.brand}
                            onChange={(e) => handleUpdateProduct(prod.originalIndex, 'brand', e.target.value)}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveProduct(prod.originalIndex)}
                        className="text-red-500 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <span className="mobile-label">Hạng mục</span>
                        <select 
                          className="w-full text-xs bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100"
                          value={prod.moduleId}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'moduleId', e.target.value)}
                        >
                          {MODULE_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="mobile-label">Đơn giá</span>
                        <input 
                          type="number" 
                          className="w-full text-sm font-bold text-[#0F4C81] bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100 text-right"
                          value={prod.price}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'price', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <span className="mobile-label">Hình dạng</span>
                        <select 
                          className="w-full text-xs bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100"
                          value={prod.shape || ''}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'shape', e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="Chữ nhật">Chữ nhật</option>
                          <option value="Vuông">Vuông</option>
                        </select>
                      </div>
                      <div>
                        <span className="mobile-label">Màu sắc</span>
                        <select 
                          className="w-full text-xs bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100"
                          value={prod.color || ''}
                          onChange={(e) => handleUpdateProduct(prod.originalIndex, 'color', e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="Trắng">Trắng</option>
                          <option value="Đen">Đen</option>
                          <option value="Champagne">Champagne</option>
                          <option value="Dark Grey">Dark Grey</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <span className="mobile-label">Mô tả</span>
                      <textarea 
                        className="w-full text-xs bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100 min-h-[60px]"
                        value={prod.description || (prod as any).desc || ''}
                        onChange={(e) => handleUpdateProduct(prod.originalIndex, 'description', e.target.value)}
                        placeholder="Mô tả sản phẩm..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {filteredCatalog.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <Package size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Không có sản phẩm nào trong hạng mục này</p>
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="p-4 bg-gray-50 border-t text-[10px] text-gray-500 flex justify-between">
              <p>* Gợi ý: File Excel cần có các cột: moduleId, brand, name, unit, price, image</p>
              <p>Tổng số sản phẩm: {localCatalog.length}</p>
            </div>
          </>
        )}
        
        {activeTab === 'versions' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            <div className="p-4 md:p-6 border-b bg-white flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2">
                  <History className="text-[#0F4C81]" size={20} /> Lịch sử phiên bản báo giá
                </h3>
                <p className="text-gray-500 text-xs md:text-sm">Quản lý và khôi phục lại các bản báo giá đã lưu trước đó</p>
              </div>
              <button 
                onClick={onSaveVersion}
                disabled={!hasPermission('quotation', 'edit')}
                className={`w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm ${!hasPermission('quotation', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Save size={18} /> Lưu phiên bản hiện tại
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {versions.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 italic bg-white rounded-2xl border border-gray-100">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    Chưa có phiên bản nào được lưu.
                  </div>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="bg-white rounded-xl p-4 md:p-5 border border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 hover:border-[#1BA1E2] hover:shadow-md transition-all group">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-base md:text-lg mb-1">{v.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded-md">Khách: {v.customer || 'Không tên'}</span>
                          <span>Ngày: {v.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setViewingVersion(v)}
                          className="p-2 text-gray-400 hover:text-[#1BA1E2] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Search size={20} />
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={() => setShowDownloadMenu(showDownloadMenu === v.id ? null : v.id)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Tải xuống"
                          >
                            <Upload size={20} className="rotate-180" />
                          </button>
                          
                          {showDownloadMenu === v.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                              <button 
                                onClick={() => {
                                  onExportVersion?.(v, 'pdf');
                                  setShowDownloadMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FileSpreadsheet size={16} className="text-red-500" /> Xuất PDF
                              </button>
                              <button 
                                onClick={() => {
                                  onExportVersion?.(v, 'excel');
                                  setShowDownloadMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FileSpreadsheet size={16} className="text-green-600" /> Xuất Excel
                              </button>
                              <button 
                                onClick={() => {
                                  onExportVersion?.(v, 'word');
                                  setShowDownloadMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FileSpreadsheet size={16} className="text-blue-600" /> Xuất Word
                              </button>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => {
                            onRestoreVersion(v);
                            onClose();
                          }}
                          disabled={!hasPermission('quotation', 'edit')}
                          className={`bg-[#0F4C81] text-white px-4 py-2 rounded-lg text-xs md:text-sm font-bold hover:opacity-90 transition-all ${!hasPermission('quotation', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Sửa / Khôi phục
                        </button>
                        <button 
                          onClick={() => onDeleteVersion(v.id)}
                          disabled={!hasPermission('quotation', 'edit')}
                          className={`p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ${!hasPermission('quotation', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Xóa phiên bản"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && <UsersTab showToast={showToast} />}
      </div>

      {/* Version Detail Modal */}
      {viewingVersion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{viewingVersion.name}</h3>
                <p className="text-sm text-gray-500">Chi tiết báo giá ngày {viewingVersion.date}</p>
              </div>
              <button onClick={() => setViewingVersion(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-2">Thông tin khách hàng</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-bold text-blue-900">Dự án:</span> {viewingVersion.data?.project?.name}</p>
                    <p><span className="font-bold text-blue-900">Khách hàng:</span> {viewingVersion.data?.project?.customer}</p>
                    <p><span className="font-bold text-blue-900">SĐT:</span> {viewingVersion.data?.project?.phone}</p>
                    <p><span className="font-bold text-blue-900">Địa chỉ:</span> {viewingVersion.data?.project?.address}</p>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <h4 className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mb-2">Tổng kết chi phí</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-bold text-emerald-900">Tổng cộng:</span> <span className="text-lg font-black text-emerald-600">{formatMoney(viewingVersion.data?.grandTotal)}đ</span></p>
                    <p><span className="font-bold text-emerald-900">Số hạng mục:</span> {viewingVersion.data?.modules?.filter((m: any) => m.enabled).length || 0}</p>
                    <p><span className="font-bold text-emerald-900">Nhân viên lập:</span> {viewingVersion.data?.project?.staff}</p>
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-wider border-b pb-2">Chi tiết các hạng mục</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[400px]">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-3 border font-bold text-gray-600">Hạng mục</th>
                      <th className="p-3 border font-bold text-gray-600 text-center">Số thiết bị</th>
                      <th className="p-3 border font-bold text-gray-600 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingVersion.data?.modules?.filter((m: any) => m.enabled && m.items.length > 0).map((mod: any) => (
                      <tr key={mod.id} className="hover:bg-gray-50">
                        <td className="p-3 border font-medium text-gray-800">{mod.name}</td>
                        <td className="p-3 border text-center">{mod.items.length}</td>
                        <td className="p-3 border text-right font-bold text-[#0F4C81]">{formatMoney(mod.items.reduce((sum: number, item: any) => sum + (item.price * item.qty * (1 - item.discount / 100)), 0))}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => {
                  onRestoreVersion(viewingVersion);
                  onClose();
                }}
                className="flex items-center gap-2 bg-[#0F4C81] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
              >
                <RotateCcw size={18} /> Khôi phục & Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 transition-all transform translate-y-0 opacity-100 ${toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Xác nhận</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-[#0F4C81] text-white rounded-lg font-medium hover:opacity-90 transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
