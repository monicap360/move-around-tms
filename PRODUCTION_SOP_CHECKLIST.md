# MoveAround TMS / Enterprise AI
## Production-Readiness SOP & Launch Checklist

### 1. System Stabilization
- [ ] Reboot server to clear pending kernel updates
- [ ] Confirm all services auto-start on boot (PM2, Docker, Supabase if local)
- [ ] Run final production build (`npm run build`)
- [ ] Confirm zero TypeScript errors
- [ ] Lock dependency versions
- [ ] Commit package-lock.json / pnpm-lock.yaml

### 2. Environment & Security Lockdown
- [ ] Verify `.env.production` is complete (Supabase, JWT, OCR/AI keys)
- [ ] Remove unused/test credentials
- [ ] Enable UFW firewall (allow only 22, 80, 443)
- [ ] Enable Fail2Ban
- [ ] Confirm HTTPS + SSL auto-renewal

### 3. Database & Data Integrity
- [ ] Confirm Supabase RLS policies enabled/tested
- [ ] Multi-tenant isolation verified
- [ ] Seed baseline data (company, drivers, trucks, ticket categories)
- [ ] Run backup snapshot and store off-server

### 4. Feature Validation (Smoke Tests)
- [ ] FleetPulse Live dashboard loads
- [ ] Driver timeline reconstructs correctly
- [ ] Ticket OCR uploads + parses
- [ ] Weekly performance analytics render
- [ ] Admin permissions restrict correctly
- [ ] Error states handled gracefully

### 5. Branding & UX Polish
- [ ] Brand colors finalized
- [ ] Consistent typography
- [ ] Logo placement correct
- [ ] Remove placeholder copy/dummy metrics
- [ ] Lock UI components as “v1 stable”

### 6. Monitoring & Logging
- [ ] Enable PM2 monitoring
- [ ] Enable server disk/memory alerts
- [ ] Add central error logging (Sentry or equivalent)
- [ ] Add API failure alerts for OCR/AI calls

### 7. Documentation
- [ ] Admin quick-start guide
- [ ] Driver onboarding guide
- [ ] Internal system architecture diagram
- [ ] Recovery checklist

### 8. Production Readiness Gate
- [ ] Fresh deploy from clean repo works
- [ ] New admin user can onboard without help
- [ ] No console errors in production
- [ ] Backup + restore tested successfully

### 9. Version Tag & Freeze
- [ ] Tag release: v1.0.0-production
- [ ] Freeze core architecture
- [ ] All future work moves to feature branches only

### 10. Next Phase (Optional)
- [ ] Client onboarding flows
- [ ] Billing / subscriptions
- [ ] White-label tenants
- [ ] AI forecasting & anomaly detection
- [ ] Mobile driver app

---
**Status Definition:**
Once steps 1–9 are complete, the program is officially: Production-complete, stable, and deployable at scale.
