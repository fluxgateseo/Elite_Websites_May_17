import { LoginForm } from "@/components/LoginForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { makeT } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLang();
  const t = makeT(lang);
  return {
    title: t("signup.metaTitle"),
    description: t("signup.metaDescription"),
  };
}

export default async function SignupPage() {
  const lang = await getLang();
  const t = makeT(lang);
  const devMode = process.env.AUTH_DEV_MODE === "true";

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
            {t("signup.h1Line1")}<br />
            <em>{t("signup.h1Emphasis")}</em>,<br />
            {t("signup.h1Line3")}
          </h1>
          <p className="elite-auth-subline">{t("signup.subline")}</p>
        </div>

        <p className="elite-auth-tagline">{t("signup.taglineSuffix")}</p>
      </div>

      {/* Right: form panel */}
      <div className="elite-auth-right">
        <div className="elite-mobile-brand">
          <div className="elite-brand-logo">
            <span>E</span>
          </div>
          <span className="elite-brand-name">Elite Pipeline</span>
        </div>

        <h2 className="elite-auth-form-title">{t("signup.formTitle")}</h2>
        <p className="elite-auth-form-subtitle">{t("signup.formSubtitle")}</p>

        <LoginForm mode="signup" devMode={devMode} lang={lang} />

        <p className="elite-legal">
          {t("legal.prefixSignup")}{" "}
          <a href="/termini" tabIndex={-1}>{t("legal.terms")}</a>{" "}
          {t("legal.and")}{" "}
          <a href="/privacy" tabIndex={-1}>{t("legal.privacy")}</a>.
        </p>
      </div>
    </div>
  );
}
