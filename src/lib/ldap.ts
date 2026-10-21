import ldap, { Client } from "ldapjs";

// LDAP configuration from environment
const LDAP_URL = process.env.LDAP_URL || "ldap://localhost:389";
const LDAP_BASE_DN = process.env.LDAP_BASE_DN || "DC=domain,DC=local";
const LDAP_USER_SEARCH_BASE = process.env.LDAP_USER_SEARCH_BASE || "OU=Users,DC=domain,DC=local";
const LDAP_BIND_DN = process.env.LDAP_BIND_DN || "";
const LDAP_BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD || "";
const LDAP_ENABLED = process.env.LDAP_ENABLED === "true";

export interface LdapUser {
  dn: string;
  cn: string;
  mail: string;
  sAMAccountName: string;
  displayName: string;
  memberOf?: string[];
}

export interface LdapConfig {
  url: string;
  baseDn: string;
  userSearchBase: string;
  bindDn: string;
  bindPassword: string;
}

/**
 * Create an LDAP client connection
 */
function createClient(): Client {
  return ldap.createClient({
    url: LDAP_URL,
    reconnect: true,
    timeout: 5000,
    connectTimeout: 10000,
  });
}

/**
 * Bind to LDAP with service account
 */
async function bindWithServiceAccount(client: Client): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!LDAP_BIND_DN || !LDAP_BIND_PASSWORD) {
      // No service account configured, skip bind
      resolve();
      return;
    }

    client.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD, (err) => {
      if (err) {
        reject(new Error(`LDAP bind failed: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Search for user in LDAP by email or username
 */
async function searchUser(
  client: Client,
  identifier: string
): Promise<LdapUser | null> {
  return new Promise((resolve, reject) => {
    // Try to find user by email first, then by sAMAccountName
    const searchFilter = `(&(|(mail=${identifier})(sAMAccountName=${identifier})(userPrincipalName=${identifier})))`;

    const opts: ldap.SearchOptions = {
      filter: searchFilter,
      scope: "sub",
      attributes: ["dn", "cn", "mail", "sAMAccountName", "displayName", "memberOf", "userAccountControl"],
    };

    client.search(LDAP_USER_SEARCH_BASE, opts, (err, res) => {
      if (err) {
        reject(new Error(`LDAP search failed: ${err.message}`));
        return;
      }

      let user: LdapUser | null = null;

      res.on("searchEntry", (entry) => {
        const obj = entry.pojo;
        const attributes: Record<string, string[]> = {};
        
        obj.attributes.forEach((attr) => {
          attributes[attr.type] = attr.values;
        });

        user = {
          dn: obj.objectName,
          cn: attributes.cn?.[0] || "",
          mail: attributes.mail?.[0] || "",
          sAMAccountName: attributes.sAMAccountName?.[0] || "",
          displayName: attributes.displayName?.[0] || attributes.cn?.[0] || "",
          memberOf: attributes.memberOf,
        };
      });

      res.on("error", (err) => {
        reject(new Error(`LDAP search error: ${err.message}`));
      });

      res.on("end", () => {
        resolve(user);
      });
    });
  });
}

/**
 * Authenticate user against LDAP with their own credentials
 */
async function authenticateUser(
  client: Client,
  userDn: string,
  password: string
): Promise<boolean> {
  return new Promise((resolve) => {
    // Create a new client for user authentication
    const userClient = ldap.createClient({
      url: LDAP_URL,
      timeout: 5000,
      connectTimeout: 10000,
    });

    userClient.bind(userDn, password, (err) => {
      userClient.unbind();
      if (err) {
        // Authentication failed
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Check if user account is enabled in AD
 */
function isAccountEnabled(control: string | string[]): boolean {
  if (!control) return true;
  
  const value = Array.isArray(control) ? control[0] : control;
  const flags = parseInt(value, 10);
  
  // Bit 1 (0x2) = Account disabled
  return (flags & 0x2) === 0;
}

/**
 * Main authentication function
 * Validates user credentials against LDAP/AD
 */
export async function ldapAuthenticate(
  identifier: string,
  password: string
): Promise<LdapUser | null> {
  if (!LDAP_ENABLED) {
    console.log("LDAP authentication is disabled");
    return null;
  }

  if (!password) {
    return null;
  }

  const client = createClient();

  try {
    // Bind with service account to search
    await bindWithServiceAccount(client);

    // Search for user
    const user = await searchUser(client, identifier);
    
    if (!user) {
      console.log(`User not found in LDAP: ${identifier}`);
      return null;
    }

    // Authenticate with user credentials
    const isValid = await authenticateUser(client, user.dn, password);
    
    if (!isValid) {
      console.log(`LDAP authentication failed for: ${identifier}`);
      return null;
    }

    console.log(`LDAP authentication successful for: ${identifier}`);
    return user;

  } catch (error) {
    console.error("LDAP authentication error:", error);
    return null;
  } finally {
    client.unbind();
  }
}

/**
 * Check if LDAP is configured and enabled
 */
export function isLdapEnabled(): boolean {
  return LDAP_ENABLED && !!LDAP_URL;
}

/**
 * Get LDAP configuration info (without sensitive data)
 */
export function getLdapConfig(): LdapConfig {
  return {
    url: LDAP_URL,
    baseDn: LDAP_BASE_DN,
    userSearchBase: LDAP_USER_SEARCH_BASE,
    bindDn: LDAP_BIND_DN ? "***configured***" : "",
    bindPassword: LDAP_BIND_PASSWORD ? "***configured***" : "",
  };
}