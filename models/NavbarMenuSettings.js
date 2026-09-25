import mongoose from 'mongoose';

const NavbarMenuSettingsSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    logoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    logoWidth: {
      type: Number,
    },
    logoHeight: {
      type: Number,
    },
    footerLogoSameAsNavbar: {
      type: Boolean,
      default: true,
    },
    footerLogoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    footerLogoWidth: {
      type: Number,
      default: 160,
    },
    footerLogoHeight: {
      type: Number,
      default: 40,
    },
    backgroundColor: {
      type: String,
      default: '#8f3404',
      trim: true,
    },
    navMenuEnabled: {
      type: Boolean,
      default: true,
    },
    navMenuUseParentCategories: {
      type: Boolean,
      default: false,
    },
    navMenuHoverDropdown: {
      type: Boolean,
      default: true,
    },
    bnplTopBar: {
      enabled: { type: Boolean, default: true },
      tamaraEnabled: { type: Boolean, default: true },
      tabbyEnabled: { type: Boolean, default: false },
      tamaraPayments: { type: Number, default: 4 },
      tabbyPayments: { type: Number, default: 4 },
      tamaraText: { type: String, default: '', trim: true },
      tamaraTextAr: { type: String, default: '', trim: true },
      tabbyText: { type: String, default: '', trim: true },
      tabbyTextAr: { type: String, default: '', trim: true },
      fontSize: { type: Number, default: 14 },
      minHeight: { type: Number, default: 40 },
    },
    navActionsVisibility: {
      store: { type: Boolean, default: true },
      orders: { type: Boolean, default: true },
      wishlist: { type: Boolean, default: true },
      cart: { type: Boolean, default: true },
      phone: { type: Boolean, default: true },
      language: { type: Boolean, default: true },
    },
    navbarPhone: {
      number: { type: String, default: '8007861920', trim: true },
      shortText: { type: String, default: '', trim: true },
      label: { type: String, default: 'Toll-free', trim: true },
      labelAr: { type: String, default: 'مجاني', trim: true },
    },
    navbarLanguage: {
      flagCode: { type: String, default: 'auto', trim: true },
      iconUrl: { type: String, default: '', trim: true },
    },
    navMenuStyle: {
      barBackgroundColor: { type: String, default: '#000000', trim: true },
      categoryBarBackgroundColor: { type: String, default: '#000000', trim: true },
      barTextColor: { type: String, default: '#334155', trim: true },
      barHoverBackgroundColor: { type: String, default: '#f1f5f9', trim: true },
      dropdownBackgroundColor: { type: String, default: '#ffffff', trim: true },
      dropdownTextColor: { type: String, default: '#334155', trim: true },
      dropdownMutedTextColor: { type: String, default: '#64748b', trim: true },
      dropdownBorderColor: { type: String, default: '#e2e8f0', trim: true },
      showBottomBorder: { type: Boolean, default: false },
      bottomBorderWidth: { type: Number, default: 2 },
      bottomBorderColor: { type: String, default: '#e2e8f0', trim: true },
    },
    navMenuItems: [
      {
        name: { type: String, default: '' },
        link: { type: String, default: '' },
        icon: { type: String, default: '' },
        hasDropdown: { type: Boolean, default: false },
        categoryId: { type: String, default: '' },
        megaMenu: {
          linkColumns: { type: Number, default: 1 },
          manualLinks: { type: Boolean, default: false },
          links: [
            {
              name: { type: String, default: '' },
              link: { type: String, default: '' },
              categoryId: { type: String, default: '' },
              slug: { type: String, default: '' },
              children: [
                {
                  name: { type: String, default: '' },
                  link: { type: String, default: '' },
                  categoryId: { type: String, default: '' },
                  slug: { type: String, default: '' },
                },
              ],
            },
          ],
          images: [
            {
              url: { type: String, default: '' },
              label: { type: String, default: '' },
              link: { type: String, default: '' },
            },
          ],
        },
      },
    ],
    navExtraButtons: [
      {
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        labelAr: { type: String, default: '' },
        link: { type: String, default: '/offers' },
        enabled: { type: Boolean, default: true },
        style: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
    searchMaxWidth: {
      type: Number,
      default: 600,
    },
    searchAlign: {
      type: String,
      default: 'left',
      trim: true,
    },
    searchPlaceholder: {
      type: String,
      default: '',
      trim: true,
    },
    searchPlaceholderAr: {
      type: String,
      default: '',
      trim: true,
    },
    searchStyle: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    navbarMaxWidth: {
      type: Number,
      default: 1400,
    },
    itemGap: {
      type: Number,
      default: 12,
    },
    logoGap: {
      type: Number,
      default: 16,
    },
    mobileItemGap: {
      type: Number,
      default: 4,
    },
    stickyHeader: {
      type: Boolean,
      default: false,
    },
    showCategoriesButton: {
      type: Boolean,
      default: true,
    },
    categoriesButtonLabel: {
      type: String,
      default: '',
      trim: true,
    },
    categoriesButtonLabelAr: {
      type: String,
      default: '',
      trim: true,
    },
    categoriesButtonStyle: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    navbarItemOrder: {
      type: [String],
      default: [],
    },
    navbarItemAlign: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    unifyNavbarText: {
      type: Boolean,
      default: false,
    },
    unifiedTextFontFamily: {
      type: String,
      default: 'inherit',
      trim: true,
    },
    unifiedTextFontSize: {
      type: Number,
      default: 13,
    },
    items: [
      {
        label: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        categoryId: {
          type: String,
          required: false,
        },
      },
    ],
  },
  { timestamps: true }
);

const NavbarMenuSettingsModel = mongoose.models.NavbarMenuSettings ||
  mongoose.model('NavbarMenuSettings', NavbarMenuSettingsSchema);

// In Next.js dev hot-reload, a cached model may have been compiled before
// new fields were added. Ensure required paths exist on the cached schema.
if (!NavbarMenuSettingsModel.schema.path('logoWidth')) {
  NavbarMenuSettingsModel.schema.add({
    logoWidth: {
      type: Number,
    },
  });
}

if (!NavbarMenuSettingsModel.schema.path('logoHeight')) {
  NavbarMenuSettingsModel.schema.add({
    logoHeight: {
      type: Number,
    },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navMenuEnabled')) {
  NavbarMenuSettingsModel.schema.add({
    navMenuEnabled: {
      type: Boolean,
      default: true,
    },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navActionsVisibility')) {
  NavbarMenuSettingsModel.schema.add({
    navActionsVisibility: {
      store: { type: Boolean, default: true },
      orders: { type: Boolean, default: true },
      wishlist: { type: Boolean, default: true },
      cart: { type: Boolean, default: true },
      phone: { type: Boolean, default: true },
      language: { type: Boolean, default: true },
    },
  });
}

const navActionsVisibilitySchema = NavbarMenuSettingsModel.schema.path('navActionsVisibility')?.schema;
if (navActionsVisibilitySchema && !navActionsVisibilitySchema.path('phone')) {
  navActionsVisibilitySchema.add({
    phone: { type: Boolean, default: true },
    language: { type: Boolean, default: true },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navbarPhone')) {
  NavbarMenuSettingsModel.schema.add({
    navbarPhone: {
      number: { type: String, default: '8007861920', trim: true },
      shortText: { type: String, default: '', trim: true },
      label: { type: String, default: 'Toll-free', trim: true },
      labelAr: { type: String, default: 'مجاني', trim: true },
    },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navbarLanguage')) {
  NavbarMenuSettingsModel.schema.add({
    navbarLanguage: {
      flagCode: { type: String, default: 'auto', trim: true },
      iconUrl: { type: String, default: '', trim: true },
    },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navMenuItems')) {
  NavbarMenuSettingsModel.schema.add({
    navMenuItems: [
      {
        name: { type: String, default: '' },
        link: { type: String, default: '' },
        icon: { type: String, default: '' },
        hasDropdown: { type: Boolean, default: false },
        categoryId: { type: String, default: '' },
        megaMenu: {
          linkColumns: { type: Number, default: 1 },
          manualLinks: { type: Boolean, default: false },
          links: [
            {
              name: { type: String, default: '' },
              link: { type: String, default: '' },
              categoryId: { type: String, default: '' },
              slug: { type: String, default: '' },
              children: [
                {
                  name: { type: String, default: '' },
                  link: { type: String, default: '' },
                  categoryId: { type: String, default: '' },
                  slug: { type: String, default: '' },
                },
              ],
            },
          ],
          images: [
            {
              url: { type: String, default: '' },
              label: { type: String, default: '' },
              link: { type: String, default: '' },
            },
          ],
        },
      },
    ],
  });
}

if (!NavbarMenuSettingsModel.schema.path('navMenuStyle')) {
  NavbarMenuSettingsModel.schema.add({
    navMenuStyle: {
      barBackgroundColor: { type: String, default: '#000000', trim: true },
      categoryBarBackgroundColor: { type: String, default: '#000000', trim: true },
      barTextColor: { type: String, default: '#334155', trim: true },
      barHoverBackgroundColor: { type: String, default: '#f1f5f9', trim: true },
      dropdownBackgroundColor: { type: String, default: '#ffffff', trim: true },
      dropdownTextColor: { type: String, default: '#334155', trim: true },
      dropdownMutedTextColor: { type: String, default: '#64748b', trim: true },
      dropdownBorderColor: { type: String, default: '#e2e8f0', trim: true },
      showBottomBorder: { type: Boolean, default: false },
      bottomBorderWidth: { type: Number, default: 2 },
      bottomBorderColor: { type: String, default: '#e2e8f0', trim: true },
    },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navMenuStyle.categoryBarBackgroundColor')) {
  NavbarMenuSettingsModel.schema.add({
    'navMenuStyle.categoryBarBackgroundColor': { type: String, default: '#000000', trim: true },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navMenuStyle.showBottomBorder')) {
  NavbarMenuSettingsModel.schema.add({
    'navMenuStyle.showBottomBorder': { type: Boolean, default: false },
    'navMenuStyle.bottomBorderWidth': { type: Number, default: 2 },
    'navMenuStyle.bottomBorderColor': { type: String, default: '#e2e8f0', trim: true },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navMenuUseParentCategories')) {
  NavbarMenuSettingsModel.schema.add({
    navMenuUseParentCategories: {
      type: Boolean,
      default: false,
    },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navMenuHoverDropdown')) {
  NavbarMenuSettingsModel.schema.add({
    navMenuHoverDropdown: {
      type: Boolean,
      default: true,
    },
  });
}

if (!NavbarMenuSettingsModel.schema.path('bnplTopBar')) {
  NavbarMenuSettingsModel.schema.add({
    bnplTopBar: {
      enabled: { type: Boolean, default: true },
      tamaraEnabled: { type: Boolean, default: true },
      tabbyEnabled: { type: Boolean, default: false },
      tamaraPayments: { type: Number, default: 4 },
      tabbyPayments: { type: Number, default: 4 },
      tamaraText: { type: String, default: '', trim: true },
      tamaraTextAr: { type: String, default: '', trim: true },
      tabbyText: { type: String, default: '', trim: true },
      tabbyTextAr: { type: String, default: '', trim: true },
      fontSize: { type: Number, default: 14 },
      minHeight: { type: Number, default: 40 },
    },
  });
}

const bnplTopBarPath = NavbarMenuSettingsModel.schema.path('bnplTopBar');
if (bnplTopBarPath?.schema && !bnplTopBarPath.schema.path('fontSize')) {
  bnplTopBarPath.schema.add({
    fontSize: { type: Number, default: 14 },
    minHeight: { type: Number, default: 40 },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navMenuItems.megaMenu.manualLinks')) {
  NavbarMenuSettingsModel.schema.add({
    'navMenuItems.megaMenu.manualLinks': { type: Boolean, default: false },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navExtraButtons')) {
  NavbarMenuSettingsModel.schema.add({
    navExtraButtons: [
      {
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        labelAr: { type: String, default: '' },
        link: { type: String, default: '/offers' },
        enabled: { type: Boolean, default: true },
        style: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],
    searchMaxWidth: { type: Number, default: 600 },
    searchPlaceholder: { type: String, default: '', trim: true },
    searchPlaceholderAr: { type: String, default: '', trim: true },
    searchStyle: { type: mongoose.Schema.Types.Mixed, default: {} },
    navbarMaxWidth: { type: Number, default: 1400 },
    itemGap: { type: Number, default: 12 },
    mobileItemGap: { type: Number, default: 4 },
    stickyHeader: { type: Boolean, default: false },
  });
}

const extraButtonsPath = NavbarMenuSettingsModel.schema.path('navExtraButtons');
if (extraButtonsPath?.schema && !extraButtonsPath.schema.path('style')) {
  extraButtonsPath.schema.add({
    style: { type: mongoose.Schema.Types.Mixed, default: {} },
  });
}

if (!NavbarMenuSettingsModel.schema.path('stickyHeader')) {
  NavbarMenuSettingsModel.schema.add({
    stickyHeader: { type: Boolean, default: false },
  });
}

if (!NavbarMenuSettingsModel.schema.path('showCategoriesButton')) {
  NavbarMenuSettingsModel.schema.add({
    showCategoriesButton: { type: Boolean, default: true },
    categoriesButtonLabel: { type: String, default: '', trim: true },
    categoriesButtonLabelAr: { type: String, default: '', trim: true },
    categoriesButtonStyle: { type: mongoose.Schema.Types.Mixed, default: {} },
  });
}

if (!NavbarMenuSettingsModel.schema.path('categoriesButtonStyle')) {
  NavbarMenuSettingsModel.schema.add({
    categoriesButtonStyle: { type: mongoose.Schema.Types.Mixed, default: {} },
  });
}

if (!NavbarMenuSettingsModel.schema.path('unifyNavbarText')) {
  NavbarMenuSettingsModel.schema.add({
    unifyNavbarText: { type: Boolean, default: false },
    unifiedTextFontFamily: { type: String, default: 'inherit', trim: true },
    unifiedTextFontSize: { type: Number, default: 13 },
  });
}

if (!NavbarMenuSettingsModel.schema.path('searchStyle')) {
  NavbarMenuSettingsModel.schema.add({
    searchStyle: { type: mongoose.Schema.Types.Mixed, default: {} },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navbarItemOrder')) {
  NavbarMenuSettingsModel.schema.add({
    navbarItemOrder: { type: [String], default: [] },
  });
}

if (!NavbarMenuSettingsModel.schema.path('navbarItemAlign')) {
  NavbarMenuSettingsModel.schema.add({
    navbarItemAlign: { type: mongoose.Schema.Types.Mixed, default: {} },
  });
}

if (!NavbarMenuSettingsModel.schema.path('itemGap')) {
  NavbarMenuSettingsModel.schema.add({
    itemGap: { type: Number, default: 12 },
  });
}

if (!NavbarMenuSettingsModel.schema.path('mobileItemGap')) {
  NavbarMenuSettingsModel.schema.add({
    mobileItemGap: { type: Number, default: 4 },
  });
}

if (!NavbarMenuSettingsModel.schema.path('searchAlign')) {
  NavbarMenuSettingsModel.schema.add({
    searchAlign: { type: String, default: 'left', trim: true },
  });
}

if (!NavbarMenuSettingsModel.schema.path('logoGap')) {
  NavbarMenuSettingsModel.schema.add({
    logoGap: { type: Number, default: 16 },
  });
}

if (!NavbarMenuSettingsModel.schema.path('footerLogoSameAsNavbar')) {
  NavbarMenuSettingsModel.schema.add({
    footerLogoSameAsNavbar: { type: Boolean, default: true },
    footerLogoUrl: { type: String, default: '', trim: true },
    footerLogoWidth: { type: Number, default: 160 },
    footerLogoHeight: { type: Number, default: 40 },
  });
}

export default NavbarMenuSettingsModel;
