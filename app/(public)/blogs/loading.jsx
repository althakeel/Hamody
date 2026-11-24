import { BlogListSkeleton } from '@/components/home/HomeSectionSkeletons';

export default function BlogsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-slate-200" />
      <BlogListSkeleton />
    </div>
  );
}
