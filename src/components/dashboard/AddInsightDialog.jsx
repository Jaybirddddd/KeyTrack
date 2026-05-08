import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function AddInsightDialog({ open, onOpenChange, cars, onSaved }) {
  const [carId, setCarId] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('update');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const car = cars.find((c) => c.id === carId);
    await base44.entities.CarInsight.create({
      car_id: carId,
      stock_number: car?.stock_number || '',
      car_label: car ? `${car.year} ${car.make} ${car.model}` : '',
      note,
      type,
    });
    setSaving(false);
    setCarId('');
    setNote('');
    setType('update');
    onSaved();
    onOpenChange(false);
  };

  // Sort cars by year desc for easier picking
  const sortedCars = [...cars].sort((a, b) => b.year - a.year || a.make.localeCompare(b.make));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vehicle Insight</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Vehicle</Label>
            <Select value={carId} onValueChange={setCarId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {sortedCars.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    #{c.stock_number} — {c.year} {c.make} {c.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="update">Update — recent work done</SelectItem>
                <SelectItem value="watch_out">Watch Out — issue to be aware of</SelectItem>
                <SelectItem value="ready">Ready — good to go</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Just back from detail, needs new tires, AC repaired..."
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !carId || !note.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Insight
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}