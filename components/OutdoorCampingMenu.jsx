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
    <div className="flex items-stretch overflow-hidden rounded-[18px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
      <nav
        aria-label={isArabic ? 'الفئات' : 'Categories'}
        className="w-[232px] shrink-0 py-2"
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
              className={`flex items-center justify-between gap-3 px-4 py-[9px] text-start text-[13.5px] leading-5 ${
                selected ? 'font-semibold text-[#111111]' : 'font-medium text-[#3f3f46] hover:text-[#111111]'
              }`}
            >
              <span className="min-w-0 truncate">{labelOf(item, isArabic)}</span>
              <Chevron size={14} strokeWidth={1.75} className="shrink-0 text-[#a1a1aa]" />
            </Link>
          )
        })}
      </nav>

      <div className="w-[560px] max-w-[calc(100vw-280px)] px-6 pb-6 pt-4">
        <div className="flex justify-end">
          <Link
            href={active.href}
            onClick={onNavigate}
            className="shrink-0 text-[12px] font-semibold uppercase tracking-wide text-[#9C6E20]"
          >
            {isArabic ? 'عرض الكل' : 'VIEW ALL'}
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-10 gap-y-6">
          {active.groups.map((group) => (
            <div key={group.slug} className="min-w-0">
              <Link href={group.href} onClick={onNavigate} className="block text-[14px] font-bold leading-5 text-[#111111]">
                {labelOf(group, isArabic)}
              </Link>
              <div className="mt-2 space-y-1.5">
                {group.children.map((child) => (
                  <Link
                    key={child.slug}
                    href={child.href}
                    onClick={onNavigate}
                    className="block truncate text-[13px] leading-5 text-[#6b7280] hover:text-[#111111]"
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
