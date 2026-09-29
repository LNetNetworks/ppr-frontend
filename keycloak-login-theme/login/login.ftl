<#-- Minimal, self-contained login that lets you paste your own HTML/CSS.
     Keep the key hooks: ${url.loginAction}, "username"/"password" inputs,
     hidden ${credentialId!}, optional rememberMe/recovery/registration. -->

<#-- Access to i18n messages -->
<#assign msg = messagesPerLocale ?? .globals['msg']!messages>

<!DOCTYPE html>
<html lang="${locale.currentLanguageTag!'en'}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${realm.displayName!realm.name} — ${msg("doLogIn")}</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/custom.css" />
  <#-- reCAPTCHA if enabled server-side -->
  <#if authenticationSession?has_content && auth?has_content && auth.realm?has_content && auth.realm.password?has_content && auth.realm.password.isRegistrationEmailAsUsername??>
  </#if>
  <#if realm.password?has_content && realm.password.isRegistrationEmailAsUsername??>
  </#if>
  <#-- If realm uses reCAPTCHA, Keycloak injects scripts via "scripts" var in base themes.
        For simplicity: if recaptchaRequired, add script. -->
  <#if login.recaptchaRequired?? && login.recaptchaRequired>
    <script src="https://www.google.com/recaptcha/api.js" async defer></script>
  </#if>
</head>

<body>
  <main class="kc-wrap">
    <div class="kc-logo">
      <img src="${url.resourcesPath}/img/logo.svg" alt="logo"/>
      <h1 class="kc-title">${realm.displayName!realm.name}</h1>
    </div>
    <p class="kc-sub">${msg("doLogIn")}</p>

    <#-- Messages (errors, info) -->
    <#if message?has_content>
      <div class="kc-alert ${message.type}">
        ${message.summary}
      </div>
    </#if>

    <form id="kc-form-login" action="${url.loginAction}" method="post" onsubmit="document.getElementById('kc-login').disabled=true;">
      <input type="hidden" name="credentialId" value="${credentialId!}" />

      <div class="kc-field">
        <label for="username">${msg("usernameOrEmail")}</label>
        <input class="kc-input" id="username" name="username" type="text"
               value="${(login.username!'')?html}" autocomplete="username" autofocus />
      </div>

      <div class="kc-field">
        <label for="password">${msg("password")}</label>
        <input class="kc-input" id="password" name="password" type="password"
               autocomplete="current-password" />
      </div>

      <div class="kc-row">
        <#if realm.rememberMe && login.rememberMe??>
          <label style="display:flex;gap:8px;align-items:center;">
            <input type="checkbox" id="rememberMe" name="rememberMe" <#if login.rememberMe>checked</#if> />
            ${msg("rememberMe")}
          </label>
        </#if>

        <#if realm.resetPasswordAllowed>
          <a href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
        </#if>
      </div>

      <#-- reCAPTCHA widget if required -->
      <#if login.recaptchaRequired?? && login.recaptchaRequired>
        <div class="g-recaptcha" style="margin: 12px 0;" data-sitekey="${login.recaptchaSiteKey}"></div>
      </#if>

      <button id="kc-login" class="kc-button" type="submit">${msg("doLogIn")}</button>
    </form>

    <#-- Social providers if configured -->
    <#if social.providers?has_content>
      <div class="kc-social">
        <#include "fragments/social.ftl">
      </div>
    </#if>

    <div class="kc-links">
      <#if realm.registrationAllowed && !requiredActions?seq_contains('VERIFY_EMAIL')>
        <a href="${url.registrationUrl}">${msg("doRegister")}</a>
      </#if>
      <#-- Optional legal/links; replace with your own -->
      <a href="/" target="_blank" rel="noopener">Back to site</a>
    </div>

    <div class="kc-foot">Powered by Keycloak • Theming by you 😎</div>
  </main>
</body>
</html>
