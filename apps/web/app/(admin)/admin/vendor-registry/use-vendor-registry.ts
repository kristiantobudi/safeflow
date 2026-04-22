import { useVendorsQuery } from '@/store/users/users-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export interface VendorProps {
  id: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string;
  vendorAddress: string;
  vendorLogo: string | null;
  vendorStatus: string;
  createdAt: string;
}

export const useVendorRegistry = () => {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [globalSearch, setGlobalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const router = useRouter();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  const { data, isLoading } = useVendorsQuery(
    pagination.pageIndex + 1,
    pagination.pageSize,
    debouncedSearch,
  );

  const totalVendors = data?.data?.stats?.total || 0;
  const activeVendors = data?.data?.stats?.active || 0;

  const memoizedData = useMemo(() => {
    if (!data) return [];
    return data.data?.vendors || data.vendors || [];
  }, [data]);

  const safeTotalPersonel = data?.data?.total || data?.vendors?.length || 0;

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Vendor ID copied to clipboard');
  };

  const safeTotalCount = data?.data?.total || 0;

  return {
    pagination,
    setPagination,
    globalSearch,
    setGlobalSearch,
    debouncedSearch,
    setDebouncedSearch,
    router,
    data,
    isLoading,
    totalVendors,
    activeVendors,
    memoizedData,
    safeTotalPersonel,
    handleCopyId,
    safeTotalCount,
  };
};
