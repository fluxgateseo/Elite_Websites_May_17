// WizardState — single source of truth for the 11-step onboarding wizard

export type Scenario = "plan-a" | "plan-b" | "plan-c";

export type Industry =
  | "Ristorazione"
  | "Beauty/Wellness"
  | "Tech/SaaS"
  | "Servizi professionali"
  | "E-commerce"
  | "Turismo"
  | "Salute"
  | "Educazione"
  | "Altro";

export type DesignStyle = "Elegant" | "Modern" | "Editorial" | "Bold";
export type PalettePreset = "Neutri caldi" | "Neutri freddi" | "Pastello" | "Saturo brillante" | "Mono dark" | "Custom";
export type FontPairing = "Playfair + Inter" | "DM Serif + DM Sans" | "IBM Plex Serif + IBM Plex Sans";

export type HeroVariant =
  | "hero-fullbleed"
  | "hero-mosaic"
  | "hero-split"
  | "hero-carousel"
  | "hero-video"
  | "hero-form";

export type SectionId =
  | "section-featured-dishes"
  | "section-photo-mosaic"
  | "section-story"
  | "section-stats"
  | "section-press"
  | "section-testimonials"
  | "section-map-hours"
  | "section-blog-feed"
  | "section-cta-banner"
  | "section-newsletter"
  | "section-awards"
  | "section-events-strip";

export type CategoryLayout =
  | "cat-grid-cards"
  | "cat-list-thumb"
  | "cat-magazine"
  | "cat-filtered"
  | "cat-map"
  | "cat-pinterest";

export type SeoSource = "dataforseo" | "csv" | "skip";
export type LeadCapture = "form" | "phone" | "both";
export type ApprovalMode = "manual" | "auto";

export interface Step1Data {
  domain: string;
  preflightDone: boolean;
  account?: "IT" | "EN";
  preflightResult?: {
    whois?: { registered_until?: string; registrar?: string };
    ns?: string[];
    cf_zone?: { present: boolean; status?: string; id?: string; account?: "IT" | "EN" };
  };
}

export interface Step2Data {
  skipped: boolean;
  cfAdded: boolean;
  nsChanged: boolean;
}

export interface Step3Data {
  scenario: Scenario | null;
  referenceUrl?: string; // for plan-c
}

export interface Step4Data {
  businessName: string;
  industry: Industry | "";
  subCategory: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  usp: string;
}

export interface Step5Data {
  acknowledged: boolean;
}

export interface Step6Data {
  sources: SeoSource[];
  csvFileName?: string;
}

export interface Step7Data {
  designStyle: DesignStyle | null;
  palette: PalettePreset | null;
  customColors: { primary: string; accent: string; background: string };
  fontPairing: FontPairing | null;
  references: string;
  layout: {
    hero: HeroVariant;
    sections: SectionId[];
    categoryLayout: CategoryLayout;
  };
}

export interface Step8Data {
  toneFormal: number; // 1 (Formale) to 5 (Casual)
  voiceTraits: string[];
  avoidWords: string;
  brandKeywords: string;
}

export interface Step9Data {
  pages: {
    home: boolean;
    chiSiamo: boolean;
    serviziMenu: boolean;
    galleria: boolean;
    eventi: boolean;
    blog: boolean;
    blogArticoli: 0 | 5 | 10 | 20;
    faq: boolean;
    contatti: boolean;
  };
  leadCapture: LeadCapture;
  lingua: string;
}

export interface Step10Data {
  hostnameWithWww: boolean;
  emailRouting: boolean;
  catchAllEmail: boolean;
  autoDeploy: boolean;
  gdprBanner: boolean;
  approvalMode: ApprovalMode;
}

export interface WizardState {
  currentStep: number;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  step5: Step5Data;
  step6: Step6Data;
  step7: Step7Data;
  step8: Step8Data;
  step9: Step9Data;
  step10: Step10Data;
}

export function defaultWizardState(): WizardState {
  return {
    currentStep: 1,
    step1: {
      domain: "",
      preflightDone: false,
    },
    step2: {
      skipped: false,
      cfAdded: false,
      nsChanged: false,
    },
    step3: {
      scenario: null,
      referenceUrl: "",
    },
    step4: {
      businessName: "",
      industry: "",
      subCategory: "",
      city: "",
      address: "",
      phone: "",
      email: "",
      description: "",
      usp: "",
    },
    step5: {
      acknowledged: false,
    },
    step6: {
      sources: ["dataforseo", "csv"],
    },
    step7: {
      designStyle: null,
      palette: null,
      customColors: { primary: "#000000", accent: "#3b82f6", background: "#ffffff" },
      fontPairing: null,
      references: "",
      layout: {
        hero: "hero-fullbleed",
        sections: [
          "section-featured-dishes",
          "section-story",
          "section-photo-mosaic",
          "section-blog-feed",
          "section-cta-banner",
        ],
        categoryLayout: "cat-grid-cards",
      },
    },
    step8: {
      toneFormal: 3,
      voiceTraits: [],
      avoidWords: "",
      brandKeywords: "",
    },
    step9: {
      pages: {
        home: true,
        chiSiamo: true,
        serviziMenu: false,
        galleria: false,
        eventi: false,
        blog: false,
        blogArticoli: 0,
        faq: false,
        contatti: true,
      },
      leadCapture: "both",
      lingua: "Italiano",
    },
    step10: {
      hostnameWithWww: false,
      emailRouting: true,
      catchAllEmail: true,
      autoDeploy: true,
      gdprBanner: false,
      approvalMode: "manual",
    },
  };
}

export interface PreflightResult {
  whois?: { registered_until?: string; registrar?: string };
  ns?: string[];
  cf_zone?: { present: boolean; status?: string; id?: string };
  error?: string;
}
