'use client';

export default function CategoryBanner({
  desktopSrc = '',
  tabletSrc = '',
  mobileSrc = '',
  alt = '',
}) {
  const desktop = String(desktopSrc || '').trim();
  const tablet = String(tabletSrc || '').trim();
  const mobile = String(mobileSrc || '').trim();
  if (!desktop && !tablet && !mobile) return null;

  const desktopImage = desktop || tablet || mobile;
  const tabletImage = tablet || desktop || mobile;
  const mobileImage = mobile || tablet || desktop;

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 md:mb-5" aria-label={alt}>
      <img
        src={desktopImage}
        alt={alt}
        width={1440}
        height={320}
        className="hidden aspect-[1440/320] w-full object-cover object-center lg:block"
      />
      <img
        src={tabletImage}
        alt={alt}
        width={1024}
        height={320}
        className="hidden aspect-[1024/320] w-full object-cover object-center md:block lg:hidden"
      />
      <img
        src={mobileImage}
        alt={alt}
        width={768}
        height={280}
        className="block aspect-[768/280] w-full object-cover object-center md:hidden"
      />
    </section>
  );
}
