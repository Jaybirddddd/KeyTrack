import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (dateStr) => new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z').toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
const INITIAL_SHOW = 5;

export default function RecentKeyActivity({ logs }) {
  const [showAll, setShowAll] = useState(false);
  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Key Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No key activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Key Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(showAll ? logs : logs.slice(0, INITIAL_SHOW)).map((log) => (
          <div key={log.id} className="flex items-center gap-3 py-2 border-b last:border-0">
            <div className={`p-2 rounded-lg ${log.action === 'checked_out' ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
              {log.action === 'checked_out' ? (
                <ArrowUpFromLine className="h-4 w-4 text-destructive" />
              ) : (
                <ArrowDownToLine className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{log.car_label || `Stock #${log.stock_number}`}</p>
              <p className="text-xs text-muted-foreground">{log.person}{log.reason ? ` — ${log.reason}` : ''}</p>
            </div>
            <div className="text-right shrink-0">
              <Badge variant={log.action === 'checked_out' ? 'destructive' : 'secondary'} className={log.action === 'checked_in' ? 'bg-green-500/15 text-green-500 border-green-500/30' : ''}>
                {log.action === 'checked_out' ? 'Out' : 'In'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {fmt(log.created_date)}
              </p>
            </div>
          </div>
        ))}
        {logs.length > INITIAL_SHOW && (
          <button
            className="w-full flex items-center justify-center gap-1.5 text-sm text-primary font-medium hover:underline pt-1"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Show {logs.length - INITIAL_SHOW} more</>}
          </button>
        )}
      </CardContent>
    </Card>
  );
}