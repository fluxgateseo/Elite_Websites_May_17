export type CfAccountLabel = "IT" | "EN";

export type CfAccount = {
  token: string;
  accountId: string;
  label: CfAccountLabel;
};

export type AccountInference = CfAccountLabel | "AMBIGUOUS";

type Env = {
  CLOUDFLARE_API_TOKEN_IT?: string;
  CLOUDFLARE_ACCOUNT_ID_IT?: string;
  CLOUDFLARE_API_TOKEN_EN?: string;
  CLOUDFLARE_ACCOUNT_ID_EN?: string;
  [key: string]: string | undefined;
};

const IT_TLDS = new Set(["it", "eu"]);
const EN_SINGLE_TLDS = new Set(["com", "us", "uk"]);
const EN_MULTI_TLDS = ["com.au", "co.uk"];
const AMBIGUOUS_TLDS = new Set(["ai", "io"]);

export function inferAccountFromDomain(domain: string): AccountInference {
  const lower = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  for (const m of EN_MULTI_TLDS) {
    if (lower.endsWith("." + m)) return "EN";
  }
  const tld = lower.split(".").slice(-1)[0];
  if (IT_TLDS.has(tld)) return "IT";
  if (EN_SINGLE_TLDS.has(tld)) return "EN";
  if (AMBIGUOUS_TLDS.has(tld)) return "AMBIGUOUS";
  return "AMBIGUOUS";
}

export function cfAccountForDomain(env: Env, domain: string, override?: CfAccountLabel): CfAccount {
  const label: AccountInference = override ?? inferAccountFromDomain(domain);
  if (label === "AMBIGUOUS") {
    throw new Error(`cfAccountForDomain: TLD of "${domain}" is ambiguous — pass explicit override ('IT' | 'EN')`);
  }
  const token = label === "IT" ? env.CLOUDFLARE_API_TOKEN_IT : env.CLOUDFLARE_API_TOKEN_EN;
  const accountId = label === "IT" ? env.CLOUDFLARE_ACCOUNT_ID_IT : env.CLOUDFLARE_ACCOUNT_ID_EN;
  if (!token || !accountId) {
    throw new Error(`cfAccountForDomain: missing ${label} secrets (CLOUDFLARE_API_TOKEN_${label} / CLOUDFLARE_ACCOUNT_ID_${label})`);
  }
  return { token, accountId, label };
}
