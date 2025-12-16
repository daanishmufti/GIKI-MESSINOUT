import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Utensils, Edit2, Save, X, Coffee, Sun, Moon } from "lucide-react";

interface MenuDay {
  id: string;
  day_of_week: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

interface MessMenuProps {
  isAdmin?: boolean;
  userIsIn?: boolean;
}

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MEAL_TIMES = {
  breakfast: { start: 7, end: 9 },
  lunch: { start: 12.5, end: 14.5 },
  dinner: { start: 19, end: 21 }
};

const MessMenu = ({ isAdmin = false, userIsIn = false }: MessMenuProps) => {
  const [menu, setMenu] = useState<MenuDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedMenu, setEditedMenu] = useState<MenuDay[]>([]);
  const [saving, setSaving] = useState(false);

  const getCurrentDayAndMeal = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    const currentHour = now.getHours() + now.getMinutes() / 60;

    let currentMeal: 'breakfast' | 'lunch' | 'dinner' | null = null;
    if (currentHour >= MEAL_TIMES.breakfast.start && currentHour < MEAL_TIMES.breakfast.end) {
      currentMeal = 'breakfast';
    } else if (currentHour >= MEAL_TIMES.lunch.start && currentHour < MEAL_TIMES.lunch.end) {
      currentMeal = 'lunch';
    } else if (currentHour >= MEAL_TIMES.dinner.start && currentHour < MEAL_TIMES.dinner.end) {
      currentMeal = 'dinner';
    }

    return { currentDay, currentMeal };
  };

  const { currentDay, currentMeal } = getCurrentDayAndMeal();

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase
        .from("mess_menu")
        .select("*");

      if (error) throw error;

      const sortedMenu = (data || []).sort((a, b) => 
        DAYS_ORDER.indexOf(a.day_of_week) - DAYS_ORDER.indexOf(b.day_of_week)
      );

      setMenu(sortedMenu);
      setEditedMenu(sortedMenu);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of editedMenu) {
        const { error } = await supabase
          .from("mess_menu")
          .update({
            breakfast: item.breakfast,
            lunch: item.lunch,
            dinner: item.dinner,
          })
          .eq("id", item.id);

        if (error) throw error;
      }

      setMenu(editedMenu);
      setEditing(false);
      toast({
        title: "Menu Updated",
        description: "The mess menu has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedMenu(menu);
    setEditing(false);
  };

  const updateMenuItem = (dayIndex: number, field: 'breakfast' | 'lunch' | 'dinner', value: string) => {
    const updated = [...editedMenu];
    updated[dayIndex] = { ...updated[dayIndex], [field]: value };
    setEditedMenu(updated);
  };

  const getCellHighlight = (dayOfWeek: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    const isCurrentMeal = dayOfWeek === currentDay && meal === currentMeal;
    if (isCurrentMeal) {
      return userIsIn ? "ring-2 ring-success bg-success/10" : "ring-2 ring-warning bg-warning/10";
    }
    return "";
  };

  const getMealIcon = (meal: string) => {
    switch (meal) {
      case 'breakfast': return <Coffee className="w-3.5 h-3.5" />;
      case 'lunch': return <Sun className="w-3.5 h-3.5" />;
      case 'dinner': return <Moon className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getMealTime = (meal: string) => {
    switch (meal) {
      case 'breakfast': return '7-9 AM';
      case 'lunch': return '12:30-2:30 PM';
      case 'dinner': return '7-9 PM';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-6 text-center text-muted-foreground">
        Loading menu...
      </div>
    );
  }

  const displayMenu = editing ? editedMenu : menu;

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-primary/5 px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">Weekly Menu</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
              <span className="text-muted-foreground">Active & IN</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-warning"></span>
              <span className="text-muted-foreground">Active & OUT</span>
            </div>
          </div>
          {isAdmin && (
            <>
              {editing ? (
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving} className="h-7 px-2 text-xs">
                    <X className="w-3.5 h-3.5 mr-1" />Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 px-2 text-xs gradient-primary">
                    <Save className="w-3.5 h-3.5 mr-1" />{saving ? "..." : "Save"}
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-7 px-2 text-xs">
                  <Edit2 className="w-3.5 h-3.5 mr-1" />Edit
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Compact Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left py-2 px-3 font-semibold text-foreground w-20">Day</th>
              <th className="text-left py-2 px-3 font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  {getMealIcon('breakfast')}
                  <span>Breakfast</span>
                  <span className="text-muted-foreground font-normal hidden md:inline">({getMealTime('breakfast')})</span>
                </div>
              </th>
              <th className="text-left py-2 px-3 font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  {getMealIcon('lunch')}
                  <span>Lunch</span>
                  <span className="text-muted-foreground font-normal hidden md:inline">({getMealTime('lunch')})</span>
                </div>
              </th>
              <th className="text-left py-2 px-3 font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  {getMealIcon('dinner')}
                  <span>Dinner</span>
                  <span className="text-muted-foreground font-normal hidden md:inline">({getMealTime('dinner')})</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayMenu.map((day, index) => (
              <tr 
                key={day.id} 
                className={`border-b border-border/20 last:border-0 ${day.day_of_week === currentDay ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
              >
                <td className="py-2 px-3">
                  <span className={`font-medium ${day.day_of_week === currentDay ? 'text-primary' : 'text-foreground'}`}>
                    {day.day_of_week.slice(0, 3)}
                  </span>
                </td>
                {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                  <td key={meal} className="py-1.5 px-2">
                    {editing ? (
                      <Input
                        value={editedMenu[index]?.[meal] || ''}
                        onChange={(e) => updateMenuItem(index, meal, e.target.value)}
                        className="h-7 text-xs"
                      />
                    ) : (
                      <div className={`text-muted-foreground py-1 px-2 rounded-md transition-all ${getCellHighlight(day.day_of_week, meal)}`}>
                        {day[meal] || '-'}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MessMenu;
