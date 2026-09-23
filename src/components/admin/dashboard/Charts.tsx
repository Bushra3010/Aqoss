'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

/**
 * Dashboard charts. One hue per series, flat fills, gridlines only where they
 * help read a value off the axis.
 */

const BLUE = '#3B82F6';
const GREEN = '#22C55E';
const GRID = '#EEF2F6';

const axis = {
  stroke: '#94A3B8',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
  dy: 8,
} as const;

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  formatter: (value: number) => string | number;
  seriesLabel: string;
  color: string;
}

function CardTooltip({ active, payload, label, formatter, seriesLabel, color }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-900">{shortDate(label)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {seriesLabel}: <span className="font-semibold text-slate-900">{formatter(payload[0].value)}</span>
      </p>
    </div>
  );
}

export function BookingOverviewChart({
  data,
}: {
  data: { date: string; bookings: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="bookingsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BLUE} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axis} minTickGap={20} />
        <YAxis allowDecimals={false} {...axis} dy={0} width={48} />
        <Tooltip
          cursor={{ stroke: BLUE, strokeDasharray: '4 4', strokeOpacity: 0.4 }}
          content={
            <CardTooltip seriesLabel="Bookings" color={BLUE} formatter={(v: number) => v} />
          }
        />
        <Area
          type="monotone"
          dataKey="bookings"
          stroke={BLUE}
          strokeWidth={2.5}
          fill="url(#bookingsArea)"
          dot={{ r: 3.5, fill: BLUE, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 5, fill: BLUE, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueOverviewChart({
  data,
}: {
  data: { date: string; revenue: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axis} minTickGap={20} />
        <YAxis
          {...axis}
          dy={0}
          width={72}
          tickFormatter={(v: number) =>
            v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`
          }
        />
        <Tooltip
          cursor={{ fill: 'rgba(34,197,94,0.06)' }}
          content={
            <CardTooltip
              seriesLabel="Revenue"
              color={GREEN}
              formatter={(v: number) => formatCurrency(v)}
            />
          }
        />
        <Bar dataKey="revenue" fill={GREEN} fillOpacity={0.35} stroke={GREEN} strokeWidth={1.5} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}
