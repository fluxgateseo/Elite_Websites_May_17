import { LoginForm } from "@/components/LoginForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLang();
  const t = makeT(lang);
  return {
    title: t("login.metaTitle"),
    description: t("login.metaDescription"),
  };
}

export default async function LoginPage() {
  const lang = await getLang();
  const t = makeT(lang);
  const devMode = process.env.AUTH_DEV_MODE === "true";
  const hostname = process.env.DASHBOARD_HOSTNAME ?? "app.chefconnect.it";

  return (
    <div className="elite-auth-page" lang={lang}>
      <LanguageSwitcher current={lang} />
      {/* Left: editorial hero panel */}
      <div className="elite-auth-left">
        <div className="elite-brand-mark">
          <div className="elite-brand-logo">
            <span>E</span>
          </div>
          <span className="elite-brand-name">Elite Pipeline</span>
        </div>

        <div className="elite-auth-headline">
          <div className="elite-rule-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>
            {t("login.h1Line1")}<br />
            {t("login.h1Line2")} <em>{t("login.h1Emphasis")}</em>{t("login.h1Suffix")}
          </h1>
          <p className="elite-auth-subline">{t("login.subline")}</p>
        </div>

        <p className="elite-auth-tagline">
          {hostname} {t("login.taglineSuffix")}
        </p>
      </div>

      {/* Right: form panel */}
      <div className="elite-auth-right">
        {/* Mobile brand mark */}
        <div className="elite-mobile-brand">
          <div className="elite-brand-logo">
            <span>E</span>
          </div>
          <span className="elite-brand-name">Elite Pipeline</span>
        </div>

        <h2 className="elite-auth-form-title">{t("login.formTitle")}</h2>
        <p className="elite-auth-form-subtitle">{t("login.formSubtitle")}</p>

        <LoginForm mode="login" devMode={devMode} lang={lang} />

        <p className="elite-legal">
          {t("legal.prefixLogin")}{" "}
          <a href="/termini" tabIndex={-1}>{t("legal.terms")}</a>{" "}
          {t("legal.and")}{" "}
          <a href="/privacy" tabIndex={-1}>{t("legal.privacy")}</a>.
        </p>
      </div>
    </div>
  );
}
