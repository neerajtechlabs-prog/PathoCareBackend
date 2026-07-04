# PathCare Multi-Agent System — Developer Guide

Ye document batata hai ki humne jo 9 agents banaye hain, wo actually kaise kaam karte hain, "sync" ka matlab kya hai is context me, aur aapko (developer/founder) roz-roz kya karna padega.

---

## 1. Sabse pehle: ye agents "AI ka background service" nahi hain

Koi server nahi chal raha, koi cron job nahi hai, koi cloud process nahi hai. Har agent **sirf ek `.md` (Markdown) file** hai jisme:
- Ek chhota YAML config (kaun sa naam, kaunse tools use kar sakta hai, kis agent ko handoff kar sakta hai)
- Neeche instructions (persona, rules, working style)

Jab aap VS Code me Copilot Chat kholte ho aur ek agent select karte ho, VS Code us `.md` file ko **us waqt** padh leta hai aur Copilot ko wo instructions bhej deta hai. Bas itna hi hai — koi magic sync, koi background training nahi hota.

**Matlab:** agent "kaam kaise karta hai" — ye sirf is baat pe depend karta hai ki file me kya likha hai, aur file kitni updated hai.

---

## 2. "Sync" ka asli matlab yahan

Kyunki koi server nahi hai, "sync" ka matlab hai **2 cheezein**:

### (a) File location sync (VS Code ko pata hona chahiye files kahan hain)
VS Code sirf in jagah agent files dhoondta hai:
- Har repo ke andar: `<repo>/.github/agents/*.agent.md`
- Workspace settings me explicitly bataye gaye extra locations (`chat.agentFilesLocations`)

Isliye humne `CommondCenter/.github/agents/` folder ko workspace settings me register kiya — warna VS Code use dekhega hi nahi.

**Aapko karna hai:** jab bhi koi naya agent file add karo, ya folder move karo, ek baar **`Developer: Reload Window`** chalao (`Ctrl+Shift+P` se). Bas yahi "sync" hai.

### (b) Git sync (team/backup ke liye)
Agar aap in files ko Git me commit karte ho, to:
- `pathcare-frontend.agent.md` → us repo ke apne git history me jayega (jab aap FrontEnd repo commit/push karo)
- `pathcare-backend.agent.md` → Backend repo ke git history me
- `CommondCenter/` folder — agar ye khud ek git repo hai to alag se commit/push hoga; agar nahi hai, to ye sirf local rahega (dusre machine/laptop pe manually copy karna padega)

**Suggestion:** `CommondCenter` folder ko bhi ek chhota git repo bana do (`git init` andar) aur GitHub pe rakh do — taaki future me kisi aur machine pe ya kisi team-member ko dena ho to bas `git clone` karna pade.

---

## 3. Aapko as developer kya karna padega — Day to Day

### Roz ka kaam shuru karne ka tareeka
1. VS Code kholo, poora `PathCareWorkspace` workspace open karo (teeno folders saath me dikhne chahiye)
2. Copilot Chat panel kholo
3. Agent-picker dropdown se **"PathCare Command Center"** select karo
4. Simply likho jo karna hai: *"Booking section pe kaam karna hai"* ya *"payment webhook me ek bug hai, fix karna hai"*
5. Command Center decide karega routing (business-first ya technical-direct) aur aapse zaroori sawal poochega

### Handoffs kaise kaam karte hain
Jab ek agent apna kaam khatam karta hai, chat me ek **button** dikhega (jaise "Delegate to Product Owner"). Aapko:
- Bas us button pe click karna hai → wo automatically next agent switch kar dega aur context/prompt bhi carry ho jayega
- Kabhi-kabhi agent khud puchega "kya main aage bhej du?" — haan bolna ya button dabana, dono chalega

### Aapka role har step pe
- **Business-relevant feature** → CBO/Product Owner/Business Analyst kaam karenge, lekin agar koi real business decision (pricing, scope-cut) aaye to wo aapse poochenge
- **Technical work** → CTO/Technical Architect/specialists kaam karenge, agar cost/infra decision ho to CTO aapko bataega, aapki haan chahiye hogi
- **Aakhir me** → Command Center hamesha aapse final confirmation lega ("confirm karo to close karein?") — bina aapke haan bole koi feature "done" nahi maana jayega

### Jab aap dusre din wapas aao
Har agent ka context sirf **usi chat conversation** tak seemित hai. Agar aap VS Code band karke agle din wapas aate ho:
- Purani chat history dikhegi (agar tab band nahi kiya), continue kar sakte ho
- Naya chat shuru karoge to Command Center ko phir se thoda context dena padega (jaise "pichle session me humne Booking ka spec finalize kiya tha, ab implementation pe kaam karna hai")

---

## 4. Agent files ko update/maintain kaise karein

### Kisi agent ka behavior change karna ho
1. Us `.agent.md` file ko VS Code me kholo aur edit karo (jaise naya rule add karna, purana constraint hatana)
2. Save karo
3. `Developer: Reload Window` chalao
4. Agla chat session me naya behavior effective ho jayega (purani chat me nahi, sirf naye session me)

### Naya agent add karna ho (future me)
1. Sahi folder me naya `<naam>.agent.md` file banao (kisi existing file ka structure copy karke)
2. Description, tools, aur agar zaroorat ho to `handoffs` likho
3. Existing agents ke `handoffs` me is naye agent ko reference add karo (agar unhe isse baat karni ho)
4. Reload window

### Kya commit karna chahiye Git me
- Haan — ye files **project ka configuration/documentation** hain, inhe commit karna best practice hai. Isse:
  - Kisi doosre laptop pe repo clone karte hi agents ready mil jayenge
  - History track hoti hai ki agent ka behavior kab/kyun change hua

---

## 5. Common Problems

| Problem | Fix |
|---|---|
| Agent dropdown me dikh hi nahi raha | `.github/agents/` folder ka naam/path check karo (dot ke saath `.github` hona chahiye), phir Reload Window karo |
| Same agent do baar dikh raha hai | User-level (`AppData\Roaming\Code\User\prompts`) me purani copy ho sakti hai — wahan se hata do |
| Handoff button click karne pe kuch nahi ho raha | File ke `handoffs` section me `agent:` field ka naam exactly target file ke naam (bina `.agent.md`) se match hona chahiye — jaise `agent: cbo` (file: `cbo.agent.md`) |
| Agent purana behavior dikha raha hai edit ke baad bhi | Reload Window bhool gaye ho, ya purani chat tab me hi test kar rahe ho (naya chat kholo) |

---

## 6. Ek-line summary

**Ye system "files + folders + VS Code settings" hai, koi live infra nahi.** Aapka kaam hai: (1) files sahi jagah rakhna, (2) reload karna jab bhi update ho, (3) handoff buttons follow karna, (4) har feature close karne se pehle khud confirm karna. Baaki sab agents khud sambhal lenge.
