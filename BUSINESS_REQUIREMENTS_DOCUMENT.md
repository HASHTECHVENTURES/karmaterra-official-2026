# Business Requirements Document (BRD)
## KarmaTerra - Skincare & Haircare Wellness Platform

**Document Version:** 1.0  
**Date:** January 2025  
**Status:** Active

---

## 1. Executive Summary

### 1.1 Purpose
This Business Requirements Document (BRD) outlines the comprehensive requirements for the KarmaTerra application - a cross-platform mobile and web application designed to provide personalized skincare and haircare analysis, recommendations, and community engagement through AI-powered technology.

### 1.2 Business Objectives
- Provide users with AI-powered personalized skincare and haircare analysis
- Create an engaging community platform for wellness enthusiasts
- Offer educational content through blogs and ingredient information
- Enable product discovery and marketplace integration
- Track user progress and provide actionable insights
- Deliver seamless cross-platform experience (iOS, Android, Web)

### 1.3 Target Audience
- **Primary Users**: Individuals seeking personalized skincare and haircare solutions
- **Secondary Users**: Wellness enthusiasts, beauty product researchers
- **Admin Users**: Platform administrators managing content, products, and AI configurations

---

## 2. Project Overview

### 2.1 Application Name
**KarmaTerra** (Version 3.11.0)

### 2.2 Platform Architecture
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.19
- **Mobile Framework**: Capacitor 7.4.4 (iOS & Android)
- **Backend**: Supabase (PostgreSQL database, Edge Functions, Storage)
- **AI Services**: Google Gemini 2.0 Flash
- **Deployment**: Vercel (Web), Native App Stores (Mobile)

### 2.3 Technology Stack
- **UI Framework**: React Router DOM, Tailwind CSS
- **State Management**: React Context API, TanStack Query
- **UI Components**: Radix UI, Lucide React Icons
- **Analytics**: Google Analytics
- **Notifications**: Capacitor Push Notifications
- **PDF Processing**: jsPDF, jsPDF-AutoTable

---

## 3. Business Requirements

### 3.1 Functional Requirements

#### 3.1.1 User Authentication & Profile Management

**FR-001: User Registration**
- Users must be able to create an account using phone number and 4-digit PIN
- Registration requires: full name, email, phone number, gender, birthdate, country, state, city
- System must validate phone number uniqueness
- PIN must be exactly 4 numeric digits
- Birthdate must be in valid format (YYYY-MM-DD)
- System must prevent duplicate phone numbers and emails

**FR-002: User Login**
- Users must be able to sign in using phone number and PIN
- System must validate credentials against database
- Session must persist across app restarts
- System must validate stored session against database on app launch
- App version changes must trigger session refresh

**FR-003: Profile Management**
- Users must be able to view and edit profile information
- Editable fields: name, email, gender, birthdate, location (country, state, city), avatar
- Changes must sync with Supabase database
- Profile data must be stored securely

**FR-004: Session Management**
- System must maintain user session in secure storage
- Session must be validated on app launch
- Invalid or expired sessions must redirect to login
- App version changes must clear old sessions

#### 3.1.2 Skin Analysis Service

**FR-005: Know Your Skin**
- Users must be able to access skin analysis without authentication (public access)
- System must guide users through skin analysis questionnaire
- Analysis must capture: skin type, concerns, current routine, environmental factors
- System must provide personalized skin analysis results
- Results must be accessible only to authenticated users

**FR-006: Skin Analysis Results**
- Authenticated users must be able to view detailed skin analysis results
- Results must include: skin type assessment, concerns identification, recommendations
- System must allow users to track skin progress over time
- Results must be stored in user profile

**FR-007: Photo Capture for Skin Analysis**
- System must support camera integration for skin photo capture
- Users must be able to grant/deny camera permissions
- Photos must be processed securely
- System must handle permission denials gracefully

#### 3.1.3 Hair Analysis Service

**FR-008: Know Your Hair**
- Authenticated users must be able to access hair analysis
- System must guide users through hair analysis questionnaire
- Analysis must capture: hair type, texture, concerns, current routine, styling habits
- System must provide personalized hair analysis results

**FR-009: Hair Analysis Results**
- Users must be able to view detailed hair analysis results
- Results must include: hair type assessment, concerns identification, product recommendations
- System must allow users to track hair progress over time
- Results must be stored in user profile

**FR-010: Photo Capture for Hair Analysis**
- System must support camera integration for hair photo capture
- Users must be able to grant/deny camera permissions
- Photos must be processed securely

#### 3.1.4 AI Assistant (Ask Karma)

**FR-011: AI Chat Interface**
- Authenticated users must be able to interact with AI assistant "Karma"
- System must support conversational interface with message history
- AI must provide personalized advice based on user context
- System must maintain conversation history per user
- Users must be able to create multiple conversations
- System must generate conversation titles automatically

**FR-012: AI Context Awareness**
- AI must access user profile data (gender, age, location, previous analyses)
- AI must reference knowledge base documents
- AI must consider conversation history for context
- AI must provide evidence-based recommendations
- AI must suggest relevant KarmaTerra products when appropriate

**FR-013: AI Response Generation**
- System must use Google Gemini 2.0 Flash model
- Responses must be formatted in plain text (no markdown)
- Responses must be between 150-300 words unless more detail requested
- System must handle API key management (database-stored or environment fallback)
- System must provide error handling for API failures

**FR-014: Knowledge Base Integration**
- Admins must be able to upload knowledge base documents
- AI must automatically incorporate knowledge base context
- System must support document management through admin panel

#### 3.1.5 Community Features

**FR-015: Community Page**
- Authenticated users must be able to access community features
- System must display community content and interactions
- Users must be able to engage with community posts
- System must support community moderation (admin-controlled)

#### 3.1.6 Blog & Content Management

**FR-016: Blog Listing**
- Authenticated users must be able to view blog posts
- System must display latest blog posts on homepage
- Blog posts must be fetched from Supabase database
- System must support featured images and external links
- Blog posts must be filterable by publish status

**FR-017: Blog Detail View**
- Users must be able to view individual blog post details
- System must support both internal and external blog links
- External links must open in new browser window
- Internal blog posts must display full content

**FR-018: Blog Content Management**
- Admins must be able to create, edit, and publish blog posts
- System must support rich text content, featured images, slugs
- Blog posts must have publish/unpublish status
- System must track publication dates

#### 3.1.7 Product Marketplace

**FR-019: Product Carousel**
- System must display product carousel on homepage
- Products must be fetched from Supabase database
- Products must support: name, image, description, product link
- System must support auto-rotating carousel (3-second intervals)
- Users must be able to swipe/click to navigate products
- Products must be orderable by display_order field
- Only active products must be displayed

**FR-020: Product Links**
- Users must be able to click products to view details
- Product links must open in external browser or in-app iframe
- System must handle external product page navigation
- Products must support payment, camera, microphone permissions in iframe

**FR-021: Market Page**
- Authenticated users must be able to access dedicated market page
- System must display available products and services
- Users must be able to browse and discover products

#### 3.1.8 Progress Tracking

**FR-022: Progress Tracking Page**
- Authenticated users must be able to track their skincare/haircare progress
- System must store progress data over time
- Users must be able to view historical progress
- System must provide visual progress indicators
- Progress must be linked to skin/hair analysis results

#### 3.1.9 Ingredients Information

**FR-023: Ingredients Page**
- Authenticated users must be able to access ingredients information
- System must provide educational content about skincare/haircare ingredients
- Users must be able to search and learn about specific ingredients
- Content must be managed through admin panel

#### 3.1.10 Feedback System

**FR-024: Feedback Submission**
- Authenticated users must be able to submit feedback
- System must store feedback in database
- Feedback must include: rating, comments, category
- Admins must be able to view and manage feedback

#### 3.1.11 Help & Support

**FR-025: Help Page**
- Users must be able to access help and support information
- System must provide FAQs and support resources
- Users must be able to contact support

**FR-026: Terms & Privacy**
- System must display Terms & Conditions page
- System must display Privacy Policy page
- Links must be accessible from menu and footer

#### 3.1.12 Notifications

**FR-027: Push Notifications**
- System must support push notifications for iOS and Android
- Users must be able to grant/deny notification permissions
- System must initialize push notifications on login
- Notifications must be user-specific
- System must handle notification registration and tokens

**FR-028: In-App Notifications**
- System must display notification icon in header
- Users must be able to view notification list
- Notifications must be fetched from Supabase database
- System must support notification read/unread status

#### 3.1.13 Admin Panel

**FR-029: Admin Authentication**
- Admins must be able to log in to admin panel
- System must support role-based access control
- Admin sessions must be secure

**FR-030: Content Management**
- Admins must be able to manage blog posts
- Admins must be able to manage products carousel
- Admins must be able to upload and manage images
- Admins must be able to configure app settings

**FR-031: AI Configuration**
- Admins must be able to manage AI API keys
- System must support per-user API key assignment
- System must support global API key fallback
- Admins must be able to upload knowledge base documents

**FR-032: User Management**
- Admins must be able to view user profiles
- Admins must be able to manage user data
- System must support user analytics

**FR-033: Feedback Management**
- Admins must be able to view all user feedback
- Admins must be able to respond to feedback
- System must support feedback categorization and filtering

#### 3.1.14 Mobile-Specific Features

**FR-034: Android Back Button**
- Android users must be able to use hardware back button
- Back button must navigate to home from service pages
- Back button must exit app from home/auth pages
- System must handle back button navigation intelligently

**FR-035: Status Bar Configuration**
- Android status bar must overlay WebView
- Status bar must respect safe areas
- System must configure status bar color and style

**FR-036: Camera Permissions**
- System must request camera permissions on native platforms
- System must handle permission denials gracefully
- Permissions must be requested proactively for new users

**FR-037: Pull to Refresh**
- Mobile users must be able to pull to refresh content
- System must support pull-to-refresh on relevant pages
- Refresh must trigger data reload

#### 3.1.15 Web-Specific Features

**FR-038: SEO Optimization**
- System must support dynamic meta tags per page
- System must include Open Graph tags
- System must include Twitter Card tags
- System must support structured data (JSON-LD)

**FR-039: Sitemap**
- System must provide sitemap.xml for search engines
- Sitemap must include all main pages
- Sitemap must be updated regularly

**FR-040: Cookie Consent**
- System must display cookie consent banner (GDPR compliant)
- Users must be able to accept/deny cookies
- Preference must be stored in localStorage

**FR-041: Global Search**
- Users must be able to search services and content
- System must support keyboard shortcut (Ctrl/Cmd + K)
- Search must be real-time with debouncing

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance Requirements

**NFR-001: Page Load Time**
- Initial page load must be under 3 seconds on 4G connection
- Subsequent page navigations must be under 1 second
- Images must load lazily (except critical above-the-fold images)

**NFR-002: API Response Time**
- API calls must respond within 2 seconds (95th percentile)
- AI response generation must complete within 10 seconds
- Database queries must be optimized with proper indexing

**NFR-003: Code Splitting**
- Application must use code splitting for optimal bundle size
- Pages must be lazy-loaded
- Initial bundle size must be minimized

**NFR-004: Image Optimization**
- Images must be optimized for web and mobile
- System must support responsive images
- Images must use appropriate formats (WebP when supported)

#### 3.2.2 Security Requirements

**NFR-005: Data Security**
- User data must be encrypted in transit (HTTPS)
- Sensitive data (PINs) must be hashed in database
- API keys must be stored securely (database or environment variables)
- User sessions must be validated server-side

**NFR-006: Authentication Security**
- PINs must be validated (exactly 4 digits)
- Phone numbers must be validated for uniqueness
- Session tokens must be secure
- System must prevent brute force attacks

**NFR-007: Privacy Compliance**
- System must comply with GDPR requirements
- Users must be able to access privacy policy
- Cookie consent must be implemented
- User data must be handled according to privacy policy

#### 3.2.3 Usability Requirements

**NFR-008: User Interface**
- Interface must be intuitive and user-friendly
- Design must be consistent across all pages
- System must provide clear navigation
- Error messages must be user-friendly

**NFR-009: Accessibility**
- System must support keyboard navigation
- System must have proper ARIA labels
- Color contrast must meet WCAG standards
- System must be usable with screen readers

**NFR-010: Mobile Responsiveness**
- Application must work on all screen sizes
- Touch interactions must be responsive
- System must handle safe areas (notches, status bars)
- Swipe gestures must be supported

#### 3.2.4 Reliability Requirements

**NFR-011: Error Handling**
- System must handle errors gracefully
- Error messages must be user-friendly
- System must log errors for debugging
- Critical errors must not crash the application

**NFR-012: Rate Limiting**
- System must handle API rate limits gracefully
- Users must see friendly error messages for rate limits
- System must display retry countdown
- Rate limit errors must be handled with user feedback

**NFR-013: Offline Support**
- System must handle network failures gracefully
- Users must see appropriate error messages
- Cached data must be used when available
- System must retry failed requests

#### 3.2.5 Scalability Requirements

**NFR-014: Database Scalability**
- Database must support concurrent users
- Queries must be optimized for performance
- System must support database indexing
- Database must handle growth in user base

**NFR-015: API Scalability**
- API must handle increased load
- System must support horizontal scaling
- Edge functions must be optimized
- System must handle AI API rate limits

#### 3.2.6 Maintainability Requirements

**NFR-016: Code Quality**
- Code must follow TypeScript best practices
- Code must be well-documented
- System must use consistent coding standards
- Code must be modular and reusable

**NFR-017: Testing**
- Critical features must be tested
- System must have error boundaries
- User flows must be validated
- System must support debugging tools

### 3.3 Business Rules

**BR-001: User Access Control**
- Skin analysis (Know Your Skin) is publicly accessible
- All other features require authentication
- Results pages require authentication
- Admin panel requires admin authentication

**BR-002: Data Validation**
- Phone numbers must be unique
- PINs must be exactly 4 numeric digits
- Email addresses must be valid format
- Birthdates must be valid dates

**BR-003: Content Management**
- Only published blog posts are visible to users
- Only active products are displayed
- Products are ordered by display_order
- Blog posts are ordered by published_at (newest first)

**BR-004: AI Service Rules**
- AI responses must be context-aware
- Knowledge base is automatically included in AI responses
- API keys are fetched from database first, then environment
- AI responses must be formatted as plain text

**BR-005: Session Management**
- Sessions persist across app restarts
- App version changes clear old sessions
- Invalid sessions redirect to login
- Sessions are validated against database

**BR-006: Mobile Platform Rules**
- Android back button behavior is platform-specific
- Camera permissions are requested on native platforms
- Push notifications are initialized on login
- Status bar configuration is Android-specific

---

## 4. User Stories

### 4.1 End User Stories

**US-001: As a new user, I want to create an account using my phone number and PIN, so that I can access personalized features.**

**US-002: As a user, I want to analyze my skin type and concerns, so that I can get personalized skincare recommendations.**

**US-003: As a user, I want to analyze my hair type and concerns, so that I can get personalized haircare recommendations.**

**US-004: As a user, I want to chat with an AI assistant about skincare and haircare, so that I can get instant expert advice.**

**US-005: As a user, I want to track my skincare/haircare progress over time, so that I can see improvements.**

**US-006: As a user, I want to browse blog posts about wellness, so that I can learn more about skincare and haircare.**

**US-007: As a user, I want to discover products through the marketplace, so that I can find suitable products for my needs.**

**US-008: As a user, I want to receive push notifications, so that I can stay updated with new content and features.**

**US-009: As a user, I want to provide feedback, so that I can help improve the platform.**

**US-010: As a user, I want to access help and support, so that I can get assistance when needed.**

### 4.2 Admin User Stories

**US-011: As an admin, I want to manage blog posts, so that I can keep content fresh and relevant.**

**US-012: As an admin, I want to manage product carousel, so that I can showcase featured products.**

**US-013: As an admin, I want to configure AI settings, so that I can control AI behavior and API keys.**

**US-014: As an admin, I want to upload knowledge base documents, so that AI can provide accurate information.**

**US-015: As an admin, I want to view user feedback, so that I can improve the platform based on user needs.**

---

## 5. System Architecture

### 5.1 Application Structure

```
KarmaTerra Application
‚îú‚îÄ‚îÄ Frontend (React + TypeScript)
‚îÇ   ‚îú‚îÄ‚îÄ Pages (User-facing pages)
‚îÇ   ‚îú‚îÄ‚îÄ Components (Reusable UI components)
‚îÇ   ‚îú‚îÄ‚îÄ Services (Business logic and API calls)
‚îÇ   ‚îú‚îÄ‚îÄ Hooks (Custom React hooks)
‚îÇ   ‚îî‚îÄ‚îÄ Lib (Utilities and configurations)
‚îú‚îÄ‚îÄ Backend (Supabase)
‚îÇ   ‚îú‚îÄ‚îÄ Database (PostgreSQL)
‚îÇ   ‚îú‚îÄ‚îÄ Edge Functions (Serverless functions)
‚îÇ   ‚îî‚îÄ‚îÄ Storage (File storage)
‚îú‚îÄ‚îÄ Mobile (Capacitor)
‚îÇ   ‚îú‚îÄ‚îÄ iOS App
‚îÇ   ‚îî‚îÄ‚îÄ Android App
‚îî‚îÄ‚îÄ Admin Panel (Separate React app)
```

### 5.2 Database Schema (Key Tables)

- **profiles**: User profiles and authentication
- **blog_posts**: Blog content management
- **products_carousel**: Product marketplace
- **conversations**: AI chat conversations
- **messages**: AI chat messages
- **notifications**: Push notifications
- **feedback**: User feedback
- **app_config**: Application configuration
- **knowledge_base**: AI knowledge base documents
- **api_keys**: AI API key management

### 5.3 Integration Points

- **Supabase**: Database, authentication, storage, edge functions
- **Google Gemini AI**: AI response generation
- **Google Analytics**: User analytics and tracking
- **Push Notification Services**: iOS (APNs) and Android (FCM)
- **Vercel**: Web deployment and hosting

---

## 6. Success Criteria

### 6.1 User Engagement Metrics
- User registration and retention rates
- Daily/Monthly Active Users (DAU/MAU)
- Feature usage statistics
- Session duration and frequency

### 6.2 Technical Metrics
- Page load times < 3 seconds
- API response times < 2 seconds
- Error rate < 1%
- Uptime > 99.5%

### 6.3 Business Metrics
- User satisfaction scores
- Feedback submission rates
- AI conversation engagement
- Product discovery and click-through rates

---

## 7. Assumptions and Constraints

### 7.1 Assumptions
- Users have access to smartphones with internet connectivity
- Users are comfortable with mobile applications
- AI API (Google Gemini) will remain available and stable
- Supabase infrastructure will scale with user growth
- Users will provide accurate information during registration

### 7.2 Constraints
- AI API rate limits may affect response times
- Mobile app store approval processes may delay releases
- Database storage costs increase with user growth
- Camera permissions are required for photo capture features
- Push notifications require user permission

---

## 8. Risks and Mitigation

### 8.1 Technical Risks
- **AI API Failures**: Mitigation - Fallback API keys, error handling, user-friendly messages
- **Database Performance**: Mitigation - Query optimization, indexing, caching
- **Mobile Platform Changes**: Mitigation - Regular updates, testing, platform monitoring

### 8.2 Business Risks
- **User Adoption**: Mitigation - User-friendly interface, clear value proposition, marketing
- **Data Privacy Concerns**: Mitigation - GDPR compliance, clear privacy policy, secure data handling
- **Scalability**: Mitigation - Cloud infrastructure, database optimization, load testing

---

## 9. Future Enhancements

### 9.1 Planned Features
- Enhanced community features (posts, comments, likes)
- Social sharing capabilities
- Advanced progress tracking with charts
- Product recommendations based on analysis
- Multi-language support
- Video tutorials and content
- Appointment booking (if applicable)
- Loyalty program integration

### 9.2 Technical Improvements
- Offline mode support
- Advanced caching strategies
- Performance monitoring and optimization
- Enhanced analytics and reporting
- A/B testing capabilities
- Advanced AI features (image analysis, voice interaction)

---

## 10. Glossary

- **BRD**: Business Requirements Document
- **FR**: Functional Requirement
- **NFR**: Non-Functional Requirement
- **BR**: Business Rule
- **US**: User Story
- **AI**: Artificial Intelligence
- **API**: Application Programming Interface
- **PIN**: Personal Identification Number (4-digit)
- **GDPR**: General Data Protection Regulation
- **SEO**: Search Engine Optimization
- **PWA**: Progressive Web App
- **Capacitor**: Cross-platform mobile framework
- **Supabase**: Backend-as-a-Service platform
- **Gemini**: Google's AI model

---

## 11. Document Control

### 11.1 Version History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | System | Initial BRD creation |

### 11.2 Approval
- **Business Owner**: [To be filled]
- **Technical Lead**: [To be filled]
- **Project Manager**: [To be filled]

### 11.3 Distribution
This document is distributed to:
- Development Team
- Product Management
- Quality Assurance Team
- Business Stakeholders
- Project Management

---

## 12. Appendices

### 12.1 Related Documents
- FEATURES_IMPLEMENTED.md
- GOOGLE_ANALYTICS_SETUP.md
- VERCEL_DEPLOYMENT.md
- PERFORMANCE_OPTIMIZATION_GUIDE.md

### 12.2 Contact Information
- **Project Repository**: [GitHub Repository URL]
- **Documentation**: [Documentation URL]
- **Support**: [Support Contact]

---

**End of Document**



