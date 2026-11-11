export const tools = [
  {
    slug: "aircrack-ng",
    name: "Aircrack-ng",
    category: "wireless",
    summary:
      "Aircrack-ng is the classic suite for auditing wireless network security, and it is still the first tool many testers reach for when the target is a WPA/WPA2-PSK network. Its components split the job into distinct phases: airmon-ng puts a supported adapter into monitor mode, airodump-ng captures traffic from the access point, and aircrack-ng performs the offline key search against a captured four-way handshake or a PMKID. Because the attack happens offline against stored key material, you can run it at whatever speed your hardware allows without repeatedly touching the target. It remains the reference implementation that other wireless tooling is measured against.",
    install: [
      "apt update && apt install -y aircrack-ng",
      "brew install aircrack-ng",
      "git clone https://github.com/aircrack-ng/aircrack-ng.git && cd aircrack-ng && autoreconf -i && ./configure && make && sudo make install",
    ],
    usage: [
      {
        title: "Enable monitor mode",
        command: "sudo airmon-ng start wlan0",
        detail:
          "The interface is normally left as wlan0 and reappears as wlan0mon once the driver allows raw frame capture. If the adapter is not supported, airmon-ng says so here and nothing downstream will work.",
      },
      {
        title: "Capture a handshake",
        command: "sudo airodump-ng wlan0mon",
        detail:
          "Watch for the EAPOL handshake lines for the access point you care about. Let the capture run long enough to see all four messages, because aircrack-ng needs the complete exchange rather than a single frame.",
      },
      {
        title: "Crack the captured handshake",
        command: "sudo aircrack-ng -w capture.cap -b <bssid> wordlist.txt",
        detail:
          "The BSSID narrows the run to one access point so you are not testing thousands of handshakes at once. Wordlist attacks are fast but only useful against weak passphrases; rules or a GPU-based mask expands the search space considerably.",
      },
      {
        title: "Capture a PMKID instead",
        command: "sudo airodump-ng --pmkid wlan0mon -w pmkid",
        detail:
          "A single management frame is enough to derive a PMKID candidate, which removes the need to wait for a client to reassociate. Support depends on the access point and the driver, so treat it as a bonus rather than a plan.",
      },
      {
        title: "Force a reauthentication",
        command: "sudo aireplay-ng -0 5 -a <bssid> wlan0mon",
        detail:
          "Deauthentication sends real clients off the network so the handshake is captured cleanly. It is disruptive and it is visible to anyone on the network, so only do this in a lab you control.",
      },
    ],
    useCases: [
      "Audit the passphrase strength of a WPA/WPA2-PSK network",
      "Capture and crack an EAPOL handshake offline",
      "Recover a PMKID from an access point without a client",
      "Validate wireless policy in an owned lab environment",
    ],
    notes:
      "This method only applies to PSK handshakes and PMKIDs — WPA3-SAE networks are not vulnerable to it, and a long passphrase will not fall to any wordlist. Monitor mode and packet injection depend on the chipset and driver, so check `airmon-ng` output before planning around a capture.",
  },
  {
    slug: "amass",
    name: "Amass",
    category: "recon",
    summary:
      "Amass is the most thorough open-source subdomain enumeration project and the default answer when you need a defensible inventory of a domain's external attack surface. It collects from passive sources by default and can switch into active resolution, which turns a long list of guesses into a set of hosts that actually answer. The database-backed design lets you run it repeatedly over time and diff the results to spot assets as they appear. It is a slow tool, and that slowness is exactly why it catches things that faster scanners miss.",
    install: [
      "brew install amass",
      "go install github.com/owasp-amass/amass/v4/...@master",
      "apt update && apt install -y amass   # distro builds often lag behind the release",
    ],
    usage: [
      {
        title: "Enumerate a domain",
        command: "amass enum -d <domain> -o amass.txt",
        detail:
          "The default run combines passive collection with a light active resolution pass and writes deduplicated results to the output file. Expect it to take several minutes for a large domain.",
      },
      {
        title: "Passive-only enumeration",
        command: "amass enum -passive -d <domain> -o amass.txt",
        detail:
          "Passive mode never sends a DNS query to the target's own servers, which matters when the domain is monitored and you want to avoid noise. Coverage drops accordingly, because names that do not resolve publicly are never found.",
      },
      {
        title: "Active enumeration with brute force",
        command: "amass enum -active -d <domain> -b -o amass.txt",
        detail:
          "Active mode resolves candidates directly and the brute-force flag generates additional name permutations. The queries land on the authoritative servers, so keep it for engagements where that is acceptable.",
      },
      {
        title: "Show which sources were used",
        command: "amass enum -d <domain> -src",
        detail:
          "Printing the data sources is how you audit the result. If a source errored out, the gap in coverage is usually explainable rather than random.",
      },
      {
        title: "Query the stored database",
        command: "amass db -list",
        detail:
          "Because Amass keeps its findings, the database is the record of what was known on each run. Diffing it between dates is a cheap way to identify newly exposed hosts.",
      },
    ],
    useCases: [
      "Map the subdomain surface of a domain",
      "Collect and store asset history over time",
      "Confirm candidate names with active DNS resolution",
      "Feed a pipeline of live hosts for HTTP probing",
    ],
    notes:
      "Passive collection leans on third-party APIs and search engines, so provider rate limits and changed interfaces make two runs return different results. The active phase issues queries against the authoritative servers, which shows up in their logs and can be attributed to you.",
  },
  {
    slug: "apktool",
    name: "Apktool",
    category: "mobile",
    summary:
      "Apktool decodes an Android package back into something close to its source form: smali bytecode, decoded resources and a readable manifest. That is usually the first step when you need to audit permissions, exported components, hardcoded endpoints or signing configuration. It also rebuilds an APK from the decoded tree, which makes it possible to patch a smali file and produce a modified build for testing on a device you control. It is the heavier and more faithful alternative to unzipping an APK and reading the raw XML by hand.",
    install: [
      "apt update && apt install -y apktool",
      "brew install apktool",
      "wget https://github.com/iBotPeaches/Apktool/releases/latest/download/apktool.jar   # then run: java -jar apktool.jar",
    ],
    usage: [
      {
        title: "Decode an APK",
        command: "apktool d app.apk -o app-unpacked",
        detail:
          "The output directory holds the decoded AndroidManifest.xml, the res tree and a smali directory per DEX file. The manifest alone usually answers most of the permission and component questions.",
      },
      {
        title: "Decode without resources",
        command: "apktool d app.apk -o app-unpacked -r",
        detail:
          "Skipping resources makes decoding much faster when you only care about code. It is the right option for large apps whose resource decoding is slow.",
      },
      {
        title: "Rebuild a patched APK",
        command: "apktool b app-unpacked -o app-patched.apk",
        detail:
          "Edit the smali or manifest inside the decoded tree first. The rebuilt package is unsigned and will not install until you sign it with a test key.",
      },
      {
        title: "Sign a rebuilt APK for testing",
        command: "apksigner sign --ks test.keystore app-patched.apk",
        detail:
          "A throwaway keystore is enough for a device you own. This step is required because rebuilding always discards the original signature.",
      },
      {
        title: "Read the manifest without decoding",
        command: "aapt2 dump badging app.apk",
        detail:
          "Package name, version, permissions and launchable activity come straight from the APK. It is the fastest way to answer a scoping question before doing anything else.",
      },
    ],
    useCases: [
      "Audit permissions and exported components in an APK",
      "Locate hardcoded URLs and API keys in decompiled code",
      "Patch and rebuild an app for authorised testing",
      "Extract smali for closer static analysis",
    ],
    notes:
      "Rebuilt APKs are never byte-identical to the original and always lose the original signature, so they must be signed again before installation. Resource decoding depends on the aapt2 version bundled with the release, and a mismatch produces build errors that look like the app has been tampered with.",
  },
  {
    slug: "assetfinder",
    name: "Assetfinder",
    category: "recon",
    summary:
      "Assetfinder is a small, fast subdomain finder that queries a fixed set of passive sources and prints what it finds. It has no configuration, no database and no active resolution, which makes it the tool to reach for when you want a list in a couple of seconds rather than a research project. The output is plain text and pipes cleanly into the httpx, dnsx or nuclei stages of a pipeline. Its best use is fast, broad coverage of what is publicly indexed about a domain.",
    install: ["go install github.com/tomnomnom/assetfinder@latest"],
    usage: [
      {
        title: "List subdomains",
        command: "assetfinder --subs-only <domain> > subs.txt",
        detail:
          "Subdomains-only mode strips the root domains and the resolved addresses, which is usually what a downstream tool wants to consume.",
      },
      {
        title: "Get everything it found",
        command: "assetfinder <domain> > results.txt",
        detail:
          "The full output includes the root domain, any extra hostnames and the IP addresses behind them. It is worth keeping alongside the subdomain list for reference.",
      },
      {
        title: "List root domains only",
        command: "assetfinder --domains-only <domain>",
        detail:
          "Useful when the target is a parent domain and you want to know which registrations sit underneath it rather than every host name.",
      },
      {
        title: "Pipe into a live host check",
        command: "assetfinder --subs-only <domain> | httpx -silent -title",
        detail:
          "The output is one host per line, so it drops straight into a probing tool. Doing this in one line keeps the intermediate list out of your shell history and your notes.",
      },
    ],
    useCases: [
      "Rapidly list publicly indexed subdomains",
      "Seed a larger enumeration pipeline",
      "Check for newly published hosts on a domain",
      "Provide input for HTTP probing and port scanning",
    ],
    notes:
      "Because it is passive only, assets that were never indexed — recent deployments, internal hostnames, staging boxes — will not appear. It reports what certificate transparency and DNS data reveal, so treat the output as a starting point rather than a complete inventory.",
  },
  {
    slug: "bettercap",
    name: "Bettercap",
    category: "wireless",
    summary:
      "Bettercap is a programmable network attack and monitoring framework that replaces a pile of one-off scripts with a single interactive console. Its modules cover Wi-Fi reconnaissance, deauthentication, ARP spoofing, DNS spoofing and BLE, all driven by simple eval commands you can chain or script. The live console is what makes it useful: you can watch the ARP table fill in as machines talk and act on a specific host the moment it appears. It is the sane choice when you need a tool that keeps running and reacts to traffic rather than replaying a fixed script.",
    install: [
      "apt update && apt install -y bettercap",
      "brew install bettercap",
      "go install github.com/bettercap/bettercap/v2@latest",
    ],
    usage: [
      {
        title: "Start the console on an interface",
        command: "sudo bettercap -iface eth0",
        detail:
          "The console prints the available modules and their current state. Work from the prompt rather than chaining blind commands, because module state persists between lines.",
      },
      {
        title: "Probe for hosts on the segment",
        command: "sudo bettercap -eval \"net.probe on\"",
        detail:
          "ARP probing populates the host table with every device that answered. It is a fast, quiet way to map a segment before committing to anything more intrusive.",
      },
      {
        title: "Watch Wi-Fi clients and access points",
        command: "sudo bettercap -eval \"wifi.recon\"",
        detail:
          "The recon module lists nearby access points, their channels and associated clients. On a card in monitor mode this also captures frames that a managed-mode card would ignore.",
      },
      {
        title: "Deauthenticate a client",
        command: "sudo bettercap -eval \"wifi.deauth <bssid>\"",
        detail:
          "The client is disconnected from the access point. This disrupts real users and is easy for anyone nearby to notice, so it belongs in a lab network.",
      },
      {
        title: "Enable ARP spoofing on the segment",
        command: "sudo bettercap -eval \"net.arp.spoof on\" -eval \"set net.arp.spoof.target <ip>\"",
        detail:
          "Traffic for the targeted host is redirected through your machine. Every host on the segment can see the change of MAC address for the gateway, so use it where you are authorised to intercept traffic.",
      },
    ],
    useCases: [
      "Map hosts on a local network segment",
      "Enumerate nearby Wi-Fi access points and clients",
      "Test ARP and DNS spoofing defences",
      "Automate repeatable network interception steps",
    ],
    notes:
      "Deauthentication and ARP spoofing disrupt live traffic and will take real users offline, so keep them inside a lab you control. Bettercap needs root for raw socket and monitor-mode work, and injecting frames requires a chipset whose driver supports injection.",
  },
  {
    slug: "binwalk",
    name: "Binwalk",
    category: "forensics",
    summary:
      "Binwalk finds embedded content inside firmware images and other binary blobs by matching magic bytes and scanning for compressed or encrypted regions. It tells you what is packed into a device before you have reverse-engineered anything, which shortens the path from 'here is an image' to 'here is the filesystem, the web server config and the credentials'. It can carve files straight out of the image and pull apart embedded filesystems in the older versions. It is a starting point for firmware work rather than the whole of it.",
    install: [
      "git clone https://github.com/ReFirmLabs/binwalk.git && cd binwalk && ./setup.sh -y",
      "pip install binwalk",
      "brew install binwalk",
    ],
    usage: [
      {
        title: "Scan a firmware image",
        command: "binwalk firmware.bin",
        detail:
          "The scan lists every recognised region with its offset and type. Offsets matter: they are what you use to extract or patch the piece you are interested in.",
      },
      {
        title: "Extract embedded files",
        command: "binwalk -e --run-as=root firmware.bin",
        detail:
          "Extraction writes every carved file into a directory named after the image. Some plugins need root because they create temporary files or mount a filesystem.",
      },
      {
        title: "Locate compressed regions",
        command: "binwalk -D firmware.bin",
        detail:
          "Delta and compression detection finds data that is stored in a compressed or delta-encoded form. Those regions are usually where the interesting filesystem lives.",
      },
      {
        title: "Look for executable code signatures",
        command: "binwalk -A firmware.bin",
        detail:
          "Opcode scanning flags regions that look like executable code, which is often a bundled web server or a management binary inside the image.",
      },
      {
        title: "Signature scan with a custom signature set",
        command: "binwalk -R signatures/ firmware.bin",
        detail:
          "Custom signature files let you look for the specific strings you already suspect, such as a default credential or a hardcoded URL.",
      },
    ],
    useCases: [
      "Identify embedded filesystems in firmware images",
      "Locate hardcoded credentials in a device image",
      "Carve files out of an unknown binary blob",
      "Triage an unknown file before deeper analysis",
    ],
    notes:
      "The third-generation rewrite changed plugin names and output formats, so older tutorials and custom extraction scripts may not apply. Signature matching is optimistic — plenty of embedded content is compressed or encrypted in ways binwalk flags but cannot extract, and that part stays manual.",
  },
  {
    slug: "bloodhound-ce",
    name: "BloodHound CE",
    category: "red-team",
    summary:
      "BloodHound Community Edition maps the Active Directory graph — users, groups, sessions, ACLs and trust edges — so you can see which accounts an attacker could actually reach with the rights you found. The collector walks LDAP and SMB as a domain user and writes a JSON graph that the web interface renders as attack paths. Running it after credential discovery typically turns a list of accounts into a short list of routes to Domain Admin. It is the standard tool for turning domain enumeration into prioritised findings.",
    install: [
      "sudo dpkg -i bloodhound-*.deb   # .deb package from the GitHub releases",
      "docker pull bloodhound/bloodhound-ce && docker run -p 8080:8080 --name bhce -d bloodhound/bloodhound-ce",
      "pip install bloodhound-python   # the collector that talks to the domain",
    ],
    usage: [
      {
        title: "Collect the domain graph",
        command: "bloodhound-python -u <user> -p '<password>' -d <domain> -c Group,Session,SessionLoop -o bloodhound.json",
        detail:
          "Group, Session and SessionLoop is the combination that surfaces privilege escalation through group membership and token rights. A full All collection is noisier and takes considerably longer.",
      },
      {
        title: "Collect as an individual user",
        command: "bloodhound-python -u <user> -p '<password>' -d <domain> --zip",
        detail:
          "The zip flag bundles the output with the collection metadata, which is the format the interface expects when you upload to a self-hosted instance.",
      },
      {
        title: "Authenticate with a Kerberos ticket",
        command: "bloodhound-python -k -d <domain> -o bloodhound.json",
        detail:
          "Passing -k uses the current Kerberos ticket rather than a password, so the collection runs with whatever rights that ticket already carries.",
      },
      {
        title: "Collect on a single host",
        command: "bloodhound-python -u <user> -p '<password>' -d <domain> --target-ip <ip> -o bloodhound.json",
        detail:
          "Scoping the collection to one machine is faster when you are validating a single workstation rather than mapping the domain.",
      },
      {
        title: "Load the results into the UI",
        command: "bloodhound-python --upload bloodhound.json",
        detail:
          "Uploading into a local instance writes directly into its database. If you did not start the container with a data volume, the graph disappears when the container is recreated.",
      },
    ],
    useCases: [
      "Map Active Directory privilege relationships",
      "Find paths from a low-privilege account to Domain Admin",
      "Identify users and groups with excessive control over other objects",
      "Turn credential findings into ranked escalation paths",
    ],
    notes:
      "Collection reads directory data broadly, so it generates noticeable LDAP traffic and may trip lockout thresholds on badly configured domains. CE is the community edition; the paid tiers add collection features, APIs and support, and much older material still refers to the retired BloodHound Classic application.",
  },
  {
    slug: "certipy",
    name: "Certipy",
    category: "red-team",
    summary:
      "Certipy-Ad is a Python tool for enumerating and abusing Active Directory Certificate Services, the component that issues certificates to many domain machines. It enumerates the CA's templates, the permissions on them and the accounts allowed to enrol, which often reveals escalation paths that plain LDAP enumeration misses. It can request a certificate whose subject matches an existing privileged account and manipulate the SAN in an enrolled certificate. In a domain with an over-permissive CA it is frequently the shortest route to domain admin.",
    install: [
      "pipx install certipy-ad",
      "pip install certipy-ad",
      "git clone https://github.com/ly4k/Certipy.git && cd Certipy && pip install -e .",
    ],
    usage: [
      {
        title: "Enumerate the CA and its templates",
        command: "certipy-ad find -u <user> -p '<password>' -dc <dc.domain> -target <domain>",
        detail:
          "The find command lists the CA configuration, enrolled templates and who holds the rights to manage each one. Read the enrollment ACL section carefully — that is where the escalation opportunities live.",
      },
      {
        title: "Enumerate templates and permissions in detail",
        command: "certipy-ad find -u <user> -p '<password>' -dc <dc.domain> -target <domain> -v",
        detail:
          "Verbose output adds the template properties that determine whether a certificate can carry a different identity in its subject or SAN.",
      },
      {
        title: "Shadow credentials against a machine account",
        command: "certipy-ad shadow -u <user> -p '<password>' -dc <dc.domain> -target <domain> -m <machine>",
        detail:
          "MS-DRSR lets a privileged user write a key credential onto a machine account and then request a ticket as that machine. The machine account has to be known and the attacker typically needs the right permissions on it.",
      },
      {
        title: "Request a certificate with a chosen subject",
        command: "certipy-ad req -u <user> -p '<password>' -dc <dc.domain> -target <domain> -ca <ca-name> -template 'User' -out csr.pem",
        detail:
          "The template name must match one the CA allows the account to enrol against. Enrolment rights on a template with domain-controller authentication enabled are what make this valuable.",
      },
      {
        title: "Authenticate with the certificate",
        command: "certipy-ad auth -pfx administrator.pfx -dc <dc.domain>",
        detail:
          "The resulting PKCS#12 bundle authenticates as the identity in the certificate. This is the step that turns the certificate from a file into a session.",
      },
    ],
    useCases: [
      "Enumerate Active Directory Certificate Services",
      "Find users who can enrol in dangerous certificate templates",
      "Abuse MS-DRSR to add shadow credentials to machine accounts",
      "Authenticate with a certificate that carries a chosen identity",
    ],
    notes:
      "Almost every operation needs valid domain credentials, and enumeration against a CA produces a burst of authentication and directory queries. The tool does nothing at all in an environment without AD CS, so confirm the CA exists before spending time on it.",
  },
  {
    slug: "checkov",
    name: "Checkov",
    category: "cloud",
    summary:
      "Checkov is an open-source policy engine that scans infrastructure-as-code, container images and Kubernetes manifests for misconfigurations. It ships with a large library of built-in checks mapped to CIS, NIST and provider best practices, and it understands Terraform, CloudFormation, Dockerfile, Helm and ARM templates among others. Because it can read a Terraform plan file, it reports what a deployment would actually create rather than what the source appears to say. It is the tool to run when the question is whether the cloud estate matches policy.",
    install: [
      "pip install checkov",
      "pipx install checkov",
      "brew install checkov",
    ],
    usage: [
      {
        title: "Scan a directory",
        command: "checkov -d .",
        detail:
          "Pointing it at the root of a repository scans every supported file it finds. The output groups failures by check ID, and the same ID can be suppressed inline if the finding is a deliberate exception.",
      },
      {
        title: "Scan a single Terraform file",
        command: "checkov -f main.tf",
        detail:
          "Scanning one file is useful while iterating on a specific resource. The failing checks print the offending lines directly.",
      },
      {
        title: "Scan a Terraform plan",
        command: "terraform plan -out tf.plan && checkov -f tf.plan",
        detail:
          "A plan file describes the resources that would be created, including values that only exist after interpolation. This catches problems the source never showed.",
      },
      {
        title: "Limit to one framework and provider",
        command: "checkov -d . --framework terraform --skip-path ./.terraform",
        detail:
          "Skipping the state and module cache directories keeps the output focused. Without it the report fills with findings about downloaded dependencies.",
      },
      {
        title: "Run custom policy checks",
        command: "checkov -d . --external-checks-dir ./custom_checks --check CUSTOM-1,CUSTOM-2",
        detail:
          "Custom Python checks let you encode rules specific to your organisation. The --check flag then runs only those, which keeps a policy-as-code suite fast.",
      },
    ],
    useCases: [
      "Scan Terraform, CloudFormation and Kubernetes for misconfiguration",
      "Enforce a specific set of checks in CI",
      "Write organisation-specific policies as Python checks",
      "Audit container images and Dockerfiles for build issues",
    ],
    notes:
      "Generic checks fire on custom modules and unusual but valid patterns, so the default output needs tuning against your own baselines before it becomes a pipeline blocker. It reasons about what is written in files, not about the running estate, so drift between code and reality is completely invisible to it.",
  },
  {
    slug: "crackmapexec",
    name: "CrackMapExec",
    category: "post-exploitation",
    summary:
      "CrackMapExec automates the repetitive parts of testing a Windows network over SMB, LDAP and WinRM: spraying one password across many hosts, listing shares and pulling the SAM or NTDS remotely once you have the rights. It handles multihost targets in parallel, which is why it became the default tool for moving from a single credential to every machine of that type. It accepts Kerberos tickets and hashes as well as passwords. It is the tool that answers the question 'how far does this one credential actually go'.",
    install: [
      "pipx install crackmapexec",
      "pip install crackmapexec",
    ],
    usage: [
      {
        title: "Authenticate against a host",
        command: "crackmapexec smb <target> -u <user> -p '<password>'",
        detail:
          "The output ends with a summary of successful logins, local administrators and other useful markers. Use the -x flag to add a module such as whoami to run on the successful hosts.",
      },
      {
        title: "List SMB shares",
        command: "crackmapexec smb <target> -u <user> -p '<password>' --shares",
        detail:
          "Shares are listed per host with their permissions. Interesting-looking names are worth a closer look even when the permissions are not obviously broken.",
      },
      {
        title: "Authenticate with a hash",
        command: "crackmapexec smb <target> -u <user> -H <hash>",
        detail:
          "Passing an NT hash works because it is the same material a password would produce, so this turns a hash you found elsewhere into a working session.",
      },
      {
        title: "Test a range of hosts at once",
        command: "crackmapexec smb 10.0.0.0/24 -u <user> -p '<password>' --local-auth",
        detail:
          "Multiple targets and the --local-auth flag push the authentication attempt to each machine locally. The output is the fastest way to find every machine that accepts the same local administrator password.",
      },
      {
        title: "Dump the remote SAM",
        command: "crackmapexec smb <target> -u <user> -p '<password>' --sam",
        detail:
          "With the right privileges this returns the local account hashes of the target. It is loud: endpoint products watch for exactly this request pattern.",
      },
    ],
    useCases: [
      "Spray one credential across a Windows network",
      "Map SMB share exposure across many hosts",
      "Extract remote SAM data with valid privileges",
      "Execute a command over WinRM on authenticated hosts",
    ],
    notes:
      "CrackMapExec was renamed NetExec by the same author and the original project is no longer maintained — install `netexec` with pipx and use the netexec command, which has safer defaults and cleaner output. Remote SAM and NTDS extraction is detected by endpoint products by design, and spraying a domain is precisely the pattern lockout policies exist to catch.",
  },
  {
    slug: "dalfox",
    name: "Dalfox",
    category: "web",
    summary:
      "Dalfox is a Go-based XSS scanner that parses a URL, injects payloads into every parameter and reports the ones that survive into the response. It handles the awkward cases — HTML-encoded output, attribute context, JavaScript string context — considerably better than a naive reflection check, and it tries to confirm that a payload actually fires rather than merely reflecting. It is written for the modern workflow of piping a URL in and reading JSON output. It is one of the fastest ways to establish whether a reflected parameter is genuinely exploitable.",
    install: [
      "go install github.com/hahwul/dalfox/v2@latest",
      "brew install dalfox",
    ],
    usage: [
      {
        title: "Scan a URL",
        command: "dalfox url <url>",
        detail:
          "Every parameter in the URL is tested and each confirmed finding is printed with its type. This is the command you run once you know the endpoint is worth attacking.",
      },
      {
        title: "Output only proof of concept",
        command: "dalfox url <url> --only-poc --silence",
        detail:
          "Only the payloads that worked are printed, which makes the output small enough to paste into a finding write-up.",
      },
      {
        title: "Save results as JSON",
        command: "dalfox url <url> -F json -o dalfox.json",
        detail:
          "The JSON output carries the type, the parameter and the injected value for each finding, which makes it straightforward to feed into a report or another tool.",
      },
      {
        title: "Test a parameter in a POST request",
        command: "dalfox url <url> -d 'user=<user>&q=test'",
        detail:
          "Supplying a request body covers the parameters that never appear in the URL, including those set by a JavaScript form.",
      },
      {
        title: "Check for blind injection points",
        command: "dalfox url <url> --blind",
        detail:
          "Blind testing reports parameters that behave differently but do not reflect the payload. It needs an external callback service to be useful.",
      },
    ],
    useCases: [
      "Confirm reflected XSS in URL parameters",
      "Test POST bodies and JSON endpoints for injection",
      "Produce machine-readable findings for a report",
      "Find injection points that only reflect on certain headers",
    ],
    notes:
      "Findings are context-dependent: a reported payload may still be neutralised by a WAF or an input sanitizer sitting in front of the application, so confirm it in a browser before reporting. Parameters set by JavaScript after page load are out of reach, and heavily encoded or JSON-only responses often defeat the parser.",
  },
  {
    slug: "dig",
    name: "Dig",
    category: "recon",
    summary:
      "Dig is the DNS query tool, and it is still the fastest way to answer questions about how a domain is delegated, which nameservers answer for it and what records point where. It gives full control over record type, queried server and query flags, which lets you force a specific authoritative server or walk the delegation chain from the root. It also shows TTLs and CNAME chains, useful for spotting a CDN or third-party SaaS sitting in front of an origin. It is the DNS tool you will reach for more than any other.",
    install: [
      "apt update && apt install -y dnsutils",
      "yum install -y bind-utils",
      "brew install bind   # macOS already ships dig",
    ],
    usage: [
      {
        title: "Query a domain",
        command: "dig <domain>",
        detail:
          "The full answer includes the query flags, the answer section and the authority and additional sections. The SERVER and flags line tells you whether recursion was used.",
      },
      {
        title: "Get just the addresses",
        command: "dig <domain> +short",
        detail:
          "The short format prints only the answer records, one per line, which is what you want when the output is going into a file or a pipeline.",
      },
      {
        title: "Check mail routing",
        command: "dig <domain> MX +short",
        detail:
          "The preference values and hosts reveal the mail providers in use. This is often the quickest way to spot a third-party mail service that shares the same domain.",
      },
      {
        title: "Query one nameserver directly",
        command: "dig @<ns> <domain> +norecurse",
        detail:
          "Asking a specific server without recursion is how you compare what the authoritative answer is against what a resolver cached.",
      },
      {
        title: "Test a zone transfer",
        command: "dig @<ns> <domain> axfr",
        detail:
          "A successful transfer hands over every record in the zone. Only try this against servers you are authorised to assess, and expect it to be logged.",
      },
    ],
    useCases: [
      "Check delegation, nameservers and glue records",
      "Identify mail providers and CDN front ends",
      "Compare authoritative and cached answers",
      "Test whether a nameserver allows zone transfers",
    ],
    notes:
      "A large share of surprising 'no answer' results come from caching, so use +trace or query the authoritative server directly when something looks wrong. Zone transfer attempts are logged and occasionally blocked, and ANY queries are now commonly refused outright by authoritative servers.",
  },
  {
    slug: "enum4linux",
    name: "Enum4linux",
    category: "network",
    summary:
      "Enum4linux automates the SMB enumeration that net use and smbclient otherwise force you to do by hand: share listings, session and share permissions, group and user enumeration, and policy or GPO reads. It works over SMB2 with either credentials or a null session, which makes it a quick check for anonymous exposure on a Windows file server. The recursive directory listing it can produce is also the fastest way to spot files that were never meant to be shared. It is a small, dependable tool that has been in everyone's kit for a decade.",
    install: [
      "pip install enum4linux",
      "git clone https://github.com/davedittrich/Enum4linux.git && cd Enum4linux",
    ],
    usage: [
      {
        title: "Full enumeration with credentials",
        command: "enum4linux -u <user> -p '<password>' <target>",
        detail:
          "This runs every module the script has: shares, groups, users, policies and file listings. On a large server the recursive file listing is slow, so interrupt it once you have what you need.",
      },
      {
        title: "List shares only",
        command: "enum4linux -u <user> -p '<password>' -S <target>",
        detail:
          "Share enumeration on its own is fast and gives you the list to work from. Read the permissions column rather than just hunting for names.",
      },
      {
        title: "Enumerate users with a null session",
        command: "enum4linux -U <target>",
        detail:
          "No credentials are needed for this if the server allows anonymous access, which is still common on older hosts and misconfigured shares.",
      },
      {
        title: "Enumerate group membership",
        command: "enum4linux -u <user> -p '<password>' -G <target>",
        detail:
          "Group membership explains why an account has the access it does. Domain Admins or a broadly delegated custom group is where the interesting answers live.",
      },
      {
        title: "Enumerate files in shares",
        command: "enum4linux -u <user> -p '<password>' -F <target>",
        detail:
          "The file listing recurses into every readable share and names every file it finds, which is how sensitive documents get discovered without any vulnerability at all.",
      },
    ],
    useCases: [
      "Enumerate SMB shares with or without credentials",
      "Check for anonymous session access to file servers",
      "Map user and group membership over SMB",
      "Find sensitive files exposed through shared folders",
    ],
    notes:
      "The project has moved between maintainers, and the classic script still falls back to SMB1 on some builds, so pass -m for SMB2 when the server has it turned off. Every enumeration attempt is a logged authentication event, so run it against infrastructure you are authorised to test.",
  },
  {
    slug: "evil-winrm",
    name: "Evil-WinRM",
    category: "post-exploitation",
    summary:
      "Evil-WinRM is a Ruby tool that opens an interactive PowerShell session over WinRM using a password, a hash or a client certificate. It adds the conveniences testers want on top of a plain WinRS shell: a useful prompt, a menu of common scripts and optional evasion modules. It is the fastest way to move from 'I have valid Windows credentials' to a working shell without deploying a custom implant. It remains the standard way to demonstrate what domain credentials are actually worth.",
    install: [
      "sudo apt install -y ruby ruby-dev && gem install evil-winrm --no-document",
      "git clone https://github.com/PowerShellMafia/Evil-WinRM.git && cd Evil-WinRM && bundle install",
      "brew install ruby && gem install evil-winrm --no-document",
    ],
    usage: [
      {
        title: "Connect with a password",
        command: "evil-winrm -i <ip> -u <user> -p '<password>'",
        detail:
          "You land in an interactive PowerShell session on the remote host. The prompt shows the host and user you are running as.",
      },
      {
        title: "Connect with an NT hash",
        command: "evil-winrm -i <ip> -u <user> -H <hash>",
        detail:
          "Passing the hash removes the need for the plaintext password, which is often all you have once you have cracked or extracted it.",
      },
      {
        title: "Connect with a client certificate",
        command: "evil-winrm -i <ip> -u <user> -c client.pem -k client.key",
        detail:
          "Certificate authentication is the modern path and the one most hardened environments still have to support for administrators.",
      },
      {
        title: "Load your own script directory",
        command: "evil-winrm -i <ip> -u <user> -p '<password>' -s ./scripts",
        detail:
          "Any executable in the supplied directory becomes available as a shortcut inside the shell. It keeps a small set of your own utilities to hand.",
      },
      {
        title: "Connect over HTTPS",
        command: "evil-winrm -i <ip> -u <user> -p '<password>' -S",
        detail:
          "The -S flag switches to TLS on the HTTPS listener, which is the configuration most organisations have standardised on.",
      },
    ],
    useCases: [
      "Obtain an interactive PowerShell session with valid credentials",
      "Demonstrate the impact of a compromised domain account",
      "Connect using a certificate instead of a password",
      "Move laterally from one authenticated Windows host to another",
    ],
    notes:
      "WinRM must be enabled and reachable on 5985 or 5986, and the service must accept the authentication type you are using — many hardened configurations reject NTLM outright. Its AMSI and ETW bypass modules are exactly the pattern endpoint detection looks for, so expect an alert the moment you load them.",
  },
  {
    slug: "feroxbuster",
    name: "Feroxbuster",
    category: "web",
    summary:
      "Feroxbuster is a recursive content discovery tool that keeps walking into the directories it finds, so one wordlist turns into a full directory tree instead of a flat list of hits. It runs a threaded scanner that stays fast even while recursing, and it applies the same filters — status code, size, extensions — at every level. It also produces a wordlist of discovered URLs that feeds straight into the rest of a workflow. It is a good default for content discovery against a large application.",
    install: [
      "apt update && apt install -y feroxbuster",
      "brew install feroxbuster",
      "cargo install feroxbuster",
    ],
    usage: [
      {
        title: "Discover content",
        command: "feroxbuster -u <url> -w wordlist.txt",
        detail:
          "The scanner reports every discovered path with its status code, content length and response time. Response time is worth watching, because a consistent delay often means the server is doing something.",
      },
      {
        title: "Limit the recursion depth",
        command: "feroxbuster -u <url> -w wordlist.txt --depth 3",
        detail:
          "Depth control keeps a single command from walking the entire site. A depth of two or three finds most of what matters without the runtime.",
      },
      {
        title: "Add file extensions",
        command: "feroxbuster -u <url> -w wordlist.txt -x php,html,txt",
        detail:
          "Appending extensions catches the back-up and configuration files that never appear in a plain wordlist. It roughly triples the request count, so keep the list short when using it.",
      },
      {
        title: "Filter out noise by size",
        command: "feroxbuster -u <url> -w wordlist.txt --filter-size 1024",
        detail:
          "Soft-404 pages all share a length, so filtering on that size removes them. Find the noise size by requesting a path you know does not exist and reading the Content-Length.",
      },
      {
        title: "Keep the scan on the same host",
        command: "feroxbuster -u <url> -w wordlist.txt --same-host --depth 2",
        detail:
          "Without this, a redirect or an absolute link can lead the crawler to a host that was never in scope. Same-host plus a depth limit is the combination to use on a real engagement.",
      },
    ],
    useCases: [
      "Discover hidden directories and files recursively",
      "Find backup and configuration files by extension",
      "Map the structure of an unauthenticated application",
      "Generate a URL list for follow-up scanning",
    ],
    notes:
      "Recursive discovery will follow redirects into hosts you never scoped, so use --same-host and a depth limit. Matching relies on status code and response length, so a soft-404 returning 200 floods the output until you calibrate the filter against a known missing path.",
  },
  {
    slug: "ffuf",
    name: "FFUF",
    category: "web",
    summary:
      "FFUF is built around a simple idea: a web path is a template with a marker in it, and the rest of the request can be as simple or as complicated as you like. You point it at a URL containing FUZZ and it substitutes every word in a list, optionally appending extensions and comparing responses to find the interesting ones. Its match and filter rules are the key — status code, response size and word count let you discard the noise a wordlist generates. It is fast enough to run a large list repeatedly and useful enough to keep in a pipeline.",
    install: [
      "go install github.com/ffuf/ffuf/v2@latest",
      "brew install ffuf",
    ],
    usage: [
      {
        title: "Fuzz a path",
        command: "ffuf -u <url>/FUZZ -w wordlist.txt",
        detail:
          "FFUF substitutes the wordlist entries into the marked location and prints each hit with its status, size and words. Without a filter this output is mostly noise.",
      },
      {
        title: "Match and filter by status code",
        command: "ffuf -u <url>/FUZZ -w wordlist.txt -mc 200,204,301,302,401,403 -fc 404",
        detail:
          "Matching keeps the interesting statuses and filtering removes the ones you do not care about. 403 responses are worth keeping, since a forbidden directory is often a misconfigured one.",
      },
      {
        title: "Auto-calibrate against a random path",
        command: "ffuf -u <url>/FUZZ -w wordlist.txt -ac",
        detail:
          "Calibration requests a random path, measures the response and filters out everything that looks the same. It is the quickest fix for applications that answer every request with 200.",
      },
      {
        title: "Fuzz with file extensions",
        command: "ffuf -u <url>/FUZZ -w wordlist.txt -e .php,.html,.bak",
        detail:
          "The extension list is appended to each word. It multiplies the request count, so pair it with a shorter wordlist.",
      },
      {
        title: "Fuzz a header value",
        command: "ffuf -u <url> -w wordlist.txt -H 'X-Forwarded-For: FUZZ' -mc all -fs 0",
        detail:
          "Markers work in headers as well as in the path, which is how you test host header injection and similar trust issues.",
      },
    ],
    useCases: [
      "Discover hidden paths and files in an application",
      "Fuzz parameters, headers and virtual hosts",
      "Find backup and configuration files by extension",
      "Test for soft-404 handling that hides real content",
    ],
    notes:
      "Without a filter, a soft-404 that returns HTTP 200 fills the results with false hits — use -ac to calibrate or -fs to drop the noise size. Recursion can escape the intended scope through redirects or absolute links, so bound it with -recursion-depth and check the request log before leaving it running.",
  },
  {
    slug: "foremost",
    name: "Foremost",
    category: "forensics",
    summary:
      "Foremost carves files out of raw data using a configuration of header and footer signatures, recovering documents and media that a deleted file left behind in unallocated space. It works against disk images, memory dumps and other binary data, and it writes each recovered file into its own directory for inspection. It is one of the oldest carving tools and still the fastest way to answer the question 'were there ever any files here' during a forensic triage. It is usually one of the first commands you run after imaging a system.",
    install: [
      "apt update && apt install -y foremost",
      "brew install foremost",
      "yum install -y foremost",
    ],
    usage: [
      {
        title: "Carve a disk image",
        command: "foremost -i disk.img -o output/",
        detail:
          "The output directory is created and filled with one folder per file type. The audit log written alongside it records how many files of each type were recovered.",
      },
      {
        title: "Limit to specific file types",
        command: "foremost -i disk.img -o output/ -t jpg,png,pdf",
        detail:
          "Restricting the types keeps the run fast and the results readable. It is also useful when you know what you are looking for.",
      },
      {
        title: "Carve from a memory dump",
        command: "foremost -i memory.raw -o output/",
        detail:
          "A memory image often contains documents that were opened and cached but never written to disk, which is exactly the material a disk image no longer holds.",
      },
      {
        title: "Use a custom signature configuration",
        command: "foremost -c carve.conf -i disk.img -o output/",
        detail:
          "The default configuration covers common formats. A custom file lets you carve a proprietary container that only you know the header of.",
      },
      {
        title: "Carve only from a region of the image",
        command: "foremost -i disk.img -o output/ -s 1048576",
        detail:
          "Starting at a byte offset limits the scan when you have already located the interesting partition or area of the disk.",
      },
    ],
    useCases: [
      "Recover deleted documents from a disk image",
      "Extract files from a memory dump",
      "Triage an image before deeper forensic analysis",
      "Carve files with custom signatures",
    ],
    notes:
      "Carving is signature-based, so re-encoded, compressed or partially overwritten files are missed and recovered files may be truncated. It needs read access to the entire image, which in practice means running it as root against a raw device or an image file.",
  },
  {
    slug: "gitleaks",
    name: "Gitleaks",
    category: "vulnerability-management",
    summary:
      "Gitleaks scans git history for secrets — API keys, passwords, private keys and tokens — that were committed and later removed. Because the content still lives in the object database, deleting the file in a later commit does not remove the secret, which is precisely the case a working-directory scan misses. It can scan a local clone, a commit range or a remote repository, and it can redact matched values so a report is safe to share. It belongs in CI as much as it belongs in a review of a codebase you were handed.",
    install: [
      "brew install gitleaks",
      "go install github.com/gitleaks/gitleaks/v8@latest",
      "curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/main/install.sh | sh -s -- -b /usr/local/bin",
    ],
    usage: [
      {
        title: "Scan the full history of a repository",
        command: "gitleaks detect --source . --redact",
        detail:
          "The detect command walks the commit history and reports every match. Redaction replaces the secret itself so the output can be pasted into a ticket.",
      },
      {
        title: "Scan the working tree only",
        command: "gitleaks detect --source . --no-git --redact -v",
        detail:
          "Skipping the history makes it fast enough for a pre-commit hook. It will not find anything that was already removed in an earlier commit.",
      },
      {
        title: "Scan a commit range",
        command: "gitleaks detect --source . --log-opts='v1.0.0..v2.0.0' --redact",
        detail:
          "Reviewing what changed between two tags is the practical way to check a release branch without rescanning years of history.",
      },
      {
        title: "Use a custom configuration",
        command: "gitleaks detect --source . --config .gitleaks.toml --redact",
        detail:
          "The configuration file controls the rules and allowlists. Without one, test fixtures and example keys produce noise that gets the tool ignored.",
      },
      {
        title: "Fail a pipeline on findings",
        command: "gitleaks detect --source . --exit-code 1 --redact",
        detail:
          "A non-zero exit code is what turns a scan into a gate. Wire it into the pipeline and the report lands as a build failure.",
      },
    ],
    useCases: [
      "Find leaked credentials in a repository's history",
      "Gate commits in CI against secret leakage",
      "Audit a codebase handed over for review",
      "Produce a redacted list of exposed keys to rotate",
    ],
    notes:
      "Detection is a mix of regular expressions and entropy scoring, so high-entropy custom tokens can slip through while test fixtures and documentation examples produce noise. It cannot tell you whether a key is still valid, so treat every hit as needing rotation or revocation until someone confirms otherwise.",
  },
  {
    slug: "gobuster",
    name: "Gobuster",
    category: "web",
    summary:
      "Gobuster is a directory, file, virtual host and DNS brute-forcer that grew out of dirb and gained the pace and flexibility people wanted. Its modes cover the four things worth brute-forcing: content paths, virtual hosts, subdomains and, in v3, cloud storage buckets. It is straightforward to point at a target, give it a wordlist and read the results. It is the tool for finding the path a developer forgot to take down.",
    install: [
      "go install github.com/OJ/gobuster/v3@latest",
      "brew install gobuster",
      "apt update && apt install -y gobuster",
    ],
    usage: [
      {
        title: "Find content paths",
        command: "gobuster dir -u <url> -w wordlist.txt",
        detail:
          "The dir mode requests each word and reports anything that is not a 404. Add -x to also test file extensions.",
      },
      {
        title: "Search for files by extension",
        command: "gobuster dir -u <url> -w wordlist.txt -x php,txt,html,bak",
        detail:
          "Extension testing is how back-up and configuration files get found. Keep the extension list short, since every entry multiplies the request count.",
      },
      {
        title: "Discover virtual hosts",
        command: "gobuster vhost -u <url> -w hosts.txt",
        detail:
          "Each candidate is sent in the Host header while the URL stays the same, so a response that differs in length or status reveals a different virtual host.",
      },
      {
        title: "Enumerate subdomains",
        command: "gobuster dns -d <domain> -w subdomains.txt",
        detail:
          "The dns mode resolves each candidate name and reports the ones that exist. It generates real queries against the authoritative servers.",
      },
      {
        title: "Tune the request rate",
        command: "gobuster dir -u <url> -w wordlist.txt -t 50 --no-error",
        detail:
          "Thread count and the error suppression flag decide how noisy and how fast the run is. On a monitored application keep the thread count low.",
      },
    ],
    useCases: [
      "Discover hidden directories and files",
      "Enumerate virtual hosts on a shared IP",
      "Brute-force subdomains with DNS resolution",
      "Find forgotten backup and configuration files",
    ],
    notes:
      "Virtual host brute forcing can generate thousands of requests to a host that never intended to serve them, and DNS mode hammers the authoritative servers, so pace both. A wrong guess often returns a redirect to a login page rather than a clean 404, which means status code alone does not tell you what is real.",
  },
  {
    slug: "grype",
    name: "Grype",
    category: "container",
    summary:
      "Grype scans container images, directories and software bills of materials for packages that match a known vulnerability. It is built around Syft's inventory format, so an SBOM produced by Syft can be scanned later and offline without pulling the image again. It matches the installed packages against the Grype vulnerability database and reports the version that fixes each issue where one exists. It is the tool for answering what is actually installed and which of those versions are known bad.",
    install: [
      "brew install grype",
      "curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin",
      "go install github.com/anchore/grype/cmd/grype@latest",
    ],
    usage: [
      {
        title: "Scan a container image",
        command: "grype <image>:<tag>",
        detail:
          "Grype pulls the image metadata and reports every package that matches an advisory. The summary at the end breaks the findings down by severity.",
      },
      {
        title: "Scan a directory on disk",
        command: "grype dir:.",
        detail:
          "This covers a checked-out repository, so a dependency file or a vendored binary can be assessed before anything is built.",
      },
      {
        title: "Scan an existing SBOM",
        command: "grype sbom:sbom.json",
        detail:
          "Scanning an SBOM needs no registry access at all, which makes it the right approach in an air-gapped pipeline and for repeat audits.",
      },
      {
        title: "Produce JSON output",
        command: "grype <image>:<tag> -o json -o grype.json",
        detail:
          "The JSON report carries the matched package, the vulnerability identifier and the fix version, which is what you want to attach to a finding.",
      },
      {
        title: "Fail only on serious findings",
        command: "grype <image>:<tag> --fail-on high",
        detail:
          "Setting the failure threshold is what turns the scan into a gate. Leaving it unset means the command always exits zero regardless of the findings.",
      },
    ],
    useCases: [
      "Find known vulnerabilities in a container image",
      "Audit dependencies in a source tree",
      "Re-scan a stored SBOM without registry access",
      "Gate a build on high-severity findings",
    ],
    notes:
      "Match quality is limited by the advisory data — CPE-based records produce false positives when a package has been rebranded or repackaged, and a custom build with an upstream-looking version string will look vulnerable when it is not. Keep the database current with `grype db update` and treat the output as a prioritisation aid rather than a verdict.",
  },
  {
    slug: "hashcat",
    name: "Hashcat",
    category: "password",
    summary:
      "Hashcat is the fastest general-purpose password cracker available, using GPU parallelism to work through enormous keyspaces against a captured hash. Once you have a hash and know its type, you select the mode and point hashcat at a wordlist, a rule set or a mask, and it does the rest at whatever speed the hardware allows. The mode number is the detail that matters most: NTLM is 1000, NetNTLMv2 is 3200 and Kerberos TGS-REP is 1400, and the wrong one wastes the entire run. It is the last step in almost every credential recovery path.",
    install: [
      "apt update && apt install -y hashcat",
      "brew install hashcat",
    ],
    usage: [
      {
        title: "List the available modes",
        command: "hashcat --help",
        detail:
          "The mode list is the single most useful reference when you are handed a hash of unknown type. Mode numbers have moved between releases, so check your installed version.",
      },
      {
        title: "Crack an NTLM hash",
        command: "hashcat -m 1000 <hash> wordlist.txt",
        detail:
          "Mode 1000 is NTLM, the hash format you get out of a Windows domain or a local SAM dump. A plain wordlist run is fast because the hash is unsalted.",
      },
      {
        title: "Crack a NetNTLMv2 response",
        command: "hashcat -m 3200 <hash> wordlist.txt",
        detail:
          "NetNTLMv2 responses are captured over the wire and include a challenge. They are harder to crack than NTLM but still fall to a decent wordlist.",
      },
      {
        title: "Crack a Kerberos TGS-REP",
        command: "hashcat -m 1400 <hash> wordlist.txt",
        detail:
          "The 1400 mode covers the ticket-granting service response, which is the format a Kerberoasting attack produces.",
      },
      {
        title: "Crack a WPA2 handshake",
        command: "hashcat -m 22000 <hash> wordlist.txt",
        detail:
          "Mode 22000 handles the PMKID and EAPOL formats. The value is the PMKID and the salt is the access point name, so the format is easy to get wrong.",
      },
    ],
    useCases: [
      "Recover plaintext from captured password hashes",
      "Attack NTLM, Kerberos and NetNTLM hashes",
      "Crack a WPA2 handshake or PMKID",
      "Test a wordlist or rule set against a known hash",
    ],
    notes:
      "Hashcat will drive a GPU hard enough to freeze a desktop, so set the workload and device limits with -w and -D before a long run. Only crack hashes you are authorised to crack, and remember that a correct-looking result still has to be verified against the service it unlocks.",
  },
  {
    slug: "httpx",
    name: "Httpx",
    category: "web",
    summary:
      "Httpx is a fast HTTP prober that takes a list of hosts and tells you which of them answer, on which status code, with which title, technologies and redirect chain. It is designed to run over hundreds or thousands of hosts without becoming the slowest stage of a pipeline, and it emits machine-readable JSON when you need it downstream. Title, technology and web-server detection are what turn a list of addresses into a triage list. It is usually the second stage of a pipeline, straight after subdomain enumeration.",
    install: [
      "go install github.com/projectdiscovery/httpx/cmd/httpx@latest",
      "brew install httpx",
      "docker pull projectdiscovery/httpx",
    ],
    usage: [
      {
        title: "Probe a list of hosts",
        command: "httpx -l hosts.txt -silent",
        detail:
          "Silent mode prints only the hosts that responded. It is the fastest way to reduce a thousand candidate names to a few dozen live ones.",
      },
      {
        title: "Probe a single URL with detail",
        command: "httpx -u <url> -status-code -title -tech-detect -follow-redirects",
        detail:
          "The single-URL mode prints a full picture of the response. Following redirects is worth doing because the interesting host is often the one at the end of the chain.",
      },
      {
        title: "Emit JSON for the next stage",
        command: "httpx -l hosts.txt -json -o live.json",
        detail:
          "The JSON records carry the URL, status, title, technologies and the resolved address, so a triage script can sort on them instead of parsing text.",
      },
      {
        title: "Probe common ports",
        command: "httpx -l hosts.txt -ports 80,443,8080,8443 -silent",
        detail:
          "Port probing on the same list catches hosts running a web service somewhere other than the default port, which are frequently forgotten about.",
      },
      {
        title: "Match on a specific status code",
        command: "httpx -l hosts.txt -mc 200,401,403 -silent",
        detail:
          "Restricting the match narrows the output to genuinely interesting responses. A login page returning 401 or a misconfigured directory returning 403 is worth a closer look.",
      },
    ],
    useCases: [
      "Find live web hosts from a list of names",
      "Collect titles, technologies and status codes",
      "Produce JSON input for an active scanner",
      "Probe non-standard web ports on known hosts",
    ],
    notes:
      "High concurrency and default headers make httpx look like a scanner, which rate limiters and WAFs will notice — pace it on a site you care about. Technology detection is heuristic and regularly misidentifies reverse proxies and CDNs, so treat the tech field as a hint rather than a fact.",
  },
  {
    slug: "hydra",
    name: "Hydra",
    category: "password",
    summary:
      "Hydra is the classic online brute-forcer, and it is still the right tool when you have a live service rather than a hash. It speaks a wide range of protocols — SSH, FTP, SMTP, RDP, HTTP form posts and more — and it can vary the username, the password or both from wordlists. The syntax is uniform enough to transfer between services, which is exactly why it has survived unchanged for two decades. It remains useful for a small set of accounts and for confirming weak credentials on a service you own.",
    install: [
      "apt update && apt install -y hydra",
      "brew install hydra",
      "yum install -y hydra",
    ],
    usage: [
      {
        title: "Attack SSH with a password list",
        command: "hydra -l <user> -P passwords.txt <target> ssh",
        detail:
          "One username against many passwords. The output shows which combination worked, if any.",
      },
      {
        title: "Attack with a list of usernames",
        command: "hydra -L users.txt -P passwords.txt <target> ssh -t 4",
        detail:
          "This is credential stuffing in shape, so keep the thread count low and the list small. Against a domain with lockout policies it will disable accounts.",
      },
      {
        title: "Test a single password against a service",
        command: "hydra -l <user> -p '<password>' <target> ftp",
        detail:
          "A single pair is a targeted check rather than a brute force, and it is fast enough to run against a range of services.",
      },
      {
        title: "Attack a web login form",
        command: "hydra -l <user> -p '<password>' <target> http-post-form '/login.php:user=^USER^&pass=^PASS^:F=incorrect'",
        detail:
          "The module string is the login path, the parameter pair, and the text that appears in a failed response. A captcha or a multi-step form breaks this approach entirely.",
      },
      {
        title: "Stop on the first success",
        command: "hydra -l <user> -P passwords.txt <target> ssh -F",
        detail:
          "The -F flag exits as soon as a credential succeeds, which limits the number of failed logins a successful account accumulates.",
      },
    ],
    useCases: [
      "Test weak passwords on a service you own",
      "Confirm a credential against a live protocol",
      "Test a web application's login form",
      "Check a single account across many hosts",
    ],
    notes:
      "Hydra generates a lot of failed logins: against a domain with lockout it will disable accounts, and against a web application it looks exactly like a credential-stuffing attack. Keep the thread count low, and remember that rate limiting or a captcha turns this into a very slow test rather than a useful one.",
  },
  {
    slug: "impacket",
    name: "Impacket",
    category: "post-exploitation",
    summary:
      "Impacket is a collection of Python classes and example scripts for working with Windows network protocols at a low level, and it has become the default toolbox for attacking and auditing Active Directory. Secretsdump, psexec, wmiexec, smbclient and the Kerberos tooling cover everything from credential extraction to remote execution to ticket forgery. Because it is all implemented in Python, you can read the exact protocol exchange and adapt a script rather than treating it as a black box. It is the toolkit to learn properly if you work with Windows networks.",
    install: [
      "python3 -m venv ~/venvs/impacket && source ~/venvs/impacket/bin/activate && pip install impacket",
      "pip install impacket",
      "git clone https://github.com/fortra/impacket.git && cd impacket && pip install -e .",
    ],
    usage: [
      {
        title: "Dump domain secrets",
        command: "impacket-secretsdump <domain>/<user>:<password>@<dc.domain>",
        detail:
          "The modern target syntax accepts a full domain, user and password in one argument. The output separates the NTDS hashes, the SAM and the kerberos tickets.",
      },
      {
        title: "Dump the local SAM",
        command: "impacket-secretsdump <domain>/<user>:<password>@<target> -sam",
        detail:
          "The -sam flag limits the run to the machine's local accounts. It needs administrative rights on the target, which is exactly why it is interesting.",
      },
      {
        title: "Execute a command over SMB",
        command: "impacket-psexec <domain>/<user>:<password>@<host> 'whoami'",
        detail:
          "Psexec creates a service to run the command and then cleans up. The service creation is the signature most endpoint products look for.",
      },
      {
        title: "Execute a command over WMI",
        command: "impacket-wmiexec <domain>/<user>:<password>@<host> 'whoami'",
        detail:
          "WMI needs no new service, so it leaves less behind than psexec and is often the quieter of the two.",
      },
      {
        title: "Enumerate users by SID",
        command: "impacket-lookupsid <domain>/<user>:<password>@<dc.domain>",
        detail:
          "Resolving SIDs against the directory uncovers accounts that are hidden from normal enumeration, including ones with unusual names.",
      },
    ],
    useCases: [
      "Extract NTDS, SAM and Kerberos material from a domain",
      "Run commands remotely over SMB or WMI",
      "Enumerate hidden accounts through SID lookups",
      "Build custom protocol tooling from readable Python",
    ],
    notes:
      "Several of these scripts write to disk, create services or perform Kerberos operations that fail silently when the clock is skewed, so keep your time synchronised with the domain. The example scripts are also named inconsistently between releases — check the script list in your installed version rather than trusting a command copied from a tutorial.",
  },
  {
    slug: "jadx",
    name: "JADX",
    category: "mobile",
    summary:
      "JADX decompiles an Android APK back into readable Java-like source, including the resources and a view of the manifest. It is considerably more readable than the smali you get from Apktool, which makes it the tool for tracing logic, checking hardcoded secrets and following API calls through an application. Its GUI cross-references classes with search and a hierarchy view, which is how you follow a flag from the entry point to the check that consumes it. It is the first thing to open when auditing a mobile binary.",
    install: [
      "brew install jadx",
      "sudo unzip jadx-<version>.zip -d /opt && sudo ln -s /opt/jadx-<version>/bin/jadx /usr/local/bin/jadx",
      "git clone https://github.com/skylot/jadx.git && cd jadx && ./gradlew assembleDist   # needs a JDK",
    ],
    usage: [
      {
        title: "Decompile an APK",
        command: "jadx -d out app.apk",
        detail:
          "The output directory contains the reconstructed Java sources and the decoded resources. The manifest is rewritten in readable form at the root of the tree.",
      },
      {
        title: "Decompile without resources",
        command: "jadx --no-res -d out app.apk",
        detail:
          "Skipping resources makes decompilation considerably faster on a large application and leaves you with the code, which is usually what you want.",
      },
      {
        title: "Extract a single class",
        command: "jadx --single-class 'com.example.app.Secret' -d out app.apk",
        detail:
          "Targeting one class is much faster than decompiling the whole package, and it keeps the output reviewable.",
      },
      {
        title: "Enable deobfuscation",
        command: "jadx --deobf -d out app.apk",
        detail:
          "The deobfuscation option renames the meaningless identifiers that obfuscators generate, which makes call chains readable again.",
      },
      {
        title: "Use the graphical interface",
        command: "jadx-gui app.apk",
        detail:
          "The GUI adds a class hierarchy, xrefs and a search across the whole application. It is the fastest way to answer 'where is this string used'.",
      },
    ],
    useCases: [
      "Read an Android application's logic in Java-like source",
      "Find hardcoded secrets and API endpoints",
      "Trace a value through the application's call graph",
      "Audit permissions and exported components",
    ],
    notes:
      "Decompiled code is an approximation and is not recompilable — for anything that needs modifying, work in smali with Apktool instead. Obfuscation and native code push the interesting parts into a shared library you have to analyse separately, and decompilers occasionally produce plausible-looking but wrong control flow.",
  },
  {
    slug: "john-the-ripper",
    name: "John The Ripper",
    category: "password",
    summary:
      "John the Ripper is the venerable offline password cracker, and its real value is format coverage: the Jumbo build knows more hash formats than anything else and will happily identify which one you are looking at. For a single password hash it is the tool you run first, particularly when the format is unusual or the hash came from a Windows host or a network appliance. Rule-based mangling lets a small wordlist cover far more ground than its size suggests. It still earns its place beside the GPU crackers.",
    install: [
      "apt update && apt install -y john",
      "brew install john",
      "git clone https://github.com/openwall/john.git && cd john/src && ./configure && make -s clean && make -sj$(nproc)",
    ],
    usage: [
      {
        title: "Crack a hash with a wordlist",
        command: "john --wordlist=wordlist.txt hash.txt",
        detail:
          "John detects the format from the hash file automatically where it can and reports the cracked result against the original hash.",
      },
      {
        title: "List the supported formats",
        command: "john --list=formats | head -40",
        detail:
          "Format names are easier to work with than the numeric identifiers used by other tools. Grep this list when you are handed an unfamiliar hash.",
      },
      {
        title: "Force a specific format",
        command: "john --format=NT hash.txt",
        detail:
          "Overriding the format avoids the guesswork of auto-detection. NT is the Windows hash, and --format=ntlm or --format=netntlmv2 cover the rest of the family.",
      },
      {
        title: "Apply mangling rules",
        command: "john --wordlist=wordlist.txt --rules hash.txt",
        detail:
          "Rules append digits, swap case and substitute characters, multiplying the effective size of the wordlist without needing a bigger file.",
      },
      {
        title: "Show what was already cracked",
        command: "john --show hash.txt",
        detail:
          "The show command prints the recovered plaintexts from a previous run, so you never have to re-run an expensive crack to check the result.",
      },
    ],
    useCases: [
      "Identify and crack uncommon hash formats",
      "Recover a password from a single captured hash",
      "Test a wordlist and rule set against a known hash",
      "Review previously cracked results",
    ],
    notes:
      "The stock package is limited compared with the Jumbo build, which is the one you almost certainly want for dynamic, PDF or wallet formats. CPU-only cracking of a modern hash is slow, and a single wrong --format choice wastes the entire run without any warning.",
  },
  {
    slug: "joomscan",
    name: "JoomScan",
    category: "web",
    summary:
      "JoomScan was built to fingerprint a Joomla installation, enumerate its components and modules and look for the version-specific weaknesses that come with them. It reports the Joomla version, the loaded extensions and known issues, which is the starting point for deciding whether the installation is worth attacking harder. Running it against a URL takes seconds and produces a report rather than a stream of raw responses. It was one of the earlier CMS scanners and one of the few that stayed Joomla-specific.",
    install: [
      "git clone https://github.com/OWASP/joomscan.git && cd joomscan && sudo ./joomscan.pl -h",
      "sudo apt install -y perl   # the script requires Perl and a few core modules",
    ],
    usage: [
      {
        title: "Scan a Joomla site",
        command: "perl joomscan.pl -u <url>",
        detail:
          "The script reports the Joomla version, the core components and any issues that map to the detected version. The output is grouped by severity.",
      },
      {
        title: "Enforce extension checks",
        command: "perl joomscan.pl -u <url> -ec",
        detail:
          "Extension checks look for the directory and file names that common Joomla components leave behind. They add requests but catch a lot of misconfigured installs.",
      },
      {
        title: "Set a custom user agent",
        command: "perl joomscan.pl -u <url> --user-agent 'Mozilla/5.0'",
        detail:
          "Sites that block the default scanner string will happily answer a normal browser request. Changing the user agent is often enough to get past that.",
      },
      {
        title: "Send the traffic through a proxy",
        command: "perl joomscan.pl -u <url> --proxy http://127.0.0.1:8080",
        detail:
          "Routing through a proxy keeps the source address consistent with the rest of your engagement traffic, or lets you capture the requests for review.",
      },
    ],
    useCases: [
      "Fingerprint a Joomla installation and its version",
      "Enumerate installed Joomla extensions",
      "Check a site against known Joomla issues",
      "Triage a Joomla host before deeper testing",
    ],
    notes:
      "The OWASP project has been unmaintained for years, so it will miss issues in current Joomla releases and its rules are stale — fingerprint the version first and check that version's advisories directly. Extension detection depends on the host revealing its directories, and a hardened site returns nothing useful at all.",
  },
  {
    slug: "katana",
    name: "Katana",
    category: "web",
    summary:
      "Katana is a web crawler built for security testing, which means it understands JavaScript-rendered content, forms, API endpoints and the file-extension guessing a generic crawler skips. It can parse JavaScript for routes and parameters, collect known files from a wordlist, and stay inside the scope you define with crawl and form scope rules. It produces a URL list that feeds straight into an active scanner, so the two stages compose well. It is the crawler to use when a normal spider returns nothing useful.",
    install: [
      "go install github.com/projectdiscovery/katana/cmd/katana@latest",
      "brew install katana",
      "docker pull projectdiscovery/katana",
    ],
    usage: [
      {
        title: "Crawl a site",
        command: "katana -u <url> -d 3",
        detail:
          "A depth of three is usually enough to reach the endpoints that matter without wandering off the site. The output is one URL per line.",
      },
      {
        title: "Parse JavaScript for routes",
        command: "katana -u <url> -jc -d 3",
        detail:
          "JavaScript crawling is what finds the API paths that exist only in a bundle. This is the flag that makes the difference on a modern single-page application.",
      },
      {
        title: "Collect known files",
        command: "katana -u <url> -kf all -d 2",
        detail:
          "The known-files module requests the paths common to a given technology, such as the admin or config endpoints for the detected stack.",
      },
      {
        title: "Crawl a list of URLs",
        command: "katana -list urls.txt -silent -d 2",
        detail:
          "Crawling a list of starting points covers several hosts in one run and deduplicates the output across all of them.",
      },
      {
        title: "Keep the crawl in scope",
        command: "katana -u <url> -cs /app/ -fs /logout -d 3",
        detail:
          "The crawl scope limits which URL prefixes are followed and the form scope excludes matching forms from submission. Without both, a crawler can log itself out or submit real data.",
      },
    ],
    useCases: [
      "Discover routes hidden inside JavaScript bundles",
      "Map the endpoint surface of a web application",
      "Find known files for the detected technology stack",
      "Produce a URL list for an active scanner",
    ],
    notes:
      "A security crawler will follow logout links, submit forms and hit endpoints with side effects, so scope it tightly with -cs and -fs and prefer a test account. Headless mode needs a working Chrome install, and a crawler stuck on a single-page application will hammer the same API for hours without adding coverage.",
  },
];
