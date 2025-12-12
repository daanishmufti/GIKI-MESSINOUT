import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { 
  LogOut, Search, Users, 
  CheckCircle2, XCircle, Settings, Calendar,
  BarChart3, UserSearch, Trash2, KeyRound, Star
} from "lucide-react";
import logo from "@/assets/logo.png";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StudentAttendance {
  user_id: string;
  email: string;
  full_name: string;
  is_in_today: boolean;
  total_days: number;
  total_amount: number;
}

const AdminDashboard = () => {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredStudents(
        students.filter(
          (s) =>
            s.full_name.toLowerCase().includes(query) ||
            s.email.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_all_students_attendance");

      if (error) throw error;

      setStudents(data || []);
      setFilteredStudents(data || []);
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

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    
    setActionLoading(true);
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: {
          action: "delete_user",
          targetUserId: selectedStudent.user_id
        }
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Student Deleted",
        description: `${selectedStudent.full_name || selectedStudent.email} has been removed`,
      });

      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedStudent || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: {
          action: "update_password",
          targetUserId: selectedStudent.user_id,
          newPassword
        }
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Password Updated",
        description: `Password for ${selectedStudent.full_name || selectedStudent.email} has been changed`,
      });

      setPasswordDialogOpen(false);
      setSelectedStudent(null);
      setNewPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (student: StudentAttendance) => {
    setActionLoading(true);
    try {
      const response = await supabase.functions.invoke("admin-operations", {
        body: {
          action: "update_attendance",
          targetUserId: student.user_id,
          isIn: !student.is_in_today
        }
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Status Updated",
        description: `${student.full_name || student.email} marked as ${!student.is_in_today ? "IN" : "OUT"}`,
      });

      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const totalStudents = students.length;
  const studentsIn = students.filter((s) => s.is_in_today).length;
  const studentsOut = totalStudents - studentsIn;
  const totalRevenue = students.reduce((acc, s) => acc + s.total_amount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GIKI Mess" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-display font-bold text-foreground">GIKI Mess</h1>
              <p className="text-xs text-muted-foreground">Mess Officer Portal</p>
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
      <main className="container mx-auto px-4 py-8">
        {/* Date Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/stats")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Statistics
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/lookup")}>
              <UserSearch className="w-4 h-4 mr-2" />
              Student Lookup
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/50 animate-slide-up">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Users className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 animate-slide-up" style={{ animationDelay: "0.05s" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IN Today</p>
                  <p className="text-2xl font-bold text-foreground">{studentsIn}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">OUT Today</p>
                  <p className="text-2xl font-bold text-foreground">{studentsOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-accent">₨</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">PKR {totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student List */}
        <Card className="border-border/50 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Student Attendance</span>
              <Button variant="outline" size="sm" onClick={fetchStudents}>
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              View and manage all registered students
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No students found matching your search" : "No students registered yet"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Today</TableHead>
                      <TableHead className="text-right">Total Days</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.user_id}>
                        <TableCell className="font-medium">
                          {student.full_name || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.email}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleToggleStatus(student)}
                            disabled={actionLoading}
                            className="cursor-pointer"
                          >
                            {student.is_in_today ? (
                              <Badge className="bg-success/20 text-success hover:bg-success/30 border-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                IN
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80">
                                <XCircle className="w-3 h-3 mr-1" />
                                OUT
                              </Badge>
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {student.total_days}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          PKR {student.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedStudent(student);
                                setPasswordDialogOpen(true);
                              }}
                              title="Change Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedStudent(student);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete Student"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedStudent?.full_name || selectedStudent?.email}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStudent}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedStudent?.full_name || selectedStudent?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setPasswordDialogOpen(false);
              setNewPassword("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={actionLoading || newPassword.length < 6}
              className="gradient-primary"
            >
              {actionLoading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;