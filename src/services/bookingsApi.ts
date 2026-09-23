import { api } from './api';
import {
  Booking,
  BookingCancellationRule,
  BookingPolicySet,
  AttendanceRecord,
  AccessEvent,
  MemberAttendanceState,
  AttendancePolicySet,
  AttendancePenaltyRule,
} from '../types/bookings';

export const bookingsApi = {
  // Bookings
  getBookings: async (params?: {
    status?: string;
    branch_id?: string;
    occurrence_id?: string;
    user_id?: string;
  }): Promise<Booking[]> => {
    const res = await api.get('/tenant/bookings/', { params });
    return res.data.results || res.data;
  },

  getBookableMembers: async (search?: string): Promise<any[]> => {
    const params: any = { bookable_only: true };
    if (search) params.search = search;
    const res = await api.get('/tenant/user-profiles/', { params });
    return res.data.results || res.data;
  },

  getBooking: async (id: string): Promise<Booking> => {
    const res = await api.get(`/tenant/bookings/${id}/`);
    return res.data;
  },

  createBooking: async (data: {
    user_profile: string;
    occurrence: string;
    booking_type?: string;
    booking_source?: string;
    membership?: string;
  }): Promise<Booking> => {
    const res = await api.post('/tenant/bookings/', data);
    return res.data;
  },

  cancelBooking: async (
    bookingId: string,
    data: {
      reason_code?: string;
      reason_text?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/tenant/bookings/${bookingId}/cancel/`, data);
    return res.data;
  },

  rescheduleBooking: async (
    bookingId: string,
    data: {
      to_occurrence_id: string;
      reason_code?: string;
      reason_text?: string;
    }
  ): Promise<Booking> => {
    const res = await api.post(`/tenant/bookings/${bookingId}/reschedule/`, data);
    return res.data;
  },

  recordAttendance: async (
    bookingId: string,
    data: {
      status?: string;
      check_in_method?: string;
    }
  ): Promise<AttendanceRecord> => {
    const res = await api.post(`/tenant/bookings/${bookingId}/record-attendance/`, data);
    return res.data;
  },

  confirmBooking: async (
    bookingId: string,
    data?: {
      channel?: string;
      notes?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/tenant/bookings/${bookingId}/confirm/`, data || {});
    return res.data;
  },

  promoteWaitlist: async (occurrenceId: string): Promise<Booking> => {
    const res = await api.post('/tenant/bookings/promote-waitlist/', { occurrence_id: occurrenceId });
    return res.data;
  },

  // Attendance Records
  getAttendanceRecords: async (params?: {
    status?: string;
    branch_id?: string;
    occurrence_id?: string;
    user_id?: string;
  }): Promise<AttendanceRecord[]> => {
    const res = await api.get('/tenant/attendance-records/', { params });
    return res.data.results || res.data;
  },

  // Access Events
  getAccessEvents: async (params?: {
    branch_id?: string;
    event_type?: string;
    status?: string;
  }): Promise<AccessEvent[]> => {
    const res = await api.get('/tenant/access-events/', { params });
    return res.data.results || res.data;
  },

  // Member Attendance States (Discipline)
  getMemberAttendanceStates: async (params?: {
    is_suspended?: boolean;
    user_id?: string;
  }): Promise<MemberAttendanceState[]> => {
    const res = await api.get('/tenant/member-attendance-states/', { params });
    return res.data.results || res.data;
  },

  resetMemberRestriction: async (stateId: string, reason?: string): Promise<MemberAttendanceState> => {
    const res = await api.post(`/tenant/member-attendance-states/${stateId}/reset-restriction/`, { reason });
    return res.data;
  },

  // Policies & Rules
  getBookingPolicySets: async (params?: { branch_id?: string; status?: string }): Promise<BookingPolicySet[]> => {
    const res = await api.get('/tenant/booking-policy-sets/', { params });
    return res.data.results || res.data;
  },

  createBookingPolicySet: async (data: Partial<BookingPolicySet>): Promise<BookingPolicySet> => {
    const res = await api.post('/tenant/booking-policy-sets/', data);
    return res.data;
  },

  updateBookingPolicySet: async (id: string, data: Partial<BookingPolicySet>): Promise<BookingPolicySet> => {
    const res = await api.patch(`/tenant/booking-policy-sets/${id}/`, data);
    return res.data;
  },

  getBookingCancellationRules: async (): Promise<BookingCancellationRule[]> => {
    const res = await api.get('/tenant/booking-cancellation-rules/');
    return res.data.results || res.data;
  },

  createBookingCancellationRule: async (data: Partial<BookingCancellationRule>): Promise<BookingCancellationRule> => {
    const res = await api.post('/tenant/booking-cancellation-rules/', data);
    return res.data;
  },

  updateBookingCancellationRule: async (id: string, data: Partial<BookingCancellationRule>): Promise<BookingCancellationRule> => {
    const res = await api.patch(`/tenant/booking-cancellation-rules/${id}/`, data);
    return res.data;
  },

  getAttendancePolicySets: async (): Promise<AttendancePolicySet[]> => {
    const res = await api.get('/tenant/attendance-policy-sets/');
    return res.data.results || res.data;
  },

  getAttendancePenaltyRules: async (): Promise<AttendancePenaltyRule[]> => {
    const res = await api.get('/tenant/attendance-penalty-rules/');
    return res.data.results || res.data;
  },
};
