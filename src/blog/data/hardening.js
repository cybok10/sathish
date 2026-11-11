export const hardening = [
  {
    slug: "network",
    title: "Network exposure",
    icon: "network",
    summary:
      "Anything that answers on an untrusted network is a candidate for someone else's process, so the first decision is not how to protect the services but which of them should answer at all. This guide works the exposure surface from the outside in: what listens, who is permitted to reach it, and which paths are allowed to leave the host. Read it top to bottom, because almost every real intrusion begins with a service that was never supposed to be exposed in the first place.",
    checks: [
      {
        title: "Install a default-deny host firewall",
        severity: "critical",
        command: "sudo nft list ruleset | grep -E 'hook input|policy (drop|reject)'",
        detail:
          "A host firewall with a drop policy is the cheapest control you can ship and the only one that still holds when a daemon binds more widely than you intended. Be honest about the trade-off: a flat port blocklist is a poor substitute for segmentation, because it rots the moment a new service starts listening and every exception added weakens it. Prefer default-deny with a short allow list per host, and let VLANs, security groups and network ACLs carry the coarse policy.",
      },
      {
        title: "Inventory every listening socket",
        severity: "critical",
        command: "sudo ss -tulpnH",
        detail:
          "The listening set is the real attack surface and it rarely matches the diagram in the wiki. A service bound to 0.0.0.0 or :: that you believed was confined to loopback is the most common finding in any perimeter review. Diff the output against the intended service inventory and shut down everything with no named owner.",
      },
      {
        title: "Remove default routes from non-internet interfaces",
        severity: "critical",
        command: "ip route get 1.1.1.1 && ip -4 route show default",
        detail:
          "A host that needs outbound access for package updates does not need a default route on every network interface, and a management interface carrying one hands an attacker your egress path. On dual-homed machines, drop the default route from the management NIC and pin explicit routes where you need them. The cost is that scripts assuming a default route now fail loudly, which is the behaviour you want.",
      },
      {
        title: "Close the container and orchestration ports",
        severity: "critical",
        command: "sudo ss -tulpnH | grep -E ':(2375|2376|4243|10250|6443)\\b'",
        detail:
          "An unauthenticated Docker API is effectively root on the host, and the kubelet API delivers the same power in a different wrapper. These ports are usually published by accident because container tooling defaults to a wildcard bind. Move the API to a unix socket or loopback, and require TLS with client certificates on anything that genuinely must listen on a network.",
      },
      {
        title: "Segment management traffic onto a dedicated path",
        severity: "high",
        command: "sudo grep -rnE 'dport (22|3389|5432|3306)' <firewall-rules-dir> 2>/dev/null",
        detail:
          "Administrative access should never share a segment with user or east-west application traffic. A VLAN plus an access list that accepts management addresses only from the jump host removes an entire class of lateral movement after a single credential leak. The operational cost is real: every bastion, support channel and emergency access path has to be documented and kept in step with the rules, and that upkeep is the price of the isolation.",
      },
      {
        title: "Filter egress as well as ingress",
        severity: "high",
        command: "sudo nft list chain inet filter output",
        detail:
          "Ingress filtering assumes the attacker cannot leave, which stops being true the moment a web shell, a compromised dependency or a rogue container lands. Egress rules allowing only DNS, NTP and the specific endpoints the application talks to kill most command-and-control channels, bulk exfiltration and mining behaviour. Log outbound connections for a week first so you are blocking observed dependencies rather than a guessed list.",
      },
      {
        title: "Restrict administrative ports to known sources",
        severity: "high",
        command: "sudo nft list ruleset | grep -E 'tcp dport (22|3389)' -A2",
        detail:
          "SSH and RDP reachable from the whole internet are scanned continuously and attacked with credential stuffing on a permanent schedule. Limiting the source range to your office VPN or bastion collapses the brute-force surface and most of the alert noise with it. If you must publish the port, front it with a VPN or a bastion and keep the listener closed to everything else.",
      },
      {
        title: "Disable IPv6 where you do not route it",
        severity: "medium",
        command: "sysctl net.ipv6.conf.all.disable_ipv6 && ip -6 route show",
        detail:
          "A carefully written IPv4 firewall next to a live IPv6 stack is a bypass rather than a policy, and it is a standard surprise on IPv4-only networks. Either filter IPv6 with the same rigour or disable it on the interfaces that should not carry it. Check afterwards, because some services re-enable it per interface and some VPN clients need it back.",
      },
      {
        title: "Verify the boundary from a genuinely external vantage point",
        severity: "medium",
        command: "nmap -sV -p- --open --min-rate 2000 <target>",
        detail:
          "Local checks only prove the host's own view of its firewall, which is exactly the view that is wrong when the firewall was misconfigured. Scan from a network outside the perimeter and reconcile the result against the intended exposure. Run it on a schedule rather than once, because firewall rules drift whenever someone adds an exception during an incident.",
      },
      {
        title: "Make the firewall rules survive a reboot",
        severity: "low",
        command: "systemctl is-enabled nftables firewalld ufw 2>/dev/null",
        detail:
          "A firewall that is running but not enabled at boot is an outage waiting for the next reboot, and nobody notices until the day it matters. Confirm the service is enabled and that the ruleset is loaded from a file on disk rather than typed into a live shell. This check costs nothing and belongs in every baseline you ship.",
      },
    ],
  },
  {
    slug: "services",
    title: "Service hardening",
    icon: "server",
    summary:
      "Most service compromises are not novel exploits; they are a daemon running with more privilege, more capability and more reach than its job requires. These checks decide how much damage a successful exploitation actually buys an attacker. Work through them in order, because each item makes the next one cheaper to land.",
    checks: [
      {
        title: "Run the service as a dedicated unprivileged account",
        severity: "critical",
        command: "systemctl show <service> -p User -p Group",
        detail:
          "A service running as root converts any code execution bug into root execution. Running as a named account with no login shell and no group memberships limits the blast radius to whatever that account can reach. One caveat: some daemons were never tested as non-root and fail on start, so test the change in staging before you roll it.",
      },
      {
        title: "Block privilege escalation for the process",
        severity: "critical",
        command: "systemctl show <service> -p NoNewPrivileges -p User",
        detail:
          "NoNewPrivileges stops the process and anything it spawns from acquiring new privileges through setuid binaries, which closes a common escalation path in file-write bugs. It is a one-line unit directive that costs almost nothing. It does break software that deliberately re-executes itself with elevated rights, so check the vendor notes first.",
      },
      {
        title: "Delete the services you do not actually run",
        severity: "critical",
        command: "systemctl list-unit-files --state=enabled --type=service --no-pager",
        detail:
          "Enabled units are the attacker's shopping list, and packages rarely uninstall cleanly enough to remove them all. Anything enabled without an owner, a ticket or a documented dependency should be disabled and masked so it cannot be started by accident. In containers and golden images this matters even more, since every layer ships whatever the build machine installed.",
      },
      {
        title: "Bound capabilities and filesystem access",
        severity: "high",
        command: "systemctl show <service> -p CapabilityBoundingSet -p ProtectSystem -p ReadWritePaths -p PrivateTmp",
        detail:
          "A service that can write anywhere and hold every capability has no meaningful containment, so systemd's sandboxing directives are where the real containment lives. Strip capabilities the daemon does not need, mark the filesystem read-only, and grant write access to named paths only. The cost is debugging write failures in an unfamiliar service, which is why you stage this before the change window.",
      },
      {
        title: "Disable anonymous and clear-text protocol modes",
        severity: "high",
        command: "sudo grep -rnE '^(anonymous_enable|noanonymous|cleartext|none|clear_anonymous|allow_no_crypt)' <daemon-config-dir> 2>/dev/null | grep -vE '\\.bak|dpkg'",
        detail:
          "Anonymous FTP, unencrypted SMB, TELNET and friends hand over content and sometimes credentials to the first person who asks. Most of these switches exist only for a migration that finished years ago. Switch the service to an encrypted mode instead of just disabling the feature, and verify no client still depends on the old path.",
      },
      {
        title: "Remove unused packages and their daemons",
        severity: "medium",
        command: "sudo apt-get -s autoremove 2>/dev/null | grep '^Remv' | head -30",
        detail:
          "Every installed package is another version string for an attacker to match against published vulnerabilities. Remove what nothing imports, especially language runtimes and HTTP servers pulled in as transitive dependencies. Use the simulated run first so you can read the removal list before anything is deleted.",
      },
      {
        title: "Cap the resources a runaway service can consume",
        severity: "medium",
        command: "systemctl show <service> -p MemoryMax -p CPUQuota -p TasksMax -p LimitNOFILE",
        detail:
          "A daemon with no limits is one bad request away from taking the host down with it, which turns a single application bug into a full outage. MemoryMax, CPUQuota and TasksMax keep a fault inside the service's own box. Tune the numbers from observed peak usage, since limits set too low cause the failures you are trying to prevent.",
      },
      {
        title: "Enable the mandatory access control the distribution ships",
        severity: "medium",
        command: "sudo aa-status --enabled 2>/dev/null || sudo getenforce",
        detail:
          "AppArmor on Debian and Ubuntu and SELinux on RHEL are installed by default and mostly unenforced, which leaves a whole layer of protection switched off. The profiles already exist for most daemons, so enforcing is a configuration change rather than a project. Expect some services to need small profile additions, and keep those changes in version control.",
      },
      {
        title: "Validate the unit and configuration before you restart",
        severity: "low",
        command: "systemd-analyze verify /etc/systemd/system/<service>.service && sudo <service> -t",
        detail:
          "A syntax error in a unit file or a config file means the next restart fails, and on a hardened host that failure may be the only thing keeping the old process alive. Run the verifier and the daemon's own test mode as part of the deployment pipeline. It turns an outage into a failed pipeline run.",
      },
    ],
  },
  {
    slug: "identity",
    title: "Identity and access",
    icon: "user",
    summary:
      "Most organisations control who can log in but not what that person can do once they are in, and the gap between those two is where lateral movement happens. This guide covers the account, credential and privilege decisions that decide whether a single stolen password ends at one machine or at the whole estate. Start at the top: the paths that give direct interactive access are worth more to an attacker than everything below them.",
    checks: [
      {
        title: "Disable direct root login",
        severity: "critical",
        command: "sudo sshd -T | grep -E '^permitrootlogin|^usepam'",
        detail:
          "Root login lets a password guess or a stolen key hand over the highest privilege on the machine with no second account in between. Setting PermitRootLogin no forces a named account plus sudo, which gives you an attribution trail in the logs. Verify with sshd -T rather than reading the config file, because the effective value is the last one that applies across all included files.",
      },
      {
        title: "Require key-based authentication",
        severity: "critical",
        command: "sudo sshd -T | grep -E '^passwordauthentication|^pubkeyauthentication|^kbdinteractiveauthentication'",
        detail:
          "Password authentication is guessable, phishable and reusable against every other service you own, which is why one shared credential keeps spreading. Keys remove the shared-secret problem and give you per-device revocation. Keep passwords on for emergency access behind the management network until you have confirmed every legitimate path works with keys.",
      },
      {
        title: "Detect shared and generic accounts",
        severity: "high",
        command: "sudo last -a | awk '{print $1}' | sort | uniq -c | sort -rn | head -15",
        detail:
          "A shared account destroys attribution, because the logs tell you the account but not the person, and it makes revocation impossible without breaking everyone. Look for several humans behind one login and for names like admin, deploy or service that humans also use. Migrate each user to individual credentials and keep a documented break-glass path for emergencies.",
      },
      {
        title: "Require a second factor for privileged access",
        severity: "high",
        command: "sudo sshd -T | grep -iE '^authenticationmethods|^requiredrsasize|^pubkeyacceptedalgorithms'",
        detail:
          "Phishing-resistant MFA on administrative paths turns a stolen password from an incident into a non-event. The gap is usually in the non-interactive paths: automation, vendor access and the emergency account. Enrol the human paths first, then decide explicitly what the automation paths use rather than leaving them on shared secrets by default.",
      },
      {
        title: "Trim sudo to the commands the role needs",
        severity: "high",
        command: "sudo grep -rn 'NOPASSWD' /etc/sudoers <sudoers-dir> 2>/dev/null",
        detail:
          "NOPASSWD ALL is a delayed full compromise for anyone who can edit a file the user owns or run a binary on their PATH. Replace it with a narrow command list, ideally pinned to absolute paths, and require a password so a hijacked session cannot silently escalate. Narrow rules also make the audit log meaningful, because a permitted command is now visible as an event.",
      },
      {
        title: "Lock service and orphaned accounts",
        severity: "high",
        command: "awk -F: '$3 < 1000 && $7 !~ /(nologin|false)$/ {print $1 \":\" $3 \":\" $7}' /etc/passwd",
        detail:
          "A leftover human or service account with a valid shell is a standing target for password spraying and a place for a persistence implant to hide. Lock the password and set the shell to nologin for anything that does not need interactive access. Review the list quarterly, since service accounts accumulate quietly as deployments are retired.",
      },
      {
        title: "Enforce password policy and lockout in PAM",
        severity: "medium",
        command: "sudo grep -E '^(minlen|uquality|dcredit|ocredit|remember)' /etc/security/pwquality.conf 2>/dev/null; sudo grep -E 'pam_(faillock|tally2|unix|pwquality)' /etc/pam.d/<service>",
        detail:
          "Length matters more than the special-character rules everyone argues about, and lockout stops online guessing dead. Tune pam_faillock so a legitimate mistyped password does not lock a busy administrator out of production. Note that lockout also enables denial-of-service against a targeted account, so pair it with the second factor above.",
      },
      {
        title: "Constrain what an authorized key can do",
        severity: "medium",
        command: "sudo grep -rn 'authorized_keys' <user-home>/.ssh/authorized_keys 2>/dev/null",
        detail:
          "An unrestricted key means whoever copies it inherits full SSH access to that account, on every host it is installed on. Adding from= and restrict options turns a stolen key into a source-restricted, command-limited credential. Existing keys need to be re-issued with the constraints, so schedule the change instead of leaving both forms in place indefinitely.",
      },
      {
        title: "Audit the sudo group on a schedule",
        severity: "medium",
        command: "sudo getent group sudo wheel admin; sudo -l -U <user>",
        detail:
          "sudo membership is the fastest route to root and it accumulates as people change roles without anyone re-reading the list. Dump the group membership and the resolved rules for each member on a recurring schedule and compare the output against the current role list. Treat unexplained additions as an incident, because that is exactly what they usually are.",
      },
      {
        title: "Expire long-lived credentials and stale passwords",
        severity: "medium",
        command: "sudo chage -l <user> | grep -E 'Password expires|Maximum number of days between password change'",
        detail:
          "A password set three years ago is effectively a permanent credential, because it has survived every compromise since. Set maximum ages for human accounts and, more importantly, rotate machine credentials on a schedule you can evidence. Service accounts need automated rotation because nobody remembers their passwords.",
      },
    ],
  },
  {
    slug: "secrets",
    title: "Secrets and keys",
    icon: "lock",
    summary:
      "Credentials leak through the paths nobody watches: a committed file, a log line, a process argument, a backup. This guide is about finding the leaks you already have, moving the remaining secrets somewhere that can be rotated and revoked, and proving that the rotation actually happened. The honest part is the last quarter of this work, because secret rotation has a real operational cost and only pays off if it is automated.",
    checks: [
      {
        title: "Sweep the repository history for committed credentials",
        severity: "critical",
        command: "git log --all -p | grep -nE 'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]+' | head -20",
        detail:
          "Removing a secret from the tip of a branch does not remove it from history, and every clone and fork keeps a copy. Searching the full history tells you the real blast radius before you start rotating. History rewriting plus credential rotation are both required; rewriting alone leaves the credential valid in every clone.",
      },
      {
        title: "Move every secret into a managed store",
        severity: "critical",
        command: "vault status 2>/dev/null || aws secretsmanager list-secrets --query 'SecretList[].Name' --output text",
        detail:
          "A secret living in a file on disk is one server compromise away from being public, and it cannot be revoked without touching the host. A managed store gives you versioning, access control and an audit trail over who read what. The migration is the hard part, so start with the credentials an attacker would use to pivot furthest.",
      },
      {
        title: "Rotate anything that was ever exposed",
        severity: "critical",
        command: "vault read -field=current_version secret/<name>; openssl rand -base64 32",
        detail:
          "Assume every credential that touched source control, a CI log or a support ticket is compromised, because you cannot prove otherwise. Rotate it, then verify the old value no longer authenticates rather than assuming the rotation ran. Keep a rollback path until dependent systems have been confirmed to be using the new value.",
      },
      {
        title: "Give each workload its own credential",
        severity: "high",
        command: "sudo -u postgres psql -c '\\du' 2>/dev/null || aws iam list-access-keys --query 'AccessKeyMetadata[].UserName'",
        detail:
          "One shared database or API credential means you cannot revoke one component without breaking all of them, which is why shared credentials stay alive long past their welcome. Per-workload credentials give you attribution and one-stroke revocation. It multiplies the number of secrets to manage, so the automation has to come first or nobody will keep the list true.",
      },
      {
        title: "Keep secrets out of logs and process arguments",
        severity: "high",
        command: "sudo journalctl -u <service> --since today | grep -icE 'password|token|secret|authorization'; ps auxww | grep -icE 'password=|--token '",
        detail:
          "A secret in a log line survives the vulnerability that leaked it, and a secret in a command argument is visible to every local user through the process table. Feed credentials through environment files with restrictive permissions or an injected file descriptor, and scrub anything sensitive from the application logs. Check this periodically, because frameworks log connection strings by default.",
      },
      {
        title: "Set expiry on secrets and automate the rotation",
        severity: "high",
        command: "vault kv get -format=json secret/<name> | grep -o '\"lease_duration\"[^,]*'; systemctl list-timers --no-pager | grep -iE 'rotate|vault'",
        detail:
          "Manual rotation does not happen, so the real control is an automated pipeline with a short TTL and a renewal job that fails loudly. The cost is genuine: every consumer needs a refresh path, and a broken renewal takes the service down instead of leaving a stale key working. Build the refresh capability before you shorten the TTL, or you will cause the outage you are trying to avoid.",
      },
      {
        title: "Protect key material at rest on disk",
        severity: "medium",
        command: "sudo stat -c '%a %U:%G %n' <config-file>",
        detail:
          "A private key or token file that is world-readable is equivalent to having no secret at all, because every local account can copy it. Mode 0400 or 0600 with a dedicated owner removes that exposure, and it costs nothing to verify. Watch out for copies the tooling leaves behind in temporary directories.",
      },
      {
        title: "Scope cloud keys to the least privilege they need",
        severity: "medium",
        command: "aws iam list-access-keys --query 'AccessKeyMetadata[].[UserName,AccessKeyId]' --output text; aws iam get-access-key-last-used --access-key-id <key-id>",
        detail:
          "Long-lived cloud keys with broad permissions are the standard target for anyone who lands on the host. Prefer short-lived credentials from an instance role and reduce key count to the minimum, then use the last-used report to delete keys nobody has touched in months. The output of this command should be boring, and anything else needs an explanation.",
      },
      {
        title: "Keep a single audited break-glass path",
        severity: "medium",
        command: "sudo grep -rnE 'break.?glass|emergency' <sudoers-dir> /etc/ssh/sshd_config.d/ 2>/dev/null",
        detail:
          "Teams under pressure create emergency accounts that outlive the incident, and they become permanent backdoors. Provide one offline-stored credential or certificate that requires two people and generates an alert, and store it where the compromise cannot reach it. The break-glass path must be tested, because it is the one path nobody has time to debug.",
      },
    ],
  },
  {
    slug: "tls",
    title: "Transport and TLS",
    icon: "globe",
    summary:
      "TLS failures rarely announce themselves; they show up as an expired certificate, a protocol downgrade or a missing intermediate that only breaks some clients. These checks verify the configuration that is actually on the wire rather than the one you believe you deployed. They are cheap to run and the failures they catch are among the most common causes of self-inflicted outages.",
    checks: [
      {
        title: "Require TLS 1.2 and refuse everything older",
        severity: "critical",
        command: "openssl s_client -connect <target>:443 -tls1_1 </dev/null 2>&1 | grep -E 'Protocol|alert|failure'",
        detail:
          "Legacy protocol support is what turns a passive observer into an active attacker, because it permits downgrade and padding-oracle attacks against otherwise sound ciphers. Disable SSLv3, TLS 1.0 and TLS 1.1 on every listener, including the ones behind your load balancer. Keep TLS 1.3 on and verify the negotiated version from an external client rather than trusting the server config alone.",
      },
      {
        title: "Replace the default or self-signed certificate",
        severity: "critical",
        command: "openssl x509 -in <config-file> -noout -subject -issuer -dates -fingerprint",
        detail:
          "A default certificate with a wrong common name, a self-signed certificate or a hostname mismatch trains every client to click through the warning, which removes the protection TLS gives you. Every host your users reach should present a certificate from a trusted chain with the exact name in the URL. Check the fingerprint against what your CA issued so you know the deployed file is the one you intended.",
      },
      {
        title: "Automate renewal and alert before expiry",
        severity: "critical",
        command: "sudo certbot certificates 2>/dev/null; systemctl list-timers --no-pager | grep -i certbot",
        detail:
          "Expired certificates are the most common self-inflicted outage on the internet and they always take down the path you forgot about. Use an automated renewal timer and a separate monitor that checks the live endpoint from outside your network. Renewal also fails for boring reasons, such as a changed DNS record or a rate-limited CA, so alert on the next expiry date rather than only on the failure.",
      },
      {
        title: "Redirect every plaintext request",
        severity: "high",
        command: "curl -sI http://<target> | grep -iE '^(HTTP|location)'",
        detail:
          "Anything accepted over plain HTTP can be modified in transit, including the cookies and tokens that travel with the request. Redirect port 80 to HTTPS at the edge and confirm the redirect happens before any response body is generated. Watch for mixed content in the HTML itself, because a single http:// asset silently downgrades the value of the whole page.",
      },
      {
        title: "Send HSTS with a realistic max-age",
        severity: "high",
        command: "curl -sI https://<target> | grep -i 'strict-transport-security'",
        detail:
          "HSTS removes the downgrade opportunity by telling the browser to refuse plaintext for that host, but it only protects you if the header survives a redirect or a proxy error page. Include it on the HTTPS response and confirm it is not stripped by an intermediary. Start with a modest max-age if you are unsure every subdomain can serve TLS, since preload is effectively irreversible for a year.",
      },
      {
        title: "Publish the full certificate chain",
        severity: "high",
        command: "openssl s_client -connect <target>:443 -showcerts </dev/null 2>/dev/null | grep -c 'BEGIN CERTIFICATE'",
        detail:
          "Serving only the leaf certificate works in browsers that happen to have cached the intermediate and fails everywhere else, which is a nightmare to diagnose. A single returned certificate on a modern server usually means the chain is incomplete. Count the certificates in the handshake and confirm the last one is the root your clients trust.",
      },
      {
        title: "Offer only modern ciphers with forward secrecy",
        severity: "high",
        command: "openssl ciphers -v 'ECDHE+AESGCM:ECDHE+CHACHA20' | wc -l; nmap --script ssl-enum-ciphers -p 443 <target>",
        detail:
          "Static RSA key exchange and CBC suites keep traffic decryptable if the server's private key is ever exposed, and they have been broken repeatedly in practice. Enforce ECDHE with AEAD suites and let the scanner tell you what the endpoint actually offers. The trade-off is that some old clients and appliances will stop connecting, so inventory the client population before you enforce it.",
      },
      {
        title: "Encrypt and authenticate the traffic between your own services",
        severity: "medium",
        command: "openssl s_client -connect <target>:8443 -CAfile <ca-cert> </dev/null 2>&1 | grep -E 'Verify return code|Verification'",
        detail:
          "Flat internal networks are how a single compromised workload reaches the database, and TLS with mutual authentication is what stops it. Client certificates prove the caller identity so authorisation does not rest on network position alone. It adds certificate lifecycle work, so start with the hops that carry credentials rather than converting everything at once.",
      },
      {
        title: "Watch certificate transparency for unexpected issuance",
        severity: "medium",
        command: "curl -s 'https://crt.sh/?q=%25.<domain>&output=json' | grep -o '\"name_value\":\"[^\"]*\"' | head -20",
        detail:
          "Certificate transparency logs let you find domains and hosts that were issued a certificate without anyone on your side asking for it, which is how most subdomain takeovers are spotted. Poll the log for your domains on a schedule and alert on names you do not recognise. The coverage is good for public CAs but not complete, so treat it as a detection source rather than a guarantee.",
      },
      {
        title: "Run an external TLS scanner on a schedule",
        severity: "low",
        command: "testssl.sh --quiet <target>:443 2>/dev/null | head -40",
        detail:
          "Configurations drift when certificates are renewed or a proxy is added, and each of those changes can silently downgrade the result. A scheduled scan against the public endpoint gives you a baseline you can diff over time. Running it from inside your network is not the same test, because that path may not include the load balancer you actually serve traffic through.",
      },
    ],
  },
  {
    slug: "cloud",
    title: "Cloud and container",
    icon: "cloud",
    summary:
      "Cloud platforms fail in ways that servers do not: a metadata endpoint that hands out credentials, a container runtime socket that grants root, and an IAM policy that allows everything. The controls here are about removing the shortcuts that providers give you by default. Most of them are configuration, and all of them need verifying from inside the workload because the console view rarely tells the whole story.",
    checks: [
      {
        title: "Block the instance metadata endpoint",
        severity: "critical",
        command: "curl -s --max-time 2 http://169.254.169.254/latest/meta-data/iam/security-credentials/",
        detail:
          "An SSRF from any process on the host can read the instance role credentials from the metadata service and use them from anywhere. Require IMDSv2 with a hop limit, or terminate egress to the link-local address entirely at the network level. A request that returns credentials here means any workload on that host can assume its role.",
      },
      {
        title: "Keep the container socket off the network",
        severity: "critical",
        command: "sudo ss -tulpnH | grep -E ':(2375|2376|4243)\\b'; sudo docker info --format '{{json .SecurityOptions}}'",
        detail:
          "Anyone who can reach the Docker API socket can start a privileged container and become root on the host, which turns a container escape into a node compromise. Bind the socket to a unix socket with restrictive permissions and drive it through a proxy that authenticates each caller. The same applies to the kubelet API and to any CI runner that keeps a socket mounted.",
      },
      {
        title: "Remove wildcards from IAM policies",
        severity: "critical",
        command: "aws iam list-attached-user-policies --user-name <user> --output text; aws iam list-attached-role-policies --role-name <role> --output text",
        detail:
          "A policy containing Action * with Resource * is the same as no policy at all, and these accumulate from well-meaning console clicks and copied examples. Read each attached policy and replace the wildcards with the specific actions and resources the workload needs. The trade-off is that policies become maintenance work, so review them on the same cadence as code.",
      },
      {
        title: "Encrypt volumes, snapshots and databases",
        severity: "high",
        command: "aws ec2 describe-volumes --query 'Volumes[].[VolumeId,Encrypted,KmsKeyId]' --output table",
        detail:
          "Default server-side encryption covers the volume but not the snapshots someone copies to another account for backups. Enable encryption on both and specify your own key where the threat model requires it. The key choice is the real decision, because a customer-managed key gives you an independent revocation point.",
      },
      {
        title: "Run containers as non-root with a read-only filesystem",
        severity: "high",
        command: "docker inspect -f '{{.Config.User}} {{.HostConfig.ReadonlyRootfs}} {{.HostConfig.Privileged}} {{.HostConfig.CapAdd}}' <container>",
        detail:
          "A container that runs as root with a writable filesystem and added capabilities has almost nothing between it and the kernel. Drop to a numeric uid, set ReadonlyRootfs, mount only the paths the process writes to, and drop all capabilities you did not name. Build pipelines often reintroduce root because a test step assumed it, so enforce the policy at admission rather than trusting the Dockerfile.",
      },
      {
        title: "Pin images by digest and scan them before they ship",
        severity: "high",
        command: "docker inspect -f '{{index .RepoDigests 0}}' <image>; trivy image --severity HIGH,CRITICAL <image>:latest",
        detail:
          "A mutable tag means the thing you scanned last week is not necessarily the thing that runs today, and tag reuse is a real supply-chain technique. Deploy by digest and re-scan the digest rather than the tag. There is a maintenance cost in re-pinning on every rebuild, so automate the promotion pipeline instead of leaving it to a human.",
      },
      {
        title: "Close public IPs and default-open security groups",
        severity: "high",
        command: "aws ec2 describe-security-groups --query 'SecurityGroups[].[GroupId,IpPermissions]' --output json",
        detail:
          "The default security group in most cloud accounts allows traffic from every peer, and copied rules accumulate 0.0.0.0/0 entries for admin services. Audit every rule, replace broad sources with security group references, and remove public addresses from instances that do not need them. Restricting at the instance level rather than the perimeter is what keeps a misplaced rule from being internet-facing.",
      },
      {
        title: "Give each workload identity its own boundary",
        severity: "medium",
        command: "aws sts get-caller-identity; aws iam get-role-policy --role-name <role> --output json",
        detail:
          "If every container in a cluster shares one instance role, compromising one workload compromises the entire account. Assume-role per workload, or use IRSA-style workload identity with distinct roles per service. It adds token plumbing to the build, and that plumbing is where the mistakes happen, so test the assumed-role path explicitly.",
      },
      {
        title: "Turn on a configuration and API audit trail",
        severity: "medium",
        command: "aws cloudtrail describe-trails --query 'trailList[].[Name,IsMultiRegionTrail]' --output table",
        detail:
          "Without a multi-region audit trail you cannot see who changed a security group or attached a role at three in the morning. Enable trails across every region and ship the logs to a bucket the workloads cannot write to. Alert on the identity and IAM events specifically, because that is what a real intrusion looks like in the trail.",
      },
      {
        title: "Make the build image reproducible and minimal",
        severity: "medium",
        command: "docker history --no-trunc <image>:latest | head -20",
        detail:
          "Every build layer is code you shipped, and base images bring in a package tree nobody chose deliberately. Multi-stage builds keep compilers and credentials out of the final layer, and pinning the base by digest stops the contents changing under you. Review the layer list for anything that should never have been baked in, such as a pip cache containing private indexes.",
      },
    ],
  },
  {
    slug: "logging",
    title: "Logging and detection",
    icon: "bell",
    summary:
      "Detection only works if the evidence survives the incident, and on a compromised host the local logs are usually the first thing an attacker removes. This guide is about getting logs off the machine, keeping them tamper-evident, and turning a handful of specific events into alerts an engineer will actually see. The checks are ordered by what you lose first when you skip them.",
    checks: [
      {
        title: "Ship logs off the host as they happen",
        severity: "critical",
        command: "systemctl status rsyslog --no-pager 2>/dev/null | head -5; sudo ss -unlp | grep -E ':(514|6514)'",
        detail:
          "Local logs on a host that was just compromised are attacker-controlled evidence, and wiping them is one of the first things any intrusion attempt does. A forwarder to a separate collector gives you a copy the attacker on that host cannot reach. Buffering and retry settings matter as much as the shipping itself, because a collector that drops data during a burst loses exactly the events you needed.",
      },
      {
        title: "Enable kernel-level auditing",
        severity: "critical",
        command: "systemctl is-enabled auditd; sudo auditctl -l | head -10",
        detail:
          "auditd records the file, permission and process events that no application log ever sees, which is how you spot an account being created or a binary replaced. The default rules cover very little, so add rules for the directories that matter: passwd, sudoers, cron, SSH keys and your application binaries. It has a real performance cost on busy hosts, so scope the watches instead of recording everything.",
      },
      {
        title: "Log the failures, not only the successes",
        severity: "high",
        command: "sudo grep -E 'Failed|Accepted|Invalid user|authentication failure' <auth-log> 2>/dev/null | tail -20",
        detail:
          "A log that records only successful authentications tells you nothing about the hundreds of attempts that preceded a success. Failed logins, invalid users and sudo denials are the early signal, and they need to be retained long enough to be correlated with the successful event that follows. Filter them out at the source and you lose your earliest warning.",
      },
      {
        title: "Make the log files append-only",
        severity: "high",
        command: "sudo lsattr <audit-log> <auth-log> 2>/dev/null",
        detail:
          "An attacker with write access to the log directory can edit history in place unless the immutable attribute is set. The chattr +a flag stops truncation and modification without stopping new writes. Note the operational cost: rotation scripts need to lift the attribute before they can move the file, so the automation has to know about it.",
      },
      {
        title: "Synchronise the clock across the estate",
        severity: "high",
        command: "timedatectl status; chronyc tracking 2>/dev/null | head -10",
        detail:
          "Correlation across hosts is impossible when their clocks disagree, and forensic timelines become fiction. Even a few seconds of drift will scramble the ordering of a login followed by a privilege escalation. Use NTP with a source you control, and alarm on drift rather than only on synchronisation state, since an unsynchronised host still reports as synced long after it loses the server.",
      },
      {
        title: "Alert on a short, specific list of signals",
        severity: "high",
        command: "sudo grep -rn 'ExecStartPre' /etc/cron.d /etc/systemd/system 2>/dev/null | head -10; systemctl list-timers --no-pager | grep -iE 'alert|check'",
        detail:
          "A hundred alerts a day get muted by week two, and the one that mattered sits in the noise. Start with the signals that map to a specific response: new privileged account, sudden outbound traffic, log service stopped, certificate expiring. Each alert should name the runbook and the person who owns it, otherwise it is a notification rather than a control.",
      },
      {
        title: "Normalise the format at the collector",
        severity: "medium",
        command: "sudo journalctl -u <service> -o json --since '1 hour ago' | head -1",
        detail:
          "Free text in logs cannot be queried reliably, and searching for it later costs hours when you are already under pressure. Structured output with fixed field names makes one query work across ten services. Changing the format costs a rollout and a parser for the old format, so agree the schema centrally rather than letting each service invent its own.",
      },
      {
        title: "Set retention that matches the investigation window",
        severity: "medium",
        command: "journalctl --disk-usage; sudo logrotate -d /etc/logrotate.conf 2>&1 | head -20",
        detail:
          "Logs that rotate in a day are useless when you discover an intrusion three weeks later, and logs kept forever run up a bill you will be asked to justify. Decide the retention from the realistic dwell time rather than a round number. Compress and archive older files to object storage so the hot path stays fast while the history stays searchable.",
      },
      {
        title: "Stop the secrets from reaching the logs",
        severity: "medium",
        command: "sudo grep -riE 'password=|token=|BEGIN [A-Z ]*PRIVATE KEY|api[_-]?key' <log-dir> 2>/dev/null | head -10",
        detail:
          "Application frameworks log connection strings and request bodies by default, which quietly writes your database password into a file that is frequently less protected than the database itself. Scrub sensitive fields at the logger level rather than relying on every developer to remember. Then rotate anything already written, because log retention means the old value stays live in a file for as long as you keep it.",
      },
      {
        title: "Test the pipeline by breaking it on purpose",
        severity: "medium",
        command: "logger -p authpriv.warning 'logging pipeline test' && sleep 5 && sudo grep -r 'logging pipeline test' <log-dir> 2>/dev/null",
        detail:
          "Log forwarding fails quietly and usually right when the host is busy or the network is degraded. Sending a known marker and confirming it arrives at the collector proves the path end to end, and doing it on a schedule means you discover the outage before an attacker does. Track the age of the newest event per host, since that is the metric that tells you the pipeline is alive.",
      },
    ],
  },
  {
    slug: "patching",
    title: "Patching and dependencies",
    icon: "code",
    summary:
      "The operating system is rarely the weakest link any more; it is the application and the thousand transitive packages underneath it. This guide covers keeping the base patched, knowing what you actually depend on, and making sure the artefact you deploy was scanned rather than assumed safe. The uncomfortable truth is that most teams can patch the OS on time and have no idea which CVEs apply to their own code.",
    checks: [
      {
        title: "Patch the operating system on a fixed cadence",
        severity: "critical",
        command: "apt list --upgradable 2>/dev/null | head -20; sudo dnf check-update 2>/dev/null | head -20",
        detail:
          "Unpatched base packages are the cheapest thing for an attacker to exploit, because they come with working public exploits. Run unattended security updates and reboot on a schedule, and verify the running kernel matches the installed one, since a patched package on an unpatched kernel does nothing. Reboot scheduling is the part teams forget, and it is the part that determines whether the patch took effect.",
      },
      {
        title: "Remove end-of-life packages",
        severity: "critical",
        command: "dpkg -l 2>/dev/null | awk '$1 == \"ii\" && $2 ~ /^[a-z0-9.+-]+$/ {print $2, $3}' | grep -E '^(libssl|libcrypto|gnutls|openssl|curl|nginx|apache2|php|python3|ruby|nodejs)' | head -20",
        detail:
          "An unmaintained package receives no fixes, so every new vulnerability in it stays open forever. Find the ones you inherited from a base image or an old deployment and either upgrade them or remove them. Upgrading is usually cheaper than removing because other software depends on them quietly.",
      },
      {
        title: "Know what is in your dependency tree",
        severity: "high",
        command: "npm ls --all --omit=dev --prefix <project-dir> 2>/dev/null | head -40; pip list --format=freeze 2>/dev/null | head -40",
        detail:
          "You cannot patch what you do not know you have, and modern applications pull in hundreds of packages that no human selected. Generate the tree on every build and store it as an artefact so the exact set is versioned and diffable. The lockfile is the first half of this; the resolved transitive tree is the half that tells you what you actually shipped.",
      },
      {
        title: "Fail the build on known vulnerabilities",
        severity: "high",
        command: "npm audit --omit=dev --audit-level=high --prefix <project-dir> --json 2>/dev/null | grep -o '\"[a-z-]*\": *\"[0-9.]*\"' | head -20",
        detail:
          "A vulnerability report that nobody blocks on becomes a report nobody reads. Wire the scanner into CI so a serious finding fails the pipeline, and define the exception path explicitly, because without one the rule gets disabled globally within a month. Development dependencies need attention too, since they run with build credentials in the pipeline.",
      },
      {
        title: "Pin and lock dependencies",
        severity: "high",
        command: "npm ci --omit=dev --prefix <project-dir>; git diff --exit-code package-lock.json",
        detail:
          "A floating version range means two builds of the same commit can produce different artefacts, which makes every vulnerability fix a guessing game. Lockfiles give you a reproducible tree and a reviewable diff when a dependency changes. The real payoff comes from a scheduled process that proposes lockfile updates so the pin stays fresh without a developer choosing it by hand.",
      },
      {
        title: "Scan the built artefact, not just the source",
        severity: "high",
        command: "trivy image --severity HIGH,CRITICAL <image>:latest 2>/dev/null | tail -20",
        detail:
          "The artefact that runs contains the base image layers, the build tools and the vendored binaries, and none of those appear in a source-only review. A build step that pulls a package from a registry at build time also introduces code nobody reviewed. Scan the exact digest that will be deployed and block the push when it fails.",
      },
      {
        title: "Strip the features and packages you do not use",
        severity: "medium",
        command: "sudo apt-get -s autoremove 2>/dev/null | grep '^Remv'; dpkg -l 2>/dev/null | grep -c '^ii'",
        detail:
          "Unused features are attack surface that nobody watches, and the count of installed packages is a decent proxy for how large your real exposure is. Remove the sample code, the extra language runtimes and the plugins nobody loads. This reduces patch load as a side effect, which is the argument that wins when someone says they might need it later.",
      },
      {
        title: "Track the actively exploited vulnerability list",
        severity: "medium",
        command: "curl -s -X POST https://api.osv.dev/v1/query -d '{\"package\":{\"name\":\"<package>\",\"ecosystem\":\"npm\"},\"version\":\"<version>\"}' | grep -o '\"id\":\"[^\"]*\"' | head -10",
        detail:
          "Most exploited-in-the-wild vulnerabilities were published before the breach that used them, which makes the exploit list the highest-value shortlist you have. Feed that list into your scanners so known-exploited packages get priority over everything else. Querying it per package keeps the list small enough to act on.",
      },
      {
        title: "Sign the artefacts and verify before deployment",
        severity: "medium",
        command: "cosign verify --key <cosign-pub-key> <image>@sha256:<digest> 2>&1 | tail -5",
        detail:
          "A tag in a registry is a mutable pointer, and a registry account compromise lets an attacker publish something that looks like your release. Signing the digest and verifying it at admission turns the registry into a distribution channel instead of a trust boundary. The key distribution and rotation process is the real work here, and it belongs with your secrets management.",
      },
      {
        title: "Rebuild images on a schedule",
        severity: "low",
        command: "docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' | head -20; systemctl list-timers --no-pager | grep -iE 'build|rebuild'",
        detail:
          "An image built six months ago carries six months of base image vulnerabilities even if your own code never changed. Scheduled rebuilds pull in patched base layers without waiting for a feature release. The cost is churn in your registry, so keep the rebuild pipeline automated and give the base image its own versioning scheme.",
      },
    ],
  },
  {
    slug: "web",
    title: "Web applications",
    icon: "eye",
    summary:
      "The application layer is where most reported breaches live, and the controls that matter are concentrated in a handful of framework settings. This guide covers the OWASP ground truth in the order it usually gets exploited: broken authorisation, injection, missing headers and leaked internals. Read it as a review checklist against your own codebase, since each check names the place in the code where the fix belongs.",
    checks: [
      {
        title: "Authenticate and authorise every route",
        severity: "critical",
        command: "grep -rnE 'app\\.(get|post|put|patch|delete)\\(' <source-dir> | head -40",
        detail:
          "Unauthenticated or un-authorised endpoints are the most common finding in an application assessment, and object-level authorisation bugs are worse because they only appear for other users' identifiers. Enumerate every route, confirm each one has an authorisation check, and test that the check compares the resource owner rather than the role alone. Mounting a global middleware hides the gap instead of closing it, so prefer explicit per-route checks that fail closed.",
      },
      {
        title: "Parameterise every query",
        severity: "critical",
        command: "grep -rnE '\\.(query|raw|execute)\\(' <source-dir> | head -30",
        detail:
          "String concatenation into SQL is the most reliable remote compromise there is, and the fix is a prepared statement rather than a sanitiser or a blocklist. Find every raw call and confirm the values are bound as parameters rather than interpolated. The same pattern shows up in NoSQL query construction and in shell commands built with string formatting, where the same argument applies.",
      },
      {
        title: "Send the security headers on every response",
        severity: "high",
        command: "curl -sI https://<target> | grep -iE 'content-security-policy|x-content-type-options|x-frame-options|referrer-policy|permissions-policy'",
        detail:
          "Headers such as X-Content-Type-Options and X-Frame-Options are one line each and defuse whole categories of attack, including MIME sniffing and clickjacking. Check the error responses as well as the happy path, because error handlers frequently bypass the middleware that sets them. Set them at the edge so nothing can bypass them by hitting a different route.",
      },
      {
        title: "Ship a strict content security policy",
        severity: "high",
        command: "curl -sI https://<target> | grep -i 'content-security-policy'",
        detail:
          "A CSP is the only thing standing between an injected script and a full session takeover, which makes it the highest-leverage header on the list. Start in report-only mode, collect the violations, then move to enforcement without unsafe-inline. It is the one control with real friction, since it means removing inline scripts and moving to nonces or hashes.",
      },
      {
        title: "Escape output by default",
        severity: "high",
        command: "grep -rnE 'v-html|dangerouslySetInnerHTML|innerHTML|\\.raw\\(' <source-dir> | head -30",
        detail:
          "Cross-site scripting happens when data reaches the page without the template engine's escaping, and the escaping is usually on unless somebody opts out of it. Find every place that disables escaping and confirm the value is sanitised with a maintained library and not merely concatenated. The number of hits here should be small and each one should have a comment explaining why.",
      },
      {
        title: "Add CSRF protection to state-changing routes",
        severity: "high",
        command: "grep -rnE 'csurf|csrf|xsrf|_token' <source-dir> | head -20",
        detail:
          "Cookie-based sessions mean a third-party page can make your browser perform an authenticated state change, which is how an attacker deletes accounts or changes email addresses. Use a synchroniser token or a SameSite cookie policy on every request that mutates state, and verify the framework's CSRF middleware is actually mounted on the router. API routes that use bearer tokens instead of cookies do not need it, and mixing the two authentication styles is where the gaps appear.",
      },
      {
        title: "Run the application outside the web root as an unprivileged user",
        severity: "high",
        command: "ps -o user,pid,cmd -C <process> 2>/dev/null; ls -ld <web-root>",
        detail:
          "A web server running as root turns any file-write bug into full host compromise, and a document root containing the application source lets a file upload land in the code. Run the worker as a dedicated user with no shell, keep the code directory read-only to that user, and serve static files from a separate path. The only writable locations should be an upload directory with a controlled filename policy.",
      },
      {
        title: "Stop leaking stack traces and framework banners",
        severity: "medium",
        command: "curl -s https://<target>/this-route-does-not-exist | grep -iE 'traceback|stack trace|at [a-z]+\\.|laravel|express|powered by|php/'",
        detail:
          "A stack trace on an error page hands an attacker file paths, framework versions and occasionally database credentials, and it converts a blind bug into an exploitable one. Configure the framework to render a generic error page and log the detail server-side where it belongs. Set the same behaviour for every error status, since 404 pages are the most commonly missed one.",
      },
      {
        title: "Rate limit the endpoints that cost you money",
        severity: "medium",
        command: "grep -rnE 'rateLimit|express-rate-limit|throttle|slowDown|recaptcha' <source-dir> | head -20",
        detail:
          "Login, password reset and any endpoint that triggers an outbound email or a paid API call is a target for abuse, and it does not require an exploit. Per-account and per-source limits with an exponential backoff blunt the automation that makes these attacks cheap. Rate limits in memory do not survive a restart, so back them with a shared store in a multi-instance deployment.",
      },
      {
        title: "Treat uploads and file paths as untrusted input",
        severity: "medium",
        command: "grep -rnE 'multer|upload|sendFile|createReadStream|path\\.join' <source-dir> | head -30",
        detail:
          "Upload handlers that keep the client filename can be walked out of the upload directory with a crafted name, and that is a direct route to remote code execution. Generate the stored filename yourself, verify the extension and content type against a server-side allow list, and store uploads outside the document root. Also check the download routes, where a path parameter is the same bug in a different place.",
      },
    ],
  },
  {
    slug: "backup",
    title: "Backups and recovery",
    icon: "database",
    summary:
      "A backup is only real once it has been restored, and the restore is the part that gets skipped until the worst possible week. This guide covers the full chain: what you capture, where it sits, who can reach it, and how you prove it comes back. The emphasis is on immutability and off-host copies, because ransomware that can encrypt the backup is functionally the same as no backup at all.",
    checks: [
      {
        title: "Prove the restore works",
        severity: "critical",
        command: "gzip -t <dump-file> && zcat <dump-file> | head -5; sudo -u postgres psql -c '\\l' | head -10",
        detail:
          "A backup you have never restored is a hypothesis, and the failure modes are mundane: wrong credentials, missing extensions, a database version mismatch and restore commands that need a human. Run a full restore into a scratch environment on a schedule and time it. That run also produces the recovery time objective you can quote, instead of the one your architecture diagram promises.",
      },
      {
        title: "Keep one copy off the host and offline",
        severity: "critical",
        command: "aws s3 ls s3://<backup-bucket> --recursive | head -10; mount | grep -iE 'cifs|nfs' | head -5",
        detail:
          "A backup on the same disk as the data protects you from a bad migration and nothing else. Get one copy onto separate infrastructure, ideally in a separate account, so the compromise that reaches the first cannot reach the second. The operational cost is real: cross-region copies cost money and slow the window, and you should size the window so the backup still finishes before the next one starts.",
      },
      {
        title: "Make the backup copies immutable",
        severity: "critical",
        command: "aws s3api get-object-lock-configuration --bucket <backup-bucket> --output json",
        detail:
          "Attackers with credentials on the backup host will delete or encrypt every copy they can reach, often before you notice the original incident. Object lock in compliance mode, or an immutable storage tier, prevents deletion for a window you control. It has a storage cost and a retention commitment, so agree the window with whoever owns the recovery objectives before you enable it.",
      },
      {
        title: "Encrypt the backups and hold the keys separately",
        severity: "critical",
        command: "age --decrypt -i <key-file> <backup-file> | head -c 64 | xxd | head -3",
        detail:
          "A backup contains everything the production data contains, including the secrets and personal data you are required to protect. Encrypt the archive and keep the key somewhere the backup host cannot read, otherwise the encryption only proves you followed the steps. Test the decryption path with a real file, because restoring into a panic is a bad time to discover the key is wrong.",
      },
      {
        title: "Use a least-privilege account to write backups",
        severity: "high",
        command: "aws iam list-attached-role-policies --role-name <backup-role> --output text",
        detail:
          "A backup role that can read the entire account is a single credential away from copying everything into an attacker-controlled bucket. Restrict it to the specific resources and write-only actions the job needs, and give the deletion path no permissions at all. Review the attached policies whenever the job changes, since the trend in these roles is always upward.",
      },
      {
        title: "Match the retention to the recovery objective",
        severity: "high",
        command: "aws s3api get-bucket-lifecycle-configuration --bucket <backup-bucket> --output json",
        detail:
          "Retention is a balance between the recovery point objective you promised and what the storage costs. Keep hourly copies for a few weeks, daily for a few months and monthly for the rest of the retention period, so you can answer both how recent and how far back. Most organisations discover they cannot meet their stated objective and have to revise the promise, which is cheaper to do now.",
      },
      {
        title: "Alert on failure and on the absence of a backup",
        severity: "high",
        command: "systemctl list-timers --no-pager | grep -iE 'backup|rotate'; sudo grep -rn 'backup' /etc/cron.d/ 2>/dev/null | head -10",
        detail:
          "A backup job that fails silently is the normal failure mode, and a missing backup is invisible until you need it. Alert on both the job result and the age of the newest artefact, since a job that succeeds while writing nothing is still an outage. The age check is the one that catches the real problems, so make it the primary signal.",
      },
      {
        title: "Check the contents, not just the file size",
        severity: "medium",
        command: "sudo zcat <dump-file> | grep -c '^COPY '; sudo zcat <dump-file> | grep -c '^CREATE TABLE'",
        detail:
          "A file with a plausible size can contain truncated tables if the dump failed partway through. Counting the tables and rows in the dump and comparing them against the source catches empty and partial archives. It also gives you a cheap sanity check you can automate on every single run instead of only during a quarterly restore drill.",
      },
      {
        title: "Watch for silent corruption",
        severity: "medium",
        command: "sha256sum -c <checksum-file> 2>&1 | grep -v ': OK' | head -10",
        detail:
          "Media rots, object stores replicate lazily and archives lose bits slowly, none of which shows up as an error at write time. Verifying checksums on the read side detects the problem before you need the data. Run it on the restore path rather than the backup path, since that is the copy you are actually going to rely on.",
      },
      {
        title: "Document the recovery order and rehearse it",
        severity: "medium",
        command: "ls -l <runbook-file>; grep -nE 'restore|RPO|RTO' <runbook-file> | head -20",
        detail:
          "Recovery is a dependency graph, and getting it wrong means restoring a database before the storage it depends on, then discovering the difference three hours in. Write the order down with the owner and the expected duration for each step. The rehearsal is the part that matters: a runbook that has never been followed is a document, not a procedure.",
      },
    ],
  },
];
