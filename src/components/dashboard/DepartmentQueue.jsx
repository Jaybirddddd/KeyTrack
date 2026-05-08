import { useState } from 'react';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Zap, Hammer, Store, Clock, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

const INITIAL_SHOW = 5;

const deptConfig = {
  Detail: { label: 'Detail', icon: Zap, badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  Service: { label: 'Service', icon: Hammer, badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  Vendor: { label: 'Vendor', icon: Store, badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

function QueueSection({ dept, cars, logs }) {
  const [showAll, setShowAll] = useState(false);
  const cfg = deptConfig[dept];
  const Icon = cfg.icon;

  // Build a map of car_id -> most recent checkout log timestamp
  // Use the most recent checked_out log for each car (logs are sorted newest first)
  const checkoutTimes = {};
  for (const log of logs) {
    if (log.action === 'checked_out' && log.car_id && !checkoutTimes[log.car_id]) {
      checkoutTimes[log.car_id] = log.created_date;
    }
  }

  const visible = showAll ? cars : cars.slice(0, INITIAL_SHOW);
  const hidden = cars.length - INITIAL_SHOW;

  if (!cars.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4" />
          <h3 className="font-semibold text-sm">{cfg.label} Department</h3>
          <Badge className={`${cfg.badgeClass} ml-auto`}>0 vehicles</Badge>
        </div>
        <p className="text-xs text-muted-foreground">No vehicles currently checked out.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Icon className="h-4 w-4" />
        <h3 className="font-semibold text-sm">{cfg.label} Department</h3>
        <Badge className={`${cfg.badgeClass} ml-auto`}>{cars.length} vehicle{cars.length !== 1 ? 's' : ''}</Badge>
      </div>
      <div className="divide-y divide-border">
        {visible.map((car) => {
          const logDate = checkoutTimes[car.id];
          const since = logDate
            ? formatDistanceToNow(new Date(logDate.endsWith('Z') ? logDate : logDate + 'Z'), { addSuffix: false })
            : null;

          return (
            <div key={car.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {car.year} {car.make} {car.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  Stock #{car.stock_number}
                  {car.key_holder ? ` · ${car.key_holder}` : ''}
                  {car.location ? ` · ${car.location}` : ''}
                </p>
              </div>
              {since && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {since}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {cars.length > INITIAL_SHOW && (
        <div className="border-t border-border px-4 py-2.5 bg-muted/20">
          <button
            className="w-full flex items-center justify-center gap-1.5 text-sm text-primary font-medium hover:underline py-1"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? (
              <><ChevronUp className="h-4 w-4" /> Show less</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> Show {hidden} more vehicle{hidden !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function avgHoursInDept(cars, logs, dept) {
  // For each car, find the most recent checked_out log
  const checkoutTimes = {};
  for (const log of logs) {
    if (log.action === 'checked_out' && log.car_id && !checkoutTimes[log.car_id]) {
      checkoutTimes[log.car_id] = log.created_date;
    }
  }
  const hours = cars
    .map((c) => {
      const d = checkoutTimes[c.id];
      if (!d) return null;
      return differenceInHours(new Date(), new Date(d.endsWith('Z') ? d : d + 'Z'));
    })
    .filter((h) => h !== null);
  if (!hours.length) return null;
  return Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
}

function formatHours(h) {
  if (h === null) return '—';
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  const rem = h % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

function EfficiencySummary({ detailCars, serviceCars, vendorCars, logs }) {
  const detailAvg = avgHoursInDept(detailCars, logs);
  const serviceAvg = avgHoursInDept(serviceCars, logs);
  const vendorAvg = avgHoursInDept(vendorCars, logs);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg. time in Detail</p>
          <p className="text-lg font-bold text-foreground">{formatHours(detailAvg)}</p>
        </div>
      </div>
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
          <Hammer className="h-4 w-4 text-orange-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg. time in Service</p>
          <p className="text-lg font-bold text-foreground">{formatHours(serviceAvg)}</p>
        </div>
      </div>
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          <Store className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg. time with Vendor</p>
          <p className="text-lg font-bold text-foreground">{formatHours(vendorAvg)}</p>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentQueue({ cars, logs = [] }) {
  const detailCars = cars.filter((c) => c.disp === 'Detail');
  const serviceCars = cars.filter((c) => c.disp === 'Service' || c.status === 'service');
  const vendorCars = cars.filter((c) => c.disp === 'Vendor');

  if (!detailCars.length && !serviceCars.length && !vendorCars.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Department Queues</h2>
      </div>
      <EfficiencySummary detailCars={detailCars} serviceCars={serviceCars} vendorCars={vendorCars} logs={logs} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <QueueSection dept="Detail" cars={detailCars} logs={logs} />
        <QueueSection dept="Service" cars={serviceCars} logs={logs} />
        <QueueSection dept="Vendor" cars={vendorCars} logs={logs} />
      </div>
    </div>
  );
}