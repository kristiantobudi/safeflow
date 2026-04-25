'use client';

import { useAuthQuery } from '@/store/auth/auth-query';
import { usePtwList } from '@/store/ptw/query';
import { useMyProgram } from '@/store/vendor-certification/query';
import { useJsaList } from '@/store/jsa/query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ClipboardList,
  ShieldCheck,
  Clock,
  MapPin,
  ChevronRight,
  AlertCircle,
  FilePlus,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function HSEDashboard() {
  const { data: user, isLoading: isUserLoading } = useAuthQuery();
  const { data: permits, isLoading: isPermitLoading } = usePtwList();
  const { data: myProgramResp, isLoading: isMyProgramLoading } = useMyProgram();
  const { data: jsaList, isLoading: isJsaLoading } = useJsaList();

  const myProgramData = myProgramResp?.data ?? myProgramResp;
  const totalRequired = myProgramData?.totalRequired || 0;
  const completedCount = myProgramData?.completedCount || 0;
  const progressPercent =
    totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0;

  const nextUpModule = myProgramData?.modules?.find(
    (m: any) => m.status === 'PENDING' && m.isRequired,
  );

  const activePermits =
    permits?.filter(
      (p) =>
        p.approvalStatus === 'APPROVED' ||
        p.approvalStatus === 'PENDING' ||
        p.approvalStatus === 'ON_PROGRESS',
    ) || [];

  const activeJsas =
    jsaList?.filter(
      (j) =>
        j.approvalStatus === 'APPROVED' ||
        j.approvalStatus === 'PENDING' ||
        j.approvalStatus === 'ON_PROGRESS',
    ) || [];

  // Limiting to 2 to match the design roughly, or show all in a scrollable list.
  const displayPermits = activePermits.slice(0, 2);
  const displayJsas = activeJsas.slice(0, 2);

  return (
    <div className="space-y-6 py-6 pb-20 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-[#eef2ff] to-[#e0e7ff] rounded-2xl p-6 sm:p-10 border border-blue-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-3">
          <motion.h1
            initial={{ x: -50, opacity: 0.2 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.2, type: 'spring', damping: 20 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900"
          >
            Welcome back,{' '}
            <motion.span className="text-[#2563eb]">
              {isUserLoading ? '...' : user?.name || 'User'}!
            </motion.span>
          </motion.h1>
          <motion.div
            initial={{ x: -30, opacity: 0.2 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.8, type: 'spring', damping: 20 }}
            className="flex items-center gap-3 mt-1"
          >
            <span className="text-sm font-medium text-slate-600">
              Your safety status is:
            </span>
            <Badge
              variant="secondary"
              className="bg-[#dbeafe] text-[#1d4ed8] hover:bg-[#bfdbfe] border-none px-3 py-1 text-xs shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-[#2563eb] mr-2" />
              Green Compliant
            </Badge>
          </motion.div>
          <motion.p
            initial={{ x: -20, opacity: 0.2 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 2, type: 'spring', damping: 20 }}
            className="text-sm text-slate-600 max-w-lg mt-3 leading-relaxed"
          >
            All your site-specific permits are active and your certifications
            are up to date. Remember: safety is a shared responsibility.
          </motion.p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Certification Progress */}
        <div className="col-span-1 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4 invisible">
            Progress
          </h2>
          <Card className="shadow-sm border-slate-100 h-full flex flex-col hover:shadow-md transition-shadow -mt-11">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-800">
                My HSE Certification Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between gap-6">
              {isMyProgramLoading ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="w-full h-24 rounded-xl" />
                  <Skeleton className="w-full h-11 rounded-xl" />
                </div>
              ) : myProgramData ? (
                <>
                  <div className="flex items-center gap-6">
                    {/* Donut Chart */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg
                        className="w-full h-full -rotate-90"
                        viewBox="0 0 36 36"
                      >
                        <path
                          className="text-slate-100"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="text-[#1d4ed8]"
                          strokeDasharray={`${progressPercent}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-slate-800">
                          {completedCount}/{totalRequired}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                          Modules
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold text-slate-800">
                        {nextUpModule ? 'Next Up' : 'Completed'}
                      </span>
                      <span className="text-sm text-slate-600 leading-snug">
                        {nextUpModule
                          ? nextUpModule.title
                          : 'All requirements met'}
                      </span>
                      {nextUpModule && (
                        <span className="text-xs text-[#2563eb] font-semibold mt-1">
                          Action Required
                        </span>
                      )}
                    </div>
                  </div>

                  <Link href="/hse/training" className="w-full block">
                    <Button className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl shadow-sm h-11 font-semibold">
                      {nextUpModule ? 'Continue Learning' : 'View Certificate'}
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                  <FileText className="h-8 w-8 mb-2 text-slate-400" />
                  <p className="text-sm font-medium">No program assigned</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Permits */}
        <div className="col-span-1 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              My Active Permits
            </h2>
            <Link
              href="/hse/ptw"
              className="text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8]"
            >
              View All
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {isPermitLoading ? (
              <>
                <Skeleton className="w-[300px] h-[170px] rounded-2xl flex-shrink-0" />
                <Skeleton className="w-[300px] h-[170px] rounded-2xl flex-shrink-0" />
              </>
            ) : displayPermits.length > 0 ? (
              displayPermits.map((permit) => (
                <Card
                  key={permit.id}
                  className="min-w-[280px] sm:min-w-[320px] h-[190px] flex-shrink-0 snap-center shadow-sm border-slate-100 hover:shadow-md transition-shadow rounded-2xl"
                >
                  <CardContent className="p-5 flex flex-col gap-4 h-full justify-between">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb]">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border-none ${permit.approvalStatus === 'APPROVED' ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#fef3c7] text-[#b45309]'}`}
                      >
                        {permit.approvalStatus}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">
                        {permit.noPtw || permit.judulPekerjaan}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">
                          {permit.lokasiPekerjaan || 'Location not specified'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between mt-1 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                        <Clock className="h-4 w-4 text-[#2563eb]" />
                        {permit.approvalStatus === 'APPROVED'
                          ? 'Expires in 4h 12m'
                          : 'Pending approval...'}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="w-full flex flex-col items-center justify-center border border-card rounded-2xl p-8 text-center text-slate-500 h-[190px]">
                <FileText className="h-8 w-8 mb-2 text-slate-400" />
                <p className="font-medium">No active permits found.</p>
                <p className="text-sm mt-1">Submit a new PTW to get started.</p>
              </Card>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 mt-8">
            <h2 className="text-lg font-bold text-slate-800">My Active JSAs</h2>
            <Link
              href="/hse/jsa"
              className="text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8]"
            >
              View All
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {isJsaLoading ? (
              <>
                <Skeleton className="w-[300px] h-[190px] rounded-2xl flex-shrink-0" />
                <Skeleton className="w-[300px] h-[190px] rounded-2xl flex-shrink-0" />
              </>
            ) : displayJsas.length > 0 ? (
              displayJsas.map((jsa) => (
                <Card
                  key={jsa.id}
                  className="min-w-[280px] sm:min-w-[320px] h-[190px] flex-shrink-0 snap-center shadow-sm border-slate-100 hover:shadow-md transition-shadow rounded-2xl"
                >
                  <CardContent className="p-5 flex flex-col gap-4 h-full justify-between">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb]">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 border-none ${jsa.approvalStatus === 'APPROVED' ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#fef3c7] text-[#b45309]'}`}
                      >
                        {jsa.approvalStatus}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">
                        {jsa.jenisKegiatan}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">
                          {jsa.lokasiKegiatan || 'Location not specified'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between mt-1 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                        <Clock className="h-4 w-4 text-[#2563eb]" />
                        {jsa.approvalStatus === 'APPROVED'
                          ? 'Active'
                          : 'Pending approval...'}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="w-full flex flex-col items-center justify-center border border-card rounded-2xl p-8 text-center text-slate-500 h-[190px]">
                <FileText className="h-8 w-8 mb-2 text-slate-400" />
                <p className="font-medium">No active JSAs found.</p>
                <p className="text-sm mt-1">Submit a new JSA to get started.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link href="/hse/ptw" className="group">
            <Card className="h-full hover:shadow-md transition-all border-slate-100 hover:border-[#bfdbfe] group-hover:bg-[#f8fafc] rounded-2xl">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb] group-hover:bg-[#dbeafe] transition-colors">
                  <FilePlus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1.5">
                    Submit New PTW
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Request permission for high-risk work activities.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hse/jsa" className="group">
            <Card className="h-full hover:shadow-md transition-all border-slate-100 hover:border-[#bfdbfe] group-hover:bg-[#f8fafc] rounded-2xl">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb] group-hover:bg-[#dbeafe] transition-colors">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1.5">
                    Create JSA/HIRA
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Conduct a Job Safety Analysis or Risk Assessment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hse" className="group">
            <Card className="h-full hover:shadow-md transition-all border-slate-100 hover:border-[#bfdbfe] group-hover:bg-[#f8fafc] rounded-2xl">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#eff6ff] flex items-center justify-center text-[#2563eb] group-hover:bg-[#dbeafe] transition-colors">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1.5">
                    View My Certificate
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Access and download your valid HSE credentials.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
