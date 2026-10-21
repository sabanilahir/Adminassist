"use client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ChartData {
  statusData: { name: string; value: number; color: string }[];
  priorityData: { name: string; value: number; color: string }[];
  customerData: { name: string; count: number }[];
}

export function DashboardCharts({ data }: { data: ChartData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-base font-medium mb-4">Tickets by Status</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-base font-medium mb-4">Tickets by Priority</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.priorityData} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.priorityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.customerData.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6 lg:col-span-2">
          <h3 className="text-base font-medium mb-4">Tickets by Customer</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.customerData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
