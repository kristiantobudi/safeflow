'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Textarea } from '@repo/ui/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { 
  useCreateHiracMutation, 
  useUpdateHiracMutation 
} from '@/store/project-hirac/query';
import { Badge } from '@repo/ui/components/ui/badge';

interface HiracEditModalProps {
  projectId: string;
  hirac?: any; // If provided, we are in EDIT mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HiracEditModal({
  projectId,
  hirac,
  open,
  onOpenChange,
}: HiracEditModalProps) {
  const createMutation = useCreateHiracMutation(projectId);
  const updateMutation = useUpdateHiracMutation(projectId);

  const [formData, setFormData] = useState<any>({
    kegiatan: '',
    kategori: 'R',
    identifikasiBahaya: '',
    akibatRisiko: '',
    pengendalian: '',
    penilaianAwal: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' },
    penilaianLanjutan: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' },
    status: 'OPEN',
  });

  useEffect(() => {
    if (hirac) {
      setFormData({
        kegiatan: hirac.kegiatan || '',
        kategori: hirac.kategori || 'R',
        identifikasiBahaya: hirac.identifikasiBahaya || '',
        akibatRisiko: hirac.akibatRisiko || '',
        pengendalian: hirac.pengendalian || '',
        penilaianAwal: {
          akibat: hirac.penilaianAwalAkibat || 1,
          kemungkinan: hirac.penilaianAwalKemungkinan || 'A',
          tingkatRisiko: hirac.penilaianAwalTingkatRisiko || 'L',
        },
        penilaianLanjutan: {
          akibat: hirac.penilaianLanjutanAkibat || 1,
          kemungkinan: hirac.penilaianLanjutanKemungkinan || 'A',
          tingkatRisiko: hirac.penilaianLanjutanTingkatRisiko || 'L',
        },
        status: hirac.status || 'OPEN',
      });
    } else {
      setFormData({
        kegiatan: '',
        kategori: 'R',
        identifikasiBahaya: '',
        akibatRisiko: '',
        pengendalian: '',
        penilaianAwal: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' },
        penilaianLanjutan: { akibat: 1, kemungkinan: 'A', tingkatRisiko: 'L' },
        status: 'OPEN',
      });
    }
  }, [hirac, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hirac) {
      updateMutation.mutate(
        { id: hirac.id, data: formData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(formData, { 
        onSuccess: () => onOpenChange(false) 
      });
    }
  };

  const updateNested = (parent: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'L': return 'bg-blue-100 text-blue-700';
      case 'M': return 'bg-emerald-100 text-emerald-700';
      case 'H': return 'bg-amber-100 text-amber-700';
      case 'E': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
          <DialogTitle className="text-2xl font-black">
            {hirac ? 'Edit' : 'Tambah'} Data HIRAC
          </DialogTitle>
          <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest pl-1 mt-1">
            {hirac ? 'Perbarui informasi penilaian risiko' : 'Masukkan item penilaian risiko baru'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Kegiatan</Label>
              <Input
                placeholder="Contoh: Pekerjaan Sipil..."
                value={formData.kegiatan}
                onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })}
                className="rounded-xl bg-slate-50/50 border-slate-100 focus-visible:ring-primary/20 h-11"
                required
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kategori (R/NR/E)</Label>
              <Select
                value={formData.kategori}
                onValueChange={(v) => setFormData({ ...formData, kategori: v })}
              >
                <SelectTrigger className="rounded-xl bg-slate-50/50 border-slate-100 focus-visible:ring-primary/20 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  <SelectItem value="R">Routine (R)</SelectItem>
                  <SelectItem value="NR">Non-Routine (NR)</SelectItem>
                  <SelectItem value="E">Emergency (E)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identifikasi Bahaya</Label>
              <Textarea
                placeholder="Deskripsikan potensi bahaya..."
                value={formData.identifikasiBahaya}
                onChange={(e) => setFormData({ ...formData, identifikasiBahaya: e.target.value })}
                className="rounded-xl bg-slate-50/50 border-slate-100 focus-visible:ring-primary/20 min-h-[80px]"
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Akibat Risiko</Label>
              <Textarea
                placeholder="Deskripsikan akibat yang mungkin terjadi..."
                value={formData.akibatRisiko}
                onChange={(e) => setFormData({ ...formData, akibatRisiko: e.target.value })}
                className="rounded-xl bg-slate-50/50 border-slate-100 focus-visible:ring-primary/20 min-h-[80px]"
              />
            </div>

            <div className="col-span-2 h-[1px] bg-slate-100 my-2" />

            {/* Assessment Section */}
            <div className="col-span-2 bg-emerald-50/30 rounded-[1.5rem] p-6 border border-emerald-100/50">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700/60 mb-4">Penilaian Risiko Awal</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-emerald-600/60">Akibat (1-5)</Label>
                  <Input 
                    type="number" min="1" max="5" 
                    value={formData.penilaianAwal.akibat}
                    onChange={(e) => updateNested('penilaianAwal', 'akibat', parseInt(e.target.value))}
                    className="rounded-lg border-emerald-100 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-emerald-600/60">Kemungkinan (A-E)</Label>
                  <Select value={formData.penilaianAwal.kemungkinan} onValueChange={(v) => updateNested('penilaianAwal', 'kemungkinan', v)}>
                    <SelectTrigger className="rounded-lg border-emerald-100 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {['A', 'B', 'C', 'D', 'E'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-emerald-600/60">Tingkat Risiko</Label>
                  <Select value={formData.penilaianAwal.tingkatRisiko} onValueChange={(v) => updateNested('penilaianAwal', 'tingkatRisiko', v)}>
                    <SelectTrigger className={`rounded-lg border-emerald-100 ${getRiskColor(formData.penilaianAwal.tingkatRisiko)} font-bold`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="L">LOW (L)</SelectItem>
                      <SelectItem value="M">MEDIUM (M)</SelectItem>
                      <SelectItem value="H">HIGH (H)</SelectItem>
                      <SelectItem value="E">EXTREME (E)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pengendalian</Label>
              <Textarea
                placeholder="Rencana pengendalian risiko..."
                value={formData.pengendalian}
                onChange={(e) => setFormData({ ...formData, pengendalian: e.target.value })}
                className="rounded-xl bg-slate-50/50 border-slate-100 focus-visible:ring-primary/20 min-h-[80px]"
              />
            </div>
          </div>
        </form>

        <DialogFooter className="p-8 bg-white border-t border-slate-100">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="rounded-xl font-bold px-8 shadow-xl shadow-primary/20"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
