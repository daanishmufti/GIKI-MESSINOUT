import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { LogIn, LogOut, Calendar, User, Settings, Clock, Star } from "lucide-react";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface Profile {
  id: string;
  email: string;
  full_name: string;
}

const StudentDashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayStatus, setTodayStatus] = useState<boolean>(false);
  const [tomorrowStatus, setTomorrowStatus] = useState<boolean | null>(null);
  const [totalDays, setTotalDays] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isBefore9AM = () => {
    const now = new Date();
    return now.getHours() < 9;
  };

  useEffect(() => {
    fetchProfile();
    fetchAttendance();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile(data);
      }
    }
  };

  const fetchAttendance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

    // Check today's status
    const { data: todayData } = await supabase
      .from("daily_attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    setTodayStatus(todayData?.is_in || false);

    // Check tomorrow's status
    const { data: tomorrowData } = await supabase
      .from("daily_attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", tomorrow)
      .maybeSingle();

    setTomorrowStatus(tomorrowData?.is_in ?? null);

    // Get total days marked as IN
    const { data: allAttendance } = await supabase
      .from("daily_attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_in", true);

    const days = allAttendance?.length || 0;
    setTotalDays(days);
    setTotalAmount(days * 600);
  };

  const handleMarkAttendance = async (markIn: boolean) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const before9AM = isBefore9AM();

    try {
      if (markIn) {
        // Marking IN
        const targetDate = before9AM ? today : tomorrow;
        
        const { data: existing } = await supabase
          .from("daily_attendance")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", targetDate)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("daily_attendance")
            .update({ is_in: true, marked_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("daily_attendance")
            .insert({
              user_id: user.id,
              date: targetDate,
              is_in: true,
            });
          if (error) throw error;
        }

        if (before9AM) {
          setTodayStatus(true);
        } else {
          setTomorrowStatus(true);
        }

        toast({
          title: "Marked IN",
          description: before9AM 
            ? "You are now eligible for today's mess. PKR 600 will be charged."
            : "You will be eligible for tomorrow's mess. PKR 600 will be charged.",
        });
      } else {
        // Marking OUT
        const targetDate = before9AM ? today : tomorrow;
        
        const { data: existing } = await supabase
          .from("daily_attendance")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", targetDate)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("daily_attendance")
            .update({ is_in: false, marked_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("daily_attendance")
            .insert({
              user_id: user.id,
              date: targetDate,
              is_in: false,
            });
          if (error) throw error;
        }

        if (before9AM) {
          setTodayStatus(false);
        } else {
          setTomorrowStatus(false);
        }

        toast({
          title: "Marked OUT",
          description: before9AM 
            ? "You have marked out for today."
            : "You have marked out for tomorrow. Today's status remains unchanged.",
        });
      }

      // Recalculate totals
      const { data: allAttendance } = await supabase
        .from("daily_attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_in", true);

      const days = allAttendance?.length || 0;
      setTotalDays(days);
      setTotalAmount(days * 600);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const before9AM = isBefore9AM();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GIKI Mess" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-display font-bold text-foreground">GIKI Mess</h1>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/reviews")}
              title="Reviews"
            >
              <Star className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Welcome Card */}
        <Card className="mb-6 border-border/50 animate-slide-up">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Welcome, {profile?.full_name || "Student"}
                </CardTitle>
                <CardDescription>{profile?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Time Notice */}
        <Card className="mb-6 border-border/50 bg-accent/10 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {before9AM ? "Before 9:00 AM" : "After 9:00 AM"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {before9AM 
                    ? "Changes will apply to today" 
                    : "Changes will apply to tomorrow"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Status */}
        <Card className="mb-6 border-border/50 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Today's Status
            </CardTitle>
            <CardDescription>
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${
                todayStatus 
                  ? "bg-success/20 text-success" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {todayStatus ? (
                  <LogIn className="w-10 h-10" />
                ) : (
                  <LogOut className="w-10 h-10" />
                )}
              </div>
              <p className="text-2xl font-bold mb-2">
                {todayStatus ? "IN" : "OUT"}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {todayStatus 
                  ? "You are eligible for today's mess" 
                  : "You are not eligible for today's mess"}
              </p>

              {before9AM ? (
                <div className="flex gap-3 w-full max-w-xs">
                  <Button
                    className="flex-1 gradient-primary"
                    onClick={() => handleMarkAttendance(true)}
                    disabled={loading || todayStatus}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Mark IN
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleMarkAttendance(false)}
                    disabled={loading || !todayStatus}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Mark OUT
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  It's past 9 AM. Today's status is locked.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tomorrow's Status (only show after 9 AM) */}
        {!before9AM && (
          <Card className="mb-6 border-border/50 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                Tomorrow's Status
              </CardTitle>
              <CardDescription>
                {format(addDays(new Date(), 1), "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${
                  tomorrowStatus 
                    ? "bg-success/20 text-success" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {tomorrowStatus ? (
                    <LogIn className="w-10 h-10" />
                  ) : (
                    <LogOut className="w-10 h-10" />
                  )}
                </div>
                <p className="text-2xl font-bold mb-2">
                  {tomorrowStatus ? "IN" : "OUT"}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {tomorrowStatus 
                    ? "You will be eligible for tomorrow's mess" 
                    : "Mark IN for tomorrow's mess"}
                </p>

                <div className="flex gap-3 w-full max-w-xs">
                  <Button
                    className="flex-1 gradient-primary"
                    onClick={() => handleMarkAttendance(true)}
                    disabled={loading || tomorrowStatus === true}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Mark IN
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleMarkAttendance(false)}
                    disabled={loading || tomorrowStatus === false || tomorrowStatus === null}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Mark OUT
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                  <p className="text-2xl font-bold text-foreground">{totalDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-accent">₨</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-foreground">PKR {totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Each day marked IN costs PKR 600
        </p>
      </main>
    </div>
  );
};

export default StudentDashboard;
