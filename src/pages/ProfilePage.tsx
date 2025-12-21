import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { User } from "lucide-react";
import { AndroidPageHeader } from "../components/AndroidBackButton";
import { supabase } from "@/lib/supabase";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(true);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [birthdate, setBirthdate] = useState(user?.birthdate || "");
  const [country, setCountry] = useState(user?.country || "");
  const [stateName, setStateName] = useState(user?.state || "");
  const [city, setCity] = useState(user?.city || "");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: "Invalid Input", description: "Name is required", variant: "destructive" });
      return;
    }
    try {
      const updates: any = {
        full_name: name.trim(),
        email: email || null,
        // phone_number is not editable, so we don't update it
        gender: gender || null,
        birthdate: birthdate || null,
        country: country || null,
        state: stateName || null,
        city: city || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      await updateProfile({
        name: name.trim(),
        email,
        // phone_number is not editable, so we keep the existing value
        phone_number: user?.phone_number,
        gender,
        birthdate,
        country,
        state: stateName,
        city
      });
      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Changes saved to Supabase" });
    } catch (err: any) {
      console.error('Profile update failed:', err);
      toast({ title: "Update Failed", description: err.message || 'Could not save changes', variant: "destructive" });
    }
  };

  const handleChangePin = async () => {
    if (!user) return;
    const is4Digits = (v: string) => /^\d{4}$/.test(v);
    if (!is4Digits(currentPin) || !is4Digits(newPin) || !is4Digits(confirmPin)) {
      toast({ title: "Invalid PIN", description: "PINs must be exactly 4 digits.", variant: "destructive" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "Mismatch", description: "New PIN and confirmation do not match.", variant: "destructive" });
      return;
    }
    try {
      // Verify current PIN matches this user's record
      const { data: profile, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, pin')
        .eq('id', user.id)
        .single();
      if (fetchErr) throw fetchErr;
      if (!profile || String(profile.pin) !== currentPin) {
        toast({ title: "Wrong PIN", description: "Current PIN is incorrect.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ pin: newPin, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;

      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      toast({ title: "PIN Updated", description: "Your login PIN has been changed." });
    } catch (err: any) {
      console.error('Change PIN failed:', err);
      toast({ title: "Failed to Change PIN", description: err.message || 'Please try again', variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-karma-cream via-background to-karma-light-gold">
      {/* Android Material Design Header */}
      <AndroidPageHeader
        title="Profile"
        backTo="/"
      />

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Profile Details */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing ? (
              <>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div><span className="font-medium">Name:</span> {user?.name}</div>
                  {user?.email && <div><span className="font-medium">Email:</span> {user.email}</div>}
                  {user?.phone_number && <div><span className="font-medium">Phone:</span> {user.phone_number}</div>}
                  {user?.gender && <div><span className="font-medium">Gender:</span> {user.gender}</div>}
                  {user?.birthdate && <div><span className="font-medium">Birthdate:</span> {user.birthdate}</div>}
                  {(user?.country || user?.state || user?.city) && (
                    <div><span className="font-medium">Location:</span> {user?.city || ''}{user?.city && (user?.state || user?.country) ? ', ' : ''}{user?.state || ''}{user?.state && user?.country ? ', ' : ''}{user?.country || ''}</div>
                  )}
                </div>
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-gradient-to-r from-karma-gold to-accent min-h-[48px]"
                >
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone</label>
                    <Input 
                      value={phone} 
                      disabled
                      readOnly
                      className="bg-gray-100 cursor-not-allowed opacity-75"
                      placeholder="1234567890"
                      title="Phone number cannot be changed"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Gender</label>
                    <Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Male/Female/Other" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Birthdate</label>
                    <Input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Country</label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">State</label>
                    <Input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">City</label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                  </div>
                </div>

                {/* Change PIN */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Change PIN</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Current PIN</label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        pattern="\\d*"
                        value={currentPin}
                        maxLength={4}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, '').slice(0,4))}
                        placeholder="1234"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">New PIN</label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        pattern="\\d*"
                        value={newPin}
                        maxLength={4}
                        onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0,4))}
                        placeholder="1234"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Confirm PIN</label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        pattern="\\d*"
                        value={confirmPin}
                        maxLength={4}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0,4))}
                        placeholder="1234"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button onClick={handleChangePin} variant="outline">Update PIN</Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-r from-karma-gold to-accent"
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setName(user?.name || "");
                      setEmail(user?.email || "");
                      setPhone(user?.phone_number || "");
                      setGender(user?.gender || "");
                      setBirthdate(user?.birthdate || "");
                      setCountry(user?.country || "");
                      setStateName(user?.state || "");
                      setCity(user?.city || "");
                      setCurrentPin("");
                      setNewPin("");
                      setConfirmPin("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;