import { z } from "zod";

const BriefStep1 = z.object({
  domain: z.string(),
  preflightDone: z.boolean().optional(),
  preflightResult: z
    .object({
      whois: z.object({ registrar: z.string().optional(), registered_until: z.string().optional() }).optional(),
      ns: z.array(z.string()).optional(),
      cf_zone: z.object({ present: z.boolean(), status: z.string().optional(), id: z.string().optional(), account: z.enum(["IT", "EN"]).optional() }).optional(),
    })
    .optional(),
  account: z.enum(["IT", "EN"]).optional(),
});

const BriefStep4 = z.object({
  businessName: z.string(),
  industry: z.string().optional(),
  subCategory: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  description: z.string().optional(),
  usp: z.string().optional(),
});

const BriefStep6 = z.object({
  source: z.string().optional(),
  sources: z.array(z.enum(["dataforseo", "csv", "skip"])).optional(),
});

const BriefStep7 = z.object({
  designStyle: z.string().optional(),
  palette: z.string().optional(),
  customColors: z
    .object({ primary: z.string(), accent: z.string(), background: z.string() })
    .optional(),
  fontPairing: z.string().optional(),
  references: z.string().optional(),
  layout: z
    .object({
      hero: z.string(),
      sections: z.array(z.string()),
      categoryLayout: z.string(),
    })
    .optional(),
});

const BriefStep8 = z.object({
  toneFormal: z.number().optional(),
  voiceTraits: z.array(z.string()).optional(),
  avoidWords: z.string().optional(),
  brandKeywords: z.string().optional(),
});

const BriefStep9 = z.object({
  pages: z
    .object({
      home: z.boolean().optional(),
      chiSiamo: z.boolean().optional(),
      serviziMenu: z.boolean().optional(),
      galleria: z.boolean().optional(),
      eventi: z.boolean().optional(),
      blog: z.boolean().optional(),
      blogArticoli: z.number().optional(),
      faq: z.boolean().optional(),
      contatti: z.boolean().optional(),
    })
    .optional(),
  leadCapture: z.string().optional(),
  lingua: z.string().optional(),
});

const BriefStep10 = z.object({
  hostnameWithWww: z.boolean().optional(),
  emailRouting: z.boolean().optional(),
  catchAllEmail: z.boolean().optional(),
  autoDeploy: z.boolean().optional(),
  gdprBanner: z.boolean().optional(),
  approvalMode: z.string().optional(),
});

export const BriefSchema = z.object({
  currentStep: z.number().optional(),
  step1: BriefStep1,
  step2: z.object({ skipped: z.boolean().optional(), cfAdded: z.boolean().optional(), nsChanged: z.boolean().optional() }).optional(),
  step3: z.object({ scenario: z.string().optional(), referenceUrl: z.string().optional() }).optional(),
  step4: BriefStep4.optional(),
  step5: z.object({ acknowledged: z.boolean().optional() }).optional(),
  step6: BriefStep6.optional(),
  step7: BriefStep7.optional(),
  step8: BriefStep8.optional(),
  step9: BriefStep9.optional(),
  step10: BriefStep10.optional(),
});

export type Brief = z.infer<typeof BriefSchema>;

export function parseBrief(json: string): Brief {
  return BriefSchema.parse(JSON.parse(json));
}
