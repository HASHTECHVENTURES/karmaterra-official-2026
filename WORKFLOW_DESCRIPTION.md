# KarmaTerra Application - Complete Workflow Descriptions

**Document Purpose:** This document provides detailed workflow descriptions for all major features in the KarmaTerra application. Use this with AI tools to generate documentation, diagrams, user guides, or technical specifications.

---

## WORKFLOW 1: User Registration Workflow

### Overview
New users create an account using phone number and 4-digit PIN with additional profile information.

### Step-by-Step Process

1. **User Opens App**
   - App checks for existing session
   - If no session exists, redirects to AuthPage

2. **User Selects Sign Up Mode**
   - User clicks "Sign Up" button on AuthPage
   - Form expands to show all registration fields

3. **User Enters Registration Information**
   - **Phone Number**: Required, must be unique
   - **PIN**: Exactly 4 numeric digits
   - **Full Name**: Required
   - **Email**: Required, must be unique
   - **Gender**: Male, Female, or Other
   - **Birthdate**: Date picker, format YYYY-MM-DD
   - **Location**: Country → State → City (cascading dropdowns)

4. **Form Validation**
   - Phone number format validation
   - PIN validation (exactly 4 digits, numbers only)
   - Email format validation
   - All required fields must be filled

5. **Submit Registration**
   - System checks if phone number already exists in database
   - If exists, shows error: "Phone number already registered"
   - If not exists, creates new profile in Supabase `profiles` table

6. **Profile Creation**
   - PIN stored as plain text (4 digits)
   - All user data stored in database
   - User ID generated (UUID)

7. **Session Initialization**
   - User data stored in localStorage
   - App version stored for session management
   - User state updated in React context

8. **Post-Registration Actions**
   - Push notifications initialized
   - Camera permissions requested (native platforms only)
   - User redirected to HomePage

9. **Success Feedback**
   - Toast notification: "Account Created!"
   - Welcome message displayed

---

## WORKFLOW 2: User Login Workflow

### Overview
Existing users sign in using phone number and PIN.

### Step-by-Step Process

1. **User Opens App**
   - App checks for stored session
   - If session exists, validates against database
   - If valid, user auto-logged in
   - If invalid or expired, shows AuthPage

2. **User Enters Credentials**
   - **Phone Number**: User's registered phone number
   - **PIN**: 4-digit PIN

3. **Form Validation**
   - Phone number format check
   - PIN format check (4 digits)

4. **Submit Login**
   - System queries Supabase `profiles` table
   - Searches for phone number match

5. **Account Verification**
   - If phone number not found: Error "Account not found. Please sign up"
   - If phone number found: Proceeds to PIN verification

6. **PIN Verification**
   - Compares entered PIN with stored PIN
   - If PIN matches: Login successful
   - If PIN doesn't match: Error "Incorrect PIN. Please try again"

7. **Session Creation**
   - User profile data fetched from database
   - User object created with: id, name, email, phone_number, gender, birthdate, location, avatar
   - Data stored in localStorage
   - App version stored

8. **State Update**
   - User state updated in React AuthContext
   - Push notifications initialized
   - User redirected to HomePage

9. **Success Feedback**
   - Toast notification: "Welcome Back!"

---

## WORKFLOW 3: Skin Analysis Workflow (Know Your Skin)

### Overview
Users complete a questionnaire and upload photos for AI-powered skin analysis. This feature is publicly accessible (no login required to start).

### Step-by-Step Process

1. **User Accesses Feature**
   - User navigates to "Know Your Skin" from HomePage
   - OR accesses directly via `/know-your-skin` route
   - No authentication required initially

2. **Questionnaire Phase**
   - User sees multi-step questionnaire
   - **Step 1: Primary Skin Concerns**
     - Multiple selection from: Acne, Dark Spots, Wrinkles, Dryness, Oiliness, Redness, Dullness, Uneven Texture, Pores, Fine Lines, Aging
   - **Step 2: Skin Type**
     - Single selection: Dry, Oily, Normal, Sensitive, Combination
   - **Step 3: Skin Tone**
     - Single selection: Fair, Light, Medium, Tan, Dark, Deep
   - **Step 4: Skin Glow**
     - Single selection: Dull, Low Glow, Moderate Glow, High Glow, Radiant
   - **Step 5: Midday Skin Feel**
     - Single selection: Fresh and well hydrated, Smooth and bright, Neither smooth nor rough, Rough and dull
   - **Step 6: Sunscreen Usage**
     - Single selection: Everyday, Everytime I go out, Only when prolonged sun exposure, I do not apply
   - **Step 7: Physical Activity**
     - Single selection: Regular, Sometimes, Rarely
   - **Step 8: Sleeping Habits**
     - Single selection: Sound Sleep, Moderate Sleep, Disturbed Sleep
   - **Step 9: Skin Treatments**
     - Single selection: Chemical Peels, Laser Treatments, Bleaching, None
   - **Step 10: Lifestyle Questions** (Optional)
     - Profession, Working Hours, AC Usage, Smoking, Water Quality

3. **Photo Capture Phase**
   - User prompted to take/upload photos
   - **Photo Requirements:**
     - Front-facing photo (required)
     - Side photos (optional, recommended)
   - **Camera Integration:**
     - System requests camera permission
     - If denied, shows error message
     - User can retry or skip photos
   - **Photo Processing:**
     - Images converted to base64
     - Validated for quality
     - Stored temporarily

4. **Authentication Check**
   - Before analysis, system checks if user is logged in
   - If not logged in: Redirects to AuthPage
   - If logged in: Proceeds to analysis

5. **Data Preparation**
   - Questionnaire answers compiled
   - User profile data merged (age, gender, location from profile)
   - Photos prepared for API call
   - All data formatted for AI analysis

6. **AI Analysis Request**
   - Data sent to Supabase Edge Function: `analyze-skin`
   - OR sent to Gemini API directly (client-side)
   - **Analysis Method:**
     - Three-phase approach:
       1. Pure visual image analysis
       2. Questionnaire data review
       3. Cross-validation & integrated analysis

7. **AI Processing**
   - Google Gemini 2.0 Flash model analyzes:
     - Skin parameters: Acne, Dark Spots, Wrinkles, Dryness, Oiliness, Redness, Dullness, Texture, Pores, Fine Lines, Aging
   - Each parameter rated 1-10
   - Recommendations generated
   - Personalized advice created

8. **Results Generation**
   - Analysis result includes:
     - Overall skin assessment
     - Parameter ratings (1-10 scale)
     - Specific concerns identified
     - Personalized recommendations
     - Product suggestions
     - Lifestyle tips

9. **Results Storage**
   - Report saved to `analysis_history` table
   - Linked to user ID
   - Analysis type: 'skin'
   - Timestamp recorded

10. **Results Display**
    - User redirected to `/skin-analysis-results`
    - Results page displays:
      - Visual skin assessment
      - Parameter breakdown
      - Recommendations
      - Action items
    - User can view, share, or track progress

---

## WORKFLOW 4: Hair Analysis Workflow (Know Your Hair)

### Overview
Authenticated users complete a hair questionnaire for personalized hair analysis.

### Step-by-Step Process

1. **User Accesses Feature**
   - User must be logged in
   - Navigates to "Know Your Hair" from HomePage
   - Route: `/hair-analysis`

2. **Questionnaire Phase**
   - Multi-step questionnaire:
     - **Hair Type**: Straight, Wavy, Curly, Coily
     - **Hair Texture**: Fine, Medium, Thick
     - **Hair Concerns**: Multiple selection (Damage, Frizz, Dryness, etc.)
     - **Current Routine**: Products used, frequency
     - **Styling Habits**: Heat usage, chemical treatments
     - **Hair Goals**: What user wants to achieve

3. **Photo Capture (Optional)**
   - User can upload hair photos
   - Camera integration available
   - Photos used for visual analysis

4. **Data Compilation**
   - Questionnaire answers collected
   - User profile data merged
   - Photos prepared (if provided)

5. **AI Analysis**
   - Data sent to hair analysis service
   - AI analyzes:
     - Hair type and texture
     - Condition assessment
     - Concerns identification
     - Product recommendations

6. **Results Generation**
   - Personalized hair analysis created
   - Recommendations provided
   - Product suggestions included

7. **Results Storage**
   - Saved to `analysis_history` table
   - Analysis type: 'hair'
   - Linked to user profile

8. **Results Display**
   - User redirected to `/hair-analysis-results`
   - Results page shows:
      - Hair type assessment
      - Condition analysis
      - Recommendations
      - Product suggestions

---

## WORKFLOW 5: AI Assistant Workflow (Ask Karma)

### Overview
Users chat with AI assistant "Karma" for personalized skincare/haircare advice.

### Step-by-Step Process

1. **User Accesses Feature**
   - User must be logged in
   - Navigates to "Ask Karma" from HomePage
   - Route: `/ask-karma`

2. **Conversation Management**
   - User sees list of previous conversations (if any)
   - Can create new conversation
   - Can delete old conversations
   - Can switch between conversations

3. **New Conversation Creation**
   - User types first message
   - System creates new conversation in database
   - Conversation title auto-generated from first message (first 50 chars)
   - Conversation saved to `conversations` table

4. **Message Sending**
   - User types message in input field
   - Clicks send or presses Enter
   - Message immediately added to UI (optimistic update)

5. **Message Storage**
   - User message saved to `messages` table
   - Linked to conversation ID
   - Marked as `is_user_message: true`
   - Timestamp recorded

6. **Context Building**
   - System fetches conversation history (last 10 messages)
   - User context built from profile:
     - Name, gender, age (calculated from birthdate)
     - Location (city, state, country)
   - Knowledge base context fetched from database
   - Previous analysis results retrieved (if available)

7. **API Key Management**
   - System checks for user-specific API key in database
   - If found, uses user's API key
   - If not found, uses global API key from environment
   - API key passed to Edge Function securely

8. **AI Response Generation**
   - Request sent to Supabase Edge Function: `ask-karma`
   - Edge Function calls Google Gemini 2.0 Flash model
   - **Prompt includes:**
     - System prompt (Karma persona)
     - User context
     - Knowledge base context
     - Conversation history
     - Current user message
   - AI generates response (150-300 words)
   - Response formatted as plain text (no markdown)

9. **Response Processing**
   - AI response received
   - Response saved to `messages` table
   - Marked as `is_user_message: false`
   - Linked to conversation

10. **Response Display**
    - AI message added to chat UI
    - Displayed with Karma avatar
    - Formatted for readability
    - User can continue conversation

11. **Conversation Continuation**
    - User can send follow-up messages
    - Conversation history maintained
    - Context preserved across messages
    - Multiple conversations supported

---

## WORKFLOW 6: Product Discovery Workflow

### Overview
Users discover and view products through homepage carousel and market page.

### Step-by-Step Process

1. **Homepage Product Carousel**
   - User lands on HomePage
   - Product carousel displayed at top
   - Products fetched from `products_carousel` table
   - Only active products shown (`is_active: true`)
   - Products ordered by `display_order`

2. **Product Display**
   - Each product shows:
     - Product image
     - Product name
     - Product description (optional)
   - Auto-rotates every 3 seconds
   - User can swipe left/right to navigate
   - Dots indicator shows current position

3. **Product Interaction**
   - User clicks/taps on product
   - System checks product link
   - If external link: Opens in external browser
   - If internal link: Opens in-app iframe
   - Product page loads with permissions (payment, camera, microphone)

4. **Market Page Access**
   - User navigates to Market from menu
   - Route: `/market`
   - User must be logged in

5. **Product Browsing**
   - Market page displays all available products
   - Products organized by category (if applicable)
   - User can browse and discover products
   - Clicking product opens product details

6. **Product Details**
   - Product information displayed
   - Product link available
   - User can purchase or learn more
   - External links open in new window

---

## WORKFLOW 7: Blog Content Workflow

### Overview
Users browse and read blog posts about wellness, skincare, and haircare.

### Step-by-Step Process

1. **Homepage Blog Display**
   - HomePage shows "Latest Blog Posts" section
   - Blog posts fetched from `blog_posts` table
   - Only published posts shown (`is_published: true`)
   - Ordered by `published_at` (newest first)
   - Limited to 5 most recent posts

2. **Blog Listing Page**
   - User clicks "View All Posts" or navigates to `/blogs`
   - User must be logged in
   - All published blog posts displayed
   - Posts shown with:
     - Featured image
     - Title
     - Publication date
     - Excerpt (if available)

3. **Blog Detail View**
   - User clicks on blog post
   - System checks if post has `external_link`
   - **If external link exists:**
     - Opens in new browser window
     - User reads on external site
   - **If no external link:**
     - Navigates to `/blog/:id`
     - Internal blog detail page displayed
     - Full blog content shown
     - Featured image displayed
     - Publication date shown

4. **Blog Content Display**
   - Rich text content rendered
   - Images displayed
   - Formatting preserved
   - User can share blog post

---

## WORKFLOW 8: Progress Tracking Workflow

### Overview
Users track their skincare/haircare progress over time.

### Step-by-Step Process

1. **User Accesses Feature**
   - User must be logged in
   - Navigates to "Progress Tracking" from menu
   - Route: `/progress-tracking`

2. **Progress Data Retrieval**
   - System fetches user's analysis history
   - Queries `analysis_history` table
   - Filters by user ID
   - Retrieves both skin and hair analyses

3. **Progress Display**
   - Historical analyses shown chronologically
   - Each entry shows:
     - Analysis date
     - Analysis type (skin/hair)
     - Key findings
     - Improvement indicators
   - Visual progress indicators displayed
   - Charts/graphs show trends (if implemented)

4. **Progress Comparison**
   - User can compare analyses over time
   - Parameter changes highlighted
   - Improvement areas identified
   - Recommendations updated based on progress

5. **New Analysis Integration**
   - When user completes new analysis:
     - Automatically added to progress tracking
     - Linked to previous analyses
     - Progress updated
     - Trends recalculated

---

## WORKFLOW 9: Feedback Submission Workflow

### Overview
Users submit feedback to help improve the platform.

### Step-by-Step Process

1. **User Accesses Feature**
   - User must be logged in
   - Navigates to "Feedback" from menu
   - Route: `/feedback`

2. **Feedback Form**
   - User sees feedback form
   - **Fields:**
     - Rating (1-5 stars)
     - Category (dropdown)
     - Comments (text area)
   - All fields optional but recommended

3. **Form Submission**
   - User fills out form
   - Clicks "Submit" button
   - Form validated

4. **Feedback Storage**
   - Feedback saved to `feedback` table
   - Linked to user ID
   - Timestamp recorded
   - Status: "pending" (default)

5. **Confirmation**
   - Success message displayed
   - User thanked for feedback
   - Form cleared or reset

6. **Admin Review** (Admin Workflow)
   - Admins can view all feedback in admin panel
   - Can filter by category, rating, status
   - Can respond to feedback
   - Can mark as resolved

---

## WORKFLOW 10: Push Notification Workflow

### Overview
System sends push notifications to users for updates and engagement.

### Step-by-Step Process

1. **Notification Initialization**
   - When user logs in, system initializes push notifications
   - Checks if user has granted permission
   - Requests permission if not granted

2. **Permission Request**
   - System requests notification permission
   - User can grant or deny
   - Permission status stored

3. **Token Registration**
   - If permission granted:
     - Device token obtained (FCM for Android, APNs for iOS)
     - Token sent to Supabase
     - Stored in `notification_tokens` table
     - Linked to user ID

4. **Notification Creation** (Admin/System)
   - Admin creates notification in admin panel
   - OR system generates automatic notification
   - Notification saved to `notifications` table
   - Target users specified

5. **Notification Sending**
   - System queries target users
   - Retrieves device tokens
   - Sends notification via push service
   - Notification delivered to devices

6. **Notification Display**
   - User receives notification
   - Notification appears in device notification center
   - User can tap to open app
   - App navigates to relevant page

7. **In-App Notifications**
   - Notification icon shown in app header
   - User can view notification list
   - Notifications marked as read/unread
   - User can clear notifications

---

## WORKFLOW 11: Admin Panel - Content Management Workflow

### Overview
Admins manage blog posts, products, and app content through admin panel.

### Step-by-Step Process

1. **Admin Login**
   - Admin navigates to admin panel
   - Enters email and password
   - Authenticates via Supabase Auth
   - Session stored in localStorage

2. **Dashboard Access**
   - Admin redirected to dashboard
   - Overview of content and statistics shown

3. **Blog Post Management**
   - Admin navigates to "Blog Posts"
   - **Create New Post:**
     - Click "Create New"
     - Fill form: title, content, featured image, slug
     - Set publish status
     - Save to `blog_posts` table
   - **Edit Post:**
     - Select post from list
     - Edit fields
     - Update publish status
     - Save changes
   - **Delete Post:**
     - Select post
     - Confirm deletion
     - Post removed from database

4. **Product Carousel Management**
   - Admin navigates to "Products"
   - **Add Product:**
     - Click "Add Product"
     - Fill form: name, image, description, product link
     - Set display order
     - Set active status
     - Save to `products_carousel` table
   - **Edit Product:**
     - Select product
     - Edit fields
     - Update order or status
     - Save changes
   - **Delete Product:**
     - Select product
     - Confirm deletion
     - Product removed

5. **Image Management**
   - Admin can upload images
   - Images stored in Supabase Storage
   - URLs generated and stored
   - Images used in blog posts, products, app config

6. **App Configuration**
   - Admin can configure app settings
   - Update app icon
   - Set blog banner image
   - Configure maintenance mode
   - Settings saved to `app_config` table

---

## WORKFLOW 12: Admin Panel - AI Configuration Workflow

### Overview
Admins manage AI API keys and knowledge base for AI assistant.

### Step-by-Step Process

1. **AI Settings Access**
   - Admin navigates to "AI Settings" in admin panel
   - Views current API key configuration

2. **API Key Management**
   - **Global API Key:**
     - Admin can set global Gemini API key
     - Stored in environment or database
     - Used as fallback for all users
   - **Per-User API Keys:**
     - Admin can assign API keys to specific users
     - Keys stored in `api_keys` table
     - Linked to user ID
     - Takes priority over global key

3. **Knowledge Base Management**
   - Admin navigates to "Knowledge Base"
   - **Upload Document:**
     - Click "Upload Document"
     - Select file (PDF, text, etc.)
     - Document processed and stored
     - Content extracted and indexed
   - **View Documents:**
     - List of uploaded documents shown
     - Can view content
     - Can delete documents
   - **Document Processing:**
     - Documents converted to text
     - Stored in `knowledge_base` table
     - Automatically included in AI responses

4. **AI Response Testing**
   - Admin can test AI responses
   - Send test messages
   - Verify knowledge base integration
   - Check API key functionality

---

## WORKFLOW 13: Session Management Workflow

### Overview
System manages user sessions across app restarts and updates.

### Step-by-Step Process

1. **App Launch**
   - App starts and checks localStorage
   - Looks for stored user session
   - Checks app version

2. **Version Check**
   - Compares stored version with current version
   - If version changed:
     - Clears old session
     - Stores new version
     - User must log in again

3. **Session Validation**
   - If session exists:
     - Extracts user ID from stored data
     - Queries Supabase `profiles` table
     - Validates user still exists

4. **Session Restoration**
   - If user exists in database:
     - Fetches latest profile data
     - Updates user state
     - Restores session
     - User remains logged in

5. **Session Expiration**
   - If user not found in database:
     - Clears stored session
     - Redirects to login
     - Shows login page

6. **Session Persistence**
   - User data stored in localStorage
   - Persists across app restarts
   - Survives browser/app closure
   - Cleared only on logout or version change

---

## WORKFLOW 14: Profile Management Workflow

### Overview
Users view and edit their profile information.

### Step-by-Step Process

1. **Profile Access**
   - User must be logged in
   - Navigates to "Profile" from menu
   - Route: `/profile`

2. **Profile Display**
   - Current profile information shown:
     - Name
     - Email
     - Phone number (read-only)
     - Gender
     - Birthdate
     - Location (country, state, city)
     - Avatar image

3. **Edit Profile**
   - User clicks "Edit" button
   - Form fields become editable
   - User can modify:
     - Name
     - Email
     - Gender
     - Birthdate
     - Location
     - Avatar (upload new image)

4. **Profile Update**
   - User makes changes
   - Clicks "Save" button
   - Form validated

5. **Database Update**
   - Changes sent to Supabase
   - `profiles` table updated
   - Only changed fields updated
   - Timestamp recorded

6. **Local Storage Update**
   - Updated user data stored in localStorage
   - React state updated
   - UI refreshed with new data

7. **Confirmation**
   - Success message displayed
   - Profile shows updated information
   - Changes reflected immediately

---

## WORKFLOW 15: Community Feature Workflow

### Overview
Users engage with community features for sharing and learning.

### Step-by-Step Process

1. **Community Access**
   - User must be logged in
   - Navigates to "Community" from HomePage
   - Route: `/community`

2. **Community Content Display**
   - Community page shows:
     - Posts from other users
     - Discussions
     - Tips and advice
     - Community guidelines

3. **User Engagement** (If implemented)
   - User can view posts
   - User can like posts
   - User can comment
   - User can share posts

4. **Content Moderation** (Admin)
   - Admins can moderate content
   - Review posts and comments
   - Remove inappropriate content
   - Manage community guidelines

---

## WORKFLOW 16: Ingredients Information Workflow

### Overview
Users learn about skincare and haircare ingredients.

### Step-by-Step Process

1. **Ingredients Access**
   - User must be logged in
   - Navigates to "Ingredients" from menu
   - Route: `/ingredients`

2. **Ingredients Display**
   - List of ingredients shown
   - Organized by category
   - Search functionality available

3. **Ingredient Details**
   - User clicks on ingredient
   - Detailed information displayed:
     - What it is
     - Benefits
     - Usage recommendations
     - Products containing it

4. **Content Management** (Admin)
   - Admins can add/edit ingredients
   - Update information
   - Manage categories
   - Content stored in database

---

## WORKFLOW 17: Help & Support Workflow

### Overview
Users access help resources and support information.

### Step-by-Step Process

1. **Help Access**
   - User navigates to "Help" from menu
   - Route: `/help`
   - User must be logged in

2. **Help Content Display**
   - FAQs displayed
   - Common questions answered
   - Support resources shown
   - Contact information provided

3. **Support Contact**
   - User can contact support
   - Email or form available
   - Support request created
   - Admin notified

---

## WORKFLOW 18: Terms & Privacy Workflow

### Overview
Users view terms of service and privacy policy.

### Step-by-Step Process

1. **Terms Access**
   - User navigates to "Terms & Conditions"
   - Route: `/terms`
   - Publicly accessible (no login required)

2. **Privacy Access**
   - User navigates to "Privacy Policy"
   - Route: `/privacy`
   - Publicly accessible (no login required)

3. **Content Display**
   - Legal documents displayed
   - Full text shown
   - User can read and understand policies
   - Links accessible from menu and footer

---

## WORKFLOW 19: Error Handling Workflow

### Overview
System handles errors gracefully throughout the application.

### Step-by-Step Process

1. **Error Detection**
   - System monitors for errors
   - API call failures detected
   - Network errors caught
   - Validation errors identified

2. **Error Classification**
   - **Network Errors**: Connection issues
   - **API Errors**: Server-side errors
   - **Validation Errors**: User input errors
   - **Rate Limit Errors**: API rate limits exceeded

3. **Error Handling**
   - **Rate Limit Errors:**
     - Friendly error message shown
     - Retry countdown displayed
     - User can retry after countdown
   - **Network Errors:**
     - Error message displayed
     - User can retry
     - Cached data used if available
   - **Validation Errors:**
     - Field-specific error messages
     - Form highlights errors
     - User can correct and resubmit

4. **Error Logging**
   - Errors logged to console (development)
   - Critical errors tracked
   - User-friendly messages displayed
   - Application continues functioning

5. **Error Recovery**
   - User can retry failed operations
   - System attempts automatic recovery
   - Fallback mechanisms activated
   - User experience maintained

---

## WORKFLOW 20: Mobile-Specific Features Workflow

### Overview
Mobile-specific features for iOS and Android platforms.

### Step-by-Step Process

1. **Android Back Button**
   - Android device back button pressed
   - System checks current page
   - **If on service page**: Navigate to home
   - **If on home/auth page**: Exit app
   - **If on other pages**: Navigate back in history

2. **Status Bar Configuration** (Android)
   - Status bar overlays WebView
   - Respects safe areas
   - Color and style configured
   - Light content style used

3. **Camera Permissions**
   - System requests camera permission
   - User grants or denies
   - If granted: Camera access enabled
   - If denied: Error message shown, user can retry

4. **Pull to Refresh**
   - User pulls down on page
   - Refresh threshold reached (80px)
   - Data reload triggered
   - Loading indicator shown
   - Content refreshed

---

## Technical Implementation Notes

### Database Tables Used
- `profiles`: User authentication and profile data
- `blog_posts`: Blog content management
- `products_carousel`: Product marketplace
- `conversations`: AI chat conversations
- `messages`: AI chat messages
- `notifications`: Push notifications
- `feedback`: User feedback
- `analysis_history`: Skin/hair analysis results
- `app_config`: Application configuration
- `knowledge_base`: AI knowledge base documents
- `api_keys`: AI API key management
- `notification_tokens`: Push notification device tokens

### API Endpoints
- Supabase Edge Functions:
  - `analyze-skin`: Skin analysis
  - `analyze-hair`: Hair analysis
  - `ask-karma`: AI chat assistant
  - `send-push-notification`: Push notifications

### External Services
- Google Gemini AI: AI analysis and chat
- Supabase: Database, authentication, storage
- Google Analytics: User analytics
- Push Notification Services: iOS (APNs) and Android (FCM)

### Key Technologies
- React 18.3.1 with TypeScript
- Capacitor 7.4.4 for mobile
- Supabase for backend
- Vite for building
- Tailwind CSS for styling

---

**End of Workflow Descriptions**

Use this document with AI tools to:
- Generate user guides
- Create flow diagrams
- Write technical documentation
- Design user interfaces
- Plan testing scenarios
- Develop training materials



