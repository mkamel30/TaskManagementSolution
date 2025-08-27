import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getBakeryQuotaEditStatsToday,
  getBakeryQuotaEditStatsWeek,
  getBakeryQuotaEditStatsMonth,
  getBakeryQuotaEditStatsPerClientToday,
  getBakeryQuotaEditStatsPerClientYesterday, // New import
} from '@/api/bakery-quotas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Clock, TrendingUp, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const BakeryQuotaStats: React.FC = () => {
  const { data: todayEdits, isLoading: isLoadingToday } = useQuery({
    queryKey: ['bakeryQuotaStatsToday'],
    queryFn: getBakeryQuotaEditStatsToday,
  });

  const { data: weekEdits, isLoading: isLoadingWeek } = useQuery({
    queryKey: ['bakeryQuotaStatsWeek'],
    queryFn: getBakeryQuotaEditStatsWeek,
  });

  const { data: monthEdits, isLoading: isLoadingMonth } = useQuery({
    queryKey: ['bakeryQuotaStatsMonth'],
    queryFn: getBakeryQuotaEditStatsMonth,
  });

  const { data: perClientToday, isLoading: isLoadingPerClientToday } = useQuery({
    queryKey: ['bakeryQuotaStatsPerClientToday'],
    queryFn: getBakeryQuotaEditStatsPerClientToday,
  });

  const { data: perClientYesterday, isLoading: isLoadingPerClientYesterday } = useQuery({ // New query
    queryKey: ['bakeryQuotaStatsPerClientYesterday'],
    queryFn: getBakeryQuotaEditStatsPerClientYesterday,
  });

  // Calculate total edits yesterday for the card
  const totalYesterdayEdits = perClientYesterday?.reduce((sum, entry) => sum + entry.edit_count, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">تعديلات اليوم</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-right">
            {isLoadingToday ? <Skeleton className="h-6 w-1/2" /> : <div className="text-2xl font-bold">{todayEdits}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">تعديلات أمس</CardTitle> {/* New Card */}
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-right">
            {isLoadingPerClientYesterday ? <Skeleton className="h-6 w-1/2" /> : <div className="text-2xl font-bold">{totalYesterdayEdits}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">تعديلات هذا الأسبوع</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-right">
            {isLoadingWeek ? <Skeleton className="h-6 w-1/2" /> : <div className="text-2xl font-bold">{weekEdits}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-right">تعديلات هذا الشهر</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-right">
            {isLoadingMonth ? <Skeleton className="h-6 w-1/2" /> : <div className="text-2xl font-bold">{monthEdits}</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Use grid for side-by-side display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>تعديلات اليوم حسب العميل</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-right">
            {isLoadingPerClientToday ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : perClientToday && perClientToday.length > 0 ? (
              <ul className="space-y-2">
                {perClientToday.map((entry, index) => (
                  <li key={index} className="flex justify-between items-center text-sm">
                    <span>{entry.client_id}</span>
                    <span className="font-semibold">{entry.edit_count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">لا توجد تعديلات للعملاء اليوم.</p>
            )}
          </CardContent>
        </Card>

        <Card> {/* New Card for Yesterday's Edits per Client */}
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>تعديلات أمس حسب العميل</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-right">
            {isLoadingPerClientYesterday ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : perClientYesterday && perClientYesterday.length > 0 ? (
              <ul className="space-y-2">
                {perClientYesterday.map((entry, index) => (
                  <li key={index} className="flex justify-between items-center text-sm">
                    <span>{entry.client_id}</span>
                    <span className="font-semibold">{entry.edit_count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">لا توجد تعديلات للعملاء أمس.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};