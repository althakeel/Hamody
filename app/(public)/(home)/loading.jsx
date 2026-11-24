import {
  HomeBannerSkeleton,
  HomeCategoryStripSkeleton,
  HomeProductGridSkeleton,
} from '@/components/home/HomeSectionSkeletons';

export default function HomeLoading() {
  return (
    <div className="bg-white pb-8">
      <div className="h-[100px] animate-pulse bg-slate-100 sm:h-[320px]" />
      <div className="mx-auto mt-6 max-w-[1400px] px-4 sm:px-6">
        <HomeCategoryStripSkeleton embedded />
      </div>
      <div className="mt-6 space-y-6">
        <HomeProductGridSkeleton count={4} />
        <HomeBannerSkeleton />
      </div>
    </div>
  );
}
