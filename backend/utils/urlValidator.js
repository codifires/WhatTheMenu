/**
 * ============================================================================
 * WhatTheMenu — SSRF & Remote URL Security Validator
 * ============================================================================
 *
 * Enforces:
 * - Allowed protocols (HTTP and HTTPS only)
 * - Blocks loopback (127.0.0.1, ::1, localhost)
 * - Blocks cloud metadata endpoints (169.254.169.254, metadata.google.internal)
 * - Blocks RFC 1918 private IPv4 networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Blocks link-local (169.254.0.0/16, fe80::/10)
 * - DNS resolution verification to block DNS rebinding attacks
 * ============================================================================
 */

const dns = require('dns').promises;
const net = require('net');

/**
 * Checks whether an IPv4 address is in a private, loopback, or reserved range.
 */
const isPrivateIPv4 = (ip) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (parts[0] >= 224) return true;

  return false;
};

/**
 * Checks whether an IPv6 address is in a private, loopback, or reserved range.
 */
const isPrivateIPv6 = (ip) => {
  const normalized = ip.toLowerCase();
  // ::1 (Loopback)
  if (normalized === '::1' || normalized === '::') return true;
  // fc00::/7 (Unique local address)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // fe80::/10 (Link-local)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (normalized.includes('::ffff:')) {
    const ipv4 = normalized.split('::ffff:')[1];
    if (net.isIPv4(ipv4)) return isPrivateIPv4(ipv4);
  }

  return false;
};

/**
 * Validates a remote URL string against SSRF attacks.
 *
 * @param {string} urlString
 * @param {Object} [options]
 * @param {boolean} [options.resolveDns=true] - Resolve DNS to check resulting IP
 * @returns {Promise<{ isValid: boolean, url: URL }>}
 */
const validateExternalUrl = async (urlString, options = { resolveDns: true }) => {
  if (!urlString || typeof urlString !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string');
  }

  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch (err) {
    throw new Error(`Invalid URL format: ${err.message}`);
  }

  // 1. Enforce HTTP/HTTPS protocol only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SSRF Blocked: Protocol "${parsed.protocol}" is not allowed. Only HTTP and HTTPS are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Reject internal/metadata hostnames
  const blockedHostnames = [
    'localhost',
    'metadata.google.internal',
    'metadata.azure.internal',
    'instance-data'
  ];
  if (
    blockedHostnames.includes(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan')
  ) {
    throw new Error(`SSRF Blocked: Hostname "${hostname}" points to an internal or reserved domain.`);
  }

  // 3. Reject literal private IP addresses
  if (net.isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new Error(`SSRF Blocked: Hostname "${hostname}" is a private or loopback IP address.`);
    }
  } else if (net.isIPv6(hostname)) {
    if (isPrivateIPv6(hostname)) {
      throw new Error(`SSRF Blocked: Hostname "${hostname}" is a private or loopback IPv6 address.`);
    }
  }

  // 4. Resolve DNS to prevent DNS rebinding attacks
  if (options.resolveDns) {
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (addr.family === 4 && isPrivateIPv4(addr.address)) {
          throw new Error(`SSRF Blocked: Hostname "${hostname}" resolved to private IP "${addr.address}".`);
        }
        if (addr.family === 6 && isPrivateIPv6(addr.address)) {
          throw new Error(`SSRF Blocked: Hostname "${hostname}" resolved to private IPv6 "${addr.address}".`);
        }
      }
    } catch (dnsErr) {
      if (dnsErr.message.startsWith('SSRF Blocked:')) {
        throw dnsErr;
      }
      throw new Error(`DNS Resolution failed for "${hostname}": ${dnsErr.message}`);
    }
  }

  return { isValid: true, url: parsed };
};

module.exports = {
  validateExternalUrl,
  isPrivateIPv4,
  isPrivateIPv6
};
