'use client'
import dynamic from 'next/dynamic';
import { OrderListSkeleton } from '@/components/home/HomeSectionSkeletons';

const OrdersClient = dynamic(() => import('./OrdersClient'), {
  ssr: false,
  loading: () => <OrderListSkeleton />,
});

export default function OrdersPage() {
  return <OrdersClient />;
}