import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Users, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart } from "recharts";
import logo from "@/assets/logo.png";

interface Stats {
  total_students: number;
  students_in: number;
  students_out: number;
  total_revenue: number;
}

interface DailyData {
  date: string;
  day: string;
  in_count: number;
  out_count: number;
  revenue: number;
}

const COLORS = ['hsl(var(--success))', 'hsl(var(--muted))'];

const AdminStats = () => {
  const [weeklyStats, setWeeklyStats] = useState<Stats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<Stats | null>(null);
  const [weeklyDailyData, setWeeklyDailyData] = useState<DailyData[]>([]);
  const [monthlyDailyData, setMonthlyDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      
      // Weekly stats (current week)
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      
      const { data: weekly, error: weeklyError } = await supabase
        .rpc("get_attendance_stats", { 
          start_date: format(weekStart, "yyyy-MM-dd"), 
          end_date: format(weekEnd, "yyyy-MM-dd") 
        });
      
      if (weeklyError) throw weeklyError;
      if (weekly && weekly.length > 0) {
        setWeeklyStats({
          total_students: Number(weekly[0].total_students),
          students_in: Number(weekly[0].students_in),
          students_out: Number(weekly[0].students_out),
          total_revenue: Number(weekly[0].total_revenue)
        });
      }

      // Monthly stats (current month)
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const { data: monthly, error: monthlyError } = await supabase
        .rpc("get_attendance_stats", { 
          start_date: format(monthStart, "yyyy-MM-dd"), 
          end_date: format(monthEnd, "yyyy-MM-dd") 
        });
      
      if (monthlyError) throw monthlyError;
      if (monthly && monthly.length > 0) {
        setMonthlyStats({
          total_students: Number(monthly[0].total_students),
          students_in: Number(monthly[0].students_in),
          students_out: Number(monthly[0].students_out),
          total_revenue: Number(monthly[0].total_revenue)
        });
      }

      // Fetch daily breakdown for weekly view
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const weeklyDaily: DailyData[] = [];
      
      for (const day of weekDays) {
        const dateStr = format(day, "yyyy-MM-dd");
        const { data: dayData } = await supabase
          .from("daily_attendance")
          .select("is_in")
          .eq("date", dateStr);
        
        const inCount = dayData?.filter(d => d.is_in).length || 0;
        weeklyDaily.push({
          date: dateStr,
          day: format(day, "EEE"),
          in_count: inCount,
          out_count: (monthly?.[0]?.total_students || 0) - inCount,
          revenue: inCount * 600
        });
      }
      setWeeklyDailyData(weeklyDaily);

      // Fetch daily breakdown for monthly view (last 30 days for cleaner chart)
      const last30Days = eachDayOfInterval({ 
        start: subDays(now, 29), 
        end: now 
      });
      const monthlyDaily: DailyData[] = [];
      
      for (const day of last30Days) {
        const dateStr = format(day, "yyyy-MM-dd");
        const { data: dayData } = await supabase
          .from("daily_attendance")
          .select("is_in")
          .eq("date", dateStr);
        
        const inCount = dayData?.filter(d => d.is_in).length || 0;
        monthlyDaily.push({
          date: dateStr,
          day: format(day, "d"),
          in_count: inCount,
          out_count: (monthly?.[0]?.total_students || 0) - inCount,
          revenue: inCount * 600
        });
      }
      setMonthlyDailyData(monthlyDaily);

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

  const getPieData = (stats: Stats | null) => [
    { name: 'Students IN', value: stats?.students_in || 0 },
    { name: 'Students OUT', value: stats?.students_out || 0 },
  ];

  const StatsGrid = ({ stats, period }: { stats: Stats | null; period: string }) => (
    <div className="grid grid-cols-2 gap-4">
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold text-foreground">{stats?.total_students || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Students IN ({period})</p>
              <p className="text-2xl font-bold text-foreground">{stats?.students_in || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Students OUT ({period})</p>
              <p className="text-2xl font-bold text-foreground">{stats?.students_out || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue ({period})</p>
              <p className="text-2xl font-bold text-foreground">PKR {(stats?.total_revenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
              <h1 className="font-display font-bold text-foreground">Statistics</h1>
              <p className="text-xs text-muted-foreground">Weekly & Monthly Reports</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading statistics...</div>
        ) : (
          <Tabs defaultValue="weekly" className="animate-slide-up">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="weekly">This Week</TabsTrigger>
              <TabsTrigger value="monthly">This Month</TabsTrigger>
            </TabsList>
            
            <TabsContent value="weekly" className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Weekly Statistics</CardTitle>
                  <CardDescription>
                    {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d")} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StatsGrid stats={weeklyStats} period="Week" />
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Daily Attendance</CardTitle>
                    <CardDescription>Students IN per day this week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyDailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="in_count" name="Students IN" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">IN vs OUT Distribution</CardTitle>
                    <CardDescription>Overall weekly breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieData(weeklyStats)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {getPieData(weeklyStats).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Daily Revenue</CardTitle>
                  <CardDescription>Revenue generated per day (PKR 600 per student)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyDailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          name="Revenue (PKR)" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary))" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Monthly Statistics</CardTitle>
                  <CardDescription>
                    {format(startOfMonth(new Date()), "MMMM yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StatsGrid stats={monthlyStats} period="Month" />
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Daily Attendance Trend</CardTitle>
                    <CardDescription>Students IN over the last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyDailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line 
                            type="monotone" 
                            dataKey="in_count" 
                            name="Students IN" 
                            stroke="hsl(var(--success))" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">IN vs OUT Distribution</CardTitle>
                    <CardDescription>Overall monthly breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieData(monthlyStats)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {getPieData(monthlyStats).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Trend</CardTitle>
                  <CardDescription>Daily revenue over the last 30 days (PKR 600 per student)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyDailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          name="Revenue (PKR)" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary))" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default AdminStats;
