import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeyRound, Pencil, Trash2, Lightbulb, Wrench, Fuel, BadgeDollarSign, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig = {
  available: { label: 'Available', className: 'bg-green-500/15 text-green-500 border-green-500/30' },
  sold: { label: 'Sold', className: 'bg-muted text-muted-foreground border-border' },
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  service: { label: 'In Service', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
};

export default function CarCard({ car, hasInsights, hasRepairs, onEdit, onDelete, onKeyAction, onInsight, onRepairs, onToggleGas, onMarkSold }) {
  const status = statusConfig[car.status] || statusConfig.available;
  const keyOut = car.key_status === 'out';

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border last:border-0">
      {/* Key indicator dot */}
      <div className={`w-2 h-2 rounded-full shrink-0 ${keyOut ? 'bg-destructive' : 'bg-green-500'}`} />

      {/* Vehicle info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-foreground">
            {car.year} {car.make} {car.model}
          </span>
          {car.series && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {car.series}{car.series_detail ? ` ${car.series_detail}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono">#{car.stock_number}</span>
          {car.color && <span>· {car.color}</span>}
          {car.mileage ? <span>· {car.mileage.toLocaleString()} mi</span> : null}
        </div>
      </div>

      {/* Badges — desktop only */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
        {car.certified && <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">CPO</Badge>}
        {car.exit_strategy === 'W' && <Badge variant="outline" className="text-xs">W</Badge>}
        {car.disp && <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs">{car.disp}</Badge>}
      </div>

      {/* Price */}
      <div className="text-sm font-semibold text-foreground shrink-0 w-20 text-right hidden sm:block">
        {car.price ? `$${car.price.toLocaleString()}` : <span className="text-muted-foreground text-xs font-normal">—</span>}
      </div>

      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        {onToggleGas && (
          <Button
            size="sm" variant="ghost"
            className={`h-7 w-7 p-0 ${car.needs_gas ? 'text-amber-500 hover:text-amber-400' : 'text-muted-foreground hover:text-amber-500'}`}
            onClick={() => onToggleGas(car)}
            title={car.needs_gas ? 'Needs gas (click to clear)' : 'Mark needs gas'}
          >
            <Fuel className={`h-3.5 w-3.5 ${car.needs_gas ? 'fill-amber-500' : ''}`} />
          </Button>
        )}
        <Button
          size="sm" variant="ghost"
          className={`h-7 px-2 text-xs ${keyOut ? 'text-green-500 hover:text-green-400 hover:bg-green-500/10' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => onKeyAction(car)}
          title={keyOut ? `Key out${car.key_holder ? ` · ${car.key_holder}` : ''}` : 'Key in'}
        >
          <KeyRound className={`h-3.5 w-3.5 ${keyOut ? 'text-destructive' : 'text-green-600'}`} />
        </Button>
        {onInsight && (
          <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 hover:text-amber-600 ${hasInsights ? 'text-amber-400' : 'text-muted-foreground'}`} onClick={() => onInsight(car)} title="Insights">
            <Lightbulb className={`h-3.5 w-3.5 ${hasInsights ? 'fill-amber-400' : ''}`} />
          </Button>
        )}
        {onRepairs && (
          <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 hover:text-blue-600 ${hasRepairs ? 'text-blue-500' : 'text-muted-foreground'}`} onClick={() => onRepairs(car)} title="Repair history">
            <Wrench className={`h-3.5 w-3.5 ${hasRepairs ? 'fill-blue-500' : ''}`} />
          </Button>
        )}
        {onMarkSold && car.status !== 'sold' && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-green-600" onClick={() => onMarkSold(car)} title="Mark as sold">
            <BadgeDollarSign className="h-3.5 w-3.5" />
          </Button>
        )}
        {onEdit && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(car)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(car)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Mobile actions — dropdown */}
      <div className="flex md:hidden items-center gap-1 shrink-0">
        {/* Key button always visible on mobile */}
        <Button
          size="sm" variant="ghost"
          className={`h-7 w-7 p-0 ${keyOut ? 'text-destructive' : 'text-green-600'}`}
          onClick={() => onKeyAction(car)}
        >
          <KeyRound className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onInsight && (
              <DropdownMenuItem onClick={() => onInsight(car)}>
                <Lightbulb className={`h-4 w-4 mr-2 ${hasInsights ? 'text-amber-400 fill-amber-400' : ''}`} />
                Insights
              </DropdownMenuItem>
            )}
            {onRepairs && (
              <DropdownMenuItem onClick={() => onRepairs(car)}>
                <Wrench className={`h-4 w-4 mr-2 ${hasRepairs ? 'text-blue-500 fill-blue-500' : ''}`} />
                Repair History
              </DropdownMenuItem>
            )}
            {onToggleGas && (
              <DropdownMenuItem onClick={() => onToggleGas(car)}>
                <Fuel className={`h-4 w-4 mr-2 ${car.needs_gas ? 'text-amber-500 fill-amber-500' : ''}`} />
                {car.needs_gas ? 'Clear Gas Flag' : 'Needs Gas'}
              </DropdownMenuItem>
            )}
            {onMarkSold && car.status !== 'sold' && (
              <DropdownMenuItem onClick={() => onMarkSold(car)} className="text-green-600">
                <BadgeDollarSign className="h-4 w-4 mr-2" />
                Mark as Sold
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(car)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(car)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}