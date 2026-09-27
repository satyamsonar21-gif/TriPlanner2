import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RoleGuard } from '@/core/rbac/RoleGuard';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { TravelerLayout } from '@/components/layout/TravelerLayout';
import { OperatorLayout } from '@/components/layout/OperatorLayout';
import { VendorLayout } from '@/components/layout/VendorLayout';

import { HomePage } from '@/pages/public/HomePage';
import { DestinationsPage } from '@/pages/public/DestinationsPage';
import { DestinationDetailPage } from '@/pages/public/DestinationDetailPage';
import { PlanJourneyPage } from '@/pages/public/PlanJourneyPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage';
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage';
import { TravelerDashboardPage } from '@/pages/traveler/TravelerDashboardPage';
import { MyJourneysPage } from '@/pages/traveler/MyJourneysPage';
import { JourneyDetailPage } from '@/pages/traveler/JourneyDetailPage';
import { BookingsPage } from '@/pages/traveler/BookingsPage';
import { SavedPage } from '@/pages/traveler/SavedPage';
import { TravelerExplorePage } from '@/pages/traveler/TravelerExplorePage';
import { PreferencesPage } from '@/pages/traveler/PreferencesPage';
import { PaymentsPage } from '@/pages/traveler/PaymentsPage';
import { NotificationsPage } from '@/pages/traveler/NotificationsPage';
import { SupportPage } from '@/pages/traveler/SupportPage';
import { OperatorDashboardPage } from '@/pages/operator/OperatorDashboardPage';
import { OperatorChangeCenterPage } from '@/pages/operator/OperatorChangeCenterPage';
import { OperatorBookingCenterPage } from '@/pages/operator/OperatorBookingCenterPage';
import { OperatorAttentionCenterPage } from '@/pages/operator/OperatorAttentionCenterPage';
import { VendorDashboardPage } from '@/pages/vendor/VendorDashboardPage';
import { SupplierOperationsPage } from '@/pages/vendor/SupplierOperationsPage';
import { PlaceholderPage } from '@/pages/common/PlaceholderPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<DestinationsPage />} />
        <Route path="/destinations" element={<DestinationsPage />} />
        <Route path="/destinations/:slug" element={<DestinationDetailPage />} />
        <Route path="/plan" element={<PlanJourneyPage />} />
        <Route
          path="/operators"
          element={<PlaceholderPage title="Operator Directory" domain="operators" />}
        />
      </Route>

      {/* AUTHENTICATION ROUTES */}
      <Route path="/auth/login" element={<LoginPage defaultMode="signin" />} />
      <Route path="/auth/signup" element={<LoginPage defaultMode="signup" />} />
      <Route path="/auth/register" element={<LoginPage defaultMode="signup" />} />
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/unauthorized" element={<UnauthorizedPage />} />

      {/* ONBOARDING ROUTES */}
      <Route
        path="/onboarding/preferences"
        element={
          <RoleGuard requireAuth>
            <PreferencesPage />
          </RoleGuard>
        }
      />
      <Route
        path="/onboarding/operator-setup"
        element={
          <RoleGuard requireAuth allowedRoles={['operator', 'admin']}>
            <PlaceholderPage title="Operator Setup Onboarding" domain="operators" />
          </RoleGuard>
        }
      />
      <Route
        path="/onboarding/vendor-setup"
        element={
          <RoleGuard requireAuth allowedRoles={['vendor', 'admin']}>
            <PlaceholderPage title="Vendor Setup Onboarding" domain="vendors" />
          </RoleGuard>
        }
      />
      <Route
        path="/onboarding/team-setup"
        element={
          <RoleGuard requireAuth allowedRoles={['operator', 'admin']}>
            <PlaceholderPage title="Team & Coordinator Setup" domain="operators" />
          </RoleGuard>
        }
      />

      {/* TRAVELER PORTAL */}
      <Route
        element={
          <RoleGuard requireAuth allowedRoles={['traveler', 'admin']}>
            <TravelerLayout />
          </RoleGuard>
        }
      >
        <Route path="/dashboard" element={<TravelerDashboardPage />} />
        <Route path="/journeys" element={<MyJourneysPage />} />
        <Route path="/journeys/:id" element={<JourneyDetailPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/explore-destinations" element={<TravelerExplorePage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/agent" element={<PreferencesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/support" element={<SupportPage />} />

        {/* Specialized Traveler Sub-routes */}
        <Route
          path="/journey/build"
          element={<PlaceholderPage title="Dynamic Journey Builder" domain="journey-builder" />}
        />
        <Route path="/journeys/:id/bookings" element={<BookingsPage />} />
        <Route path="/journeys/:id/budget" element={<PaymentsPage />} />
        <Route
          path="/journeys/:id/history"
          element={<PlaceholderPage title="Journey History & Audit" domain="audit" />}
        />
        <Route path="/journeys/:id/live" element={<TravelerDashboardPage />} />
        <Route path="/journeys/:id/changes/:changeId" element={<NotificationsPage />} />
        <Route path="/journeys/:id/changes/:changeId/review" element={<NotificationsPage />} />
        <Route path="/profile" element={<PreferencesPage />} />
      </Route>

      {/* OPERATOR PORTAL */}
      <Route
        element={
          <RoleGuard requireAuth allowedRoles={['operator', 'coordinator', 'admin']}>
            <OperatorLayout />
          </RoleGuard>
        }
      >
        <Route path="/operator/dashboard" element={<OperatorDashboardPage />} />
        <Route
          path="/operator/tours"
          element={<PlaceholderPage title="Tour Package Management" domain="operators" />}
        />
        <Route
          path="/operator/tours/:id"
          element={<PlaceholderPage title="Tour Details & Itinerary Template" domain="operators" />}
        />
        <Route
          path="/operator/bookings"
          element={<OperatorBookingCenterPage />}
        />
        <Route
          path="/operator/bookings/:id"
          element={<OperatorBookingCenterPage />}
        />
        <Route
          path="/operator/customers"
          element={<PlaceholderPage title="Customer Roster" domain="operators" />}
        />
        <Route
          path="/operator/customers/:id"
          element={<PlaceholderPage title="Customer Profile & History" domain="operators" />}
        />
        <Route
          path="/operator/vendors"
          element={<PlaceholderPage title="Vendor Directory & Contracts" domain="vendors" />}
        />
        <Route
          path="/operator/vendors/:id"
          element={<PlaceholderPage title="Vendor Performance & Details" domain="vendors" />}
        />
        <Route
          path="/operator/operations"
          element={<OperatorChangeCenterPage />}
        />
        <Route
          path="/operator/attention"
          element={<OperatorAttentionCenterPage />}
        />
        <Route
          path="/operator/alerts"
          element={<OperatorAttentionCenterPage />}
        />
        <Route
          path="/operator/changes"
          element={<OperatorChangeCenterPage />}
        />
        <Route
          path="/operator/payments"
          element={<PlaceholderPage title="Operator Payments & Financials" domain="payments" />}
        />
        <Route
          path="/operator/reports"
          element={<PlaceholderPage title="Operations Analytics & Reports" domain="operators" />}
        />
        <Route
          path="/operator/settings"
          element={<PlaceholderPage title="Operator Organization Settings" domain="operators" />}
        />
      </Route>

      {/* VENDOR PORTAL */}
      <Route
        element={
          <RoleGuard requireAuth allowedRoles={['vendor', 'admin']}>
            <VendorLayout />
          </RoleGuard>
        }
      >
        <Route path="/vendor/dashboard" element={<VendorDashboardPage />} />
        <Route
          path="/vendor/bookings"
          element={<SupplierOperationsPage />}
        />
        <Route
          path="/vendor/availability"
          element={<SupplierOperationsPage />}
        />
        <Route
          path="/vendor/messages"
          element={<PlaceholderPage title="Operator Communication Hub" domain="vendors" />}
        />
        <Route
          path="/vendor/profile"
          element={<PlaceholderPage title="Vendor Business Profile" domain="vendors" />}
        />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
