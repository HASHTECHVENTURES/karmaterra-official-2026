# Admin Panel Bug Report

## Critical Bugs (Data/Functionality Issues)

### 1. UsersPage.tsx - Missing `gender` field in query
**Location:** `UsersPage.tsx:31` and `UsersPage.tsx:144,385`
**Issue:** 
- Query selects: `'id, full_name, email, phone_number, country, state, city, created_at'`
- But export function tries to use `u.gender` (line 144)
- User details modal displays `user.gender` (line 385)
- Result: Gender will always be empty/undefined in exports and user details

**Fix:** Add `gender` to the select query on line 31

---

### 2. AskKarmaPage.tsx - Inefficient search filtering
**Location:** `AskKarmaPage.tsx:48-94`
**Issue:**
- Fetches ALL conversations (limit 100) from database
- Then filters by search term in JavaScript after fetching
- This is inefficient and doesn't scale
- Search should be done at database level using `.or()` or `.ilike()`

**Fix:** Move search filtering to database query before fetching

---

### 3. NotificationsPage.tsx - Inefficient unique user count
**Location:** `NotificationsPage.tsx:136-176`
**Issue:**
- Fetches ALL device tokens to count unique users in JavaScript
- Should use database aggregation (DISTINCT or COUNT DISTINCT)
- Inefficient for large datasets

**Fix:** Use database-level distinct count instead of fetching all records

---

## UI/CSS Bugs

### 4. DashboardPage.tsx - Duplicate CSS classes
**Location:** 
- Line 89: `border border-gray-100-sm border border-gray-100`
- Line 95: `border border-gray-100-sm`
- Line 105: `border border-gray-100-sm border border-gray-100`

**Issue:** Invalid/duplicate CSS classes that don't exist in Tailwind
- `border-gray-100-sm` is not a valid Tailwind class
- Duplicate `border border-gray-100` appears twice

**Fix:** Replace with valid Tailwind classes like `border border-gray-100`

---

### 5. ServiceReportsPage.tsx - Invalid CSS class
**Location:** `ServiceReportsPage.tsx:251`
**Issue:** `border border-gray-100-xl` - invalid Tailwind class
**Fix:** Should be `border border-gray-100` or `border border-gray-200`

---

### 6. HelpRequestsPage.tsx - Invalid CSS class
**Location:** `HelpRequestsPage.tsx:244`
**Issue:** `border border-gray-100-xl` - invalid Tailwind class
**Fix:** Should be `border border-gray-100` or `border border-gray-200`

---

### 7. FeedbackPage.tsx - Invalid CSS class
**Location:** `FeedbackPage.tsx:234`
**Issue:** `border border-gray-100-xl` - invalid Tailwind class
**Fix:** Should be `border border-gray-100` or `border border-gray-200`

---

## Potential Performance Issues

### 8. UsersPage.tsx - N+1 query problem
**Location:** `UsersPage.tsx:91-105`
**Issue:** 
- For each conversation, makes a separate query to count messages
- If user has 10 conversations, that's 10+ database queries
- Should use a single query with aggregation or join

**Fix:** Use a single query with COUNT or join to get message counts

---

### 9. AskKarmaPage.tsx - N+1 query problem
**Location:** `AskKarmaPage.tsx:61-90`
**Issue:**
- For each conversation, makes separate queries for:
  - User profile (line 64-68)
  - Message count (line 71-74)
- If there are 100 conversations, that's 200+ database queries
- Should use joins or single aggregated query

**Fix:** Use joins in the main query to fetch user profiles and message counts in one query

---

## Summary

**Total Bugs Found:** 9
- **Critical (Data/Functionality):** 3
- **UI/CSS:** 4
- **Performance:** 2

**Priority:**
1. **High Priority:** UsersPage gender field, AskKarmaPage search, N+1 queries
2. **Medium Priority:** CSS class fixes, NotificationsPage unique count
3. **Low Priority:** Performance optimizations (if data volume is low, may not be urgent)

