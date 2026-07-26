export type EmailBlockType =
  | "header"
  | "image"
  | "heading"
  | "text"
  | "discount"
  | "button"
  | "spacer"
  | "divider"
  | "footer";

type BlockBase = { id: string };

export type HeaderBlock = BlockBase & {
  type: "header";
  brandName: string;
  /** Letter “A” fallback when no logo is set */
  showMark: boolean;
  /** Uploaded brand logo URL (preferred over the letter mark) */
  logoUrl?: string;
};

export type ImageBlock = BlockBase & {
  type: "image";
  src: string;
  alt: string;
  /** Optional click-through URL for the image */
  href?: string;
};

export type HeadingBlock = BlockBase & {
  type: "heading";
  text: string; // supports {name}
};

export type TextBlock = BlockBase & {
  type: "text";
  text: string; // supports {name}
};

export type DiscountBlock = BlockBase & {
  type: "discount";
  label: string;
};

export type ButtonBlock = BlockBase & {
  type: "button";
  label: string;
  href: string;
};

export type SpacerBlock = BlockBase & {
  type: "spacer";
  height: number; // px
};

export type DividerBlock = BlockBase & {
  type: "divider";
};

export type FooterBlock = BlockBase & {
  type: "footer";
  text: string;
};

export type EmailBlock =
  | HeaderBlock
  | ImageBlock
  | HeadingBlock
  | TextBlock
  | DiscountBlock
  | ButtonBlock
  | SpacerBlock
  | DividerBlock
  | FooterBlock;

export function newBlockId(): string {
  return `b_${Math.random().toString(36).slice(2, 10)}`;
}

export function createBlock(type: EmailBlockType): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "header":
      return { id, type, brandName: "Aeris Beauté", showMark: true, logoUrl: "" };
    case "image":
      return { id, type, src: "", alt: "Banner", href: "" };
    case "heading":
      return { id, type, text: "Hello, {name}" };
    case "text":
      return {
        id,
        type,
        text: "Terima kasih sudah bergabung bersama Aeris Beauté.",
      };
    case "discount":
      return { id, type, label: "Kode diskon Anda" };
    case "button":
      return {
        id,
        type,
        label: "Belanja sekarang",
        href: "https://aerisbeaute.com",
      };
    case "spacer":
      return { id, type, height: 24 };
    case "divider":
      return { id, type };
    case "footer":
      return { id, type, text: "© Aeris Beauté" };
  }
}

export const DEFAULT_LEAD_WELCOME_BLOCKS: EmailBlock[] = [
  {
    id: "b_header",
    type: "header",
    brandName: "Aeris Beauté",
    showMark: true,
    logoUrl: "",
  },
  { id: "b_heading", type: "heading", text: "Hello, {name}" },
  {
    id: "b_intro",
    type: "text",
    text: "Terima kasih sudah bergabung bersama Aeris Beauté. Kami senang menyambut Anda.",
  },
  {
    id: "b_body",
    type: "text",
    text: "Sebagai apresiasi, berikut kode diskon spesial untuk Anda:",
  },
  { id: "b_discount", type: "discount", label: "Kode diskon Anda" },
  {
    id: "b_closing",
    type: "text",
    text: "Simpan email ini agar kode tetap mudah ditemukan. Sampai jumpa di pembelian berikutnya.",
  },
  {
    id: "b_edit",
    type: "text",
    text: "Salah ketik data Anda? [Perbarui informasi di sini]({edit_url}) — tanpa menerima kode diskon lagi.",
  },
  { id: "b_footer", type: "footer", text: "© Aeris Beauté" },
];

export const BLOCK_LABELS: Record<EmailBlockType, string> = {
  header: "Brand header",
  image: "Image / banner",
  heading: "Heading",
  text: "Text",
  discount: "Discount code",
  button: "Button",
  spacer: "Spacer",
  divider: "Divider",
  footer: "Footer",
};

export function isEmailBlock(value: unknown): value is EmailBlock {
  if (!value || typeof value !== "object") return false;
  const t = (value as { type?: string }).type;
  return (
    typeof t === "string" &&
    [
      "header",
      "image",
      "heading",
      "text",
      "discount",
      "button",
      "spacer",
      "divider",
      "footer",
    ].includes(t)
  );
}

export function parseEmailBlocks(raw: unknown): EmailBlock[] {
  if (!Array.isArray(raw)) return [...DEFAULT_LEAD_WELCOME_BLOCKS];
  const blocks = raw.filter(isEmailBlock);
  return blocks.length > 0 ? blocks : [...DEFAULT_LEAD_WELCOME_BLOCKS];
}

/** Build blocks from the older flat template fields (pre-block migration). */
export function legacyFieldsToBlocks(input: {
  brandName: string;
  bannerUrl: string | null;
  greetingTemplate: string;
  introText: string;
  bodyText: string;
  discountLabel: string;
  showDiscount: boolean;
  closingText: string;
  footerText: string;
}): EmailBlock[] {
  const blocks: EmailBlock[] = [];
  if (input.bannerUrl) {
    blocks.push({
      id: newBlockId(),
      type: "image",
      src: input.bannerUrl,
      alt: "Banner",
      href: "",
    });
  }
  blocks.push({
    id: newBlockId(),
    type: "header",
    brandName: input.brandName || "Aeris Beauté",
    showMark: true,
    logoUrl: "",
  });
  blocks.push({
    id: newBlockId(),
    type: "heading",
    text: input.greetingTemplate || "Hello, {name}",
  });
  if (input.introText.trim()) {
    blocks.push({ id: newBlockId(), type: "text", text: input.introText });
  }
  if (input.bodyText.trim()) {
    blocks.push({ id: newBlockId(), type: "text", text: input.bodyText });
  }
  if (input.showDiscount) {
    blocks.push({
      id: newBlockId(),
      type: "discount",
      label: input.discountLabel || "Kode diskon Anda",
    });
  }
  if (input.closingText.trim()) {
    blocks.push({ id: newBlockId(), type: "text", text: input.closingText });
  }
  blocks.push({
    id: newBlockId(),
    type: "footer",
    text: input.footerText || "© Aeris Beauté",
  });
  return blocks;
}
