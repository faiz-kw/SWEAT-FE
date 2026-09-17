import { bookingsApi } from './bookingsApi';
import type {
  AttendanceRecord,
  MemberAttendanceState,
  AccessEvent,
  AttendancePolicySet,
  AttendancePenaltyRule,
} from '../types/bookings';

export const attendanceApi = {
  getAttendanceRecords: bookingsApi.getAttendanceRecords,
  getMemberAttendanceStates: bookingsApi.getMemberAttendanceStates,
  getTurnstileAccessEvents: bookingsApi.getAccessEvents,
  getAttendancePolicies: bookingsApi.getAttendancePolicySets,
  getAttendancePenaltyRules: bookingsApi.getAttendancePenaltyRules,
};

export type {
  AttendanceRecord,
  MemberAttendanceState,
  AccessEvent,
  AttendancePolicySet,
  AttendancePenaltyRule,
};
