import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Phone, Mail, MapPin, Calendar, Heart, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { membersApi } from '@/api/endpoints/membersApi';
import { crmApi } from '@/api/endpoints/crmApi';

export interface EditMemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  initialData: {
    name: string;
    phone?: string;
    email?: string;
    gender?: string;
    date_of_birth?: string;
    emergency_contact?: string;
    branch_id?: string;
  };
}

export const EditMemberProfileModal: React.FC<EditMemberProfileModalProps> = ({
  isOpen,
  onClose,
  memberId,
  initialData,
}) => {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('M');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [branchId, setBranchId] = useState('');

  // Fetch branches for preferred location select
  const { data: branches = [] } = useQuery({
    queryKey: ['locations-branches'],
    queryFn: async () => {
      try {
        const res = await crmApi.getBranches();
        return Array.isArray(res) ? res : (res as any)?.results || [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name || '');
      setPhone(initialData.phone || '');
      setEmail(initialData.email || '');
      setGender(initialData.gender === 'F' ? 'F' : initialData.gender === 'O' ? 'O' : 'M');
      setDateOfBirth(initialData.date_of_birth || '');
      setEmergencyContact(initialData.emergency_contact || '');
      setBranchId(initialData.branch_id || '');
    }
  }, [isOpen, initialData]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gender,
        date_of_birth: dateOfBirth || null,
        emergencyContact: emergencyContact.trim(),
      };
      if (branchId) {
        payload.locationId = branchId;
      }
      return membersApi.updateMember(memberId, payload);
    },
    onSuccess: () => {
      toast.success('Member profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member-360', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Failed to update member profile');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <User className="w-5 h-5 text-primary" />
            Edit Member Profile
          </DialogTitle>
          <DialogDescription>
            Update personal contact, demographics, and studio home branch for this member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Full Name *</Label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Phone Number</Label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="pl-9 text-sm font-mono"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Gender */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Gender</Label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Date of Birth</Label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Preferred / Home Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Home Branch
              </Label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground"
              >
                <option value="">-- Retain Current Branch --</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                Emergency Contact
              </Label>
              <Input
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Name & Contact phone"
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="gap-1.5">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
