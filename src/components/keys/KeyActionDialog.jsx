import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Loader2, KeyRound } from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function KeyActionDialog({ open, onOpenChange, car, onCompleted }) {
  const { displayName } = useCurrentUser();
  const [person, setPerson] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open && displayName) setPerson(displayName);
  }, [open, displayName]);
  const [saving, setSaving] = useState(false);

  if (!car) return null;

  const isCheckingOut = car.key_status !== 'out';
  const action = isCheckingOut ? 'checked_out' : 'checked_in';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Create key log
    await base44.entities.KeyLog.create({
      car_id: car.id,
      car_label: `${car.year} ${car.make} ${car.model}`,
      stock_number: car.stock_number,
      action,
      person,
      reason: reason || undefined,
    });

    // Update car key status
    await base44.entities.Car.update(car.id, {
      key_status: isCheckingOut ? 'out' : 'in',
      key_holder: isCheckingOut ? person : '',
    });

    setSaving(false);
    setPerson('');
    setReason('');
    onCompleted();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {isCheckingOut ? 'Check Out Key' : 'Return Key'}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-2">
          <span className="font-semibold text-foreground">{car.year} {car.make} {car.model}</span>
          <span className="ml-2">— Stock #{car.stock_number}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{isCheckingOut ? 'Who is taking the key?' : 'Who is returning the key?'} *</Label>
            <Input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Enter name"
              required
            />
          </div>

          <div>
            <Label>Reason (optional)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isCheckingOut ? 'e.g. Test drive, service...' : 'e.g. Returned after test drive'}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className={isCheckingOut ? 'bg-destructive hover:bg-destructive/90' : 'bg-green-600 hover:bg-green-700'}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCheckingOut ? 'Check Out' : 'Check In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}