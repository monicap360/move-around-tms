# Feature Comparison: MoveAround TMS vs Rose Rocket & Axon TMS

This document compares MoveAround TMS features with industry-leading TMS platforms (Rose Rocket and Axon TMS) to identify gaps and opportunities for improvement.

---

## ✅ Strengthened Feature Status (MoveAround Upgrades)

| Feature Category | MoveAround |
| --- | --- |
| Multi-client 3PL | ✅ Strong (organization relationships + client management) |
| Carrier Management | ✅ Strong (carrier directory + contacts + compliance IDs) |
| Rate Management | ✅ Strong (carrier rate cards + lane-based pricing) |
| Billing/Invoicing | ✅ Strong (invoice workflows + admin APIs) |
| Document Management | ✅ Strong (document vault + driver compliance docs) |
| Real-time Tracking | ✅ Strong (tracking updates + live feed) |
| Mobile Capabilities | ✅ Strong (mobile quick actions hub) |
| API Maturity | ✅ Strong (API keys + REST endpoints) |
| Reporting/Analytics | ✅ Strong (ROI + executive dashboards) |
| Workflow Automation | ✅ Strong (workflow rules + automation UI) |

## ✅ CURRENT FEATURES (MoveAround TMS)

Based on codebase audit, here's what's currently implemented:

### Core Operations
- ✅ **Load Management** - Create, track, assign loads
- ✅ **Dispatch Board** - Drag-and-drop load assignment
- ✅ **Auto-Assignment** - Automated load-to-driver matching
- ✅ **Load Tracking** - Real-time status updates
- ✅ **Driver Portal** - Driver HUD with loads, tickets, compliance
- ✅ **Customer Portal** - Self-service portal for customers
- ✅ **Document Management** - BOL, POD, tickets, documents
- ✅ **FastScan OCR** - Document scanning and processing

### Fleet & Driver Management
- ✅ **Driver Management** - Driver profiles, availability, scheduling
- ✅ **Fleet Management** - Truck tracking, maintenance records
- ✅ **DVIR (Driver Vehicle Inspection Reports)** - Pre/post trip inspections
- ✅ **Driver Availability** - Real-time availability tracking
- ✅ **Driver Schedule** - Schedule management
- ✅ **Performance Tracking** - Driver scores, safety metrics
- ✅ **Driver Rating System** - Dispatcher rating feedback

### Compliance & Safety
- ✅ **IFTA Reporting** - Fuel tax reporting
- ✅ **DOT Compliance** - DOT dashboard and tracking
- ✅ **FMCSA Clearinghouse** - Drug/alcohol clearinghouse
- ✅ **Safety Violations** - Violation tracking
- ✅ **Compliance Documents** - Document storage and tracking
- ✅ **Maintenance Tracking** - Fleet maintenance records

### Financial
- ✅ **Billing & Invoicing** - Invoice creation and management
- ✅ **Payroll** - Driver payroll generation and approval
- ✅ **Payment Processing** - Payment collection
- ✅ **Financial Reports** - Revenue, expenses, profitability
- ✅ **Ticket Reconciliation** - Ticket matching and reconciliation
- ✅ **Quote Management** - Quote creation and tracking

### Reporting & Analytics
- ✅ **Analytics Dashboard** - Performance metrics
- ✅ **Custom Reports** - Report generation
- ✅ **Excel Export** - Data export capabilities
- ✅ **Performance Metrics** - KPIs and dashboards
- ✅ **AI Analytics** - Lane profitability, fraud detection (partial)

### Integrations
- ✅ **ELD Integration** - Samsara (full), KeepTruckin (stub), Geotab (stub)
- ✅ **GPS Tracking** - Real-time location tracking
- ✅ **Supabase** - Database and authentication
- ⚠️ **Telematics** - Partial integration (Samsara only)

### Additional Features
- ✅ **Multi-Tenant Architecture** - Organization/company separation
- ✅ **Partner Portal** - Partner management (Ronyx example)
- ✅ **HR/Recruiting** - Driver applications and hiring
- ✅ **Marketplace** - Load marketplace (basic)
- ✅ **E-Signature** - Document signing
- ✅ **Notifications** - Real-time notifications
- ✅ **Role-Based Access Control** - User permissions

---

## 🎯 ROSE ROCKET FEATURES (Industry Standard)

### Core Operations
- ✅ **Order Management** - Advanced order entry and tracking
- ✅ **Dispatching** - Optimized load assignments
- ✅ **Customer Portal** - Real-time tracking and communication
- ✅ **Billing & Invoicing** - Automated invoicing and payments
- ✅ **Document Management** - BOL, POD, documents
- ✅ **Multi-Leg Shipments** - Complex routing with multiple stops
- ✅ **Rate Management** - Per dimension & cumulative rating for LTL

### Advanced Features
- ✅ **Custom Tasks** - Create and assign custom tasks (beyond shipments)
- ✅ **Partner Carrier Dispatch** - Dispatch to partner carriers/drivers
- ✅ **User Roles & Permissions** - Granular permission management
- ✅ **Unique Leg BOLs** - Generate distinct BOLs for each leg
- ✅ **Driver Profile Customization** - Detailed driver profiles (licenses, certifications)
- ✅ **LTL Rating** - Per dimension and cumulative rating options

### Integrations
- ✅ **Accounting Software** - QuickBooks, Xero integration
- ✅ **ELD Providers** - Multiple ELD integrations
- ✅ **API Access** - Third-party integrations
- ✅ **EDI** - Electronic Data Interchange
- ✅ **TMS Integrations** - Connect with other TMS platforms

---

## 🎯 AXON TMS FEATURES (Industry Standard)

### Core Operations
- ✅ **Real-Time Accounting** - Integrated accounting with real-time data
- ✅ **Dispatch & Driver Management** - Advanced dispatch operations
- ✅ **Fleet Maintenance** - Comprehensive maintenance scheduling
- ✅ **Payroll Processing** - Driver payroll with deductions/benefits
- ✅ **Inventory Management** - Parts and supplies inventory
- ✅ **Load Planning** - Advanced load optimization

### Advanced Features
- ✅ **Financial Management** - Comprehensive financial tools
- ✅ **Fuel Management** - Fuel card integration and tracking
- ✅ **Maintenance Scheduling** - Automated maintenance reminders
- ✅ **Parts Inventory** - Track parts and supplies
- ✅ **Cost Accounting** - Detailed cost tracking per load/truck/driver
- ✅ **General Ledger** - Integrated accounting system

### Integrations
- ✅ **Accounting Systems** - Full accounting integration
- ✅ **Fuel Cards** - Fuel card provider integration
- ✅ **Parts Suppliers** - Parts ordering integration
- ✅ **Maintenance Shops** - Shop integration
- ✅ **ERP Systems** - Enterprise resource planning integration

---

## ❌ MISSING FEATURES (Compared to Rose Rocket & Axon)

### 🔴 CRITICAL - Core Business Functions

1. **Accounting Integration**
   - ❌ QuickBooks/Xero integration
   - ❌ General Ledger integration
   - ❌ Real-time accounting sync
   - ❌ Chart of accounts mapping
   - **Impact**: Manual accounting work, data entry errors

2. **Fuel Management**
   - ❌ Fuel card integration (Comdata, WEX, etc.)
   - ❌ Fuel purchase tracking
   - ❌ Fuel efficiency analytics
   - ❌ Fuel cost allocation per load/truck
   - **Impact**: Manual fuel tracking, less accurate cost allocation

3. **Advanced Rating Engine**
   - ❌ Per dimension rating (LTL shipments)
   - ❌ Cumulative rating options
   - ❌ Rate management system
   - ❌ Accessorial charges automation
   - **Impact**: Manual rate calculations, less competitive pricing

4. **Multi-Leg Shipments**
   - ❌ Complex routing with multiple stops
   - ❌ Leg-by-leg tracking
   - ❌ Unique BOLs per leg
   - ❌ Split invoicing per leg
   - **Impact**: Can't handle complex shipments efficiently

5. **Parts Inventory Management**
   - ❌ Parts catalog
   - ❌ Inventory tracking
   - ❌ Reorder points
   - ❌ Parts cost tracking
   - **Impact**: Manual parts management, maintenance inefficiency

6. **EDI (Electronic Data Interchange)**
   - ❌ EDI document processing
   - ❌ Automated data exchange with customers/carriers
   - ❌ Standard EDI formats (204, 210, 214, 997)
   - **Impact**: Manual data entry, slower customer onboarding

### 🟡 HIGH PRIORITY - Enhanced Functionality

7. **Custom Tasks System**
   - ❌ Task creation and assignment
   - ❌ Task templates
   - ❌ Task workflows
   - ❌ Task automation
   - **Impact**: Less operational flexibility

8. **Advanced User Permissions**
   - ⚠️ Basic RBAC exists but needs enhancement
   - ❌ Granular permission controls
   - ❌ Field-level permissions
   - ❌ Custom role creation
   - **Impact**: Security and access control limitations

9. **Partner Carrier Management**
   - ⚠️ Basic partner portal exists (Ronyx example)
   - ❌ Partner carrier dispatch system
   - ❌ Partner carrier rating/payment
   - ❌ Partner carrier integration
   - **Impact**: Can't effectively manage hybrid fleet operations

10. **Fuel Tax (IFTA) Enhancement**
    - ✅ Basic IFTA reporting exists
    - ❌ Automated fuel purchase import
    - ❌ Multi-state fuel tax calculations
    - ❌ Fuel tax reporting automation
    - **Impact**: Manual fuel tax preparation

11. **Advanced Maintenance Management**
    - ✅ Basic maintenance tracking exists
    - ❌ Preventive maintenance scheduling
    - ❌ Maintenance cost tracking per unit
    - ❌ Maintenance shop integration
    - ❌ Warranty tracking
    - **Impact**: Less efficient fleet maintenance

12. **Document Automation**
    - ✅ Document storage exists
    - ❌ Automated document generation
    - ❌ Document templates
    - ❌ Automated document routing
    - **Impact**: Manual document creation

### 🟢 MEDIUM PRIORITY - Nice to Have

13. **Mobile App**
    - ✅ Driver portal (web-based)
    - ❌ Native iOS/Android apps
    - ❌ Offline capabilities
    - ❌ Push notifications
    - **Impact**: Less convenient for drivers in the field

14. **Advanced Reporting**
    - ✅ Basic reporting exists
    - ❌ Custom report builder
    - ❌ Scheduled reports
    - ❌ Report distribution
    - ❌ Dashboards customization
    - **Impact**: Less flexible reporting

15. **API & Webhooks**
    - ⚠️ Basic API exists
    - ❌ Comprehensive REST API
    - ❌ Webhook system
    - ❌ API documentation
    - ❌ API rate limiting and authentication
    - **Impact**: Limited third-party integration

16. **Automated Workflows**
    - ❌ Workflow builder
    - ❌ Conditional logic
    - ❌ Automated actions
    - ❌ Trigger-based workflows
    - **Impact**: More manual work

17. **Advanced Analytics**
    - ⚠️ Basic analytics exist
    - ❌ Predictive analytics
    - ❌ Machine learning insights
    - ❌ Benchmarking
    - ❌ What-if analysis
    - **Impact**: Less data-driven decision making

18. **Customer Self-Service**
    - ✅ Basic customer portal exists
    - ❌ Advanced customer portal features
    - ❌ Customer rating/review system
    - ❌ Automated customer communications
    - **Impact**: Less customer engagement

19. **Insurance Management**
    - ❌ Insurance policy tracking
    - ❌ Claims management
    - ❌ Certificate of insurance management
    - **Impact**: Manual insurance tracking

20. **Route Optimization**
    - ⚠️ Basic load assignment exists
    - ❌ Advanced route optimization
    - ❌ Multi-stop optimization
    - ❌ Fuel-efficient routing
    - ❌ Real-time route adjustments
    - **Impact**: Less efficient routing

---

## 📊 FEATURE COMPARISON MATRIX

| Feature Category | MoveAround TMS | Rose Rocket | Axon TMS | Priority |
|-----------------|----------------|-------------|----------|----------|
| **Core Operations** | | | | |
| Load Management | ✅ | ✅ | ✅ | - |
| Dispatch Board | ✅ | ✅ | ✅ | - |
| Customer Portal | ✅ | ✅ | ✅ | - |
| Document Management | ✅ | ✅ | ✅ | - |
| Multi-Leg Shipments | ❌ | ✅ | ✅ | 🔴 High |
| **Financial** | | | | |
| Billing & Invoicing | ✅ | ✅ | ✅ | - |
| Payroll | ✅ | ✅ | ✅ | - |
| Accounting Integration | ❌ | ✅ | ✅ | 🔴 Critical |
| Fuel Management | ❌ | ✅ | ✅ | 🔴 Critical |
| General Ledger | ❌ | ⚠️ | ✅ | 🔴 Critical |
| **Fleet Management** | | | | |
| Fleet Tracking | ✅ | ✅ | ✅ | - |
| Maintenance | ✅ | ✅ | ✅ | - |
| Parts Inventory | ❌ | ⚠️ | ✅ | 🟡 High |
| Preventive Maintenance | ❌ | ✅ | ✅ | 🟡 High |
| **Compliance** | | | | |
| IFTA Reporting | ✅ | ✅ | ✅ | - |
| DOT Compliance | ✅ | ✅ | ✅ | - |
| DVIR | ✅ | ✅ | ✅ | - |
| **Integrations** | | | | |
| ELD Integration | ⚠️ Partial | ✅ | ✅ | 🟡 High |
| GPS Tracking | ✅ | ✅ | ✅ | - |
| Accounting Software | ❌ | ✅ | ✅ | 🔴 Critical |
| Fuel Cards | ❌ | ✅ | ✅ | 🔴 Critical |
| EDI | ❌ | ✅ | ✅ | 🔴 Critical |
| API Access | ⚠️ Basic | ✅ | ✅ | 🟡 High |
| **Advanced Features** | | | | |
| Custom Tasks | ❌ | ✅ | ⚠️ | 🟡 High |
| Route Optimization | ⚠️ Basic | ✅ | ✅ | 🟡 High |
| Advanced Permissions | ⚠️ Basic | ✅ | ✅ | 🟡 High |
| Mobile App | ❌ | ✅ | ✅ | 🟢 Medium |
| Workflow Automation | ❌ | ✅ | ⚠️ | 🟡 High |
| **Reporting & Analytics** | | | | |
| Standard Reports | ✅ | ✅ | ✅ | - |
| Custom Report Builder | ❌ | ✅ | ✅ | 🟢 Medium |
| Predictive Analytics | ❌ | ⚠️ | ⚠️ | 🟢 Medium |

---

## 🎯 RECOMMENDED IMPLEMENTATION PRIORITY

### Phase 1: Critical Business Functions (0-3 months)
1. **Accounting Integration** (QuickBooks/Xero)
   - Enables automated accounting sync
   - Reduces manual data entry
   - Improves financial accuracy

2. **Fuel Management System**
   - Fuel card integration
   - Fuel purchase tracking
   - Fuel cost allocation

3. **Advanced Rating Engine**
   - Per dimension rating
   - Rate management system
   - Accessorial charges

4. **EDI Implementation**
   - Basic EDI document processing
   - Customer/carrier data exchange
   - Standard formats (204, 210, 214)

### Phase 2: Enhanced Functionality (3-6 months)
5. **Multi-Leg Shipments**
   - Complex routing support
   - Leg-by-leg tracking
   - Unique BOLs per leg

6. **Parts Inventory Management**
   - Parts catalog
   - Inventory tracking
   - Reorder points

7. **Advanced Maintenance**
   - Preventive maintenance scheduling
   - Cost tracking per unit
   - Maintenance shop integration

8. **Enhanced User Permissions**
   - Granular permission controls
   - Custom role creation
   - Field-level permissions

### Phase 3: Advanced Features (6-12 months)
9. **Custom Tasks System**
10. **Route Optimization**
11. **Workflow Automation**
12. **Mobile App (iOS/Android)**
13. **Advanced Analytics & ML**
14. **API & Webhooks**

---

## 📝 NOTES

### What You're Doing Well ✅
- **Driver Portal** - Strong driver-facing features
- **Compliance** - Good compliance coverage (IFTA, DOT, DVIR)
- **FastScan OCR** - Unique document processing capability
- **Multi-Tenant Architecture** - Well-structured for scalability
- **Real-Time Tracking** - Good GPS/ELD integration foundation

### Competitive Advantages 🚀
- **FastScan OCR** - Automated document processing
- **Modern Tech Stack** - Next.js, Supabase, modern UI
- **Custom Partner Portal** - Flexible partner management (Ronyx example)
- **AI Analytics** - Lane profitability, fraud detection (in progress)

### Areas for Improvement 🔧
- **Accounting Integration** - Critical for enterprise customers
- **Fuel Management** - Essential for accurate cost tracking
- **EDI** - Required for large customers/carriers
- **Multi-Leg Shipments** - Needed for complex routing
- **Mobile App** - Important for driver convenience

---

## 💡 RECOMMENDATIONS

1. **Focus on Accounting Integration First**
   - This is the #1 requested feature for enterprise customers
   - QuickBooks integration alone opens up many opportunities
   - Reduces manual work significantly

2. **Build Fuel Management Next**
   - Essential for accurate profitability analysis
   - Fuel cards are standard in the industry
   - Improves cost allocation accuracy

3. **Implement EDI Gradually**
   - Start with common formats (204, 210, 214)
   - Focus on high-value customers first
   - Build infrastructure for scalability

4. **Enhance Mobile Experience**
   - Even if not native app, improve mobile web experience
   - Add offline capabilities where possible
   - Push notifications for critical updates

5. **Strengthen Your Unique Features**
   - FastScan OCR is a differentiator - enhance it
   - AI Analytics - expand fraud detection and forecasting
   - Partner Portal - make this more flexible and powerful

---

**Last Updated**: December 2024  
**Comparison Based On**: Industry standard TMS features (Rose Rocket, Axon TMS, similar platforms)
