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
    const res = await api.get('/bookings/', { params });
    return res.data.results || res.data;
  },

  getBooking: async (id: string): Promise<Booking> => {
    const res = await api.get(`/bookings/${id}/`);
    return res.data;
  },

  createBooking: async (data: {
    user_profile: string;
    occurrence: string;
    booking_type?: string;
    booking_source?: string;
    membership?: string;
  }): Promise<Booking> => {
    const res = await api.post('/bookings/', data);
    return res.data;
  },

  cancelBooking: async (
    bookingId: string,
    data: {
      reason_code?: string;
      reason_text?: string;
    }
  ): Promise<any> => {
    const res = await api.post(`/bookings/${bookingId}/cancel/`, data);
    return res.data;
  },

  recordAttendance: async (
    bookingId: string,
    data: {
      status?: string;
      check_in_method?: string;
    }
  ): Promise<AttendanceRecord> => {
    const res = await api.post(`/bookings/${bookingId}/record-attendance/`, data);
    return res.data;
  },

  promoteWaitlist: async (occurrenceId: string): Promise<Booking> => {
    const res = await api.post('/bookings/promote-waitlist/', { occurrence_id: occurrenceId });
    return res.data;
  },

  // Attendance Records
  getAttendanceRecords: async (params?: {
    status?: string;
    branch_id?: string;
    occurrence_id?: string;
    user_id?: string;
  }): Promise<AttendanceRecord[]> => {
    const res = await api.get('/attendance-records/', { params });
    return res.data.results || res.data;
  },

  // Access Events
  getAccessEvents: async (params?: {
    branch_id?: string;
    event_type?: string;
    status?: string;
  }): Promise<AccessEvent[]> => {
    const res = await api.get('/access-events/', { params });
    return res.data.results || res.data;
  },

  // Member Attendance States (Discipline)
  getMemberAttendanceStates: async (params?: {
    is_suspended?: boolean;
    user_id?: string;
  }): Promise<MemberAttendanceState[]> => {
    const res = await api.get('/member-attendance-states/', { params });
    return res.data.results || res.data;
  },

  // Policies & Rules
  getBookingPolicySets: async (): Promise<BookingPolicySet[]> => {
    const res = await api.get('/booking-policy-sets/');
    return res.data.results || res.data;
  },

  getBookingCancellationRules: async (): Promise<BookingCancellationRule[]> => {
    const res = await api.get('/booking-cancellation-rules/');
    return res.data.results || res.data;
  },

  getAttendancePolicySets: async (): Promise<AttendancePolicySet[]> => {
    const res = await api.get('/attendance-policy-sets/');
    return res.data.results || res.data;
  },

  getAttendancePenaltyRules: async (): Promise<AttendancePenaltyRule[]> => {
    const res = await api.get('/attendance-penalty-rules/');
    return res.data.results || res.data;
  },
};
