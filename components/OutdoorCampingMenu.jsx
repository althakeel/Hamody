'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildCategoryUrl } from '@/lib/categorySlug'

function labelOf(item, isArabic) {
  if (isArabic && item.titleAr) return item.titleAr
  return item.title || item.name
}

const OUTDOOR_CAMPING = {
  title: 'Outdoor & Camping',
  titleAr: 'الهواء الطلق والتخييم',
  slug: 'outdoor-camping',
  groups: [
    {
      title: 'Camping',
      titleAr: 'التخييم',
      slug: 'camping',
      children: [
        { title: 'Camping Furniture', titleAr: 'أثاث التخييم', slug: 'camping-furniture' },
        { title: 'Camping Kitchen', titleAr: 'مطبخ التخييم', slug: 'camping-kitchen' },
        { title: 'Camping Personal Care', titleAr: 'العناية الشخصية للتخييم', slug: 'camping-personal-care' },
        { title: 'Camping Storage', titleAr: 'تخزين التخييم', slug: 'camping-storage' },
        { title: 'Camping Tent', titleAr: 'خيام التخييم', slug: 'camping-tent' },
        { title: 'Camping Tools', titleAr: 'أدوات التخييم', slug: 'camping-tools' },
      ],
    },
    {
      title: 'Outdoor',
      titleAr: 'الهواء الطلق',
      slug: 'outdoor',
      children: [
        { title: 'Lights & Lantern', titleAr: 'أضواء وفوانيس', slug: 'lights-lantern' },
        { title: 'Power Stations', titleAr: 'محطات الطاقة', slug: 'power-stations' },
      ],
    },
  ],
}

const TRADITIONAL = {
  title: 'Traditional',
  titleAr: 'تقليدي',
  slug: 'traditional',
  groups: [
    {
      title: 'Tabletop Sculptures',
      titleAr: 'منحوتات الطاولة',
      slug: 'tabletop-sculptures',
      children: [
        { title: 'Angel Wings', titleAr: 'أجنحة الملاك', slug: 'angel-wings' },
        { title: 'Apple Branch', titleAr: 'غصن التفاح', slug: 'apple-branch' },
        { title: 'Arch Marble', titleAr: 'القوس الرخامي', slug: 'arch-marble' },
        { title: 'Birds Branch', titleAr: 'طيور على غصن', slug: 'birds-branch' },
      ],
    },
  ],
}

function withCategoryLinks(item) {
  return {
    ...item,
    href: buildCategoryUrl([{ slug: item.slug }]),
    groups: item.groups.map((group) => ({
      ...group,
      href: buildCategoryUrl([{ slug: item.slug }, { slug: group.slug }]),
      children: group.children.map((child) => ({
        ...child,
        href: buildCategoryUrl([{ slug: item.slug }, { slug: group.slug }, { slug: child.slug }]),
      })),
    })),
  }
}

const MENU_ITEMS = [TRADITIONAL, OUTDOOR_CAMPING].map(withCategoryLinks)

export default function OutdoorCampingMenu({ isArabic = false, onNavigate }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = MENU_ITEMS[activeIndex] || MENU_ITEMS[0]
  const Chevron = isArabic ? ChevronLeft : ChevronRight

  if (!active) return null

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className="flex min-h-[460px] w-[min(920px,calc(100vw-32px))] items-stretch overflow-hidden rounded-lg bg-white shadow-[0_12px_40px_rgba(15,23,42,0.14)]"
    >
      <nav
        aria-label={isArabic ? 'الفئات' : 'Categories'}
        className="flex w-[248px] shrink-0 flex-col border-e border-[#ededed] py-2"
      >
        {MENU_ITEMS.map((item, index) => {
          const selected = index === activeIndex
          return (
            <Link
              key={item.slug}
              href={item.href}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={onNavigate}
              className={`flex items-center justify-between gap-3 px-5 py-3 text-start text-[14px] leading-5 text-[#1a1a1a] ${
                selected ? 'bg-[#f4f4f4] font-semibold' : 'font-medium hover:bg-[#fafafa]'
              }`}
            >
              <span className="min-w-0 truncate">{labelOf(item, isArabic)}</span>
              <Chevron size={16} strokeWidth={1.75} className="shrink-0 text-[#9ca3af]" />
            </Link>
          )
        })}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col px-8 pb-8 pt-6">
        <div className="flex items-center justify-between gap-6 border-b border-[#ededed] pb-4">
          <h2 className="min-w-0 truncate text-[22px] font-bold leading-none text-[#111111]">
            {labelOf(active, isArabic)}
          </h2>
          <Link
            href={active.href}
            onClick={onNavigate}
            className="shrink-0 text-[13px] font-bold uppercase tracking-wide text-[#9C6E20] hover:text-[#7d5818]"
          >
            {isArabic ? 'عرض الكل' : 'VIEW ALL'}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-14 gap-y-8 pt-6">
          {active.groups.map((group) => (
            <div key={group.slug} className="min-w-0">
              <Link
                href={group.href}
                onClick={onNavigate}
                className="block text-[15px] font-bold leading-5 text-[#111111] hover:text-[#1F5C4A]"
              >
                {labelOf(group, isArabic)}
              </Link>
              <div className="mt-3 space-y-2">
                {group.children.map((child) => (
                  <Link
                    key={child.slug}
                    href={child.href}
                    onClick={onNavigate}
                    className="block truncate text-[14px] leading-5 text-[#5c6370] hover:text-[#111111]"
                  >
                    {labelOf(child, isArabic)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
