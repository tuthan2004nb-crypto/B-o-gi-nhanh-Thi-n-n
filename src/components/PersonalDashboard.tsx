import React, { useState, useEffect } from 'react';
import { X, History, TrendingUp, Package, Calendar } from 'lucide-react';

interface PersonalDashboardProps {
  user: any;
  onClose: () => void;
  onRestoreVersion: (version: any) => void;
}

export default function PersonalDashboard({ user, onClose, onRestoreVersion }: PersonalDashboardProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const res = await fetch('/api/versions');
      if (res.ok) {
        const data = await res.json();
        // Filter versions created by this user
        const userVersions = data.filter((v: any) => v.data?.project?.staff === user.name);
        setVersions(userVersions);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0';
    return amount.toLocaleString('vi-VN');
  };

  const totalRevenue = versions.reduce((sum, v) => sum + (v.data?.grandTotal || 0), 0);
  const totalItems = versions.reduce((sum, v) => sum + (v.data?.modules?.filter((m: any) => m.enabled).length || 0), 0);

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 md:p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-white/20 p-2 md:p-3 rounded-xl">
              <TrendingUp size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold">Khu vực cá nhân</h2>
              <p className="text-xs md:text-sm opacity-90">Xin chào, {user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-blue-100 p-3 md:p-4 rounded-xl text-blue-600">
                  <History size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-[10px] md:text-sm text-gray-500 font-medium uppercase tracking-wider">Tổng số báo giá</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{versions.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-emerald-100 p-3 md:p-4 rounded-xl text-emerald-600">
                  <TrendingUp size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-[10px] md:text-sm text-gray-500 font-medium uppercase tracking-wider">Tổng giá trị</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{formatMoney(totalRevenue)}đ</p>
                </div>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 sm:col-span-2 md:col-span-1">
                <div className="bg-purple-100 p-3 md:p-4 rounded-xl text-purple-600">
                  <Package size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <p className="text-[10px] md:text-sm text-gray-500 font-medium uppercase tracking-wider">Hạng mục đã tư vấn</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{totalItems}</p>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-100">
                <h3 className="text-base md:text-lg font-bold text-gray-800">Lịch sử báo giá của bạn</h3>
              </div>
              <div className="p-4 md:p-6">
                {loading ? (
                  <div className="text-center py-10 text-gray-500">Đang tải dữ liệu...</div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic">
                    Chưa có báo giá nào được tạo.
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {versions.map((v) => (
                      <div key={v.id} className="bg-gray-50 rounded-xl p-4 md:p-5 border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all group">
                        <div className="w-full md:w-auto">
                          <h4 className="font-bold text-gray-800 text-base md:text-lg mb-1">{v.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Calendar size={12} className="md:w-[14px]" /> {v.date}</span>
                            <span className="bg-white px-2 py-0.5 rounded-md border border-gray-200">Khách: {v.customer || 'Không tên'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-gray-200">
                          <div className="text-left md:text-right">
                            <p className="text-[8px] md:text-xs text-gray-400 uppercase font-bold tracking-wider mb-0.5">Tổng tiền</p>
                            <p className="font-black text-orange-600 text-base md:text-lg">{formatMoney(v.data?.grandTotal)}đ</p>
                          </div>
                          <button 
                            onClick={() => {
                              onRestoreVersion(v);
                              onClose();
                            }}
                            className="bg-white text-orange-600 border border-orange-200 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-orange-50 transition-colors md:opacity-0 md:group-hover:opacity-100"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
