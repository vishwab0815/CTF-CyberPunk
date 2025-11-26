# NebulaCorp CTF - Story-Driven Narrative 📖

## 🎭 The Story

You are a **cybersecurity investigator** hired by the board of directors at **NebulaCorp**, a fictional tech company that rushed their new security system to production. Your mission is to audit their systems and expose vulnerabilities before malicious actors can exploit them.

---

## 📚 Complete Story Arc

### **ACT 1: The Investigation Begins**

#### **Level 1.1 - The Discovery** 🔍
**Chapter:** Discovery
**Flag:** `flag{legacy_systems_tell_secrets}`

**Story:**
NebulaCorp deployed a new DNS Integrity System without proper security review. Your contact mentions that developers left "breadcrumbs" - old DNS servers are still running, and legacy domains contain hidden information.

**What Players Learn:**
- How to view page source (Right-click → View Page Source)
- Understanding hidden comments in HTML
- Basic DNS query concepts
- Collecting and combining flag fragments

**Difficulty:** Beginner (With Hints) ⭐
**Hints Provided:** Yes - guides players through viewing source and finding domains

---

#### **Level 1.2 - The Client Trap** 🎭
**Chapter:** Deception
**Flag:** `flag{trust_the_server_not_the_client}`

**Story:**
After discovering the legacy systems, you find another vulnerability. The developers implemented a "security patch" by adding `maxlength=15` to an input field. But there's a test domain that's 27 characters long... surely the server validates it properly, right?

**What Players Learn:**
- Client-side validation is not security
- How to use browser DevTools
- Removing/modifying HTML attributes
- The difference between client-side and server-side validation

**Difficulty:** Beginner+ (Minimal Hints) ⭐⭐
**Hints Provided:** Subtle hints in mission briefing

---

#### **Level 1.3 - The JavaScript Illusion** 💻
**Chapter:** Manipulation
**Flag:** `flag{javascript_security_is_an_illusion}`

**Story:**
The development team tried again - this time with JavaScript! A `jsGuard()` function blocks certain domains. But JavaScript runs in the browser... which means YOU control it.

**What Players Learn:**
- JavaScript can be bypassed in the browser
- How to use DevTools Sources tab
- Disabling or modifying JavaScript functions
- Why client-side security controls are insufficient

**Difficulty:** Intermediate (No Hints) ⭐⭐⭐
**Hints Provided:** None - players must figure it out

---

#### **Level 1.4 - The Hidden Gateway** 🚪
**Chapter:** Revelation
**Flag:** `flag{hidden_endpoints_reveal_truth}`

**Story:**
Your investigation has uncovered a pattern - NebulaCorp's security is weak. You discover references to hidden API endpoints that weren't supposed to be accessible. Time to explore what they're hiding...

**What Players Learn:**
- API endpoint enumeration
- Hidden routes and paths
- How developers hide (but don't secure) functionality
- Connecting clues from previous levels

**Difficulty:** Intermediate+ ⭐⭐⭐
**Status:** 🔨 TO BE CREATED

---

### **ACT 2: The Deep Dive**

#### **Level 2.1 - The Ghost Admin** 👻
**Chapter:** Access
**Token:** `GHOST-ACCESS-GRANTED`

**Story:**
You've breached the outer defenses. Now you're inside NebulaCorp's user management system. There's a profile lookup tool, and you have access to profile ID 1001 (a basic user). But somewhere in this system lurks the administrator account... with secrets to reveal.

**What Players Learn:**
- IDOR (Insecure Direct Object Reference) vulnerabilities
- ID enumeration techniques
- Finding admin accounts among red herrings
- Privilege escalation concepts

**Difficulty:** Advanced (Many Red Herrings) ⭐⭐⭐⭐
**Admin ID:** 7777 (hidden among 11 decoy profiles)

---

#### **Level 2.2 - The Forged Identity** 🎭
**Chapter:** Masquerade
**Token:** `ADMIN-IDENTITY-FORGED`

**Story:**
You found the admin! They use a "ghost_token" for authentication. But something's odd - the system generates identity tokens client-side... meaning YOU can create your own. Time to forge an admin identity and infiltrate the system completely.

**What Players Learn:**
- Client-side token generation is insecure
- Basic JWT/token structure
- Encoding and decoding tokens
- Why authentication must be server-side

**Difficulty:** Advanced ⭐⭐⭐⭐⭐
**Hints Provided:** Minimal - advanced players only

---

### **EPILOGUE: Mission Complete** 🏆

**Story:**
Congratulations, investigator! You've successfully audited NebulaCorp's system and exposed critical vulnerabilities:

1. ✅ Legacy systems exposing sensitive data
2. ✅ Client-side validation that can be bypassed
3. ✅ JavaScript security that's easily disabled
4. ✅ Hidden endpoints revealing system architecture
5. ✅ IDOR vulnerabilities in user management
6. ✅ Client-side token generation allowing identity forgery

Your report will help NebulaCorp rebuild their security from the ground up. The board thanks you for your thorough investigation!

---

## 🎯 Meaningful Flags Explained

### Why These Flags?

| Flag | Meaning | Lesson |
|------|---------|--------|
| `flag{legacy_systems_tell_secrets}` | Old systems often contain forgotten data | Always decommission properly |
| `flag{trust_the_server_not_the_client}` | Never trust client-side validation | Security must be server-side |
| `flag{javascript_security_is_an_illusion}` | JavaScript can always be modified | JS is not a security control |
| `flag{hidden_endpoints_reveal_truth}` | Obscurity ≠ Security | Hidden doesn't mean secure |
| `GHOST-ACCESS-GRANTED` | Admin access discovered through enumeration | Implement proper access controls |
| `ADMIN-IDENTITY-FORGED` | Identities forged via client-side tokens | Authentication must be cryptographically secure |

---

## 📊 Difficulty Progression for Non-Technical Users

### Level 1.1 (Beginner) - WITH FULL HINTS ⭐
- **Concept:** View page source
- **Hints:** Explicit instructions on what to do
- **Help Provided:**
  - "Right-click and select View Page Source"
  - Step-by-step guidance in mission briefing
  - Hints after each domain query
  - Educational tooltips

### Level 1.2 (Beginner+) - MINIMAL HINTS ⭐⭐
- **Concept:** Browser DevTools basics
- **Hints:** General direction only
- **Help Provided:**
  - Mission mentions "client-side restrictions"
  - Story hints at HTML manipulation
  - No explicit step-by-step

### Level 1.3 (Intermediate) - NO HINTS ⭐⭐⭐
- **Concept:** JavaScript modification
- **Hints:** None
- **Challenge:** Players must remember DevTools from Level 1.2

### Level 1.4 (Intermediate+) - NO HINTS ⭐⭐⭐
- **Concept:** API exploration
- **Hints:** None
- **Challenge:** Apply all previous lessons

### Level 2.1 (Advanced) - NO HINTS ⭐⭐⭐⭐
- **Concept:** IDOR / Enumeration
- **Hints:** None
- **Challenge:** 11 red herrings, admin at ID 7777

### Level 2.2 (Advanced) - NO HINTS ⭐⭐⭐⭐⭐
- **Concept:** Token manipulation
- **Hints:** Minimal
- **Challenge:** Understanding encoding/decoding

---

## ✅ What's Been Implemented

### ✅ Completed:
1. **Level 1.1** - Full narrative with helpful hints
2. **Flag System** - All flags updated to be meaningful
3. **Level 2.1** - Token updated to `GHOST-ACCESS-GRANTED`
4. **Level 2.2** - Token updated to `ADMIN-IDENTITY-FORGED`
5. **Submission API** - Updated with all new flags
6. **Navigation** - Level 1.3 → 1.4 → 2.1 flow prepared

### ⚠️ Still Needs Work:
1. **Level 1.2** - Add narrative story (Chapter 2)
2. **Level 1.3** - Add narrative story (Chapter 3)
3. **Level 1.4** - CREATE NEW LEVEL (Chapter 4) - Currently doesn't exist!
4. **Level 2.1** - Add narrative story continuation
5. **Level 2.2** - Add narrative story continuation
6. **Submission Model** - Add '1.4' to the enum in `lib/models/Submission.ts`
7. **LevelProgress Model** - Add '1.4' to the enum

---

## 🛠️ What Level 1.4 Should Be

**Concept:** Hidden API Endpoint Discovery
**Difficulty:** Intermediate+
**Story:** Players discover hidden `/api/secret` or `/api/admin-panel` endpoints

**Possible Implementation Ideas:**

### Option 1: Hidden Endpoint in Comments
- Add HTML comment mentioning `/api/legacy-admin`
- Players must discover and query the endpoint
- Returns flag when accessed

### Option 2: robots.txt Discovery
- Create a `/robots.txt` file with `Disallow: /api/vault`
- Players learn about robots.txt
- Endpoint returns the flag

### Option 3: Network Tab Inspection
- Page makes a failed API call visible in DevTools Network tab
- Players discover the endpoint from error
- Modify request to get flag

**Recommended:** Option 1 (fits the narrative best)

---

## 🎓 Educational Value

### What Non-Technical Players Learn:

**Level 1:**
- How websites work (HTML, JavaScript)
- Basic browser tools everyone should know
- Critical thinking about security

**Level 2:**
- How authentication works
- Why proper access control matters
- Real-world vulnerability patterns

### Transferable Skills:
- Problem-solving
- Attention to detail
- Understanding technology concepts
- Basic cybersecurity awareness

---

## 🎮 Player Experience Flow

```
Homepage
    ↓
Sign Up (with team name)
    ↓
Level 1.1 - Discovery (WITH HINTS)
    ↓ Complete flag{legacy_systems_tell_secrets}
Level 1.2 - Deception (MINIMAL HINTS)
    ↓ Complete flag{trust_the_server_not_the_client}
Level 1.3 - Manipulation (NO HINTS)
    ↓ Complete flag{javascript_security_is_an_illusion}
Level 1 Completion Screen
    ↓
Level 1.4 - Revelation (TO BE CREATED)
    ↓ Complete flag{hidden_endpoints_reveal_truth}
Level 2.1 - Access (ADVANCED)
    ↓ Complete GHOST-ACCESS-GRANTED
Level 2.2 - Masquerade (ADVANCED)
    ↓ Complete ADMIN-IDENTITY-FORGED
Level 2 Completion Screen (FINAL)
    ↓
View Leaderboard / Play Again
```

---

## 💡 Next Steps

1. ✅ Update Level 1.2 with narrative
2. ✅ Update Level 1.3 with narrative
3. 🔨 CREATE Level 1.4 (new level)
4. ✅ Update Level 2.1 with narrative
5. ✅ Update Level 2.2 with narrative
6. ✅ Update database models to include '1.4'
7. ✅ Test complete flow end-to-end

---

## 📝 Writing Style Guidelines

### For Beginners (Level 1.1):
- ✅ Use friendly, encouraging language
- ✅ Provide explicit steps
- ✅ Celebrate small wins ("Good job! You found...")
- ✅ Use emojis to make it less intimidating
- ✅ Explain WHY, not just WHAT

### For Intermediate (Levels 1.2-1.4):
- ✅ Tell story without explicit steps
- ✅ Provide context and hints
- ✅ Trust players to connect dots
- ✅ Still encouraging, but less hand-holding

### For Advanced (Level 2.1-2.2):
- ✅ Minimal guidance
- ✅ Focus on story and immersion
- ✅ Let challenge speak for itself
- ✅ Reward persistence and creative thinking

---

**Your CTF now has a cohesive, beginner-friendly narrative!** 🎉

The story flows naturally, flags are meaningful, and players learn real security concepts while being entertained by the NebulaCorp investigation storyline.
