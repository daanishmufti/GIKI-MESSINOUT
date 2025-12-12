import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Search, User, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";

interface StudentInfo {
  user_id: string;
  email: string;
  full_name: string;
  is_in_today: boolean;
  total_days: number;
  total_amount: number;
}

const AdminStudentLookup = () => {
  const [regNumber, setRegNumber] = useState("");
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!regNumber || regNumber.length !== 7 || !/^\d{7}$/.test(regNumber)) {
      toast({
        title: "Invalid Registration Number",
        description: "Please enter a 7-digit registration number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearched(true);
    
    try {
      const { data, error } = await supabase.rpc("get_student_by_reg_number", {
        reg_number: regNumber
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setStudent({
          user_id: data[0].user_id,
          email: data[0].email,
          full_name: data[0].full_name,
          is_in_today: data[0].is_in_today,
          total_days: data[0].total_days,
          total_amount: data[0].total_amount
        });
      } else {
        setStudent(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!student) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("admin-operations", {
        body: {
          action: "update_attendance",
          targetUserId: student.user_id,
          isIn: !student.is_in_today
        }
      });

      if (response.error) throw new Error(response.error.message);

      setStudent({ ...student, is_in_today: !student.is_in_today });
      
      toast({
        title: "Status Updated",
        description: `Student marked as ${!student.is_in_today ? "IN" : "OUT"}`,
      });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src={logo} alt="GIKI Mess" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-display font-bold text-foreground">Student Lookup</h1>
              <p className="text-xs text-muted-foreground">Search by Registration Number</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-xl">
        <Card className="border-border/50 mb-6 animate-slide-up">
          <CardHeader>
            <CardTitle>Find Student</CardTitle>
            <CardDescription>
              Enter the 7-digit registration number (e.g., 1234567 for u1234567@giki.edu.pk)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">u</span>
                <Input
                  placeholder="1234567"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value.replace(/\D/g, "").slice(0, 7))}
                  className="pl-7"
                  maxLength={7}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} className="gradient-primary">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {searched && (
          <Card className="border-border/50 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Searching...</div>
              ) : student ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-8 h-8 text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{student.full_name || "No Name"}</h3>
                      <p className="text-muted-foreground">{student.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total Days</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{student.total_days}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-muted-foreground">₨</span>
                        <span className="text-sm text-muted-foreground">Total Amount</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">PKR {student.total_amount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">Today's Status:</span>
                      {student.is_in_today ? (
                        <Badge className="bg-success/20 text-success hover:bg-success/30 border-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          IN
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          <XCircle className="w-3 h-3 mr-1" />
                          OUT
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleStatus}
                      disabled={loading}
                    >
                      Toggle Status
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No student found with registration number u{regNumber}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminStudentLookup;