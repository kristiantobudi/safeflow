'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@repo/ui/components/ui/dialog';
import { ScrollArea } from '@repo/ui/components/ui/scroll-area';
import { Badge } from '@repo/ui/components/ui/badge';
import { Input } from '@repo/ui/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import {
  ArrowRight,
  Plus,
  Minus,
  Edit3,
  AlertCircle,
  User,
  Search,
  Filter,
  CheckCircle2,
  Layers,
  GitCompare,
} from 'lucide-react';
import { useCompareVersionsQuery } from '@/store/project-hirac/query';
import { useMemo, useState } from 'react';
import { Card } from '@repo/ui/components/ui/card';

interface ProjectComparisonModalProps {
  projectId: string;
  vA?: number;
  vB?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectComparisonModal({
  projectId,
  vA,
  vB,
  open,
  onOpenChange,
}: ProjectComparisonModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'ADDED' | 'MODIFIED' | 'REMOVED'
  >('ALL');

  const { data: compareResponse, isLoading } = useCompareVersionsQuery(
    projectId,
    vA,
    vB,
  );
  const diffData = compareResponse?.data;

  const summary = diffData?.summary;
  const allRows = diffData?.rows || [];

  const filteredRows = useMemo(() => {
    return allRows.filter((row: any) => {
      const matchesSearch = (
        row.current?.kegiatan ||
        row.previous?.kegiatan ||
        ''
      )
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'ALL' || row.diffType === filterType;
      const isNotUnchanged = row.diffType !== 'UNCHANGED';
      return matchesSearch && matchesFilter && isNotUnchanged;
    });
  }, [allRows, searchQuery, filterType]);

  const fieldLabels: Record<string, string> = {
    kegiatan: 'Activity',
    kategori: 'Category',
    identifikasiBahaya: 'Hazard Identification',
    akibatRisiko: 'Risk Consequence',
    pengendalian: 'Control Measure',
    penilaianAwalAkibat: 'Initial Severity',
    penilaianAwalKemungkinan: 'Initial Probability',
    penilaianAwalTingkatRisiko: 'Initial Risk Level',
    penilaianLanjutanAkibat: 'Residual Severity',
    penilaianLanjutanKemungkinan: 'Residual Probability',
    penilaianLanjutanTingkatRisiko: 'Residual Risk Level',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 flex flex-col gap-0 border-muted/20 shadow-2xl overflow-hidden">
        <DialogHeader className="p-8 border-b border-slate-100 bg-white sticky top-0 z-20">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <GitCompare className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  Perbandingan Perubahan
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs font-semibold text-muted-foreground/60 flex items-center gap-6 pl-1">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 opacity-50" />
                  Perbandingan v{diffData?.versionA?.versionNumber || '-'} vs v
                  {diffData?.versionB?.versionNumber || '-'}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 opacity-50" />
                  Submitter:{' '}
                  {diffData?.versionB?.submitter?.firstName || 'System'}
                </span>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground ml-2 opacity-50">
                Reviewers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Card className="group relative p-4 bg-emerald-100/50 border border-emerald-500/50 transition-all hover:bg-emerald-100">
              <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest block mb-1">
                Added
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-700">
                  {summary?.added || 0}
                </span>
                <span className="text-[10px] font-bold text-emerald-700/60 italic">
                  Items
                </span>
              </div>
              <Plus className="absolute top-4 right-4 h-4 w-4 text-emerald-500" />
            </Card>
            <Card className="group relative p-4 bg-amber-100/50 border border-amber-500/50 transition-all hover:bg-amber-100">
              <span className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest block mb-1">
                Modified
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-700">
                  {summary?.modified || 0}
                </span>
                <span className="text-[10px] font-bold text-amber-700/60 italic">
                  Changes
                </span>
              </div>
              <Edit3 className="absolute top-4 right-4 h-4 w-4 text-amber-500" />
            </Card>
            <Card className="group relative p-4 bg-rose-100/50 border border-rose-500/50 transition-all hover:bg-rose-100">
              <span className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest block mb-1">
                Removed
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-rose-700">
                  {summary?.removed || 0}
                </span>
                <span className="text-[10px] font-bold text-rose-600/40 italic">
                  Items
                </span>
              </div>
              <Minus className="absolute top-4 right-4 h-4 w-4 text-rose-200" />
            </Card>
            <Card className="group relative p-4 bg-slate-100/50 border border-slate-500/50 transition-all hover:bg-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                Unchanged
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-600">
                  {summary?.unchanged || 0}
                </span>
              </div>
              <CheckCircle2 className="absolute top-4 right-4 h-4 w-4 text-slate-200" />
            </Card>
          </div>
        </DialogHeader>

        <div className="px-8 py-4 bg-slate-50/50 border-b border-none flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              placeholder="Search by activity name..."
              className="pl-10 h-10 bg-white border-none text-sm font-medium focus-visible:ring-primary/20 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs
            value={filterType}
            onValueChange={(v: any) => setFilterType(v)}
            className="shrink-0"
          >
            <TabsList className="bg-white border border-none h-10 p-1 shadow-sm">
              <TabsTrigger
                value="ALL"
                className="text-[10px] font-bold uppercase tracking-wider px-4 data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="ADDED"
                className="text-[10px] font-bold uppercase tracking-wider px-4 text-emerald-600 hover:text-emerald-700 data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
              >
                Added
              </TabsTrigger>
              <TabsTrigger
                value="MODIFIED"
                className="text-[10px] font-bold uppercase tracking-wider px-4 text-amber-600 hover:text-amber-700 data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
              >
                Modified
              </TabsTrigger>
              <TabsTrigger
                value="REMOVED"
                className="text-[10px] font-bold uppercase tracking-wider px-4 text-rose-600 hover:text-rose-700 data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent"
              >
                Removed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-8 pt-6 space-y-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground/40">
                    Analyzing Versions
                  </p>
                  <p className="text-[11px] font-bold text-muted-foreground/40 italic">
                    Please wait while we calculate differences...
                  </p>
                </div>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4 text-center opacity-40">
                <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-[0.2em]">
                    No Data Found
                  </p>
                  <p className="text-[11px] font-bold italic">
                    Adjust your filters or try a different search
                  </p>
                </div>
              </div>
            ) : (
              filteredRows.map((row: any, idx: number) => {
                const isAdded = row.diffType === 'ADDED';
                const isRemoved = row.diffType === 'REMOVED';
                const isModified = row.diffType === 'MODIFIED';

                return (
                  <div
                    key={idx}
                    className="group transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAdded
                            ? 'bg-emerald-500'
                            : isRemoved
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                        }`}
                      />
                      <h4 className="text-sm font-black tracking-tight text-foreground/80 lowercase first-letter:uppercase">
                        {(
                          row.current?.kegiatan || row.previous?.kegiatan
                        )?.toLowerCase()}
                      </h4>
                      <div className="h-[1px] flex-1 bg-slate-100" />
                      <Badge
                        className={`py-1 px-3 text-[9px] font-black uppercase tracking-[0.1em] border-none ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-700'
                            : isRemoved
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {row.diffType}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      {isModified &&
                        row.diff &&
                        Object.entries(row.diff).map(
                          ([field, values]: [string, any], fIdx) => (
                            <div
                              key={fIdx}
                              className="bg-white border border-slate-100 rounded-[1.2rem] p-4 shadow-sm hover:shadow-md transition-all"
                            >
                              <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Filter className="h-2.5 w-2.5" />
                                {fieldLabels[field] || field}
                              </p>
                              <div className="space-y-4">
                                <div className="relative pl-4 border-l-2 border-rose-100">
                                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-rose-200" />
                                  <p className="text-[11px] font-bold text-rose-600 line-through leading-relaxed opacity-70">
                                    {String(values.old || '-')}
                                  </p>
                                </div>
                                <div className="flex justify-center -my-2 relative z-10">
                                  <div className="bg-slate-50 rounded-full p-1.5 border border-slate-100">
                                    <ArrowRight className="h-3 w-3 text-slate-300" />
                                  </div>
                                </div>
                                <div className="relative pl-4 border-l-2 border-emerald-100">
                                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-emerald-200" />
                                  <p className="text-xs font-black text-emerald-700 leading-relaxed">
                                    {String(values.new || '-')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}

                      {(isAdded || isRemoved) && (
                        <Card className="col-span-full p-6 border-none shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Hazard Identification
                              </p>
                              <p className="text-xs font-bold leading-relaxed text-slate-600">
                                {isAdded
                                  ? row.current?.identifikasiBahaya
                                  : row.previous?.identifikasiBahaya}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Risk Consequence
                              </p>
                              <p className="text-xs font-bold leading-relaxed text-slate-600">
                                {isAdded
                                  ? row.current?.akibatRisiko
                                  : row.previous?.akibatRisiko}
                              </p>
                            </div>
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground opacity-50 uppercase tracking-wider">
            SafeFlow Version Auditor v1.0
          </p>
          <div className="flex gap-2 text-[10px] font-black">
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
              Stable
            </span>
            <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100">
              Verified
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
