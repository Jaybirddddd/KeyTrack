import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Fuel, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const INITIAL_SHOW = 5;

export default function GasQueue({ cars, onUpdated }) {
  const [showAll, setShowAll] = useState(false);

  const gasCars = cars.filter((c) => c.needs_gas);
  if (!gasCars.length) return null;

  const visible = showAll ? gasCars : gasCars.slice(0, INITIAL_SHOW);
  const hidden = gasCars.length - INITIAL_SHOW;

  const handleClear = async (car) => {
    await base44.entities.Car.update(car.id, { needs_gas: false });
    onUpdated();
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20 bg-amber-500/5">
        <Fuel className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-sm text-foreground">Needs Gas</h3>
        <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 ml-auto">
          {gasCars.length} vehicle{gasCars.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="divide-y divide-border">
        {visible.map((car) => (
          <div key={car.id} className="flex items-center gap-3 px-4 py-3">
            <Fuel className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {car.year} {car.make} {car.model}
              </p>
              <p className="text-xs text-muted-foreground">
                Stock #{car.stock_number}
                {car.color ? ` · ${car.color}` : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-green-600 hover:text-green-500 hover:bg-green-500/10 shrink-0 gap-1"
              onClick={() => handleClear(car)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </Button>
          </div>
        ))}
      </div>

      {gasCars.length > INITIAL_SHOW && (
        <div className="border-t border-border px-4 py-2.5 bg-muted/20">
          <button
            className="w-full flex items-center justify-center gap-1.5 text-sm text-primary font-medium hover:underline py-1"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? (
              <><ChevronUp className="h-4 w-4" /> Show less</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> Show {hidden} more</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}