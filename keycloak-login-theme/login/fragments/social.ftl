<#-- Simple social buttons list -->
<#list social.providers as p>
  <form action="${p.loginUrl}" method="post">
    <button type="submit" class="kc-social-btn kc-social-${p.alias}">
      ${p.displayName}
    </button>
  </form>
</#list>
