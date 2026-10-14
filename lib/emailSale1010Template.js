import { getCustomerSiteUrl } from '@/lib/appUrl';
import { getBusinessAddressSingleLine } from '@/lib/businessIdentity';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { getProductAbsoluteUrl } from '@/lib/productUrl';

const PURPLE = '#6d4cc4';
const INK = '#3b2468';
const FONT = 'Montserrat, Arial, Helvetica, sans-serif';

/** The eight picks from the 10.10 sale email, in display order. */
export const SALE_1010_PICKS = [
  { id: '6ac5f53aa3785519be65a756', category: 'GAMING' },
  { id: '6abe0211e0a02c63cb189bfc', category: 'KITCHEN' },
  { id: '6abdf340e0a02c63cb184710', category: 'BEAUTY' },
  { id: '6ac3a36bdcaed03913b6d935', category: 'OUTDOOR' },
  { id: '6abe0cbee0a02c63cb18d34e', category: 'BABY & KIDS' },
  { id: '6abd1595e0a02c63cb170666', category: 'TRAVEL' },
  { id: '6ab67ca9f27ab0db7cafe209', category: 'CAR ESSENTIALS' },
  { id: '6abd1d23e0a02c63cb172a52', category: 'PETS' },
];

export function sale1010ProductIds() {
  return SALE_1010_PICKS.map((pick) => pick.id);
}

export function orderSale1010Products(products = []) {
  const byId = new Map();
  (Array.isArray(products) ? products : []).forEach((product) => {
    const id = String(product?.id || product?._id || '').trim();
    if (id) byId.set(id, product);
  });
  return SALE_1010_PICKS.map((pick) => {
    const product = byId.get(pick.id);
    if (!product) return null;
    return { ...product, categoryLabel: pick.category };
  }).filter(Boolean);
}

function siteUrl() {
  return String(getCustomerSiteUrl() || 'https://www.store1920.com').replace(/\/$/, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAed(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  const rounded = Math.round(amount * 100) / 100;
  return `AED ${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`;
}

function productImage(product, origin) {
  const raw = getProductThumbnailUrl(product, { allowVideo: false })
    || product?.image
    || (Array.isArray(product?.images) ? product.images[0] : '')
    || '';
  const src = String(raw || '').trim();
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/')) return `${origin}${src}`;
  return src;
}

function productHref(product, origin) {
  const href = String(product?.href || '').trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${origin}${href}`;
  return getProductAbsoluteUrl(product, origin);
}

function renderProductCard(product, origin) {
  const name = escapeHtml(product?.name || 'Product');
  const price = formatAed(product?.price);
  const category = escapeHtml(product?.categoryLabel || product?.categoryName || product?.category || '');
  const image = productImage(product, origin);
  const href = escapeHtml(productHref(product, origin));
  const imageHtml = image
    ? `<img src="${escapeHtml(image)}" alt="${name}" width="240" height="150" style="display:block;width:100%;max-width:240px;height:150px;object-fit:contain;border:0;background:#ffffff;" />`
    : '<div style="height:150px;background:#f8fafc;"></div>';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#ffffff;border-radius:16px;">
      <tr>
        <td align="center" style="padding:14px 12px 4px;background:#ffffff;border-radius:16px 16px 0 0;">
          <a href="${href}" style="text-decoration:none;">${imageHtml}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 14px 0;font-family:${FONT};font-size:11px;line-height:1.2;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#7c6aa8;">
          ${category}
        </td>
      </tr>
      <tr>
        <td style="padding:4px 14px 0;font-family:${FONT};font-size:14px;line-height:1.3;font-weight:800;color:#1e1633;height:54px;vertical-align:top;">
          <a href="${href}" style="color:#1e1633;text-decoration:none;">${name}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:2px 14px 0;font-family:${FONT};font-size:11px;line-height:1.3;color:#8b849c;">
          Website price before coupon
        </td>
      </tr>
      <tr>
        <td style="padding:6px 14px 0;font-family:${FONT};font-size:16px;font-weight:800;color:#111827;">
          ${escapeHtml(price)}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 14px 16px;">
          <a href="${href}" style="display:block;background:${PURPLE};color:#ffffff;text-decoration:none;text-align:center;font-family:${FONT};font-size:13px;font-weight:800;letter-spacing:0.4px;line-height:40px;border-radius:10px;">SHOP NOW</a>
        </td>
      </tr>
    </table>
  `;
}

export function renderSale1010ProductGrid(products = [], origin = siteUrl()) {
  const pinned = orderSale1010Products(products);
  const list = (pinned.length ? pinned : (Array.isArray(products) ? products : []))
    .filter((product) => product?.name || product?.image)
    .slice(0, 8);
  if (!list.length) {
    return `<p style="margin:0;padding:24px;text-align:center;font-family:${FONT};font-size:14px;color:${INK};">Store products will appear here.</p>`;
  }

  const rows = [];
  for (let index = 0; index < list.length; index += 2) {
    const left = renderProductCard(list[index], origin);
    const right = list[index + 1] ? renderProductCard(list[index + 1], origin) : '';
    rows.push(`
      <tr>
        <td width="50%" valign="top" style="width:50%;padding:8px;">${left}</td>
        <td width="50%" valign="top" style="width:50%;padding:8px;">${right}</td>
      </tr>
    `);
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;">
      <tr>
        <td align="center" style="background:#ffffff;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="sale1010-shell" style="width:100%;max-width:600px;margin:0 auto;border-collapse:separate;background:#e6def8;">
            ${rows.join('')}
            <tr>
              <td colspan="2" style="padding:8px 16px 0;text-align:center;font-family:${FONT};font-size:12px;line-height:1.45;color:#6b6280;">
                Code SALE10 is not applied automatically. Apply your 10% manually.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function applySale1010Placeholders(html = '', { products = [], recipientEmail = '' } = {}) {
  const source = String(html || '');
  if (!source.includes('{{PRODUCT_GRID}}') && !source.includes('{{SITE_URL}}') && !source.includes('{{UNSUBSCRIBE_URL}}')) {
    return source;
  }
  const origin = siteUrl();
  const email = String(recipientEmail || '').trim();
  const unsubscribe = email
    ? `${origin}/unsubscribe?unsubscribe=promotional&email=${encodeURIComponent(email)}`
    : `${origin}/unsubscribe?unsubscribe=promotional`;

  return source
    .replaceAll('{{PRODUCT_GRID}}', renderSale1010ProductGrid(products, origin))
    .replaceAll('{{SITE_URL}}', origin)
    .replaceAll('{{SALE_URL}}', `${origin}/c/10-10-sale`)
    .replaceAll('{{SHOP_URL}}', `${origin}/shop`)
    .replaceAll('{{TRACK_URL}}', `${origin}/track-order`)
    .replaceAll('{{RETURNS_URL}}', `${origin}/return-policy`)
    .replaceAll('{{CONTACT_URL}}', `${origin}/contact`)
    .replaceAll('{{UNSUBSCRIBE_URL}}', unsubscribe)
    .replaceAll('{{ADDRESS_LINE}}', escapeHtml(getBusinessAddressSingleLine()))
    .replaceAll('{{YEAR}}', String(new Date().getFullYear()));
}

export const SALE_1010_MJML = `<mjml>
  <mj-head>
    <mj-title>10.10 SALE — Get 10% off</mj-title>
    <mj-preview>10.10 SALE. Get 10% off with code SALE10.</mj-preview>
    <mj-font name="Montserrat" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" />
    <mj-attributes>
      <mj-all font-family="Montserrat, Arial, Helvetica, sans-serif" />
      <mj-text color="#3b2468" font-family="Montserrat, Arial, Helvetica, sans-serif" />
      <mj-button font-family="Montserrat, Arial, Helvetica, sans-serif" />
    </mj-attributes>
    <mj-style>
      img { max-width: 100%; height: auto; }
      .sale1010-shell { max-width: 600px !important; margin: 0 auto !important; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#ffffff" width="600px">
    <mj-section background-color="#4c1d95" padding="16px 20px">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="15px" font-weight="800" font-family="Montserrat, Arial, Helvetica, sans-serif" letter-spacing="0.8px" padding="0">
          ONE CODE. ALL AVAILABLE PRODUCTS.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff" padding="14px 22px">
      <mj-group>
        <mj-column width="38%" vertical-align="middle">
          <mj-image
            src="{{SITE_URL}}/logo/Store1920.png"
            alt="store 1920"
            width="72px"
            align="left"
            href="{{SITE_URL}}"
            padding="0"
          />
        </mj-column>
        <mj-column width="62%" vertical-align="middle">
          <mj-text align="right" font-size="14px" font-weight="800" font-family="Montserrat, Arial, Helvetica, sans-serif" color="#5b2d9a" letter-spacing="0.4px" padding="0">
            <a href="{{SHOP_URL}}" style="color:#5b2d9a;text-decoration:none;font-weight:800;font-family:Montserrat, Arial, Helvetica, sans-serif;">SHOP ALL</a>
            <span style="color:#c4b5fd;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
            <a href="{{SITE_URL}}/new" style="color:#5b2d9a;text-decoration:none;font-weight:800;font-family:Montserrat, Arial, Helvetica, sans-serif;">NEW ARRIVALS</a>
          </mj-text>
        </mj-column>
      </mj-group>
    </mj-section>

    <mj-section background-color="#e6def8" padding="0">
      <mj-column padding="0">
        <mj-image
          src="https://store1920-images.s3.ap-south-1.amazonaws.com/products/email-marketing_1791546335494_1010-sale-banner.png"
          alt="10.10 SALE. Get 10% off. Use code SALE10 at checkout."
          href="{{SALE_URL}}"
          width="600px"
          padding="0"
          fluid-on-mobile="true"
        />
      </mj-column>
    </mj-section>

    <mj-section background-color="#e6def8" padding="28px 36px 0">
      <mj-column>
        <mj-text align="center" font-size="28px" font-weight="800" line-height="1.2" color="#3b1d6e" font-family="Montserrat, Arial, Helvetica, sans-serif" padding="0">
          Your next find.<br/>Now 10% less.
        </mj-text>
        <mj-text align="center" font-size="16px" font-weight="600" color="#5b4a86" font-family="Montserrat, Arial, Helvetica, sans-serif" padding="12px 0 0">
          Don't miss your favorites.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-raw>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="sale1010-shell" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#e6def8;">
        <tr>
          <td align="center" style="padding:18px 24px 6px;background:#e6def8;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#ffffff;border:2px solid #6d4cc4;border-radius:14px;">
              <tr>
                <td align="center" style="padding:16px 56px;font-family:Montserrat, Arial, Helvetica, sans-serif;font-size:28px;line-height:1;font-weight:800;letter-spacing:1.5px;color:#5b2d9a;">
                  SALE10
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:12px 24px 8px;font-family:Montserrat, Arial, Helvetica, sans-serif;font-size:15px;line-height:1.4;font-weight:600;color:#3b2468;background:#e6def8;">
            Use code SALE10 at checkout.
          </td>
        </tr>
      </table>
    </mj-raw>

    <mj-section background-color="#e6def8" padding="26px 24px 6px">
      <mj-column>
        <mj-text align="center" font-size="20px" font-weight="800" color="#3b1d6e" padding="0">
          8 picks across the store.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-raw>{{PRODUCT_GRID}}</mj-raw>

    <mj-section background-color="#e6def8" padding="28px 24px 8px">
      <mj-column>
        <mj-text align="center" font-size="22px" font-weight="800" color="#3b1d6e" padding="0">
          Your whole store. Your choice.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#e6def8" padding="8px 12px 0">
      <mj-column>
        <mj-button href="{{SALE_URL}}" background-color="transparent" color="#5b2d9a" font-size="12px" font-weight="800" border="2px solid #6d4cc4" border-radius="12px" inner-padding="12px 10px">
          SHOP 10.10 SALE
        </mj-button>
      </mj-column>
      <mj-column>
        <mj-button href="{{SHOP_URL}}" background-color="transparent" color="#5b2d9a" font-size="12px" font-weight="800" border="2px solid #6d4cc4" border-radius="12px" inner-padding="12px 10px">
          SHOP BY CATEGORY
        </mj-button>
      </mj-column>
      <mj-column>
        <mj-button href="{{SALE_URL}}" background-color="transparent" color="#5b2d9a" font-size="12px" font-weight="800" border="2px solid #6d4cc4" border-radius="12px" inner-padding="12px 10px">
          SEE SELECTED FOR YOU
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section background-color="#e6def8" padding="28px 24px 8px">
      <mj-column>
        <mj-text align="center" font-size="20px" font-weight="800" color="#3b1d6e" padding="0">
          Found something you love?
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#e6def8" padding="8px 24px 28px">
      <mj-column>
        <mj-button href="{{SITE_URL}}" background-color="#6d4cc4" color="#ffffff" font-size="13px" font-weight="800" letter-spacing="0.6px" border-radius="12px" inner-padding="14px 28px">
          FIND IT ON OUR WEBSITE
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section background-color="#3b1d6e" padding="28px 18px 8px">
      <mj-column>
        <mj-text align="center" font-size="12px" font-weight="800" letter-spacing="1px" color="#ffffff" padding="0 0 8px">
          SHOP NOW
        </mj-text>
        <mj-text align="center" font-size="13px" color="#e9d5ff" padding="0">
          <a href="{{SITE_URL}}" style="color:#ffffff;text-decoration:none;">Shop</a>
        </mj-text>
      </mj-column>
      <mj-column>
        <mj-text align="center" font-size="12px" font-weight="800" letter-spacing="1px" color="#ffffff" padding="0 0 8px">
          HELP
        </mj-text>
        <mj-text align="center" font-size="13px" color="#e9d5ff" line-height="1.8" padding="0">
          <a href="{{TRACK_URL}}" style="color:#ffffff;text-decoration:none;">Track order</a><br/>
          <a href="{{RETURNS_URL}}" style="color:#ffffff;text-decoration:none;">Returns</a><br/>
          <a href="{{CONTACT_URL}}" style="color:#ffffff;text-decoration:none;">Contact</a>
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#3b1d6e" padding="8px 24px 28px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#d8b4fe" line-height="1.6" padding="0">
          <a href="{{UNSUBSCRIBE_URL}}" style="color:#e9d5ff;text-decoration:underline;">Unsubscribe</a><br/>
          {{ADDRESS_LINE}}<br/>
          © {{YEAR}} Store1920
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
