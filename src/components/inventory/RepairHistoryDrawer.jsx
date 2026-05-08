import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import RepairOrderHistory from './RepairOrderHistory';

export default function RepairHistoryDrawer({ car, open, onOpenChange }) {
  if (!car) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="text-left">
            <span className="text-foreground">Repair History</span>
            <span className="block text-sm font-normal text-muted-foreground mt-0.5">
              {car.year} {car.make} {car.model} · Stock #{car.stock_number}
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-3">
          <RepairOrderHistory car={car} />
        </div>
      </SheetContent>
    </Sheet>
  );
}