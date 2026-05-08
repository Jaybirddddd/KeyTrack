import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Loader2, Wand2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const emptyForm = {
  year: '',
  make: '',
  model: '',
  series: '',
  series_detail: '',
  body: '',
  vin: '',
  stock_number: '',
  color: '',
  interior: '',
  mileage: '',
  age: '',
  price: '',
  exit_strategy: 'R',
  certified: false,
  disp: '',
  location: '',
  status: 'available',
  notes: '',
};

export default function CarFormDialog({ open, onOpenChange, car, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [decodingVin, setDecodingVin] = useState(false);

  useEffect(() => {
    if (car) {
      setForm({
        year: car.year || '',
        make: car.make || '',
        model: car.model || '',
        series: car.series || '',
        series_detail: car.series_detail || '',
        body: car.body || '',
        vin: car.vin || '',
        stock_number: car.stock_number || '',
        color: car.color || '',
        interior: car.interior || '',
        mileage: car.mileage || '',
        age: car.age || '',
        price: car.price || '',
        exit_strategy: car.exit_strategy || 'R',
        certified: car.certified || false,
        disp: car.disp || '',
        location: car.location || '',
        status: car.status || 'available',
        notes: car.notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [car, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const decodeVin = async () => {
    if (!form.vin || form.vin.length < 17) return;
    setDecodingVin(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Decode this VIN: ${form.vin}
Return the vehicle details as JSON with these fields:
- year (number)
- make (string)
- model (string, include trim if available)
- color (string, leave empty if unknown)`,
      response_json_schema: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          make: { type: 'string' },
          model: { type: 'string' },
          color: { type: 'string' },
        },
      },
    });
    if (result?.make) {
      setForm((prev) => ({
        ...prev,
        year: result.year || prev.year,
        make: result.make || prev.make,
        model: result.model || prev.model,
        color: result.color || prev.color,
      }));
    }
    setDecodingVin(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      year: Number(form.year),
      mileage: form.mileage ? Number(form.mileage) : undefined,
      age: form.age ? Number(form.age) : undefined,
      price: form.price ? Number(form.price) : undefined,
    };

    // If disp changed to Detail, auto-assign key to Detail dept and log it
    const dispChanged = car && form.disp !== car.disp;
    if (dispChanged && form.disp === 'Detail') {
      data.key_status = 'out';
      data.key_holder = 'Detail';
    }

    if (car) {
      await base44.entities.Car.update(car.id, data);
      // Log the automatic key transfer to Detail
      if (dispChanged && form.disp === 'Detail') {
        await base44.entities.KeyLog.create({
          car_id: car.id,
          car_label: `${car.year} ${car.make} ${car.model}`,
          stock_number: car.stock_number,
          action: 'checked_out',
          person: 'Detail',
          reason: 'Auto-assigned when disposition changed to Detail',
        });
      }
    } else {
      await base44.entities.Car.create(data);
    }
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{car ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* VIN with decoder */}
          <div>
            <Label>VIN</Label>
            <div className="flex gap-2">
              <Input
                value={form.vin}
                onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
                placeholder="17-character VIN"
                maxLength={17}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={decodeVin}
                disabled={decodingVin || form.vin.length < 17}
                title="Auto-fill year, make, model from VIN"
              >
                {decodingVin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              </Button>
            </div>
            {form.vin.length > 0 && form.vin.length < 17 && (
              <p className="text-xs text-muted-foreground mt-1">{17 - form.vin.length} characters remaining</p>
            )}
            {form.vin.length === 17 && (
              <p className="text-xs text-green-600 mt-1">VIN complete — click the wand to auto-fill details</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Year *</Label>
              <Input type="number" value={form.year} onChange={(e) => handleChange('year', e.target.value)} required />
            </div>
            <div>
              <Label>Make *</Label>
              <Input value={form.make} onChange={(e) => handleChange('make', e.target.value)} required />
            </div>
            <div>
              <Label>Model *</Label>
              <Input value={form.model} onChange={(e) => handleChange('model', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Series</Label>
              <Input value={form.series} onChange={(e) => handleChange('series', e.target.value)} />
            </div>
            <div>
              <Label>Series Detail</Label>
              <Input value={form.series_detail} onChange={(e) => handleChange('series_detail', e.target.value)} placeholder="e.g. 4MATIC, quattro" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Body Style</Label>
              <Input value={form.body} onChange={(e) => handleChange('body', e.target.value)} placeholder="e.g. 4D Sport Utility" />
            </div>
            <div>
              <Label>Stock # *</Label>
              <Input value={form.stock_number} onChange={(e) => handleChange('stock_number', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Color</Label>
              <Input value={form.color} onChange={(e) => handleChange('color', e.target.value)} />
            </div>
            <div>
              <Label>Interior</Label>
              <Input value={form.interior} onChange={(e) => handleChange('interior', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Mileage</Label>
              <Input type="number" value={form.mileage} onChange={(e) => handleChange('mileage', e.target.value)} />
            </div>
            <div>
              <Label>Days in Inventory</Label>
              <Input type="number" value={form.age} onChange={(e) => handleChange('age', e.target.value)} />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" value={form.price} onChange={(e) => handleChange('price', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Exit Strategy</Label>
              <Select value={form.exit_strategy} onValueChange={(v) => handleChange('exit_strategy', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="R">R — Retail</SelectItem>
                  <SelectItem value="W">W — Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="service">In Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="certified" checked={form.certified} onCheckedChange={(v) => handleChange('certified', v)} />
            <Label htmlFor="certified">Certified Pre-Owned</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Disposition</Label>
              <Select value={form.disp || ''} onValueChange={(v) => handleChange('disp', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  <SelectItem value="SOLD">SOLD</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Detail">Detail</SelectItem>
                  <SelectItem value="Service-Out">Service-Out</SelectItem>
                  <SelectItem value="Transit">Transit</SelectItem>
                  <SelectItem value="Needs Work">Needs Work</SelectItem>
                  <SelectItem value="Auction">Auction</SelectItem>
                  <SelectItem value="Demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location || ''} onChange={(e) => handleChange('location', e.target.value)} placeholder="e.g. Lot B, Row 3" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {car ? 'Update' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}