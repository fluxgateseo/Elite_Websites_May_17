export type SecretBinding = "dashboard" | "workflow" | "leads-worker";

export interface SecretSpec {
  name: string;
  description: string;
  bindings: SecretBinding[];          // which workers it must be set on
  required_for_phase: "plan-a" | "plan-b" | "plan-c" | "plan-d";
  is_sensitive: boolean;               // false = plain env var (e.g. AGENCY_EMAIL)
  generation_url?: string;             // direct link where user generates it
}

export const SECRETS: SecretSpec[] = [
  {
    name: "CLOUDFLARE_API_TOKEN",
    description:
      "Cloudflare API token. Required: Account → Workers Scripts (Edit), Zone → Zone (Read). Future-proof (Plan B/C): + Account → Cloudflare Pages (Edit), Account → Email Routing Addresses (Edit), Zone → DNS (Edit), Account → Account Settings (Read).",
    bindings: ["dashboard", "workflow"],
    required_for_phase: "plan-a",
    is_sensitive: true,
    generation_url: "https://dash.cloudflare.com/profile/api-tokens",
  },
  {
    name: "ANTHROPIC_API_KEY",
    description: "Claude API key used by content generation stages.",
    bindings: ["workflow"],
    required_for_phase: "plan-c",
    is_sensitive: true,
    generation_url: "https://console.anthropic.com/settings/keys",
  },
  {
    name: "DATAFORSEO_LOGIN",
    description: "DataForSEO HTTP Basic Auth login for backlinks + keywords intel.",
    bindings: ["workflow"],
    required_for_phase: "plan-c",
    is_sensitive: true,
    generation_url: "https://app.dataforseo.com/api-access",
  },
  {
    name: "DATAFORSEO_PASSWORD",
    description: "DataForSEO HTTP Basic Auth password.",
    bindings: ["workflow"],
    required_for_phase: "plan-c",
    is_sensitive: true,
    generation_url: "https://app.dataforseo.com/api-access",
  },
  {
    name: "GITHUB_TOKEN",
    description: "GitHub PAT (scope: repo, workflow) used to create per-site repos.",
    bindings: ["workflow"],
    required_for_phase: "plan-c",
    is_sensitive: true,
    generation_url: "https://github.com/settings/tokens/new",
  },
  {
    name: "FREEPIK_API_KEY",
    description: "Freepik API for hero image acquisition (Stage 4).",
    bindings: ["workflow"],
    required_for_phase: "plan-c",
    is_sensitive: true,
    generation_url: "https://www.freepik.com/developers/dashboard",
  },
  {
    name: "UNSPLASH_ACCESS_KEY",
    description: "Unsplash API access key for content imagery (Stage 4).",
    bindings: ["workflow"],
    required_for_phase: "plan-c",
    is_sensitive: true,
    generation_url: "https://unsplash.com/oauth/applications",
  },
  {
    name: "TURNSTILE_SITE_KEY",
    description: "Cloudflare Turnstile site key (public, embedded in form).",
    bindings: ["leads-worker"],
    required_for_phase: "plan-b",
    is_sensitive: false,
    generation_url: "https://dash.cloudflare.com/?to=/:account/turnstile",
  },
  {
    name: "TURNSTILE_SECRET_KEY",
    description: "Cloudflare Turnstile secret key for server-side validation.",
    bindings: ["leads-worker"],
    required_for_phase: "plan-b",
    is_sensitive: true,
    generation_url: "https://dash.cloudflare.com/?to=/:account/turnstile",
  },
  {
    name: "AGENCY_EMAIL",
    description: "Agency email used as Email Routing destination + lead notifications.",
    bindings: ["dashboard", "workflow"],
    required_for_phase: "plan-b",
    is_sensitive: false,
  },
  {
    name: "DASHBOARD_HOSTNAME",
    description: "Public hostname where dashboard is reachable (e.g. pipeline.chefconnect.it). Used for OAuth callback URL.",
    bindings: ["dashboard"],
    required_for_phase: "plan-a",
    is_sensitive: false,
  },
];
