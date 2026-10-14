import { slugifyCategory } from '@/lib/categorySlug';

export function categorySliderSlugFromTitle(title) {
  const prepared = String(title || '').replace(/[/_]+/g, ' ');
  return slugifyCategory(prepared) || 'slider';
}

export async function allocateCategorySliderSlug(Model, title, excludeId) {
  const base = categorySliderSlugFromTitle(title);
  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
  let slug = base;
  for (let attempt = 2; attempt < 40; attempt += 1) {
    const taken = await Model.exists({ slug, ...exclude });
    if (!taken) return slug;
    slug = `${base}-${attempt}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function ensureCategorySliderSlug(Model, slider) {
  const current = String(slider?.slug || '').trim();
  if (current) return current;
  const slug = await allocateCategorySliderSlug(Model, slider?.title, slider?._id);
  await Model.updateOne({ _id: slider._id }, { $set: { slug } });
  slider.slug = slug;
  return slug;
}

export function nextCategorySliderSlugAliases(currentSlug, aliases, nextSlug) {
  const previous = String(currentSlug || '').trim();
  const list = Array.isArray(aliases) ? aliases.map((item) => String(item || '').trim()) : [];
  if (previous && previous !== nextSlug) list.push(previous);
  return Array.from(new Set(list.filter((item) => item && item !== nextSlug))).slice(-8);
}
