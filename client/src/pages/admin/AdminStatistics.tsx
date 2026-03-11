
import { useState, useEffect } from 'react';
import api from '../../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LocationStat {
  province: string | null;
  city: string | null;
  _count: { id: number };
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
  '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
];

export default function AdminStatistics() {
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocationStats();
  }, []);

  const fetchLocationStats = async () => {
    try {
      const res = await api.get('/admin/statistics/location');
      setLocationStats(res.data);
    } catch (error) {
      console.error('Failed to fetch location stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = locationStats
    .filter(item => item.province && item.city)
    .map(item => ({
      name: `${item.province} ${item.city}`,
      value: item._count.id,
      province: item.province
    }))
    .slice(0, 15);

  const totalUsers = locationStats.reduce((sum, item) => sum + item._count.id, 0);
  const uniqueProvinces = new Set(locationStats.filter(item => item.province).map(item => item.province)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">数据统计</h1>
        <p className="text-gray-600 mt-1">用户地理位置分布统计</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总用户数</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">覆盖省份</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{uniqueProvinces}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">有地区信息</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{locationStats.filter(item => item.province).length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">用户地区分布（前15名）</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-gray-500">暂无数据</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="value" name="用户数" radius={[8, 8, 0, 0]} fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">详细列表</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : locationStats.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-gray-500">暂无数据</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-3 font-medium pl-2">排名</th>
                  <th className="pb-3 font-medium">省份</th>
                  <th className="pb-3 font-medium">城市</th>
                  <th className="pb-3 font-medium text-right">用户数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {locationStats.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pl-2 text-gray-500">{index + 1}</td>
                    <td className="py-3 font-medium text-gray-800">{item.province || <span className="text-gray-300">-</span>}</td>
                    <td className="py-3 text-gray-600">{item.city || <span className="text-gray-300">-</span>}</td>
                    <td className="py-3 text-gray-600 text-right font-medium">{item._count.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
